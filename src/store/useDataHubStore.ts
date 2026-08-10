/**
 * DataHub Store — Zustand store for DataHub module state.
 * 
 * Caches the category → source_id mapping fetched at app boot from
 * GET /data-sources, so any component can instantly look up a source_id
 * by category name without a network round-trip.
 */
import { create } from 'zustand';
import type { DataSourceOut, IngestionJobOut } from '../types/datahub';

interface DataHubStoreState {
  // Array of all fetched DataSources
  sourcesList: DataSourceOut[];
  // source_id lookup map: category name → DataSourceOut
  sourcesMap: Record<string, DataSourceOut>;
  // All ingestion jobs (refreshed after each upload / poll cycle)
  jobs: IngestionJobOut[];
  // Loading state for initial data fetch
  isLoading: boolean;
  // Error state
  error: string | null;

  // Actions
  setSources: (sources: DataSourceOut[]) => void;
  setJobs: (jobs: IngestionJobOut[]) => void;
  upsertJob: (job: IngestionJobOut) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  /** Look up a source_id by category display name */
  getSourceId: (category: string) => string | null;
}

// Map frontend UI categories to DB data_sources table names
const CATEGORY_ALIAS_MAP: Record<string, string[]> = {
  'Bank Statements': ['Bank Statements', 'BANK_FEED'],
  'General Ledger': ['General Ledger', 'GL'],
  'AR Sub-ledger': ['Sub-ledger', 'AR Sub-ledger', 'AR'],
  'AP Sub-ledger': ['Sub-ledger', 'AP Sub-ledger', 'AP'],
  'Gateway Settlements': ['Gateway Settlements', 'GATEWAY'],
  'Customer Master': ['Customer Master'],
};

// Seeded UUID fallbacks matching backend DB data_sources table
const SEEDED_SOURCE_IDS: Record<string, string> = {
  'Bank Statements': 'c8ede59b-ddb4-4b26-9291-4f9efed90514',
  'General Ledger': 'e2263aad-b5c6-4047-8c9c-24fa766d2ab3',
  'AR Sub-ledger': '6bdb9473-7944-4c5f-923a-daf414ca4e77',
  'AP Sub-ledger': '6bdb9473-7944-4c5f-923a-daf414ca4e77',
  'Customer Master': '8334d952-58e2-44c4-b65c-c3088bce4ec2',
  'Sub-ledger': '6bdb9473-7944-4c5f-923a-daf414ca4e77',
};

export const useDataHubStore = create<DataHubStoreState>((set, get) => ({
  sourcesList: [],
  sourcesMap: {},
  jobs: [],
  isLoading: false,
  error: null,

  setSources: (sources) => {
    const map: Record<string, DataSourceOut> = {};
    sources.forEach((s) => {
      map[s.name] = s;
      map[s.source_id] = s;
    });
    set({ sourcesList: sources, sourcesMap: map });
  },

  setJobs: (jobs) => set({ jobs }),

  upsertJob: (job) =>
    set((state) => {
      const existing = state.jobs.findIndex((j) => j.job_id === job.job_id);
      if (existing >= 0) {
        const updated = [...state.jobs];
        updated[existing] = job;
        return { jobs: updated };
      }
      return { jobs: [job, ...state.jobs] };
    }),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  getSourceId: (category) => {
    const map = get().sourcesMap;

    // 1. Direct match by name
    if (map[category]) return map[category].source_id;

    // 2. Alias match against DB names
    const aliases = CATEGORY_ALIAS_MAP[category] || [category];
    for (const alias of aliases) {
      if (map[alias]) return map[alias].source_id;
    }

    // 3. Fall back to seeded DB UUID
    return SEEDED_SOURCE_IDS[category] || 'c8ede59b-ddb4-4b26-9291-4f9efed90514';
  },
}));
