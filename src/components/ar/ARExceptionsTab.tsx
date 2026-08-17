import React, { useState, useMemo, useEffect } from 'react';
import { reconciliationsService } from '../../services/reconciliations.service';
import { arService } from '../../services/ar.service';
import { Button } from '../ui/Button';
import { Search, Check, X } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { RULE_METADATA } from './ARRuleCard';
import type { ExceptionOut, MatchGroupOut, ARRule, RunOut, PaymentOut } from '../../types';

interface ARExceptionsTabProps {
  /** The active run - needed to fetch its open/unapplied payments for the
   * No-Payment-Received resolution panel. */
  run?: RunOut | null;
  exceptions: ExceptionOut[];
  /** Same run's match groups - looked up by match_group_id so the resolution
   * panel can show which match (and which rules) this exception is tied to,
   * for the exception types that reference one (DOUBLE_COLLISION,
   * MULTIPLE_INVOICE_MATCH). */
  matches?: MatchGroupOut[];
  loading?: boolean;
  /** Called after a successful resolve so the parent can refetch. */
  onResolved: () => void;
}

// exception_type -> display label + badge color. Every value here is a
// real constants.EXCEPTION_TYPES entry the backend can actually raise
// today (see docs/reconciliation.md §8 / the invoice-flow-example doc's
// reference table) - not a superset of hypothetical future types.
const TYPE_META: Record<string, { label: string; badgeClass: string }> = {
  SHORT_PAY: { label: 'Short-Pay', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
  SUSPENSE: { label: 'Suspense', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  DOUBLE_COLLISION: { label: 'Double Collision', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
  MULTIPLE_INVOICE_MATCH: { label: 'Multiple Invoice Match', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  UNAPPLIED_CASH: { label: 'Unapplied Cash', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  NO_PAYMENT: { label: 'No Payment Received', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
  GL_VARIANCE: { label: 'GL Variance', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
  DUPLICATE: { label: 'Duplicate', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' },
};

const rupees = (minor: number | null | undefined) =>
  minor == null ? '—' : `₹${(Math.abs(minor) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const shortId = (id: string | null | undefined) => (id ? `${id.slice(0, 8)}…` : '—');

/** Best-effort amount for display - discrepancy_minor isn't populated by
 * the engine today, so this is derived from whichever `detail` field the
 * exception type actually carries (see the dao.insert_exception call
 * sites in app/reconciliation/engine.py / gl_posting.py). */
interface KnownExceptionDetail {
  shortfall_minor?: number;
  tolerance_minor?: number;
  variance_minor?: number;
  amount_minor?: number;
  balance_due_minor?: number;
}
const exceptionDetail = (e: ExceptionOut): KnownExceptionDetail => (e.detail || {}) as KnownExceptionDetail;

function exceptionAmountMinor(e: ExceptionOut): number | null {
  if (e.discrepancy_minor != null) return e.discrepancy_minor;
  if (e.amount_minor != null) return e.amount_minor;
  const detail = exceptionDetail(e);
  if (detail.shortfall_minor != null) return detail.shortfall_minor;
  if (detail.variance_minor != null) return detail.variance_minor;
  if (detail.amount_minor != null) return detail.amount_minor;
  if (detail.balance_due_minor != null) return detail.balance_due_minor;
  return null;
}

type Disposition = 'writeoff' | 'keepopen' | 'dispute';
const DISPOSITION_TO_UPDATE: Record<Disposition, { status: string; resolution_outcome: string }> = {
  writeoff: { status: 'WRITTEN_OFF', resolution_outcome: 'WRITEOFF' },
  keepopen: { status: 'INVESTIGATING', resolution_outcome: 'KEEPOPEN' },
  dispute: { status: 'INVESTIGATING', resolution_outcome: 'DISPUTE' },
};

export const ARExceptionsTab: React.FC<ARExceptionsTabProps> = ({ run, exceptions, matches = [], loading, onResolved }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortOption, setSortOption] = useState<'amount-desc' | 'amount-asc' | 'date-desc'>('date-desc');
  const [activeExceptionId, setActiveExceptionId] = useState<string | null>(null);
  const [disposition, setDisposition] = useState<Disposition>('writeoff');
  const [resolutionNote, setResolutionNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [rulesById, setRulesById] = useState<Record<string, ARRule>>({});
  // No-Payment-Received panel state - matches the prototype's arNoPaymentPanel
  // (index copy.html:3259): a checkbox list of open/unapplied payments to
  // match against the exception's one known invoice, or "defer to next cycle".
  const [openPayments, setOpenPayments] = useState<PaymentOut[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([]);
  const [noPaymentAction, setNoPaymentAction] = useState<'match' | 'defer'>('defer');
  const { toast } = useToast();

  // Same rule-name resolution ARMatchedTab uses for "Resolved Via" - kept
  // here too so the "linked match" section below can show real rule names,
  // not raw rule_id UUIDs.
  useEffect(() => {
    let cancelled = false;
    arService.getARRules().then((rules) => {
      if (cancelled) return;
      const byId: Record<string, ARRule> = {};
      rules.forEach((r) => { byId[r.id] = r; });
      setRulesById(byId);
    }).catch(() => { });
    return () => { cancelled = true; };
  }, []);

  const shortIdRule = (id: string) => `${id.slice(0, 8)}…`;
  const ruleLabel = (ruleId: string | null): string => {
    if (!ruleId) return 'No rule (fallback)';
    const rule = rulesById[ruleId];
    if (!rule) return shortIdRule(ruleId);
    return RULE_METADATA[rule.kind]?.label || rule.name || rule.kind;
  };

  const matchesByGroupId = useMemo(() => {
    const map: Record<string, MatchGroupOut> = {};
    matches.forEach((m) => { map[m.match_group_id] = m; });
    return map;
  }, [matches]);

  const filteredExceptions = useMemo(() => {
    const rows = exceptions.filter((e) => {
      if (selectedType !== 'all' && e.exception_type !== selectedType) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          (e.reason_code || '').toLowerCase().includes(q) ||
          (e.customer_name || '').toLowerCase().includes(q) ||
          (e.customer_code || '').toLowerCase().includes(q) ||
          (e.invoice_number || '').toLowerCase().includes(q) ||
          (e.bank_reference || '').toLowerCase().includes(q) ||
          (e.customer_id || '').toLowerCase().includes(q) ||
          e.exception_id.toLowerCase().includes(q)
        );
      }
      return true;
    });

    return [...rows].sort((a, b) => {
      if (sortOption === 'date-desc') return b.created_at.localeCompare(a.created_at);
      const av = exceptionAmountMinor(a) ?? 0;
      const bv = exceptionAmountMinor(b) ?? 0;
      return sortOption === 'amount-desc' ? bv - av : av - bv;
    });
  }, [exceptions, searchQuery, selectedType, sortOption]);

  const activeException = useMemo(
    () => exceptions.find((e) => e.exception_id === activeExceptionId) || null,
    [exceptions, activeExceptionId]
  );

  // Resets the panel's local state - called from every place that opens,
  // switches, or closes the active exception, so a stale note/selection
  // from a previous exception never leaks into the next one. Deliberately
  // an event-handler helper, not a `useEffect` keyed on activeExceptionId -
  // resetting state in response to a prop/id change belongs in the handler
  // that changes it, not in an effect (see react-hooks/set-state-in-effect).
  const resetPanelState = () => {
    setResolutionNote('');
    setDisposition('writeoff');
    setSelectedPaymentIds([]);
    setNoPaymentAction('defer');
    setOpenPayments([]);
  };

  const openException = (id: string) => {
    resetPanelState();
    setActiveExceptionId(id);
  };

  const closeException = () => {
    resetPanelState();
    setActiveExceptionId(null);
  };

  // Fetch this run's open/unapplied payments only when actually needed -
  // a NO_PAYMENT exception is open.
  useEffect(() => {
    if (!run || activeException?.exception_type !== 'NO_PAYMENT') return;
    let cancelled = false;
    (async () => {
      if (!cancelled) setLoadingPayments(true);
      try {
        const payments = await reconciliationsService.getOpenPayments(run.run_id);
        if (cancelled) return;
        setOpenPayments(payments);
        // Default to "match" the moment there's something to match against -
        // same default the prototype's radio uses (`checked={availablePayments.length}`).
        setNoPaymentAction(payments.length > 0 ? 'match' : 'defer');
      } catch {
        if (!cancelled) setOpenPayments([]);
      } finally {
        if (!cancelled) setLoadingPayments(false);
      }
    })();
    return () => { cancelled = true; };
  }, [run, activeException?.exception_type, activeExceptionId]);

  const togglePaymentSelected = (paymentId: string) => {
    setSelectedPaymentIds((prev) =>
      prev.includes(paymentId) ? prev.filter((id) => id !== paymentId) : [...prev, paymentId]
    );
  };

  const handleResolveNoPayment = async () => {
    if (!activeException) return;
    setSaving(true);
    try {
      if (noPaymentAction === 'match') {
        await reconciliationsService.resolveNoPayment(activeException.exception_id, {
          payment_ids: selectedPaymentIds,
          note: resolutionNote || undefined,
        });
        toast(`Exception ${activeException.exception_no || shortId(activeException.exception_id)} matched to ${selectedPaymentIds.length} payment(s)`, 'ok');
      } else {
        await reconciliationsService.updateException(activeException.exception_id, {
          status: 'CARRIED_FORWARD',
          resolution_notes: resolutionNote || undefined,
        });
        toast(`Exception ${activeException.exception_no || shortId(activeException.exception_id)} deferred to next cycle`, 'ok');
      }
      closeException();
      onResolved();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to resolve exception', 'bad');
    } finally {
      setSaving(false);
    }
  };

  const handleResolveShortPay = async () => {
    if (!activeException) return;
    setSaving(true);
    try {
      const { status, resolution_outcome } = DISPOSITION_TO_UPDATE[disposition];
      await reconciliationsService.updateException(activeException.exception_id, {
        status,
        resolution_outcome,
        resolution_notes: resolutionNote || undefined,
      });
      toast(`Exception ${activeException.exception_no || shortId(activeException.exception_id)} → ${status}`, 'ok');
      closeException();
      onResolved();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to resolve exception', 'bad');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkResolved = async () => {
    if (!activeException) return;
    setSaving(true);
    try {
      await reconciliationsService.updateException(activeException.exception_id, {
        status: 'RESOLVED',
        resolution_notes: resolutionNote || undefined,
      });
      toast(`Exception ${activeException.exception_no || shortId(activeException.exception_id)} marked Resolved`, 'ok');
      closeException();
      onResolved();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to resolve exception', 'bad');
    } finally {
      setSaving(false);
    }
  };

  const renderBadge = (type: string) => {
    const meta = TYPE_META[type] || { label: type, badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' };
    return (
      <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${meta.badgeClass}`}>
        {meta.label}
      </span>
    );
  };

  const isResolvedStatus = (status: string) =>
    status === 'RESOLVED' || status === 'AUTO_RESOLVED' || status === 'WRITTEN_OFF' || status === 'ADJUSTED' || status === 'CARRIED_FORWARD';

  return (
    <div className="p-6 space-y-5 fade-in w-full">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-60 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customer, description, ID..."
            className="w-full pl-9 pr-3 h-9 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-600 shadow-xs"
          />
        </div>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-600 shadow-xs min-w-47.5"
        >
          <option value="all">All Exception Types ({exceptions.length})</option>
          {Object.entries(TYPE_META).map(([type, meta]) => (
            <option key={type} value={type}>{meta.label}</option>
          ))}
        </select>

        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value as typeof sortOption)}
          className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-600 shadow-xs min-w-45"
        >
          <option value="amount-desc">Amount: high → low</option>
          <option value="amount-asc">Amount: low → high</option>
          <option value="date-desc">Date: newest first</option>
        </select>
      </div>

      {/* Exception & Action Inbox Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 h-12 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-xs font-bold text-slate-900 tracking-tight">
            Exception & Action Inbox
          </h3>
          <span className="text-[11.5px] text-slate-500 font-medium">
            {filteredExceptions.length} shown ·{' '}
            <span className="text-rose-600 font-semibold">
              {exceptions.filter((e) => e.status === 'OPEN').length} open
            </span>{' '}
            · click a row to resolve
          </span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500">Loading exceptions…</div>
        ) : filteredExceptions.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">No exceptions match the current filter.</div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExceptions.map((e) => {
                const isSelected = activeExceptionId === e.exception_id;
                return (
                  <tr
                    key={e.exception_id}
                    onClick={() => openException(e.exception_id)}
                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50/60 font-medium' : 'hover:bg-slate-50/80'
                      }`}
                  >
                    <td className="px-4 py-4 align-middle">{renderBadge(e.exception_type)}</td>
                    <td className="px-4 py-4 align-middle font-medium text-xs text-slate-800" title={e.customer_id ?? undefined}>
                      {e.customer_name ? (
                        <span className="font-semibold text-slate-900">{e.customer_name}</span>
                      ) : e.customer_code ? (
                        <span className="font-semibold text-slate-900">{e.customer_code}</span>
                      ) : e.customer_id ? (
                        <span className="font-mono text-[11.5px] text-slate-600">{shortId(e.customer_id)}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 align-middle text-slate-600 font-normal leading-snug">
                      {e.reason_code || '—'}
                    </td>
                    <td className="px-4 py-4 align-middle text-slate-500 font-mono text-[11.5px]">
                      {new Date(e.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-4 align-middle text-right font-mono font-bold text-rose-700">
                      {rupees(exceptionAmountMinor(e))}
                    </td>
                    <td className="px-4 py-4 align-middle text-right">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${isResolvedStatus(e.status)
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                      >
                        {e.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Active Resolution Panel */}
      {activeException && (
        <div className="bg-white border border-indigo-200 rounded-xl overflow-hidden shadow-sm fade-in">
          {/* Panel Header */}
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span>Resolve Exception — {activeException.exception_no || shortId(activeException.exception_id)}</span>
                {activeException.customer_name && (
                  <span className="text-slate-600 font-medium">({activeException.customer_name})</span>
                )}
                {renderBadge(activeException.exception_type)}
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                {activeException.reason_code}
              </p>
            </div>

            <button
              onClick={() => closeException()}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Panel Body Per Exception Type */}
          <div className="p-5 space-y-4">
            {/* Linked Match - only exceptions tied to a match_group_id (DOUBLE_COLLISION,
                MULTIPLE_INVOICE_MATCH) have one; shows the same match type + resolved-via
                rules the Matched tab shows, real data from the same GET /runs/{id}/matches. */}
            {activeException.match_group_id && matchesByGroupId[activeException.match_group_id] && (
              <div className="p-3.5 bg-indigo-50/50 border border-indigo-200 rounded-lg">
                <div className="text-[10.5px] font-bold text-indigo-700 uppercase mb-1.5">Linked Match</div>
                <span className="inline-block px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-1.5">
                  {matchesByGroupId[activeException.match_group_id].match_type}
                </span>
                {matchesByGroupId[activeException.match_group_id].locked_by_rule_id && (
                  <div className="text-[12.5px] text-slate-800">
                    <span className="font-semibold text-slate-900">
                      {ruleLabel(matchesByGroupId[activeException.match_group_id].locked_by_rule_id)}
                    </span>
                    <span className="text-slate-400"> · customer lock</span>
                  </div>
                )}
                <div className="text-[12.5px] text-slate-800">
                  <span className="font-semibold text-slate-900">
                    {ruleLabel(matchesByGroupId[activeException.match_group_id].rule_id)}
                  </span>
                  {matchesByGroupId[activeException.match_group_id].reason && (
                    <div className="text-[11.5px] text-slate-500 font-normal mt-0.5">
                      {matchesByGroupId[activeException.match_group_id].reason}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Panel: Short-Pay - real shortfall/tolerance from detail, real disposition -> resolution_outcome mapping */}
            {activeException.exception_type === 'SHORT_PAY' && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-[10.5px] font-bold text-rose-600 uppercase">Shortfall</div>
                    <div className="text-sm font-bold text-rose-700 mt-1">
                      {rupees(exceptionDetail(activeException).shortfall_minor)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10.5px] font-bold text-slate-400 uppercase">Tolerance</div>
                    <div className="text-sm font-bold text-slate-900 mt-1">
                      {rupees(exceptionDetail(activeException).tolerance_minor)}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Resolution Disposition
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                      <input
                        type="radio"
                        name="shortpay-action"
                        checked={disposition === 'writeoff'}
                        onChange={() => setDisposition('writeoff')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">Write off the shortfall</div>
                        <div className="text-[11px] text-slate-500">status → WRITTEN_OFF, resolution_outcome → WRITEOFF</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                      <input
                        type="radio"
                        name="shortpay-action"
                        checked={disposition === 'keepopen'}
                        onChange={() => setDisposition('keepopen')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">Keep invoice open for balance follow-up</div>
                        <div className="text-[11px] text-slate-500">status → INVESTIGATING, resolution_outcome → KEEPOPEN</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                      <input
                        type="radio"
                        name="shortpay-action"
                        checked={disposition === 'dispute'}
                        onChange={() => setDisposition('dispute')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">Mark as customer dispute</div>
                        <div className="text-[11px] text-slate-500">status → INVESTIGATING, resolution_outcome → DISPUTE</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Resolution Note
                  </label>
                  <textarea
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder="Enter audit note for customer dispute or TDS deduction clearance..."
                    className="w-full bg-white border border-slate-200 rounded-lg p-3 text-xs font-medium text-slate-900 h-16 resize-none focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>
            )}

            {/* Panel: No Payment Received - match against open/unapplied
                payments (matches the prototype's arNoPaymentPanel exactly),
                or defer to next cycle. */}
            {activeException.exception_type === 'NO_PAYMENT' && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10.5px] font-bold text-slate-400 uppercase mb-2">Invoice Awaiting Payment</div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[13px] font-semibold text-slate-900">{activeException.invoice_number || shortId(activeException.invoice_id)}</div>
                      <div className="text-[11.5px] text-slate-500">{activeException.customer_name || activeException.customer_code || 'Unknown customer'}</div>
                    </div>
                    <div className="text-right font-mono text-[13px] font-semibold text-slate-900">
                      {rupees(exceptionAmountMinor(activeException))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Open Payments (select any number)
                  </label>
                  <div className="text-[11.5px] text-slate-500 mb-2">
                    {loadingPayments
                      ? 'Loading open payments…'
                      : `${openPayments.length} open/unapplied payment${openPayments.length === 1 ? '' : 's'} available to match against this invoice.`}
                  </div>
                  <div className="border border-slate-200 rounded-lg bg-white max-h-56 overflow-y-auto">
                    {loadingPayments ? (
                      <div className="px-4 py-6 text-center text-slate-400 text-xs">Loading…</div>
                    ) : openPayments.length === 0 ? (
                      <div className="px-4 py-6 text-center text-slate-400 text-xs">No open payments available</div>
                    ) : (
                      openPayments.map((p) => (
                        <label
                          key={p.payment_id}
                          className="flex items-center gap-3 p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPaymentIds.includes(p.payment_id)}
                            onChange={() => togglePaymentSelected(p.payment_id)}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div className="flex-1">
                            <div className="text-[12px] font-medium text-slate-900" title={p.payment_id}>{p.bank_reference || shortId(p.payment_id)}</div>
                            <div className="text-[11.5px] text-slate-500">{p.customer_name || 'Unknown payer'}</div>
                          </div>
                          <div className="text-right font-mono text-[12px] font-semibold text-slate-900">
                            {rupees(p.unapplied_minor)}
                            {p.unapplied_minor !== p.total_received_minor && (
                              <span className="block text-[10.5px] text-slate-400 font-normal">of {rupees(p.total_received_minor)}</span>
                            )}
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Resolution</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                      <input
                        type="radio"
                        name="nopay-action"
                        checked={noPaymentAction === 'match'}
                        disabled={openPayments.length === 0}
                        onChange={() => setNoPaymentAction('match')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">Match selected payment(s) above</div>
                        <div className="text-[11px] text-slate-500">Link this invoice to one or more available payments</div>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                      <input
                        type="radio"
                        name="nopay-action"
                        checked={noPaymentAction === 'defer'}
                        onChange={() => setNoPaymentAction('defer')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">Defer to next cycle</div>
                        <div className="text-[11px] text-slate-500">No matching payment available yet — await next payment arrival</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Note (optional)
                  </label>
                  <textarea
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder="Why this payment was chosen (or why deferred)..."
                    className="w-full bg-white border border-slate-200 rounded-lg p-3 text-xs font-medium text-slate-900 h-16 resize-none focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>
            )}

            {/* Panel: every other exception type - raw detail JSON, generic resolve */}
            {activeException.exception_type !== 'SHORT_PAY' && activeException.exception_type !== 'NO_PAYMENT' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                  <div className="font-semibold text-slate-900 mb-1">Reason</div>
                  <div>{activeException.reason_code || '—'}</div>
                </div>
                {activeException.detail && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="text-[10.5px] font-bold text-slate-400 uppercase mb-1.5">Detail</div>
                    <pre className="text-[11px] font-mono text-slate-700 whitespace-pre-wrap break-all">
                      {JSON.stringify(activeException.detail, null, 2)}
                    </pre>
                  </div>
                )}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Resolution Note
                  </label>
                  <textarea
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder="Enter audit note..."
                    className="w-full bg-white border border-slate-200 rounded-lg p-3 text-xs font-medium text-slate-900 h-16 resize-none focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="ghost" size="sm" onClick={() => closeException()} disabled={saving}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={Check}
                disabled={
                  saving ||
                  (activeException.exception_type === 'NO_PAYMENT' && noPaymentAction === 'match' && selectedPaymentIds.length === 0)
                }
                onClick={
                  activeException.exception_type === 'SHORT_PAY'
                    ? handleResolveShortPay
                    : activeException.exception_type === 'NO_PAYMENT'
                      ? handleResolveNoPayment
                      : handleMarkResolved
                }
              >
                {saving ? 'Saving…' : 'Save Decision & Resolve'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
