import React, { useState, useMemo } from 'react';
import { Modal } from '../layout/Modal';
import { Button } from '../ui/Button';
import { Search, Link, AlertCircle, X } from 'lucide-react';
import { MOCK_INVOICES, MOCK_BANK_STATEMENTS } from '../../mocks/ar';
import { useToast } from '../../hooks/useToast';

interface ARManualMatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmMatch: (invIds: string[], payIds: string[], note: string) => void;
}

export const ARManualMatcherModal: React.FC<ARManualMatcherModalProps> = ({
  isOpen,
  onClose,
  onConfirmMatch,
}) => {
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [invSearch, setInvSearch] = useState('');
  const [paySearch, setPaySearch] = useState('');
  const [note, setNote] = useState('');
  const { toast } = useToast();

  const openInvoices = useMemo(() => {
    return MOCK_INVOICES.filter((inv) => {
      if (!invSearch) return true;
      const q = invSearch.toLowerCase();
      const num = inv.invoiceNumber || '';
      const cust = inv.customerId || '';
      return num.toLowerCase().includes(q) || cust.toLowerCase().includes(q);
    });
  }, [invSearch]);

  const openPayments = useMemo(() => {
    return MOCK_BANK_STATEMENTS.filter((pay) => {
      if (!paySearch) return true;
      const q = paySearch.toLowerCase();
      const id = pay.bankTxnId || '';
      const name = pay.payerName || '';
      const narr = pay.narration || '';
      return id.toLowerCase().includes(q) || name.toLowerCase().includes(q) || narr.toLowerCase().includes(q);
    });
  }, [paySearch]);

  const totalInvAmount = useMemo(() => {
    return MOCK_INVOICES.filter((i) => i.invoiceId && selectedInvoices.includes(i.invoiceId)).reduce(
      (sum, i) => sum + (i.effectiveBalance || 0),
      0
    );
  }, [selectedInvoices]);

  const totalPayAmount = useMemo(() => {
    return MOCK_BANK_STATEMENTS.filter((p) => p.bankTxnId && selectedPayments.includes(p.bankTxnId)).reduce(
      (sum, p) => sum + (p.amount || 0),
      0
    );
  }, [selectedPayments]);

  const variance = totalInvAmount - totalPayAmount;

  const toggleInvoice = (id: string) => {
    setSelectedInvoices((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const togglePayment = (id: string) => {
    setSelectedPayments((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    if (!selectedInvoices.length || !selectedPayments.length) {
      toast('Select at least one invoice and one payment to match', 'default');
      return;
    }
    onConfirmMatch(selectedInvoices, selectedPayments, note);
    toast(`Manually matched ${selectedInvoices.length} invoice(s) with ${selectedPayments.length} payment(s)`, 'ok');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} width="xl">
      <div className="p-6 space-y-4 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Link className="w-4 h-4 text-indigo-600" />
              Manual Multi-Table Matcher
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select open invoices on the left and bank payments on the right to construct custom manual matches.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Two Tables Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Left Table: Invoices */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-slate-900">
                Open Invoices ({selectedInvoices.length} selected)
              </span>
              <div className="relative w-44">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                <input
                  type="text"
                  value={invSearch}
                  onChange={(e) => setInvSearch(e.target.value)}
                  placeholder="Filter invoices..."
                  className="w-full pl-8 pr-2 h-7 bg-white border border-slate-200 rounded-md text-[11px] font-medium"
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
              {openInvoices.map((inv) => {
                const invId = inv.invoiceId || '';
                const checked = selectedInvoices.includes(invId);
                return (
                  <label
                    key={invId}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 ${
                      checked ? 'bg-indigo-50/50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleInvoice(invId)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 truncate">
                        {inv.invoiceNumber}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        Due {inv.dueDate}
                      </div>
                    </div>
                    <div className="font-mono font-bold text-slate-900">
                      ₹{(inv.effectiveBalance || 0).toLocaleString('en-IN')}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Right Table: Payments */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-slate-900">
                Bank Deposits ({selectedPayments.length} selected)
              </span>
              <div className="relative w-44">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                <input
                  type="text"
                  value={paySearch}
                  onChange={(e) => setPaySearch(e.target.value)}
                  placeholder="Filter deposits..."
                  className="w-full pl-8 pr-2 h-7 bg-white border border-slate-200 rounded-md text-[11px] font-medium"
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
              {openPayments.map((pay) => {
                const payId = pay.bankTxnId || '';
                const checked = selectedPayments.includes(payId);
                return (
                  <label
                    key={payId}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 ${
                      checked ? 'bg-indigo-50/50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePayment(payId)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 truncate">
                        {pay.payerName}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate font-mono">
                        {pay.bankReferenceNumber || payId}
                      </div>
                    </div>
                    <div className="font-mono font-bold text-emerald-700">
                      ₹{(pay.amount || 0).toLocaleString('en-IN')}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Live Math Footer */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-[10.5px] font-bold text-slate-400 uppercase">
              Invoices Total
            </div>
            <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">
              ₹{totalInvAmount.toLocaleString('en-IN')}
            </div>
          </div>
          <div>
            <div className="text-[10.5px] font-bold text-slate-400 uppercase">
              Payments Total
            </div>
            <div className="text-sm font-bold font-mono text-emerald-700 mt-0.5">
              ₹{totalPayAmount.toLocaleString('en-IN')}
            </div>
          </div>
          <div>
            <div className="text-[10.5px] font-bold text-slate-400 uppercase">
              Net Variance
            </div>
            <div
              className={`text-sm font-bold font-mono mt-0.5 ${
                variance === 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              ₹{variance.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {variance !== 0 && selectedInvoices.length > 0 && selectedPayments.length > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-none" />
            <span>
              ₹{Math.abs(variance).toLocaleString('en-IN')} variance detected. Confirming will create a {variance > 0 ? 'Short-Pay' : 'Overpayment'} entry.
            </span>
          </div>
        )}

        {/* Audit Note */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Manual Match Audit Note (Optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Explain why these items were manually matched..."
            className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-medium text-slate-900 h-16 resize-none focus:outline-none focus:border-indigo-600"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={Link}
            onClick={handleConfirm}
            disabled={!selectedInvoices.length || !selectedPayments.length}
          >
            Confirm & Create Match
          </Button>
        </div>
      </div>
    </Modal>
  );
};
