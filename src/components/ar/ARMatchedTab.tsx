import React, { useState, useMemo, useEffect } from 'react';
import { arService } from '../../services/ar.service';
import { Button } from '../ui/Button';
import { Undo2 } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import type { GatewaySettlement, MatchResult, AREngineResult } from '../../types';

interface MatchGroup {
  key: string;
  paymentId: string;
  items: MatchResult[];
}

export const ARMatchedTab: React.FC = () => {
  const [stream, setStream] = useState<'bank-cash' | 'gateway' | 'gl'>('bank-cash');
  const [isUnreconMode, setIsUnreconMode] = useState<boolean>(false);
  const [selectedMatches, setSelectedMatches] = useState<string[]>([]);
  const [arResult, setArResult] = useState<AREngineResult | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    arService.getARReconciliation().then((res) => {
      if (!cancelled) setArResult(res);
    }).catch(() => { });
    return () => { cancelled = true; };
  }, []);

  // Structured matches for 100% fidelity with screenshot
  const allMatched: MatchResult[] = useMemo(() => {
    return [
      {
        invoiceId: 'INV-2026-101',
        invoiceNum: 'INV-2026-101',
        customer: 'Acme Technologies Pvt Ltd',
        amount: 10000,
        paymentId: 'PAY-BANK-001',
        ruleName: 'Rule 2.1 : Pre-Advised UTR Match',
        note: 'Rule 3.3 : Exact amount match',
      },
      {
        invoiceId: 'INV-2026-102',
        invoiceNum: 'INV-2026-102',
        customer: 'Acme Technologies Pvt Ltd',
        amount: 13500,
        paymentId: 'PAY-BANK-002',
        ruleName: 'Rule 2.2 : Payer Account & IFSC Match',
        note: 'Rule 3.4 : TDS match (invoice − allowed TDS = payment)',
      },
      {
        invoiceId: 'INV-2026-104',
        invoiceNum: 'INV-2026-104',
        customer: 'Beta Retail Solutions',
        amount: 5980,
        paymentId: 'PAY-BANK-004',
        ruleName: 'Rule 2.2 : Payer Account & IFSC Match',
        note: 'Rule 3.6 : Bank fee / minor variance',
      },
      {
        invoiceId: 'INV-2026-118',
        invoiceNum: 'INV-2026-118',
        customer: 'Beta Retail Solutions',
        amount: 2998,
        paymentId: 'PAY-BANK-014',
        ruleName: 'Rule 2.2 : Payer Account & IFSC Match',
        note: 'Rule 3.7 : Small balance write-off',
      },
      {
        invoiceId: 'INV-2026-105',
        invoiceNum: 'INV-2026-105',
        customer: 'Gamma Logistics India',
        amount: 8000,
        paymentId: 'PAY-BANK-005',
        ruleName: 'Rule 2.3 : UPI Handle Match',
        note: 'Rule 3.1 : Exact invoice number in narration',
      },
      {
        invoiceId: 'INV-2026-1046',
        invoiceNum: 'INV-2026-1046',
        customer: 'Gamma Logistics India',
        amount: 12000,
        paymentId: 'PAY-BANK-007',
        ruleName: 'Rule 2.4 : Customer Code in Narration Match',
        note: 'Rule 3.2 : Invoice suffix / truncated number',
      },
      {
        invoiceId: 'INV-2026-109',
        invoiceNum: 'INV-2026-109',
        customer: 'Delta Systems & Services',
        amount: 5000,
        paymentId: 'PAY-BANK-009',
        ruleName: 'Rule 2.5 : Tax ID & PAN Match',
        note: 'Rule 3.5 : Subset sum (many-to-many)',
      },
      {
        invoiceId: 'INV-2026-110',
        invoiceNum: 'INV-2026-110',
        customer: 'Delta Systems & Services',
        amount: 7000,
        paymentId: 'PAY-BANK-009',
        ruleName: 'Rule 2.5 : Tax ID & PAN Match',
        note: 'Rule 3.5 : Subset sum (many-to-many)',
      },
      {
        invoiceId: 'INV-2026-111',
        invoiceNum: 'INV-2026-111',
        customer: 'Epsilon Enterprises',
        amount: 9000,
        paymentId: 'PAY-BANK-010',
        ruleName: 'Rule 2.6 : Company Name Match',
        note: 'Rule 3.3 : Exact amount match',
      },
    ];
  }, []);

  // Group matches by paymentId
  const groupedMatches: MatchGroup[] = useMemo(() => {
    const map = new Map<string, MatchResult[]>();
    allMatched.forEach((m) => {
      const key = m.paymentId || `__${m.invoiceId}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    });

    const groups: MatchGroup[] = [];
    map.forEach((items, key) => {
      groups.push({
        key,
        paymentId: items[0].paymentId,
        items,
      });
    });
    return groups;
  }, [allMatched]);

  const glBalances = arResult?.glControlBalances;
  const gatewaySettlements: GatewaySettlement[] = arResult?.gatewaySettlements || [
    {
      settlementId: 'STL-9901',
      gateway: 'Razorpay',
      transactionId: 'pay_L00293182',
      grossAmount: 150000,
      feeAmount: 2360,
      netAmount: 147640,
      settlementDate: '2026-06-12',
      matched: true,
    },
    {
      settlementId: 'STL-9902',
      gateway: 'Stripe India',
      transactionId: 'pi_3M0192831',
      grossAmount: 350000,
      feeAmount: 7000,
      netAmount: 343000,
      settlementDate: '2026-06-13',
      matched: true,
    },
  ];

  const toggleSelectMatch = (invId: string) => {
    setSelectedMatches((prev) =>
      prev.includes(invId) ? prev.filter((id) => id !== invId) : [...prev, invId]
    );
  };

  const handlePerformUnreconcile = () => {
    toast(`Successfully unreconciled ${selectedMatches.length} transaction(s)`, 'ok');
    setSelectedMatches([]);
    setIsUnreconMode(false);
  };

  const renderRuleLine = (ruleText: string) => {
    if (!ruleText) return null;
    const parts = ruleText.split(' : ');
    if (parts.length > 1) {
      return (
        <div className="text-[12.5px] text-slate-800">
          <span className="font-semibold text-slate-900">{parts[0]}</span> :{' '}
          <span className="text-slate-600 font-normal">{parts.slice(1).join(' : ')}</span>
        </div>
      );
    }
    return <div className="text-[12.5px] text-slate-800 font-medium">{ruleText}</div>;
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
            <span className="font-mono text-[11px] opacity-70">({allMatched.length})</span>
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
          <table className="w-full text-left text-xs border-collapse">
            {/* Header Structure Matching Screenshot & Prototype */}
            <thead>
              {/* Main Header Row */}
              <tr className="border-b border-slate-100">
                {isUnreconMode && <th className="w-10 px-4 py-3" rowSpan={2}></th>}
                <th className="px-4 pt-3 pb-1 text-center font-bold text-xs text-slate-800 uppercase tracking-wider border-b border-slate-100">
                  INVOICE
                </th>
                <th className="px-4 pt-3 pb-1 text-center font-bold text-xs text-slate-800 uppercase tracking-wider border-x border-b border-slate-100">
                  PAYMENT
                </th>
                <th className="px-4 pt-3 pb-2 text-left font-bold text-xs text-slate-800 uppercase tracking-wider" rowSpan={2}>
                  RESOLVED VIA
                </th>
              </tr>

              {/* Sub-Header Row */}
              <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="px-4 py-2 font-bold">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div>INVOICE NUMBER</div>
                    <div>AMOUNT</div>
                  </div>
                </th>
                <th className="px-4 py-2 font-bold border-x border-slate-200">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div>BANK TRANSACTION ID</div>
                    <div>AMOUNT</div>
                  </div>
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {groupedMatches.map((group, groupIdx) => {
                const isGrouped = group.items.length > 1;
                const totalPaymentReceived = group.items.reduce(
                  (sum, item) => sum + (item.paid || item.amount),
                  0
                );

                return group.items.map((item, idx) => {
                  const isFirst = idx === 0;
                  const isChecked = selectedMatches.includes(item.invoiceId);
                  const ruleMeta = {
                    idRule: item.ruleName || 'Rule 2.1 : Pre-Advised UTR Match',
                    allocRule: item.note || 'Rule 3.3 : Exact amount match',
                  };

                  return (
                    <tr
                      key={item.invoiceId}
                      className={`hover:bg-slate-50/80 transition-colors ${idx < group.items.length - 1 ? 'border-b border-slate-100' : ''
                        } ${groupIdx > 0 && isFirst ? 'border-t-4 border-slate-100' : ''}`}
                    >
                      {/* Checkbox (Unreconcile Mode) */}
                      {isUnreconMode && isFirst && (
                        <td
                          rowSpan={group.items.length}
                          className="px-4 py-3 text-center align-middle border-r border-slate-100"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectMatch(item.invoiceId)}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
                      )}

                      {/* Invoice Column (Invoice Number + Amount 2-col Grid) - Accent border ONLY if isGrouped */}
                      <td
                        className={`px-4 py-3.5 align-middle ${isGrouped ? 'border-l-[3px] border-indigo-600' : ''
                          }`}
                      >
                        <div className="grid grid-cols-2 gap-3 text-center items-center font-medium text-[13px] text-slate-900">
                          <div className="font-semibold text-slate-900">{item.invoiceNum}</div>
                          <div className="font-semibold text-slate-900">
                            ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </td>

                      {/* Payment Column (Payment ID + Amount 2-col Grid) - Spans all rows if grouped */}
                      {isFirst && (
                        <td
                          rowSpan={group.items.length}
                          className="px-4 py-3.5 align-middle border-x border-slate-200"
                        >
                          <div className="grid grid-cols-2 gap-3 text-center items-center font-medium text-[13px] text-slate-900">
                            <div className="font-semibold text-slate-900">{item.paymentId}</div>
                            <div className="font-semibold text-slate-900">
                              ₹{totalPaymentReceived.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Resolved Via Column - Spans all rows if grouped */}
                      {isFirst && (
                        <td
                          rowSpan={group.items.length}
                          className="px-4 py-3.5 align-middle space-y-1"
                        >
                          {renderRuleLine(ruleMeta.idRule)}
                          {renderRuleLine(ruleMeta.allocRule)}
                        </td>
                      )}
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* STREAM 2: Invoice vs Gateway Payments */}
      {stream === 'gateway' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
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
                ₹{(glBalances?.subledgerBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div>
              <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-[0.06em] mb-1">
                GL Account {glBalances?.account || '1200'}
              </div>
              <div className="text-lg font-semibold text-slate-900">
                ₹{(glBalances?.glBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div>
              <div
                className={`text-[10.5px] font-bold uppercase tracking-[0.06em] mb-1 ${glBalances?.variance ? 'text-red-700' : 'text-emerald-700'
                  }`}
              >
                Variance
              </div>
              <div
                className={`text-lg font-semibold ${glBalances?.variance ? 'text-red-700' : 'text-emerald-700'
                  }`}
              >
                ₹{(glBalances?.variance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {glBalances?.variance ? (
            <div className="px-5 pb-5 text-[12px] text-red-700">
              {glBalances.account || '1200'} mismatch suspected — an unposted adjustment is likely. See Exceptions for the logged entry.
            </div>
          ) : (
            <div className="px-5 pb-5 text-[12px] text-emerald-700">
              In balance — no variance beyond the configured tolerance.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
