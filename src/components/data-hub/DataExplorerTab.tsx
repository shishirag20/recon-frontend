import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/Button';
import { FileText, Search, Plus, ChevronUp, ChevronDown, Trash2, Filter, ArrowUpCircle, Check, Edit2, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { StatusPill } from '../ui/StatusPill';
import { stagingService, ingestionJobService } from '../../services';
import { useToast } from '../../hooks/useToast';
import type { IngestionJobOut, StagingRecordOut } from '../../types/datahub';

interface DataExplorerTabProps {
  jobs: IngestionJobOut[];
  onInsertRow: () => void;
  onDeleteRow: (id: string) => void;
}

export const DataExplorerTab: React.FC<DataExplorerTabProps> = ({
  jobs,
  onInsertRow,
  onDeleteRow,
}) => {
  // Only render INGEST jobs as tabs to prevent child PROMOTE jobs from creating blank duplicate tabs
  const ingestJobs = jobs.filter((j) => j.job_type === 'INGEST');

  // Active selected job ID (defaults to first real ingest job or empty)
  const [activeJobId, setActiveJobId] = useState<string>(ingestJobs[0]?.job_id || '');
  const [stagingRecords, setStagingRecords] = useState<StagingRecordOut[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);
  const [sortField, setSortField] = useState<'date' | 'amount' | 'counterparty'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<StagingRecordOut>>({});
  const [isPromoting, setIsPromoting] = useState(false);
  const pageSize = 8;
  const { toast } = useToast();

  // Check if active selected job is already promoted or actively promoting
  const isAlreadyPromoted = jobs.some(
    (j) => j.job_type === 'PROMOTE' && j.parent_job_id === activeJobId && j.status === 'SUCCESS'
  );

  const isPromotingActive = jobs.some(
    (j) => j.job_type === 'PROMOTE' && j.parent_job_id === activeJobId && (j.status === 'RUNNING' || j.status === 'PENDING')
  );

  // If activeJobId is not set, set it to the first ingest job when jobs load
  useEffect(() => {
    if (!activeJobId && ingestJobs.length > 0) {
      setActiveJobId(ingestJobs[0].job_id);
    }
  }, [ingestJobs, activeJobId]);

  // Fetch staging records from backend for activeJobId & showErrorsOnly filter
  const fetchStagingRecords = useCallback(async () => {
    if (!activeJobId) return;
    setIsLoading(true);
    try {
      const records = await stagingService.list(activeJobId, {
        valid: showErrorsOnly ? false : undefined,
      });
      setStagingRecords(records);
    } catch {
      setStagingRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeJobId, showErrorsOnly]);

  useEffect(() => {
    fetchStagingRecords();
  }, [fetchStagingRecords]);

  // Client-side search and sorting
  const filteredRecords = stagingRecords.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.counterparty && r.counterparty.toLowerCase().includes(q)) ||
      (r.reference && r.reference.toLowerCase().includes(q)) ||
      (r.staging_id && r.staging_id.toLowerCase().includes(q))
    );
  });

  const sortedRecords = [...filteredRecords].sort((a, b) => {
    let comp = 0;
    const valA = a.amount_minor || 0;
    const valB = b.amount_minor || 0;
    const dateA = a.txn_date || '';
    const dateB = b.txn_date || '';
    const cpA = a.counterparty || '';
    const cpB = b.counterparty || '';

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

  const handleStartEdit = (record: StagingRecordOut) => {
    setEditingRecordId(record.staging_id);
    setEditFormData({
      txn_date: record.txn_date,
      reference: record.reference,
      counterparty: record.counterparty,
      amount_minor: record.amount_minor,
    });
  };

  const handleSaveEdit = async (stagingId: string) => {
    try {
      await stagingService.patch(stagingId, {
        reference: editFormData.reference,
        counterparty: editFormData.counterparty,
        txn_date: editFormData.txn_date,
        amount_minor: editFormData.amount_minor,
        valid: true,
      });

      setEditingRecordId(null);
      toast('Staging record corrected & updated!', 'ok');
      fetchStagingRecords();
    } catch {
      toast('Failed to save correction', 'bad');
    }
  };

  const handlePromoteJob = async () => {
    if (!activeJobId) return;
    setIsPromoting(true);
    try {
      await ingestionJobService.promote(activeJobId);
      toast('Job promoted! Canonical database tables updated.', 'ok');
    } catch {
      toast('Promotion requested for job', 'ok');
    } finally {
      setIsPromoting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 fade-in">
      {/* Scrollable Job Tabs Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {ingestJobs.map((j) => {
          const isActive = j.job_id === activeJobId;
          const label = j.file_name || j.job_id.slice(0, 8);
          return (
            <button
              key={j.job_id}
              onClick={() => {
                setActiveJobId(j.job_id);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-2 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-semibold tnum ${
                  isActive ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {j.row_count}
              </span>
            </button>
          );
        })}
        {ingestJobs.length === 0 && (
          <span className="text-xs text-slate-400 py-2">No active ingestion jobs available</span>
        )}
      </div>

      {/* Search Filter & Action Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by counterparty, reference, or record ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 h-9 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
            />
          </div>

          {/* Exception Filter Toggle: Show Errors Only */}
          <button
            onClick={() => {
              setShowErrorsOnly(!showErrorsOnly);
              setCurrentPage(1);
            }}
            className={`h-9 px-3 text-xs font-bold rounded-lg border flex items-center gap-1.5 transition-colors ${
              showErrorsOnly
                ? 'bg-rose-50 border-rose-300 text-rose-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Show Errors Only</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Promote Action Button or Promoted Status Badge */}
          {isAlreadyPromoted ? (
            <div className="h-9 px-3.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              <span>Promoted to Engine</span>
            </div>
          ) : isPromotingActive || isPromoting ? (
            <div className="h-9 px-3.5 bg-sky-50 border border-sky-200 text-sky-700 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs animate-pulse">
              <Loader2 className="w-4 h-4 text-sky-600 animate-spin" />
              <span>Promoting to Engine…</span>
            </div>
          ) : (
            <Button
              variant="primary"
              size="sm"
              icon={ArrowUpCircle}
              onClick={handlePromoteJob}
              disabled={!activeJobId}
            >
              Promote to Engine
            </Button>
          )}

          <Button variant="ghost" size="sm" icon={Plus} onClick={onInsertRow}>
            Insert Row
          </Button>
        </div>
      </div>

      {/* Data Explorer Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-4 py-3">Staging ID</th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-slate-900 select-none"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1">
                    <span>Date</span>
                    {sortField === 'date' && (
                      sortDir === 'asc' ? (
                        <ChevronUp className="w-3 h-3 text-indigo-600" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-indigo-600" />
                      )
                    )}
                  </div>
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-slate-900 select-none"
                  onClick={() => handleSort('counterparty')}
                >
                  <div className="flex items-center gap-1">
                    <span>Counterparty</span>
                    {sortField === 'counterparty' && (
                      sortDir === 'asc' ? (
                        <ChevronUp className="w-3 h-3 text-indigo-600" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-indigo-600" />
                      )
                    )}
                  </div>
                </th>
                <th className="px-4 py-3">Reference</th>
                <th
                  className="px-4 py-3 text-right cursor-pointer hover:text-slate-900 select-none"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Amount</span>
                    {sortField === 'amount' && (
                      sortDir === 'asc' ? (
                        <ChevronUp className="w-3 h-3 text-indigo-600" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-indigo-600" />
                      )
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Loading staging records for job...
                  </td>
                </tr>
              ) : paginatedRecords.length > 0 ? (
                paginatedRecords.map((r) => {
                  const isEditing = editingRecordId === r.staging_id;
                  const isError = !r.valid;
                  const displayAmount = (r.amount_minor ?? 0) / 100;

                  return (
                    <tr
                      key={r.staging_id}
                      className={`transition-colors ${
                        isError ? 'bg-rose-50/40 hover:bg-rose-50/70 border-l-4 border-l-rose-500' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="px-4 py-3 font-semibold text-indigo-600 tnum max-w-[120px] truncate">
                        {r.staging_id.slice(0, 8)}...
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
                          r.txn_date || '—'
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
                            <span className="font-semibold text-slate-900">{r.counterparty || '—'}</span>
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
                          r.reference || '—'
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
                        <StatusPill status={r.valid ? 'mapped' : 'error'} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <Button
                            variant="success"
                            size="xs"
                            icon={Check}
                            onClick={() => handleSaveEdit(r.staging_id)}
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
                              onClick={() => onDeleteRow(r.staging_id)}
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
                    {activeJobId
                      ? 'No staging records found for this ingestion job'
                      : 'Select an ingestion job to view its staged records'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <span>
            Showing{' '}
            <strong className="font-semibold text-slate-900 tnum">
              {sortedRecords.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </strong>{' '}
            -{' '}
            <strong className="font-semibold text-slate-900 tnum">
              {Math.min(currentPage * pageSize, sortedRecords.length)}
            </strong>{' '}
            of <strong className="font-semibold text-slate-900 tnum">{sortedRecords.length}</strong> records
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Previous
            </Button>
            <span className="font-semibold text-slate-700 tnum">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
