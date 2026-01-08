'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface Expert {
  id: number;
  name: string;
}

interface PayPeriod {
  id: number;
  periodName: string;
  periodStart: string;
  periodEnd: string;
  isPaid: boolean;
}

interface ExpertBonusSummary {
  expertId: number;
  expertName: string;
  periodName: string;
  periodStart: string;
  periodEnd: string;
  writerQualifyingProblems: number;
  review1QualifyingProblems: number;
  review2QualifyingProblems: number;
  totalHours: number;
  hoursAtOldSalary: number;
  initialReferralCount: number;
  dataFilesCount: number;
  writerBonus: number;
  review1Bonus: number;
  review2Bonus: number;
  hoursPercentageBonus: number;
  salaryIncreaseBonus: number;
  referralBonus: number;
  dataBonus: number;
  totalBonus: number;
  baseEarnings: number;
  totalOwed: number;
  isPaid: boolean;
}

interface BonusData {
  experts: ExpertBonusSummary[];
  periods: PayPeriod[];
  parameters: {
    writerPerProblem: number;
    review1PerProblem: number;
    review2PerProblem: number;
    hoursPercentRate: number;
    referralBonusAmount: number;
    defaultDataFilePrice: number;
  };
  totals: {
    writerBonus: number;
    review1Bonus: number;
    review2Bonus: number;
    hoursPercentageBonus: number;
    salaryIncreaseBonus: number;
    referralBonus: number;
    dataBonus: number;
    totalBonus: number;
    baseEarnings: number;
    totalOwed: number;
  };
  view: string;
  selectedPeriodId: number | null;
}

type SortKey = 'expertName' | 'totalOwed' | 'totalBonus' | 'baseEarnings';
type SortDirection = 'asc' | 'desc';

const defaultFormData = {
  expertId: '',
  periodId: '',
  periodName: '',
  periodStart: '',
  periodEnd: '',
  writerQualifyingProblems: '',
  review1QualifyingProblems: '',
  review2QualifyingProblems: '',
  totalHours: '',
  hourlyRate: '150',
  is20PercentEligible: false,
  hoursAtOldSalary: '',
  oldHourlyRate: '',
  newHourlyRate: '',
  initialReferralCount: '',
  dataFilesCount: '',
  notes: '',
};

export default function BonusesPage() {
  const [data, setData] = useState<BonusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('unpaid');
  const [sortKey, setSortKey] = useState<SortKey>('totalOwed');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedExperts, setExpandedExperts] = useState<Set<number>>(new Set());

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [formData, setFormData] = useState(defaultFormData);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success?: boolean; error?: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = '/api/bonuses';
      if (selectedPeriod === 'unpaid') {
        url += '?view=unpaid';
      } else if (selectedPeriod === 'all') {
        url += '?view=all';
      } else {
        url += `?periodId=${selectedPeriod}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.details || 'Failed to fetch bonus data');
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchExperts = async () => {
    try {
      const res = await fetch('/api/bonuses/experts');
      if (res.ok) {
        const json = await res.json();
        setExperts(json.experts || []);
      }
    } catch (err) {
      console.error('Failed to fetch experts:', err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchExperts();
  }, [selectedPeriod]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const toggleExpanded = (expertId: number) => {
    setExpandedExperts(prev => {
      const next = new Set(prev);
      if (next.has(expertId)) {
        next.delete(expertId);
      } else {
        next.add(expertId);
      }
      return next;
    });
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: (e.target as HTMLInputElement).checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitResult(null);

    try {
      const res = await fetch('/api/bonuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();

      if (res.ok) {
        setSubmitResult({ success: true });
        setFormData(defaultFormData);
        fetchData();
      } else {
        setSubmitResult({ error: result.details || result.error || 'Failed to add bonus' });
      }
    } catch (err) {
      setSubmitResult({ error: err instanceof Error ? err.message : 'An error occurred' });
    } finally {
      setSubmitting(false);
    }
  };

  const sortedExperts = data?.experts
    ? [...data.experts].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        const multiplier = sortDirection === 'asc' ? 1 : -1;

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return (aVal - bVal) * multiplier;
        }
        return String(aVal).localeCompare(String(bVal)) * multiplier;
      })
    : [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const SortHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
      onClick={() => handleSort(sortKeyName)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortKey === sortKeyName && (
          <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>
    </th>
  );

  const currentPeriodLabel = () => {
    if (selectedPeriod === 'unpaid') return 'Unpaid Bonuses';
    if (selectedPeriod === 'all') return 'All Time';
    const period = data?.periods.find(p => String(p.id) === selectedPeriod);
    return period?.periodName || 'Selected Period';
  };

  // Render the bonus breakdown for an expert
  const renderBonusBreakdown = (expert: ExpertBonusSummary) => {
    const breakdownItems = [];

    if (expert.writerBonus > 0) {
      breakdownItems.push({
        label: 'Writer Bonus',
        detail: `${expert.writerQualifyingProblems} problems × $100`,
        amount: expert.writerBonus,
      });
    }
    if (expert.review1Bonus > 0) {
      breakdownItems.push({
        label: 'Review 1 Bonus',
        detail: `${expert.review1QualifyingProblems} problems × $50`,
        amount: expert.review1Bonus,
      });
    }
    if (expert.review2Bonus > 0) {
      breakdownItems.push({
        label: 'Review 2 Bonus',
        detail: `${expert.review2QualifyingProblems} problems × $30`,
        amount: expert.review2Bonus,
      });
    }
    if (expert.hoursPercentageBonus > 0) {
      breakdownItems.push({
        label: '20% Hours Bonus',
        detail: `${formatCurrency(expert.baseEarnings)} base × 20%`,
        amount: expert.hoursPercentageBonus,
      });
    }
    if (expert.salaryIncreaseBonus > 0) {
      breakdownItems.push({
        label: 'Salary Increase',
        detail: `${expert.hoursAtOldSalary} hrs at rate diff`,
        amount: expert.salaryIncreaseBonus,
      });
    }
    if (expert.referralBonus > 0) {
      breakdownItems.push({
        label: 'Referral Bonus',
        detail: `${expert.initialReferralCount} referral${expert.initialReferralCount > 1 ? 's' : ''} × $300`,
        amount: expert.referralBonus,
      });
    }
    if (expert.dataBonus > 0) {
      breakdownItems.push({
        label: 'Data Bonus',
        detail: `${expert.dataFilesCount} file${expert.dataFilesCount > 1 ? 's' : ''} × $50`,
        amount: expert.dataBonus,
      });
    }

    return (
      <tr className="bg-gray-50">
        <td colSpan={4} className="px-4 py-4">
          <div className="ml-6 space-y-3">
            {/* Base Earnings */}
            {expert.baseEarnings > 0 && (
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <div>
                  <span className="font-medium text-gray-700">Base Earnings</span>
                  <span className="text-gray-500 text-sm ml-2">
                    ({expert.totalHours} hrs × hourly rate)
                  </span>
                </div>
                <span className="font-medium text-gray-900">{formatCurrency(expert.baseEarnings)}</span>
              </div>
            )}

            {/* Bonus Breakdown */}
            {breakdownItems.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-500 uppercase tracking-wider">Bonus Breakdown</div>
                {breakdownItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1.5 pl-4 border-l-2 border-green-300">
                    <div>
                      <span className="text-gray-700">{item.label}</span>
                      <span className="text-gray-400 text-sm ml-2">{item.detail}</span>
                    </div>
                    <span className="font-medium text-green-600">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Totals */}
            <div className="pt-3 border-t border-gray-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Bonuses</span>
                <span className="font-medium text-green-600">{formatCurrency(expert.totalBonus)}</span>
              </div>
              <div className="flex justify-between items-center text-lg">
                <span className="font-semibold text-gray-900">Total Owed</span>
                <span className="font-bold text-gray-900">{formatCurrency(expert.totalOwed)}</span>
              </div>
            </div>
          </div>
        </td>
      </tr>
    );
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading bonus data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bonus Management</h1>
              <p className="text-gray-500 mt-1">Track and manage expert bonuses</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                showForm
                  ? 'bg-gray-200 text-gray-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {showForm ? 'Cancel' : 'Add Bonus'}
            </button>
          </div>
        </div>

        {/* Add Bonus Form */}
        {showForm && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Add Bonus Entry</h2>
            <form onSubmit={handleSubmit}>
              {/* Section 1: Who & When */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Who & When</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expert</label>
                    <select
                      name="expertId"
                      value={formData.expertId}
                      onChange={handleFormChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select...</option>
                      {experts.map((expert) => (
                        <option key={expert.id} value={expert.id}>{expert.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pay Period</label>
                    <select
                      name="periodId"
                      value={formData.periodId}
                      onChange={handleFormChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select period...</option>
                      {data?.periods.map((period) => (
                        <option key={period.id} value={period.id}>
                          {period.periodName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate ($)</label>
                    <input
                      type="number"
                      name="hourlyRate"
                      value={formData.hourlyRate}
                      onChange={handleFormChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Problem Bonuses */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                  Problem Bonuses
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Writer <span className="text-gray-400">($100/ea)</span>
                    </label>
                    <input
                      type="number"
                      name="writerQualifyingProblems"
                      value={formData.writerQualifyingProblems}
                      onChange={handleFormChange}
                      min="0"
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Review 1 <span className="text-gray-400">($50/ea)</span>
                    </label>
                    <input
                      type="number"
                      name="review1QualifyingProblems"
                      value={formData.review1QualifyingProblems}
                      onChange={handleFormChange}
                      min="0"
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Review 2 <span className="text-gray-400">($30/ea)</span>
                    </label>
                    <input
                      type="number"
                      name="review2QualifyingProblems"
                      value={formData.review2QualifyingProblems}
                      onChange={handleFormChange}
                      min="0"
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Hours */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Hours</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Hours</label>
                    <input
                      type="number"
                      name="totalHours"
                      value={formData.totalHours}
                      onChange={handleFormChange}
                      min="0"
                      step="0.5"
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-center pt-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="is20PercentEligible"
                        checked={formData.is20PercentEligible}
                        onChange={handleFormChange}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">20% Hours Bonus Eligible</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Section 4: Other Bonuses */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Other</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Referrals <span className="text-gray-400">($300/ea)</span>
                    </label>
                    <input
                      type="number"
                      name="initialReferralCount"
                      value={formData.initialReferralCount}
                      onChange={handleFormChange}
                      min="0"
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data Files <span className="text-gray-400">($50/ea)</span>
                    </label>
                    <input
                      type="number"
                      name="dataFilesCount"
                      value={formData.dataFilesCount}
                      onChange={handleFormChange}
                      min="0"
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes <span className="text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleFormChange}
                    rows={2}
                    placeholder="Describe what this bonus is for..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                >
                  {submitting ? 'Adding...' : 'Add Bonus'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                {submitResult?.success && (
                  <span className="text-green-600 font-medium">Added successfully</span>
                )}
                {submitResult?.error && (
                  <span className="text-red-600">{submitResult.error}</span>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
            {error}
          </div>
        )}

        {/* Period Selector */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedPeriod('unpaid')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedPeriod === 'unpaid'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Unpaid
            </button>
            <button
              onClick={() => setSelectedPeriod('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedPeriod === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              All Time
            </button>
            <div className="border-l border-gray-300 mx-2"></div>
            {data?.periods.map((period) => (
              <button
                key={period.id}
                onClick={() => setSelectedPeriod(String(period.id))}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriod === String(period.id)
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {period.periodName}
                {period.isPaid && <span className="ml-1 text-xs opacity-75">(Paid)</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Card */}
        {data && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500 mb-1">{currentPeriodLabel()}</div>
                <div className="text-4xl font-bold text-gray-900">{formatCurrency(data.totals.totalOwed)}</div>
              </div>
              <div className="text-right">
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="text-gray-500">Base:</span>{' '}
                    <span className="font-medium">{formatCurrency(data.totals.baseEarnings)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Bonuses:</span>{' '}
                    <span className="font-medium text-green-600">{formatCurrency(data.totals.totalBonus)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bonus type breakdown */}
            {data.totals.totalBonus > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
                  {data.totals.writerBonus > 0 && (
                    <span>Writer: {formatCurrency(data.totals.writerBonus)}</span>
                  )}
                  {data.totals.review1Bonus > 0 && (
                    <span>Review 1: {formatCurrency(data.totals.review1Bonus)}</span>
                  )}
                  {data.totals.review2Bonus > 0 && (
                    <span>Review 2: {formatCurrency(data.totals.review2Bonus)}</span>
                  )}
                  {data.totals.hoursPercentageBonus > 0 && (
                    <span>20% Hours: {formatCurrency(data.totals.hoursPercentageBonus)}</span>
                  )}
                  {data.totals.salaryIncreaseBonus > 0 && (
                    <span>Salary Adj: {formatCurrency(data.totals.salaryIncreaseBonus)}</span>
                  )}
                  {data.totals.referralBonus > 0 && (
                    <span>Referral: {formatCurrency(data.totals.referralBonus)}</span>
                  )}
                  {data.totals.dataBonus > 0 && (
                    <span>Data: {formatCurrency(data.totals.dataBonus)}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Expert Table */}
        {data && sortedExperts.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-8"></th>
                  <SortHeader label="Expert" sortKeyName="expertName" />
                  <SortHeader label="Total Bonuses" sortKeyName="totalBonus" />
                  <SortHeader label="Total Owed" sortKeyName="totalOwed" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedExperts.map((expert) => (
                  <React.Fragment key={expert.expertId}>
                    <tr
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => toggleExpanded(expert.expertId)}
                    >
                      <td className="px-4 py-4 text-gray-400">
                        <span className={`transform transition-transform inline-block ${expandedExperts.has(expert.expertId) ? 'rotate-90' : ''}`}>
                          ▶
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-medium text-gray-900">
                          {expert.expertName}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-green-600 font-medium">
                          {formatCurrency(expert.totalBonus)}
                        </span>
                        {expert.totalBonus > 0 && (
                          <div className="text-xs text-gray-400 mt-1">
                            {[
                              expert.writerBonus > 0 && `W:${expert.writerQualifyingProblems}`,
                              expert.review1Bonus > 0 && `R1:${expert.review1QualifyingProblems}`,
                              expert.review2Bonus > 0 && `R2:${expert.review2QualifyingProblems}`,
                              expert.hoursPercentageBonus > 0 && '20%',
                              expert.referralBonus > 0 && `Ref:${expert.initialReferralCount}`,
                              expert.dataBonus > 0 && 'Data',
                            ].filter(Boolean).join(' + ')}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(expert.totalOwed)}
                        </span>
                      </td>
                    </tr>
                    {expandedExperts.has(expert.expertId) && renderBonusBreakdown(expert)}
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr className="font-semibold">
                  <td className="px-4 py-4"></td>
                  <td className="px-4 py-4 text-gray-900">
                    Total ({sortedExperts.length} expert{sortedExperts.length !== 1 ? 's' : ''})
                  </td>
                  <td className="px-4 py-4 text-green-600">{formatCurrency(data.totals.totalBonus)}</td>
                  <td className="px-4 py-4 text-gray-900">{formatCurrency(data.totals.totalOwed)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Empty State */}
        {data && sortedExperts.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="text-gray-300 text-5xl mb-4">$</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Bonus Data</h3>
            <p className="text-gray-500 mb-6">
              {selectedPeriod === 'unpaid'
                ? 'All bonuses have been paid, or no data has been added yet.'
                : 'No bonus data for this period.'}
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Add First Bonus
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
