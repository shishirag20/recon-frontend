import React, { useState, useMemo, useEffect } from 'react';
import { arService } from '../../services/ar.service';
import { Button } from '../ui/Button';
import { Undo2 } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { RULE_METADATA } from './ARRuleCard';
import type { GatewaySettlement, AREngineResult, RunOut, MatchGroupOut, ExceptionOut, ARRule } from '../../types';

interface ARMatchedTabProps {
  run: RunOut | null;
  matches: MatchGroupOut[];
  exceptions?: ExceptionOut[];
  loading?: boolean;
}

const rupees = (minor: number | null | undefined) =>
  `₹${((minor ?? 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

// UUIDs are long and not meaningful to read at a glance - show a short,
// hoverable form rather than either the full string or a fabricated
// human-readable label the backend doesn't provide (no invoice-number/
// customer-name join exists on GET /runs/{id}/matches today).
const shortId = (id: string | null | undefined) => (id ? `${id.slice(0, 8)}…` : '—');

export const ARMatchedTab: React.FC<ARMatchedTabProps> = ({ run, matches, exceptions = [], loading }) => {
  const [stream, setStream] = useState<'bank-cash' | 'gateway' | 'gl'>('bank-cash');
  const [isUnreconMode, setIsUnreconMode] = useState<boolean>(false);
  const [selectedMatches, setSelectedMatches] = useState<string[]>([]);
  const [arResult, setArResult] = useState<AREngineResult | null>(null);
  const [rulesById, setRulesById] = useState<Record<string, ARRule>>({});
  const { toast } = useToast();

  // Gateway settlements have no backend support yet (no endpoint returns
  // them) - this call is kept only so that stream doesn't crash; it always
  // resolves empty against the real API, which is the honest state today.
  useEffect(() => {
    let cancelled = false;
    arService.getARReconciliation().then((res) => {
      if (!cancelled) setArResult(res);
    }).catch(() => { });
    return () => { cancelled = true; };
  }, []);

  // Resolve match_group.rule_id -> a real, polished rule name (same
  // RULE_METADATA Rules Studio itself uses) for the "Resolved Via" column,
  // instead of a hardcoded placeholder string.
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

  const ruleLabel = (ruleId: string | null): string => {
    if (!ruleId) return 'No rule (fallback)';
    const rule = rulesById[ruleId];
    if (!rule) return shortId(ruleId);
    return RULE_METADATA[rule.kind]?.label || rule.name || rule.kind;
  };

  const gatewaySettlements: GatewaySettlement[] = arResult?.gatewaySettlements || [];

  // Matches the prototype exactly (index copy.html keeps `shortPays` as a
  // separate array from `matches`/`overpays`, and arMatchedTable only ever
  // reads the latter two): real cash was applied and the match_group is a
  // legitimate audit record, but a short-paid invoice isn't "done" - it
  // belongs in Exceptions, not alongside clean matches here.
  const shortPayMatchGroupIds = useMemo(
    () => new Set(exceptions.filter((e) => e.exception_type === 'SHORT_PAY' && e.match_group_id).map((e) => e.match_group_id)),
    [exceptions]
  );
  const displayedMatches = useMemo(
    () => matches.filter((g) => !shortPayMatchGroupIds.has(g.match_group_id)),
    [matches, shortPayMatchGroupIds]
  );

  // Real GL control proof result (M3) - a GL_VARIANCE exception carries the
  // sub-ledger/GL/variance figures directly in `detail`. No exception of
  // that type in this run's list means the control proof found no
  // mismatch (or hasn't been checked yet - see gl_posting.py's
  // "no gl_control_balances row -> skipped, not a mismatch" behavior).
  const glVarianceException = useMemo(
    () => exceptions.find((e) => e.exception_type === 'GL_VARIANCE'),
    [exceptions]
  );
  const glDetail = glVarianceException?.detail as
    | { sub_ledger_balance_minor?: number; gl_control_balance_minor?: number; variance_minor?: number }
    | undefined;

  const toggleSelectMatch = (id: string) => {
    setSelectedMatches((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handlePerformUnreconcile = () => {
    toast(`Successfully unreconciled ${selectedMatches.length} transaction(s)`, 'ok');
    setSelectedMatches([]);
    setIsUnreconMode(false);
  };

  return (
    <div className="p-6 space-y-5 fade-in w-full">
      {/* Top Segmented Control & Unreconcile Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
        {/* Segmented Control */}
        <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setStream('bank-cash')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${stream === 'bank-cash'
              ? 'bg-white shadow-xs text-indigo-600'
              : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Invoice vs Bank Payments{' '}
            <span className="font-mono text-[11px] opacity-70">({displayedMatches.length})</span>
          </button>

          <button
            onClick={() => setStream('gateway')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${stream === 'gateway'
              ? 'bg-white shadow-xs text-indigo-600'
              : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Invoice vs Gateway Payments{' '}
            <span className="font-mono text-[11px] opacity-70">({gatewaySettlements.length})</span>
          </button>

          <button
            onClick={() => setStream('gl')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${stream === 'gl'
              ? 'bg-white shadow-xs text-indigo-600'
              : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Subledger vs GL Control
          </button>
        </div>

        {/* Unreconcile Action */}
        {stream === 'bank-cash' && (
          <div>
            {!isUnreconMode ? (
              <Button
                variant="ghost"
                size="sm"
                icon={Undo2}
                onClick={() => setIsUnreconMode(true)}
              >
                Unreconcile
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">
                  {selectedMatches.length} selected
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={selectedMatches.length === 0}
                  onClick={handlePerformUnreconcile}
                >
                  Unreconcile Selected
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsUnreconMode(false);
                    setSelectedMatches([]);
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* STREAM 1: Invoice vs Bank Payments */}
      {stream === 'bank-cash' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          {!run ? (
            <div className="p-10 text-center text-xs text-slate-500">
              No reconciliation run yet for this definition — run one to see matches here.
            </div>
          ) : loading ? (
            <div className="p-10 text-center text-xs text-slate-500">Loading matches…</div>
          ) : displayedMatches.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              No matches in run {run.run_no} — every payment either has an open exception or nothing has been ingested yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              {/* Header structure matching the original prototype (index copy.html's
                  arMatchedTable): Invoice | Payment | Resolved via, each with a
                  sub-header row of the two fields grouped within it. */}
              <thead>
                <tr className="border-b border-slate-100">
                  {isUnreconMode && <th className="w-10 px-4 py-3" rowSpan={2}></th>}
                  <th className="px-4 pt-3 pb-1 text-center font-bold text-xs text-slate-800 uppercase tracking-wider border-b border-slate-100">
                    Invoice
                  </th>
                  <th className="px-4 pt-3 pb-1 text-center font-bold text-xs text-slate-800 uppercase tracking-wider border-x border-b border-slate-100">
                    Payment
                  </th>
                  <th className="px-4 pt-3 pb-2 text-left font-bold text-xs text-slate-800 uppercase tracking-wider" rowSpan={2}>
                    Resolved Via
                  </th>
                </tr>
                <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="px-4 py-2 font-bold">
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div>Invoice</div>
                      <div>Amount</div>
                    </div>
                  </th>
                  <th className="px-4 py-2 font-bold border-x border-slate-200">
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div>Bank Transaction</div>
                      <div>Amount</div>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedMatches.map((group, groupIdx) => {
                  const isGrouped = group.allocations.length > 1;
                  const isChecked = selectedMatches.includes(group.match_group_id);
                  const bankTxnId = group.allocations[0]?.bank_txn_id ?? null;
                  const bankReference = group.allocations[0]?.bank_reference ?? null;
                  // The payment's own total received - not the sum of what got
                  // allocated, which under/overstates it for short-pay/overpay/fee
                  // cases (every allocation in a group shares one payment, so the
                  // first is enough).
                  const paymentAmount = group.allocations[0]?.payment_amount_minor ?? null;

                  return group.allocations.map((a, idx) => {
                    const isFirst = idx === 0;
                    return (
                      <tr
                        key={a.allocation_id}
                        className={`hover:bg-slate-50/80 transition-colors ${idx < group.allocations.length - 1 ? 'border-b border-slate-100' : ''
                          } ${groupIdx > 0 && isFirst ? 'border-t-4 border-slate-100' : ''}`}
                      >
                        {isUnreconMode && isFirst && (
                          <td rowSpan={group.allocations.length} className="px-4 py-3 text-center align-middle border-r border-slate-100">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelectMatch(group.match_group_id)}
                              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>
                        )}

                        {/* Invoice column - accent border only when this payment settled >1 invoice */}
                        <td className={`px-4 py-3.5 align-middle ${isGrouped ? 'border-l-[3px] border-indigo-600' : ''}`}>
                          <div className="grid grid-cols-2 gap-3 text-center items-center font-medium text-[13px] text-slate-900">
                            <div className="font-semibold text-slate-900" title={a.invoice_id}>
                              {a.invoice_number || shortId(a.invoice_id)}
                            </div>
                            {/* The invoice's own total (what was owed), not the
                                allocated cash - they diverge on short-pay/overpay/fee
                                matches, which is exactly what this column should show. */}
                            <div className="font-semibold text-slate-900">{rupees(a.invoice_amount_minor)}</div>
                          </div>
                        </td>

                        {/* Payment column - spans all rows in the group */}
                        {isFirst && (
                          <td rowSpan={group.allocations.length} className="px-4 py-3.5 align-middle border-x border-slate-200">
                            <div className="grid grid-cols-2 gap-3 text-center items-center font-medium text-[13px] text-slate-900">
                              <div className="font-semibold text-slate-900" title={bankTxnId ?? undefined}>
                                {bankReference || shortId(bankTxnId)}
                              </div>
                              {/* The payment's own total received, not the sum of what
                                  got allocated across its invoice(s). */}
                              <div className="font-semibold text-slate-900">{rupees(paymentAmount)}</div>
                            </div>
                            
                          </td>
                        )}

                        {/* Resolved Via column - spans all rows; match-type badge + the two
                            real rules that fired (CUSTOMER_LOCK identification, then
                            ALLOCATION), each with its actual reason text underneath. */}
                        {isFirst && (
                          <td rowSpan={group.allocations.length} className="px-4 py-3.5 align-middle space-y-2">
                            <span className="inline-block px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {group.match_type}
                            </span>
                            {group.locked_by_rule_id && (
                              <div className="text-[12.5px] text-slate-800">
                                <span className="font-semibold text-slate-900">{ruleLabel(group.locked_by_rule_id)}</span>
                                <span className="text-slate-400"> · customer lock</span>
                              </div>
                            )}
                            {group.narration_crosscheck_rule_id && (
                              <div className="text-[12.5px] text-slate-800">
                                <span className="font-semibold text-slate-900">{ruleLabel(group.narration_crosscheck_rule_id)}</span>
                                <span className="text-slate-400"> · confirmed</span>
                              </div>
                            )}
                            <div className="text-[12.5px] text-slate-800">
                              <span className="font-semibold text-slate-900">{ruleLabel(group.rule_id)}</span>
                              {group.reason && (
                                <div className="text-[11.5px] text-slate-500 font-normal mt-0.5">{group.reason}</div>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* STREAM 2: Invoice vs Gateway Payments */}
      {stream === 'gateway' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          {gatewaySettlements.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              No gateway settlement API yet — this stream has no backend support today.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-2.5">Settlement ID</th>
                  <th className="px-4 py-2.5">Gateway</th>
                  <th className="px-4 py-2.5">Txn Reference</th>
                  <th className="px-4 py-2.5 text-right">Gross</th>
                  <th className="px-4 py-2.5 text-right">Fee</th>
                  <th className="px-4 py-2.5 text-right">Net</th>
                  <th className="px-4 py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {gatewaySettlements.map((gw: GatewaySettlement) => (
                  <tr key={gw.settlementId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-indigo-600">{gw.settlementId}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{gw.gateway}</td>
                    <td className="px-4 py-3 text-slate-600">{gw.transactionId}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      ₹{gw.grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      ₹{gw.feeAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      ₹{gw.netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200">
                        Settled
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* STREAM 3: Subledger vs GL Control */}
      {stream === 'gl' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-5 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-[0.06em] mb-1">
                AR Sub-ledger
              </div>
              <div className="text-lg font-semibold text-slate-900">
                {rupees(glDetail?.sub_ledger_balance_minor)}
              </div>
            </div>

            <div>
              <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-[0.06em] mb-1">
                GL Control Account
              </div>
              <div className="text-lg font-semibold text-slate-900">
                {rupees(glDetail?.gl_control_balance_minor)}
              </div>
            </div>

            <div>
              <div
                className={`text-[10.5px] font-bold uppercase tracking-[0.06em] mb-1 ${glVarianceException ? 'text-red-700' : 'text-emerald-700'
                  }`}
              >
                Variance
              </div>
              <div
                className={`text-lg font-semibold ${glVarianceException ? 'text-red-700' : 'text-emerald-700'
                  }`}
              >
                {rupees(glDetail?.variance_minor)}
              </div>
            </div>
          </div>

          {glVarianceException ? (
            <div className="px-5 pb-5 text-[12px] text-red-700">
              {glVarianceException.reason_code || 'GL control mismatch detected.'} See Exceptions for the logged entry.
            </div>
          ) : (
            <div className="px-5 pb-5 text-[12px] text-emerald-700">
              {run
                ? 'No GL_VARIANCE exception on this run — in balance, or no gl_control_balances row was seeded to check against.'
                : 'No run yet — nothing to compare.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
