/**
 * Accounts Receivable (AR) Reconciliation Service
 */
import { IS_MOCK, API_ROUTES } from './api/config';
import { api } from './api/client';
import {
  MOCK_AR_RESULT,
  MOCK_AR_RULES,
  MOCK_INVOICES,
  MOCK_BANK_STATEMENTS,
  MOCK_CUSTOMERS,
} from '../mocks/ar';
import type {
  AREngineResult,
  ARRule,
  Invoice,
  BankStatement,
  Customer,
  ARResolution,
} from '../types';

export const arService = {
  /**
   * Fetch complete AR Engine result for a given reconciliation workspace
   */
  async getARReconciliation(id: string = 'rec-ar-001'): Promise<AREngineResult> {
    if (IS_MOCK) {
      return Promise.resolve(MOCK_AR_RESULT);
    }
    return api.get<AREngineResult>(API_ROUTES.AR.RECONCILIATION(id));
  },

  /**
   * Fetch cascading AR matching rules
   */
  async getARRules(id: string = 'rec-ar-001'): Promise<ARRule[]> {
    if (IS_MOCK) {
      return Promise.resolve(MOCK_AR_RULES);
    }
    return api.get<ARRule[]>(API_ROUTES.AR.RULES(id));
  },

  /**
   * Update or toggle an AR matching rule
   */
  async updateARRule(id: string, rule: ARRule): Promise<ARRule> {
    if (IS_MOCK) {
      const idx = MOCK_AR_RULES.findIndex((r) => r.id === rule.id);
      if (idx !== -1) {
        MOCK_AR_RULES[idx] = { ...MOCK_AR_RULES[idx], ...rule };
      }
      return Promise.resolve(rule);
    }
    return api.put<ARRule>(API_ROUTES.AR.RULE_BY_ID(id, rule.id), rule);
  },

  /**
   * Fetch open AR invoices
   */
  async getInvoices(): Promise<Invoice[]> {
    if (IS_MOCK) {
      return Promise.resolve(MOCK_INVOICES);
    }
    return api.get<Invoice[]>(API_ROUTES.AR.INVOICES);
  },

  /**
   * Fetch unallocated bank statement lines
   */
  async getBankStatements(): Promise<BankStatement[]> {
    if (IS_MOCK) {
      return Promise.resolve(MOCK_BANK_STATEMENTS);
    }
    return api.get<BankStatement[]>(API_ROUTES.AR.BANK_STATEMENTS);
  },

  /**
   * Fetch customer master database
   */
  async getCustomers(): Promise<Customer[]> {
    if (IS_MOCK) {
      return Promise.resolve(MOCK_CUSTOMERS);
    }
    return api.get<Customer[]>(API_ROUTES.AR.CUSTOMERS);
  },

  /**
   * Resolve an open exception (write-off, bank charge, fee, partial pay)
   */
  async resolveException(
    exceptionKey: string,
    resolution: ARResolution
  ): Promise<{ success: boolean; key: string }> {
    if (IS_MOCK) {
      return Promise.resolve({ success: true, key: exceptionKey });
    }
    return api.post(API_ROUTES.AR.RESOLVE_EXCEPTION(exceptionKey), resolution);
  },

  /**
   * Sign-off and lock an AR reconciliation period
   */
  async finishReconciliation(
    id: string,
    signedBy: string
  ): Promise<{ signedAt: string; hash: string }> {
    if (IS_MOCK) {
      return Promise.resolve({
        signedAt: new Date().toISOString(),
        hash: 'SHA256-MOCK-SIGNATURE-8F92A1',
      });
    }
    return api.post(API_ROUTES.AR.SIGN_OFF(id), { signedBy });
  },
};
