'use client';

import { useState, useEffect } from 'react';
import { useApiClient } from '@/lib/api-client';
import { X, Calendar, Loader2, AlertCircle } from 'lucide-react';
import { Button, Input, Label, cn } from '@sly/ui';
import type { Account, ScheduleFrequency } from '@sly/api-client';

interface CreateScheduleModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const FREQUENCIES: { value: ScheduleFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export function CreateScheduleModal({ onClose, onSuccess }: CreateScheduleModalProps) {
  const api = useApiClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Form state
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USDC');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<ScheduleFrequency>('monthly');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [maxOccurrences, setMaxOccurrences] = useState('');

  useEffect(() => {
    async function fetchAccounts() {
      if (!api) {
        setLoadingAccounts(false);
        return;
      }
      try {
        const response = await api.accounts.list({ limit: 100 });
        setAccounts(response.data || []);
      } catch (err) {
        console.error('Failed to fetch accounts:', err);
      } finally {
        setLoadingAccounts(false);
      }
    }
    fetchAccounts();
  }, [api]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!api) return;

    setLoading(true);
    setError(null);

    try {
      await api.scheduledTransfers.create({
        fromAccountId,
        toAccountId,
        amount: parseFloat(amount),
        currency,
        description: description || undefined,
        frequency,
        dayOfMonth: frequency === 'monthly' ? parseInt(dayOfMonth) : undefined,
        startDate: new Date(startDate).toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        maxOccurrences: maxOccurrences ? parseInt(maxOccurrences) : undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create schedule');
    } finally {
      setLoading(false);
    }
  };

  const fromAccount = accounts.find(a => a.id === fromAccountId);
  const isValid = fromAccountId && toAccountId && parseFloat(amount) > 0 && fromAccountId !== toAccountId;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-950 rounded-xl flex items-center justify-center">
              <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">New Scheduled Transfer</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Set up recurring payments</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* From Account */}
          <div>
            <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
              From Account
            </Label>
            <select
              value={fromAccountId}
              onChange={(e) => setFromAccountId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              disabled={loadingAccounts}
            >
              <option value="">Select account...</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.currency} {account.balanceAvailable.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          {/* To Account */}
          <div>
            <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
              To Account
            </Label>
            <select
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              disabled={loadingAccounts}
            >
              <option value="">Select account...</option>
              {accounts.filter(a => a.id !== fromAccountId).map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>

          {/* Amount & Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount" className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
                Amount
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
                Currency
              </Label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              >
                <option value="USDC">USDC</option>
                <option value="USDT">USDT</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
              Description (Optional)
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Monthly salary payment"
            />
          </div>

          {/* Frequency */}
          <div>
            <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
              Frequency
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {FREQUENCIES.map((freq) => (
                <button
                  key={freq.value}
                  type="button"
                  onClick={() => setFrequency(freq.value)}
                  className={cn(
                    "py-2 px-3 rounded-lg text-sm font-medium border transition-colors",
                    frequency === freq.value
                      ? "bg-purple-600 text-white border-purple-600"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-purple-400"
                  )}
                >
                  {freq.label}
                </button>
              ))}
            </div>
          </div>

          {/* Day of Month (for monthly) */}
          {frequency === 'monthly' && (
            <div>
              <Label className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
                Day of Month
              </Label>
              <select
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>{day}{getOrdinalSuffix(day)}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate" className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
                Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate" className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
                End Date (Optional)
              </Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
              />
            </div>
          </div>

          {/* Max Occurrences */}
          <div>
            <Label htmlFor="maxOccurrences" className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
              Max Occurrences (Optional)
            </Label>
            <Input
              id="maxOccurrences"
              type="number"
              min="1"
              value={maxOccurrences}
              onChange={(e) => setMaxOccurrences(e.target.value)}
              placeholder="Leave empty for unlimited"
            />
          </div>

          {/* Summary */}
          {isValid && (
            <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-xl p-4">
              <p className="text-sm text-purple-900 dark:text-purple-200">
                <span className="font-medium">{currency} {parseFloat(amount).toLocaleString()}</span>
                {' '}will be transferred{' '}
                <span className="font-medium">{frequency}</span>
                {' '}starting{' '}
                <span className="font-medium">{new Date(startDate).toLocaleDateString()}</span>
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !isValid}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Schedule
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

