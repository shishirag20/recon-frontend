import { create } from 'zustand';
import type { Reconciliation } from '../types';
import { reconciliationsService } from '../services/reconciliations.service';

interface ReconciliationStoreState {
  jobs: Reconciliation[];
  selectedCategory: string;
  searchQuery: string;
  isLoading: boolean;
  fetchJobs: () => Promise<void>;
  setCategory: (category: string) => void;
  setSearchQuery: (query: string) => void;
  addJob: (job: Reconciliation) => void;
  deleteJob: (id: string) => void;
}

export const useReconciliationStore = create<ReconciliationStoreState>((set) => ({
  jobs: [],
  selectedCategory: 'all',
  searchQuery: '',
  isLoading: false,

  fetchJobs: async () => {
    set({ isLoading: true });
    try {
      const jobs = await reconciliationsService.getReconciliationJobs();
      set({ jobs, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  setCategory: (category) => set({ selectedCategory: category }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  addJob: (newJob) => set((state) => ({ jobs: [newJob, ...state.jobs] })),
  deleteJob: (id) => set((state) => ({ jobs: state.jobs.filter((j) => j.id !== id) })),
}));
