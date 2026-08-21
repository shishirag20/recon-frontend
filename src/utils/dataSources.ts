import { arService, type RuleCategory } from '../services/ar.service';
import type { ARRule } from '../types';

let cachedDataSources: string[] = ['Bank Statement', 'Customers', 'Expected Remittances', 'Sub-Ledger', 'General Ledger'];
let cachedFieldsByEntity: Record<string, string[]> = {
  'Bank Statement': ['bank_reference', 'narration', 'amount_minor', 'payer_name', 'payer_account_no', 'payer_ifsc', 'bank_txn_id', 'post_date', 'value_date', 'payer_account_no, payer_ifsc'],
  'Customers': ['customer_code', 'customer_name', 'company_name', 'account_number', 'ifsc_code', 'vpa_handle', 'gstin', 'pan', 'account_number, ifsc_code'],
  'Expected Remittances': ['utr_number', 'expected_amount_minor', 'customer_id', 'status', 'reconciled', 'expected_date'],
  'Sub-Ledger': ['invoice_number', 'total_amount_minor', 'balance_due_minor', 'allowed_tds_minor', 'customer_id', 'status', 'due_date'],
  'General Ledger': ['control_account', 'balance_minor'],
};
let cachedCategories: RuleCategory[] = [];

export async function fetchDynamicDataSourcesAndFields(): Promise<{
  dataSources: string[];
  fieldsByEntity: Record<string, string[]>;
  categories: RuleCategory[];
}> {
  try {
    const res = await arService.getRuleCategories();
    if (res && res.categories && res.categories.length > 0) {
      const dsList: string[] = [];
      const fieldsMap: Record<string, string[]> = {};

      res.categories.forEach((cat: RuleCategory) => {
        dsList.push(cat.key);
        fieldsMap[cat.key] = cat.fields.map((f) => f.key);
      });

      cachedDataSources = Array.from(new Set(dsList));
      cachedFieldsByEntity = fieldsMap;
      cachedCategories = res.categories;
    }
  } catch (err) {
    console.error('Failed to fetch data sources from rule-categories API:', err);
  }

  return {
    dataSources: cachedDataSources,
    fieldsByEntity: cachedFieldsByEntity,
    categories: cachedCategories,
  };
}

export function getCachedDataSources(): string[] {
  return cachedDataSources;
}

export function getCachedFieldsForEntity(entity: string): string[] {
  if (!entity) return [];
  const norm = entity.trim();
  return cachedFieldsByEntity[norm] || [];
}

/**
 * Dynamically resolves the primary (source) and target dataset + field pair for any rule
 * using rule.config metadata cross-referenced with rule category definitions.
 */
export function resolveDatasetsForRule(rule: ARRule): {
  primaryDataset: string;
  primaryField: string;
  targetDataset: string;
  targetField: string;
} {
  const cfg = rule.config || {};
  const cond = rule.cond || {};

  // 1. Explicitly saved datasets take top priority
  let primaryDataset = cfg.primaryDataset || 'Bank Statement';
  let targetDataset = cfg.targetDataset;
  let primaryField = cfg.primaryField || cfg.bank_field || cfg.location;
  let targetField = cfg.targetField || cfg.match_field || cfg.source_field;

  // 2. Derive target dataset dynamically from config.source or category schema
  if (!targetDataset) {
    const rawSource = String(cfg.source || '').toLowerCase();
    if (rawSource.includes('customer') || rawSource === 'customers' || rawSource === 'customer_bank_accounts' || rawSource === 'customer_reference_codes') {
      targetDataset = 'Customers';
    } else if (rawSource.includes('remittance') || rawSource.includes('expected') || rawSource === 'expected_remittances') {
      targetDataset = 'Expected Remittances';
    } else if (rawSource.includes('gl') || rawSource.includes('ledger') || rawSource === 'general_ledger') {
      targetDataset = 'General Ledger';
    } else {
      targetDataset = 'Sub-Ledger';
    }
  }

  // 3. Derive primary field dynamically from config
  if (!primaryField) {
    if (cfg.amount || cond.amount || rule.kind?.includes('amount') || rule.kind?.includes('fee') || rule.kind?.includes('write-off') || rule.kind?.includes('overpay') || rule.kind?.includes('partial')) {
      primaryField = 'amount_minor';
    } else if (rule.kind === 'expected-utr') {
      primaryField = 'bank_reference';
    } else if (rule.kind === 'account-ifsc') {
      primaryField = 'payer_account_no, payer_ifsc';
    } else {
      primaryField = 'narration';
    }
  }

  // 4. Derive target field dynamically from config
  if (!targetField) {
    if (Array.isArray(cfg.match_fields)) {
      targetField = cfg.match_fields.join(', ');
    } else if (cfg.extract) {
      targetField = Array.isArray(cfg.extract) ? cfg.extract.join(', ') : String(cfg.extract);
    } else if (targetDataset === 'Customers') {
      targetField = rule.kind === 'upi' ? 'vpa_handle' : rule.kind === 'customer-code' ? 'customer_code' : rule.kind === 'gstin-pan' ? 'gstin, pan' : rule.kind === 'account-ifsc' ? 'account_number, ifsc_code' : 'company_name';
    } else if (targetDataset === 'Expected Remittances') {
      targetField = 'utr_number';
    } else if (targetDataset === 'General Ledger') {
      targetField = 'control_account';
    } else {
      targetField = (rule.kind?.includes('amount') || rule.kind?.includes('fee') || rule.kind?.includes('write-off') || rule.kind?.includes('overpay') || rule.kind?.includes('partial')) ? 'balance_due_minor' : 'invoice_number';
    }
  }

  return {
    primaryDataset,
    primaryField,
    targetDataset,
    targetField,
  };
}
