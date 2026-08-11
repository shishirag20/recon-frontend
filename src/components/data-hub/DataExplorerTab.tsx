import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { StatusPill } from '../ui/StatusPill';
import {
  Landmark,
  Receipt,
  Users,
  BookOpen,
  Search,
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  Filter,
  Check,
  Edit2,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { dataSourceService, recordsService } from '../../services';
import { useToast } from '../../hooks/useToast';
import { useDataHubStore } from '../../store/useDataHubStore';
import { getStreamByCategory } from '../../types/datahub';
import type { IngestionJobOut, DataSourceOut, CanonicalRecordOut, IngestionStream } from '../../types/datahub';

interface DataExplorerTabProps {
  jobs: IngestionJobOut[];
  onInsertRow: () => void;
  onDeleteRow: (id: string) => void;
}

const CATEGORY_ICONS: Record<string, React.FC<{ className?: string }>> = {
  'Bank Statements': Landmark,
  'General Ledger': BookOpen,
  'Sub-ledger': Receipt,
  'AR Sub-ledger': Receipt,
  'AP Sub-ledger': Receipt,
  'Customer Master': Users,
  'Gateway Settlements': Zap,
};

export const DataExplorerTab: React.FC<DataExplorerTabProps> = ({
  jobs: initialJobs,
  onInsertRow,
  onDeleteRow,
}) => {
  const [dataSources, setDataSources] = useState<DataSourceOut[]>([]);
  const [activeSourceId, setActiveSourceId] = useState<string>('');
  const [activeStream, setActiveStream] = useState<IngestionStream>('BANK');
  const [activeJobId, setActiveJobId] = useState<string>('all');
  const [canonicalRecords, setCanonicalRecords] = useState<CanonicalRecordOut[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);
  const [sortField, setSortField] = useState<'date' | 'amount' | 'counterparty'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<CanonicalRecordOut>>({});
  const pageSize = 8;
  const { toast } = useToast();

  const sourcesListFromStore = useDataHubStore((s) => s.sourcesList);
  const setSourcesInStore = useDataHubStore((s) => s.setSources);

  // Derive entityId from first data source in store/API (fallback 'ent-001')
  const entityId =
    sourcesListFromStore[0]?.entity_id ||
    dataSources[0]?.entity_id ||
    'ent-001';

  // ── Step 1: Sync Data Sources (GET /data-sources) ──────────────────────────
  useEffect(() => {
    const fetchSources = async () => {
      setIsLoadingSources(true);
      try {
        if (sourcesListFromStore.length > 0) {
          setDataSources(sourcesListFromStore);
          if (!activeSourceId) {
            setActiveSourceId(sourcesListFromStore[0].source_id);
            setActiveStream(getStreamByCategory(sourcesListFromStore[0].name));
          }
        } else {
          const sources = await dataSourceService.list();
          setDataSources(sources);
          setSourcesInStore(sources);
          if (sources.length > 0 && !activeSourceId) {
            setActiveSourceId(sources[0].source_id);
            setActiveStream(getStreamByCategory(sources[0].name));
          }
        }
      } catch {
        // Fall back gracefully
      } finally {
        setIsLoadingSources(false);
      }
    };
    fetchSources();
  }, [sourcesListFromStore, setSourcesInStore, activeSourceId]);

  // Jobs matching active stream for drill-down tab strip
  const jobsForStream = initialJobs.filter(
    (j) =>
      (j.stream === activeStream || (activeSourceId && j.source_id === activeSourceId)) &&
      (j.status === 'SUCCESS' || j.status === 'PARTIAL')
  );

  // ── Step 2: Fetch Records by Stream (GET /records?stream=X&entity_id=Y) ─────
  const fetchRecords = useCallback(async () => {
    if (activeStream === 'LEDGER') {
      setCanonicalRecords([]);
      return;
    }

    setIsLoadingRecords(true);
    try {
      if (activeJobId !== 'all') {
        // Job-scoped drill down GET /ingestion-jobs/{job_id}/records
        const records = await recordsService.list(activeJobId, {
          valid: showErrorsOnly ? false : undefined,
        });
        setCanonicalRecords(records);
      } else {
        // Stream-scoped entity query GET /records?stream=X&entity_id=Y
        const records = await recordsService.listByStream(activeStream, entityId, {
          valid: showErrorsOnly ? false : undefined,
        });
        setCanonicalRecords(records);
      }
    } catch {
      setCanonicalRecords([]);
    } finally {
      setIsLoadingRecords(false);
    }
  }, [activeStream, entityId, activeJobId, showErrorsOnly]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Handle Data Source selection
  const handleSelectDataSource = (source: DataSourceOut) => {
    setActiveSourceId(source.source_id);
    const stream = getStreamByCategory(source.name);
    setActiveStream(stream);
    setActiveJobId('all');
    setCurrentPage(1);
  };

  // ── Client-side search and sorting ─────────────────────────────────────────
  const filteredRecords = canonicalRecords.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const cp = (r.counterparty || r.payer_name || r.customer_name || r.company_name || '').toLowerCase();
    const ref = (r.bank_reference || r.invoice_number || r.reference || '').toLowerCase();
    const recId = (r.record_id || r.staging_id || r.statement_id || r.invoice_id || r.customer_id || '').toLowerCase();
    return cp.includes(q) || ref.includes(q) || recId.includes(q);
  });

  const sortedRecords = [...filteredRecords].sort((a, b) => {
    let comp = 0;
    const valA = a.amount_minor ?? a.total_amount_minor ?? (a.amount != null ? Math.round(a.amount * 100) : 0);
    const valB = b.amount_minor ?? b.total_amount_minor ?? (b.amount != null ? Math.round(b.amount * 100) : 0);
    const dateA = a.txn_date || a.statement_date || a.invoice_date || '';
    const dateB = b.txn_date || b.statement_date || b.invoice_date || '';
    const cpA = a.counterparty || a.payer_name || a.customer_name || a.company_name || '';
    const cpB = b.counterparty || b.payer_name || b.customer_name || b.company_name || '';

    if (sortField === 'amount') comp = valA - valB;
    else if (sortField === 'date') comp = dateA.localeCompare(dateB);
    else comp = cpA.localeCompare(cpB);
    return sortDir === 'asc' ? comp : -comp;
  });

  const totalPages = Math.ceil(sortedRecords.length / pageSize) || 1;
  const paginatedRecords = sortedRecords.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (field: 'date' | 'amount' | 'counterparty') => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // ── Step 3: Edit Single Record via source_job_id ───────────────────────────
  const handleStartEdit = (record: CanonicalRecordOut) => {
    const recId = record.record_id || record.staging_id || record.statement_id || record.invoice_id || record.customer_id || '';
    setEditingRecordId(recId);
    setEditFormData({
      ...record,
      txn_date: record.txn_date || record.statement_date || record.invoice_date || '',
      reference: record.bank_reference || record.invoice_number || record.reference || '',
      counterparty: record.counterparty || record.payer_name || record.customer_name || record.company_name || '',
      amount_minor: record.amount_minor ?? record.total_amount_minor ?? (record.amount != null ? Math.round(record.amount * 100) : 0),
    });
  };

  const handleSaveEdit = async (recId: string, record: CanonicalRecordOut) => {
    const targetJobId = record.source_job_id || record.job_id || (activeJobId !== 'all' ? activeJobId : jobsForStream[0]?.job_id);
    if (!targetJobId) {
      toast('Cannot edit record: missing source job ID', 'bad');
      return;
    }

    try {
      await recordsService.patch(targetJobId, recId, {
        reference: editFormData.reference,
        counterparty: editFormData.counterparty,
        txn_date: editFormData.txn_date,
        amount_minor: editFormData.amount_minor,
        valid: true,
      });

      setEditingRecordId(null);
      toast('Canonical record corrected & saved!', 'ok');
      fetchRecords();
    } catch {
      toast('Failed to save record correction', 'bad');
    }
  };

  return (
    <div className="flex flex-col gap-5 fade-in">
      {/* ── Scrollable Data Source Tabs Strip (Matching Schemas & Validation) ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {dataSources.map((ds) => {
          const isActive = ds.source_id === activeSourceId;
          const Icon = CATEGORY_ICONS[ds.name] || Landmark;
          return (
            <Button
              key={ds.source_id}
              variant={isActive ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => handleSelectDataSource(ds)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-2 border ${isActive
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{ds.name}</span>
              <Badge
                variant={isActive ? 'accent' : 'muted'}
                label={ds.kind}
                className={`text-[10px] h-auto px-1.5 py-0.5 rounded font-semibold border-none ${isActive ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
              />
            </Button>
          );
        })}
        {isLoadingSources && dataSources.length === 0 && (
          <div className="text-xs text-slate-400 py-2 px-3">Loading Data Sources...</div>
        )}
      </div>

      {/* ── Notice for LEDGER Stream ── */}
      {activeStream === 'LEDGER' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-none" />
          <span>
            General Ledger control tables are stored directly in GL journal modules. Canonical sub-ledger stream viewing is active for Bank Statements, Invoices, and Customer Master.
          </span>
        </div>
      )}

      {/* ── Search Filter & Action Bar ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={`Search ${activeStream.toLowerCase()} records by counterparty, reference, or record ID...`}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 h-9 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
            />
          </div>

          {/* Error Filter Toggle using Button UI Component */}
          <Button
            variant={showErrorsOnly ? 'bad' : 'ghost'}
            size="sm"
            icon={Filter}
            onClick={() => {
              setShowErrorsOnly(!showErrorsOnly);
              setCurrentPage(1);
            }}
            className={!showErrorsOnly ? 'border border-slate-200 bg-white text-slate-600' : ''}
          >
            {showErrorsOnly ? 'Errors Only Active' : 'Show Errors Only'}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={Plus} onClick={onInsertRow}>
            Insert Row
          </Button>
        </div>
      </div>

      {/* ── Canonical Database Records Table View ── */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Record ID</th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-slate-900 transition-colors"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1">
                    <span>Date</span>
                    {sortField === 'date' &&
                      (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-slate-900 transition-colors"
                  onClick={() => handleSort('counterparty')}
                >
                  <div className="flex items-center gap-1">
                    <span>Counterparty / Entity</span>
                    {sortField === 'counterparty' &&
                      (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th className="px-4 py-3">Reference / UTR</th>
                <th
                  className="px-4 py-3 text-right cursor-pointer hover:text-slate-900 transition-colors"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Amount</span>
                    {sortField === 'amount' &&
                      (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoadingRecords ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Loading {activeStream} records...
                  </td>
                </tr>
              ) : paginatedRecords.length > 0 ? (
                paginatedRecords.map((r, idx) => {
                  const recId = r.record_id || r.staging_id || r.statement_id || r.invoice_id || r.customer_id || `rec-${idx}`;
                  const isEditing = editingRecordId === recId;
                  const isError = r.valid === false;
                  const rawAmountMinor = r.amount_minor ?? r.total_amount_minor ?? (r.amount != null ? Math.round(r.amount * 100) : 0);
                  const displayAmount = rawAmountMinor / 100;
                  const txnDate = r.txn_date || r.statement_date || r.invoice_date || '—';
                  const counterparty = r.counterparty || r.payer_name || r.customer_name || r.company_name || '—';
                  const reference = r.bank_reference || r.invoice_number || r.reference || '—';

                  return (
                    <tr
                      key={recId}
                      className={`transition-colors ${isError ? 'bg-rose-50/40 hover:bg-rose-50/70 border-l-4 border-l-rose-500' : 'hover:bg-slate-50/80'
                        }`}
                    >
                      <td className="px-4 py-3 font-semibold text-indigo-600 tnum max-w-30 truncate" title={recId}>
                        {recId.slice(0, 10)}...
                      </td>
                      <td className="px-4 py-3 text-slate-500 tnum">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.txn_date || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, txn_date: e.target.value })}
                            className="w-24 bg-white border border-indigo-500 rounded px-1.5 py-0.5 text-xs"
                          />
                        ) : (
                          txnDate
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.counterparty || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, counterparty: e.target.value })}
                            className="w-full bg-white border border-indigo-500 rounded px-1.5 py-0.5 text-xs font-semibold"
                          />
                        ) : (
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900">{counterparty}</span>
                            {r.issues && r.issues.length > 0 && (
                              <span className="text-[10px] text-rose-600 font-medium flex items-center gap-1 mt-0.5">
                                <AlertCircle className="w-3 h-3 flex-none" />
                                {r.issues[0]}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-medium">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editFormData.reference || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, reference: e.target.value })}
                            className="w-full bg-white border border-indigo-500 rounded px-1.5 py-0.5 text-xs"
                          />
                        ) : (
                          reference
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 tnum">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-slate-400 font-semibold text-xs">{r.currency || 'INR'}</span>
                            <input
                              type="number"
                              step="0.01"
                              value={editFormData.amount_minor != null ? editFormData.amount_minor / 100 : ''}
                              onChange={(e) => {
                                const parsed = parseFloat(e.target.value);
                                setEditFormData({
                                  ...editFormData,
                                  amount_minor: isNaN(parsed) ? 0 : Math.round(parsed * 100),
                                });
                              }}
                              className="w-28 bg-white border border-indigo-500 rounded px-1.5 py-0.5 text-xs text-right font-bold text-slate-900 focus:outline-none"
                            />
                          </div>
                        ) : (
                          `${r.currency || 'INR'} ${displayAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusPill status={r.valid !== false ? 'mapped' : 'error'} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <Button
                            variant="success"
                            size="xs"
                            icon={Check}
                            onClick={() => handleSaveEdit(recId, r)}
                            title="Save inline correction"
                          >
                            Save
                          </Button>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="xs"
                              icon={Edit2}
                              onClick={() => handleStartEdit(r)}
                              title="Inline edit record"
                              className="px-1.5 border-none shadow-none text-slate-400 hover:text-indigo-600"
                            />
                            <Button
                              variant="ghost"
                              size="xs"
                              icon={Trash2}
                              onClick={() => onDeleteRow(recId)}
                              title="Delete record"
                              className="px-1.5 border-none shadow-none text-slate-400 hover:text-red-600"
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No canonical database records found for {activeStream} stream
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Footer ── */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <span>
            Showing <strong className="text-slate-900">{paginatedRecords.length}</strong> of{' '}
            <strong className="text-slate-900">{sortedRecords.length}</strong> records
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="xs"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="border border-slate-200 bg-white"
            >
              Previous
            </Button>
            <span className="px-2 font-semibold text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="ghost"
              size="xs"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="border border-slate-200 bg-white"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
