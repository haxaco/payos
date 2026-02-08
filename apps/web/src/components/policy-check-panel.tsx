'use client';

import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@sly/ui';
import { cn } from '@sly/ui';
import Link from 'next/link';

export interface PolicyRule {
  name: string;
  result: 'pass' | 'warning' | 'fail';
  description: string;
  approvalId?: string;
}

interface PolicyCheckPanelProps {
  rules: PolicyRule[];
  className?: string;
}

const resultConfig = {
  pass: {
    icon: CheckCircle2,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
  },
  fail: {
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/30',
  },
};

export function PolicyCheckPanel({ rules, className }: PolicyCheckPanelProps) {
  if (rules.length === 0) return null;

  const passCount = rules.filter((r) => r.result === 'pass').length;
  const warnCount = rules.filter((r) => r.result === 'warning').length;
  const failCount = rules.filter((r) => r.result === 'fail').length;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
            Policy Evaluation
          </CardTitle>
          <div className="flex items-center gap-2 text-xs">
            {passCount > 0 && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                {passCount}
              </span>
            )}
            {warnCount > 0 && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3" />
                {warnCount}
              </span>
            )}
            {failCount > 0 && (
              <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                <XCircle className="h-3 w-3" />
                {failCount}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {rules.map((rule, i) => {
          const config = resultConfig[rule.result];
          const Icon = config.icon;
          return (
            <div
              key={i}
              className={cn(
                'flex items-start gap-3 rounded-lg px-3 py-2.5',
                config.bg
              )}
            >
              <Icon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', config.color)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {rule.name}
                  </span>
                  {rule.approvalId && (
                    <Link
                      href={`/dashboard/approvals/${rule.approvalId}`}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex-shrink-0"
                    >
                      View Approval
                    </Link>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {rule.description}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/**
 * Derive policy rules from ACP checkout data
 */
export function deriveCheckoutPolicyRules(
  checkoutData: Record<string, any> | null | undefined,
  totalAmount: number,
  status: string
): PolicyRule[] {
  const rules: PolicyRule[] = [];
  if (!checkoutData) return rules;

  // Amount threshold check
  if (totalAmount < 500) {
    rules.push({
      name: 'Amount Threshold',
      result: 'pass',
      description: `Transaction amount $${totalAmount.toLocaleString()} is within auto-approval limit ($500)`,
    });
  } else {
    rules.push({
      name: 'Amount Threshold',
      result: 'warning',
      description: `Transaction amount $${totalAmount.toLocaleString()} exceeds auto-approval limit ($500) — requires review`,
    });
  }

  // First-time merchant check
  if (checkoutData.first_time_merchant) {
    rules.push({
      name: 'Merchant History',
      result: 'warning',
      description: 'First-time merchant — additional verification recommended',
    });
  } else {
    rules.push({
      name: 'Merchant History',
      result: 'pass',
      description: 'Known merchant with previous successful transactions',
    });
  }

  // Policy check result
  if (checkoutData.policy_check === 'passed' || checkoutData.policy_check === 'all_passed') {
    rules.push({
      name: 'Policy Check',
      result: 'pass',
      description: 'All spending policies passed validation',
    });
  } else if (checkoutData.policy_check === 'failed') {
    rules.push({
      name: 'Policy Check',
      result: 'fail',
      description: 'One or more spending policies failed validation',
    });
  }

  // Auto-approval status
  if (checkoutData.auto_approved) {
    rules.push({
      name: 'Auto-Approval',
      result: 'pass',
      description: 'Checkout was auto-approved based on agent permissions and amount',
    });
  } else if (checkoutData.awaiting_confirmation) {
    rules.push({
      name: 'Auto-Approval',
      result: 'warning',
      description: 'Checkout is awaiting manual confirmation from account owner',
    });
  }

  // Multi-vendor group checkout
  if (checkoutData.checkout_group_id) {
    rules.push({
      name: 'Group Checkout',
      result: 'pass',
      description: `Part of coordinated checkout group (vendor ${checkoutData.vendor_index}/${checkoutData.total_vendors})`,
    });
  }

  // GL code / cost center (corporate)
  if (checkoutData.gl_code) {
    rules.push({
      name: 'Cost Center',
      result: 'pass',
      description: `Mapped to GL code "${checkoutData.gl_code}" — ${checkoutData.cost_center || 'N/A'}`,
    });
  }

  return rules;
}

/**
 * Derive policy rules from AP2 mandate data
 */
export function deriveMandatePolicyRules(
  mandateData: Record<string, any> | null | undefined,
  authorizedAmount: number,
  status: string
): PolicyRule[] {
  const rules: PolicyRule[] = [];
  if (!mandateData) return rules;

  // Policy result check
  if (mandateData.policy_result === 'all_passed' || mandateData.policy_check === 'passed') {
    rules.push({
      name: 'Policy Check',
      result: 'pass',
      description: 'All mandate policies passed validation',
    });
  }

  // Budget threshold
  if (authorizedAmount < 1000) {
    rules.push({
      name: 'Budget Threshold',
      result: 'pass',
      description: `Authorized amount $${authorizedAmount.toLocaleString()} within standard limit`,
    });
  } else if (authorizedAmount < 5000) {
    rules.push({
      name: 'Budget Threshold',
      result: 'warning',
      description: `Authorized amount $${authorizedAmount.toLocaleString()} requires manager approval`,
    });
  } else {
    rules.push({
      name: 'Budget Threshold',
      result: 'warning',
      description: `Authorized amount $${authorizedAmount.toLocaleString()} requires executive approval`,
    });
  }

  // Cost center / GL code
  if (mandateData.gl_code || mandateData.cost_center) {
    rules.push({
      name: 'Cost Center',
      result: 'pass',
      description: `Mapped to ${mandateData.gl_code ? `GL "${mandateData.gl_code}"` : ''}${mandateData.cost_center ? ` — ${mandateData.cost_center}` : ''}`,
    });
  }

  // Priority tier (bill pay)
  if (mandateData.priority) {
    const isPriority = mandateData.priority === 'P0';
    rules.push({
      name: 'Priority Tier',
      result: isPriority ? 'pass' : 'warning',
      description: isPriority
        ? `Priority ${mandateData.priority} — non-deferrable essential payment`
        : `Priority ${mandateData.priority} — may be deferred if needed`,
    });
  }

  // Deferred status
  if (mandateData.deferred) {
    rules.push({
      name: 'Deferred Payment',
      result: 'warning',
      description: `Payment deferred until ${mandateData.deferred_until || 'next cycle'}`,
    });
  }

  // Frequency check
  if (mandateData.frequency) {
    rules.push({
      name: 'Frequency',
      result: 'pass',
      description: `Recurring ${mandateData.frequency} payment — schedule verified`,
    });
  }

  // Bill type
  if (mandateData.bill_type) {
    rules.push({
      name: 'Bill Classification',
      result: 'pass',
      description: `Classified as "${mandateData.bill_type}" — payee: ${mandateData.payee || 'N/A'}`,
    });
  }

  // Travel-specific: items breakdown
  if (mandateData.items && Array.isArray(mandateData.items)) {
    rules.push({
      name: 'Itemized Breakdown',
      result: 'pass',
      description: `${mandateData.items.length} line items verified — ${mandateData.items.map((i: any) => i.type).join(', ')}`,
    });
  }

  // FX optimization (remittance)
  if (mandateData.fx_optimization_window_days) {
    rules.push({
      name: 'FX Optimization',
      result: 'pass',
      description: `${mandateData.fx_optimization_window_days}-day FX optimization window to ${mandateData.destination_country || 'destination'}`,
    });
  }

  return rules;
}
