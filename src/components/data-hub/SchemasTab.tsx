import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { FileSpreadsheet } from 'lucide-react';
import type { FieldMapping } from '../../types';
import { dataSourceService, fieldMappingService } from '../../services';
import { useDataHubStore } from '../../store/useDataHubStore';
import { CATEGORY_ICONS } from '../../constants/datahub';
import type { DataSourceOut, FieldMappingOut } from '../../types/datahub';

interface SchemasTabProps {
  mappings: FieldMapping[];
  onDeleteMapping: (id: string) => void;
  onAddMapping: () => void;
}

const getFriendlyFieldName = (key: string): string => {
  const map: Record<string, string> = {
    transaction_id: 'Transaction ID',
    transaction_date: 'Transaction Date',
    amount: 'Payment Amount',
    amount_minor: 'Payment Amount (Minor Units)',
    amount_home_minor: 'Home Amount (Minor Units)',
    currency: 'ISO Currency Code',
    payer_name: 'Payer / Customer Name',
    bank_reference: 'Bank UTR / Reference',
    reference: 'Reference Number',
    counterparty: 'Counterparty / Entity Name',
    narration: 'Statement Narration / Memo',
    status: 'Clearing Status',
    txn_date: 'Transaction Date (ISO)',
  };
  return map[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const getFriendlyDataType = (key: string): string => {
  if (key.includes('date') || key.includes('txn_date')) return 'Date (ISO YYYY-MM-DD)';
  if (key.includes('amount') || key.includes('balance') || key.includes('fee') || key.includes('minor')) return 'Currency Amount (Integer Minor Units)';
  if (key.includes('currency')) return '3-Letter Currency Code (e.g. INR)';
  if (key.includes('id') || key.includes('ref') || key.includes('reference')) return 'Alphanumeric Code / ID';
  return 'Text / String';
};

export const SchemasTab: React.FC<SchemasTabProps> = ({
  mappings: fallbackMappings,
}) => {
  const [dataSources, setDataSources] = useState<DataSourceOut[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  const [liveMappings, setLiveMappings] = useState<FieldMappingOut[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sourcesList = useDataHubStore((s) => s.sourcesList);

  // 1. Sync data sources from store or cache
  useEffect(() => {
    if (sourcesList.length > 0) {
      setDataSources(sourcesList);
      setSelectedSourceId((prev) => prev || sourcesList[0].source_id);
    } else {
      dataSourceService.list().then((sources) => {
        if (sources.length > 0) {
          setDataSources(sources);
          setSelectedSourceId((prev) => prev || sources[0].source_id);
        }
      }).catch(() => {});
    }
  }, [sourcesList]);

  // 2. Fetch field mappings for selected data source ID
  useEffect(() => {
    if (!selectedSourceId) return;

    let isCancelled = false;
    const fetchMappings = async () => {
      setIsLoading(true);
      try {
        const data = await fieldMappingService.getActive(selectedSourceId);
        if (!isCancelled) {
          setLiveMappings(data);
        }
      } catch {
        if (!isCancelled) {
          setLiveMappings([]);
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    fetchMappings();
    return () => { isCancelled = true; };
  }, [selectedSourceId]);

  const selectedSource = dataSources.find((s) => s.source_id === selectedSourceId);
  const selectedSourceName = selectedSource?.name || 'Selected Source';

  // Combine liveMappings or fallbackMappings for rendering
  const displayFields = liveMappings.length > 0
    ? liveMappings.map((m) => ({
        id: m.mapping_id,
        ledger: m.canonical_field,
        sourceField: m.source_field,
        transform: m.transform,
        transformParam: m.transform_param,
        required: true,
      }))
    : fallbackMappings.map((m) => ({
        id: m.id,
        ledger: m.ledger,
        sourceField: m.ledger,
        transform: 'TRIM',
        transformParam: null,
        required: m.required,
      }));

  return (
    <div className="flex flex-col gap-6 fade-in">
      {/* Scrollable Data Source Tabs Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {dataSources.map((ds) => {
          const isActive = ds.source_id === selectedSourceId;
          const Icon = CATEGORY_ICONS[ds.name] || FileSpreadsheet;
          return (
            <Button
              key={ds.source_id}
              variant={isActive ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedSourceId(ds.source_id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-2 border ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{ds.name}</span>
              <Badge
                variant={isActive ? 'accent' : 'muted'}
                label={ds.kind}
                className={`text-[10px] h-auto px-1.5 py-0.5 rounded font-semibold border-none ${
                  isActive ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              />
            </Button>
          );
        })}
        {dataSources.length === 0 && (
          <span className="text-xs text-slate-400 py-2">No backend data sources available</span>
        )}
      </div>

      {/* Field Mappings Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-900">
            Defined Schema Rules ({displayFields.length})
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100">
              Source: {selectedSourceName}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-4 py-3">Canonical Field (DB Field)</th>
                <th className="px-4 py-3">Source Column Name</th>
                <th className="px-4 py-3">Transform Engine</th>
                <th className="px-4 py-3">Expected Data Type</th>
                <th className="px-4 py-3 text-center">Requirement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Loading mapping rules from backend...
                  </td>
                </tr>
              ) : displayFields.length > 0 ? (
                displayFields.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">
                        {getFriendlyFieldName(m.ledger)}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        ({m.ledger})
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-indigo-700">
                      {m.sourceField}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-mono text-[10px] font-bold border border-amber-200">
                          {m.transform || 'TRIM'}
                        </span>
                        {m.transformParam && (
                          <span className="text-[10px] font-mono text-slate-400 truncate max-w-[120px]">
                            ({m.transformParam})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                        {getFriendlyDataType(m.ledger)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase ${
                          m.required
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {m.required ? 'Mandatory' : 'Optional'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No field mapping rules configured for {selectedSourceName}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
