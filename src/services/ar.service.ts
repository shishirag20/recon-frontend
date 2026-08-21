/**
 * Accounts Receivable (AR) Reconciliation Service
 */
import { API_ROUTES } from './api/config';
import { api } from './api/client';
import type {
  AREngineResult,
  ARRule,
  Invoice,
  BankStatement,
  Customer,
  ARResolution,
} from '../types';

const isUUID = (str?: string): boolean =>
  !!str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

let activeARDefinitionIdPromise: Promise<string> | null = null;

/**
 * Resolves a valid UUID for the AR Reconciliation definition.
 * Dynamically resolves real backend definition UUIDs (e.g. 884a4342-e0fc-45bb-a56f-0166089eadbc)
 * so non-UUID mock strings like 'rec-ar-001' map cleanly to the database.
 */
export async function resolveARDefinitionId(providedId?: string): Promise<string> {
  if (isUUID(providedId)) {
    return providedId!;
  }
  if (!activeARDefinitionIdPromise) {
    activeARDefinitionIdPromise = (async () => {
      try {
        const defs = await api.get<Array<any>>('/reconciliations');
        if (Array.isArray(defs) && defs.length > 0) {
          const arDef =
            defs.find(
              (d) =>
                d.recon_type === 'AR' ||
                d.category === 'AR' ||
                d.type === 'AR' ||
                d.type === 'ar-reconciliation'
            ) || defs[0];

          const targetId = arDef?.definition_id || arDef?.id;
          if (targetId && isUUID(targetId)) {
            return targetId;
          }
        }

        // Auto-seed an AR definition with valid entity UUID if empty
        const created = await api.post<any>('/reconciliations', {
          entity_id: 'e1111111-1111-1111-1111-111111111111',
          name: 'AR Reconciliation',
          recon_type: 'AR',
        });
        const createdId = created?.definition_id || created?.id;
        if (createdId && isUUID(createdId)) {
          return createdId;
        }
        return '884a4342-e0fc-45bb-a56f-0166089eadbc';
      } catch (err) {
        return '884a4342-e0fc-45bb-a56f-0166089eadbc';
      }
    })();
  }
  return activeARDefinitionIdPromise;
}

/**
 * Normalizes backend RuleOut objects to match the frontend ARRule schema
 * (maps rule_id -> id and CUSTOMER_LOCK -> customer-lock).
 */
function normalizeRule(r: any): ARRule {
  const phaseMap: Record<string, string> = {
    CUSTOMER_LOCK: 'customer-lock',
    CANDIDATE_POOL: 'candidate-pool',
    ALLOCATION: 'allocation',
    INTAKE_VALIDATION: 'intake',
    SHORT_PAY: 'short-pay',
    UNAPPLIED: 'unapplied',
    GL_CHECK: 'gl-check',
  };

  const rawPhase = (r.phase || '').toString();
  const normalizedPhase =
    phaseMap[rawPhase] || rawPhase.toLowerCase().replace(/_/g, '-');

  return {
    ...r,
    id: r.rule_id || r.id,
    phase: normalizedPhase,
    cond: r.config || r.cond,
  };
}

export const arService = {
  /**
   * Fetch complete AR Engine result for a given reconciliation workspace
   */
  async getARReconciliation(id?: string): Promise<AREngineResult> {
    const validId = await resolveARDefinitionId(id);
    return api.get<AREngineResult>(API_ROUTES.AR.RECONCILIATION(validId)).catch(() => {
      // Fallback empty AREngineResult schema if engine computation has not completed
      return {
        matches: [],
        exceptions: [],
        bankStatements: [],
        invoices: [],
        customers: [],
      } as AREngineResult;
    });
  },

  /**
   * Fetch cascading AR matching rules and normalize them for Rules Studio UI
   */
  async getARRules(id?: string): Promise<ARRule[]> {
    const validId = await resolveARDefinitionId(id);
    const rawRules = await api.get<any[]>(`/reconciliations/${validId}/rules`);
    return (rawRules || []).map(normalizeRule);
  },

  /**
   * Update or toggle an AR matching rule
   */
  async updateARRule(id: string, rule: ARRule): Promise<ARRule> {
    const validId = await resolveARDefinitionId(id);
    const ruleId = rule.id || (rule as any).rule_id;
    const res = await api.patch<any>(`/reconciliations/${validId}/rules/${ruleId}`, {
      enabled: rule.enabled,
      confidence: rule.confidence,
      config: rule.config || rule.cond,
    });
    return normalizeRule(res);
  },

  /**
   * Fetch open AR invoices
   */
  async getInvoices(): Promise<Invoice[]> {
    return api.get<Invoice[]>(API_ROUTES.AR.INVOICES);
  },

  /**
   * Fetch unallocated bank statement lines
   */
  async getBankStatements(): Promise<BankStatement[]> {
    return api.get<BankStatement[]>(API_ROUTES.AR.BANK_STATEMENTS);
  },

  /**
   * Fetch customer master database
   */
  async getCustomers(): Promise<Customer[]> {
    return api.get<Customer[]>(API_ROUTES.AR.CUSTOMERS);
  },

  /**
   * Resolve an open exception (write-off, bank charge, fee, partial pay)
   */
  async resolveException(
    exceptionKey: string,
    resolution: ARResolution
  ): Promise<{ success: boolean; key: string }> {
    return api.post(API_ROUTES.AR.RESOLVE_EXCEPTION(exceptionKey), resolution);
  },

  /**
   * Fetch valid rule data categories and canonical fields for Rule Studio UI
   */
  async getRuleCategories(): Promise<RuleCategoriesResponse> {
    return api.get<RuleCategoriesResponse>('/reconciliations/rule-categories');
  },

  /**
   * Sign-off and lock an AR reconciliation period
   */
  async finishReconciliation(
    id: string,
    signedBy: string
  ): Promise<{ signedAt: string; hash: string }> {
    const validId = await resolveARDefinitionId(id);
    return api.post(API_ROUTES.AR.SIGN_OFF(validId), { signedBy });
  },
};

export interface RuleCategoryField {
  key: string;
  label: string;
  type: string;
}

export interface RuleCategory {
  key: string;
  label: string;
  stream: string;
  description: string;
  fields: RuleCategoryField[];
}

export interface RuleCategoriesResponse {
  categories: RuleCategory[];
}
