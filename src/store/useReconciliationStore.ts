import { create } from 'zustand';
import type { Reconciliation } from '../types';
import { MOCK_RECONCILIATION_JOBS } from '../mocks/reconciliations';

interface ReconciliationStoreState {
  jobs: Reconciliation[];
  selectedCategory: string;
  searchQuery: string;
  setCategory: (category: string) => void;
  setSearchQuery: (query: string) => void;
  addJob: (job: Reconciliation) => void;
  deleteJob: (id: string) => void;
}

export const useReconciliationStore = create<ReconciliationStoreState>((set) => ({
  jobs: MOCK_RECONCILIATION_JOBS,
  selectedCategory: 'all',
  searchQuery: '',
  setCategory: (category) => set({ selectedCategory: category }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  addJob: (newJob) => set((state) => ({ jobs: [newJob, ...state.jobs] })),
  deleteJob: (id) => set((state) => ({ jobs: state.jobs.filter((j) => j.id !== id) })),
}));
