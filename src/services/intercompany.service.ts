/**
 * Intercompany Elimination & Settlement Service
 */
import { IS_MOCK, API_ROUTES } from './api/config';
import { api } from './api/client';
import {
  MOCK_ENTITIES,
  MOCK_IC_TRANSACTIONS,
  MOCK_TRANSFER_PRICING,
} from '../mocks/intercompany';
import type {
  Entity,
  ICTransaction,
  TransferPricingEntry,
} from '../types';

export const intercompanyService = {
  /**
   * Fetch intercompany entities with balance summary
   */
  async getEntities(): Promise<Entity[]> {
    if (IS_MOCK) {
      return Promise.resolve(MOCK_ENTITIES);
    }
    return api.get<Entity[]>(API_ROUTES.INTERCOMPANY.ENTITIES);
  },

  /**
   * Fetch intercompany paired transactions
   */
  async getTransactions(): Promise<ICTransaction[]> {
    if (IS_MOCK) {
      return Promise.resolve(MOCK_IC_TRANSACTIONS);
    }
    return api.get<ICTransaction[]>(API_ROUTES.INTERCOMPANY.TRANSACTIONS);
  },

  /**
   * Fetch transfer pricing compliance schedule
   */
  async getTransferPricing(): Promise<TransferPricingEntry[]> {
    if (IS_MOCK) {
      return Promise.resolve(MOCK_TRANSFER_PRICING);
    }
    return api.get<TransferPricingEntry[]>(API_ROUTES.INTERCOMPANY.RULES);
  },
};
