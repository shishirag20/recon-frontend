import React, { useState } from 'react';
import type { StagingRow, Job } from '../../types';
import { Button } from '../ui/Button';
import { FileText, Search, Plus, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { StatusPill } from '../ui/StatusPill';

interface DataExplorerTabProps {
  jobs: Job[];
  rows: StagingRow[];
  onInsertRow: () => void;
  onDeleteRow: (id: string) => void;
}

export const DataExplorerTab: React.FC<DataExplorerTabProps> = ({
  jobs,
  rows,
  onInsertRow,
  onDeleteRow,
}) => {
  const [activeJobId, setActiveJobId] = useState<string>(jobs[0]?.id || 'JOB-901');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'date' | 'amount' | 'counterparty'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const jobRows = rows.filter((r) => r.jobId === activeJobId);

  const filteredRows = jobRows.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.counterparty.toLowerCase().includes(q) ||
      r.reference.toLowerCase().includes(q) ||
      r.txnId.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q)
    );
  });

  const sortedRows = [...filteredRows].sort((a, b) => {
    let comp = 0;
    if (sortField === 'amount') comp = a.amount - b.amount;
    else if (sortField === 'date') comp = a.date.localeCompare(b.date);
    else comp = a.counterparty.localeCompare(b.counterparty);
    return sortDir === 'asc' ? comp : -comp;
  });

  const totalPages = Math.ceil(sortedRows.length / pageSize) || 1;
  const paginatedRows = sortedRows.slice(
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

  return (
    <div className="flex flex-col gap-5 fade-in">
      {/* File Tab Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {jobs.map((j) => {
          const isActive = j.id === activeJobId;
          return (
            <button
              key={j.id}
              onClick={() => {
                setActiveJobId(j.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-2 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{j.source}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-semibold tnum ${
                  isActive ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {j.rows}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter and Action Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by counterparty, reference, or txn ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 h-9 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
          />
        </div>

        <Button variant="primary" size="sm" icon={Plus} onClick={onInsertRow}>
          Insert Row
        </Button>
      </div>

      {/* Data Explorer Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-4 py-3">Txn ID</th>
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
                    <span>Counterparty / Description</span>
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
              {paginatedRows.length > 0 ? (
                paginatedRows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-semibold text-indigo-600 tnum">
                      {r.txnId}
                    </td>
                    <td className="px-4 py-3 text-slate-500 tnum">{r.date}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {r.counterparty}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-xs">
                        {r.description}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium">
                      {r.reference}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 tnum">
                      ₹{r.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onDeleteRow(r.id)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
                        title="Delete row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No rows match current search filter
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
              {sortedRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </strong>{' '}
            -{' '}
            <strong className="font-semibold text-slate-900 tnum">
              {Math.min(currentPage * pageSize, sortedRows.length)}
            </strong>{' '}
            of <strong className="font-semibold text-slate-900 tnum">{sortedRows.length}</strong> rows
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
