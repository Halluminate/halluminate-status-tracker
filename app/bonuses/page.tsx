'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

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
  periods: { periodName: string; periodStart: string; periodEnd: string }[];
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
}

type SortKey = 'expertName' | 'totalOwed' | 'totalBonus' | 'writerBonus' | 'review1Bonus' | 'review2Bonus' | 'hoursPercentageBonus' | 'referralBonus' | 'dataBonus';
type SortDirection = 'asc' | 'desc';

export default function BonusesPage() {
  const [data, setData] = useState<BonusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'unpaid' | 'all'>('unpaid');
  const [sortKey, setSortKey] = useState<SortKey>('totalOwed');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bonuses?view=${view}`);
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

  useEffect(() => {
    fetchData();
  }, [view]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
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

  const SortHeader = ({ label, sortKeyName, className = '' }: { label: string; sortKeyName: SortKey; className?: string }) => (
    <th
      className={`px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 ${className}`}
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

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading bonus data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bonus Management</h1>
            <p className="text-gray-600 mt-1">What I Owe - Expert Bonus Tracker</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/experts"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Back to Experts
            </Link>
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* View Toggle */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setView('unpaid')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              view === 'unpaid'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Unpaid Only
          </button>
          <button
            onClick={() => setView('all')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              view === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All Bonuses
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-sm font-medium text-gray-600">Total Owed</div>
              <div className="text-2xl font-bold text-red-600 mt-1">
                {formatCurrency(data.totals.totalOwed)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-sm font-medium text-gray-600">Base Earnings</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(data.totals.baseEarnings)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-sm font-medium text-gray-600">Total Bonuses</div>
              <div className="text-2xl font-bold text-green-600 mt-1">
                {formatCurrency(data.totals.totalBonus)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-sm font-medium text-gray-600">Experts</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {data.experts.length}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-sm font-medium text-gray-600">Periods</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {data.periods.length}
              </div>
            </div>
          </div>
        )}

        {/* Bonus Breakdown Cards */}
        {data && data.totals.totalBonus > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-xs font-medium text-red-700">Writer</div>
              <div className="text-lg font-bold text-red-800">{formatCurrency(data.totals.writerBonus)}</div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="text-xs font-medium text-orange-700">Review 1</div>
              <div className="text-lg font-bold text-orange-800">{formatCurrency(data.totals.review1Bonus)}</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="text-xs font-medium text-yellow-700">Review 2</div>
              <div className="text-lg font-bold text-yellow-800">{formatCurrency(data.totals.review2Bonus)}</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-xs font-medium text-green-700">Hours 20%</div>
              <div className="text-lg font-bold text-green-800">{formatCurrency(data.totals.hoursPercentageBonus)}</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-xs font-medium text-blue-700">Salary Inc</div>
              <div className="text-lg font-bold text-blue-800">{formatCurrency(data.totals.salaryIncreaseBonus)}</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="text-xs font-medium text-purple-700">Referral</div>
              <div className="text-lg font-bold text-purple-800">{formatCurrency(data.totals.referralBonus)}</div>
            </div>
            <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-700">Data</div>
              <div className="text-lg font-bold text-gray-800">{formatCurrency(data.totals.dataBonus)}</div>
            </div>
          </div>
        )}

        {/* Expert Bonus Table */}
        {data && sortedExperts.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {view === 'unpaid' ? 'Unpaid Bonuses by Expert' : 'All Bonuses by Expert'}
              </h2>
              <p className="text-sm text-gray-500">Click column headers to sort</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <SortHeader label="Expert" sortKeyName="expertName" />
                    <th className="px-3 py-3 text-left text-xs font-medium text-red-600 uppercase tracking-wider bg-red-50">Writer</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-orange-600 uppercase tracking-wider bg-orange-50">Rev 1</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-yellow-600 uppercase tracking-wider bg-yellow-50">Rev 2</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-green-600 uppercase tracking-wider bg-green-50">20%</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-blue-600 uppercase tracking-wider bg-blue-50">Salary</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-purple-600 uppercase tracking-wider bg-purple-50">Referral</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider bg-gray-100">Data</th>
                    <SortHeader label="Total Bonus" sortKeyName="totalBonus" />
                    <SortHeader label="Total Owed" sortKeyName="totalOwed" />
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedExperts.map((expert) => (
                    <tr key={expert.expertId} className="hover:bg-gray-50">
                      <td className="px-3 py-4 whitespace-nowrap">
                        <Link
                          href={`/experts/${expert.expertId}`}
                          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {expert.expertName}
                        </Link>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm bg-red-50">
                        {Number(expert.writerBonus) > 0 ? formatCurrency(expert.writerBonus) : '-'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm bg-orange-50">
                        {Number(expert.review1Bonus) > 0 ? formatCurrency(expert.review1Bonus) : '-'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm bg-yellow-50">
                        {Number(expert.review2Bonus) > 0 ? formatCurrency(expert.review2Bonus) : '-'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm bg-green-50">
                        {Number(expert.hoursPercentageBonus) > 0 ? formatCurrency(expert.hoursPercentageBonus) : '-'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm bg-blue-50">
                        {Number(expert.salaryIncreaseBonus) > 0 ? formatCurrency(expert.salaryIncreaseBonus) : '-'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm bg-purple-50">
                        {Number(expert.referralBonus) > 0 ? formatCurrency(expert.referralBonus) : '-'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm bg-gray-100">
                        {Number(expert.dataBonus) > 0 ? formatCurrency(expert.dataBonus) : '-'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap font-medium text-green-700">
                        {formatCurrency(expert.totalBonus)}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap font-bold text-red-700">
                        {formatCurrency(expert.totalOwed)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 font-semibold">
                  <tr>
                    <td className="px-3 py-4">TOTAL</td>
                    <td className="px-3 py-4 bg-red-100">{formatCurrency(data.totals.writerBonus)}</td>
                    <td className="px-3 py-4 bg-orange-100">{formatCurrency(data.totals.review1Bonus)}</td>
                    <td className="px-3 py-4 bg-yellow-100">{formatCurrency(data.totals.review2Bonus)}</td>
                    <td className="px-3 py-4 bg-green-100">{formatCurrency(data.totals.hoursPercentageBonus)}</td>
                    <td className="px-3 py-4 bg-blue-100">{formatCurrency(data.totals.salaryIncreaseBonus)}</td>
                    <td className="px-3 py-4 bg-purple-100">{formatCurrency(data.totals.referralBonus)}</td>
                    <td className="px-3 py-4 bg-gray-200">{formatCurrency(data.totals.dataBonus)}</td>
                    <td className="px-3 py-4 text-green-700">{formatCurrency(data.totals.totalBonus)}</td>
                    <td className="px-3 py-4 text-red-700">{formatCurrency(data.totals.totalOwed)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {data && sortedExperts.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-gray-400 text-5xl mb-4">💰</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Bonus Data Yet</h3>
            <p className="text-gray-500">
              {view === 'unpaid'
                ? 'All bonuses have been paid, or no bonus data has been imported yet.'
                : 'Import bonus data from Excel to see expert bonuses here.'}
            </p>
          </div>
        )}

        {/* Rate Reference */}
        {data && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Bonus Rate Reference</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Writer:</span>{' '}
                <span className="font-medium">${data.parameters.writerPerProblem}/problem</span>
              </div>
              <div>
                <span className="text-gray-500">Review 1:</span>{' '}
                <span className="font-medium">${data.parameters.review1PerProblem}/problem</span>
              </div>
              <div>
                <span className="text-gray-500">Review 2:</span>{' '}
                <span className="font-medium">${data.parameters.review2PerProblem}/problem</span>
              </div>
              <div>
                <span className="text-gray-500">Hours:</span>{' '}
                <span className="font-medium">{(data.parameters.hoursPercentRate * 100).toFixed(0)}% of base</span>
              </div>
              <div>
                <span className="text-gray-500">Referral:</span>{' '}
                <span className="font-medium">${data.parameters.referralBonusAmount}/referral</span>
              </div>
              <div>
                <span className="text-gray-500">Data:</span>{' '}
                <span className="font-medium">${data.parameters.defaultDataFilePrice}/file</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
