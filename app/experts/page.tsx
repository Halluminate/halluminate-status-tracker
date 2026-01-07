'use client';

import React, { useEffect, useState } from 'react';

interface ExpertStats {
  id: number;
  name: string;
  role: string;
  hourlyRate: number;
  horizonUserId: string | null;
  lastActiveDay: string | null;
  hoursThisWeek: number;
  hoursThisMonth: number;
  totalHours: number;
  problemsThisWeek: number;
  problemsThisMonth: number;
  totalProblems: number;
  pricePerProblem: number | null;
}

interface StatsData {
  experts: ExpertStats[];
  totals: {
    totalExperts: number;
    totalHours: number;
    hoursThisWeek: number;
    hoursThisMonth: number;
    totalProblems: number;
    problemsThisWeek: number;
    problemsThisMonth: number;
  };
}

type SortKey = keyof ExpertStats;
type SortDirection = 'asc' | 'desc';

export default function ExpertsPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('totalHours');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/experts/stats');
        if (res.ok) {
          const json = await res.json();
          setData(json);
          setError(null);
        } else {
          setError('Failed to load data');
        }
      } catch (err) {
        setError('Failed to load data');
      }
      setLoading(false);
    };
    fetchData();
  }, []);

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

        if (aVal === null && bVal === null) return 0;
        if (aVal === null) return 1;
        if (bVal === null) return -1;

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return (aVal - bVal) * multiplier;
        }
        return String(aVal).localeCompare(String(bVal)) * multiplier;
      })
    : [];

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatHours = (value: number) => {
    return value.toFixed(1);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
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

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1600px] mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Expert Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Hours from Rippling timecards • Problems from Horizon
          </p>
        </div>

        {/* Summary Stats */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-500 uppercase">Experts</div>
              <div className="text-xl font-bold text-gray-900">{data.totals.totalExperts}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-500 uppercase">Hours/Week</div>
              <div className="text-xl font-bold text-gray-900">{formatHours(data.totals.hoursThisWeek)}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-500 uppercase">Hours/Month</div>
              <div className="text-xl font-bold text-gray-900">{formatHours(data.totals.hoursThisMonth)}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-500 uppercase">Total Hours</div>
              <div className="text-xl font-bold text-gray-900">{formatHours(data.totals.totalHours)}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-500 uppercase">Problems/Week</div>
              <div className="text-xl font-bold text-blue-600">{data.totals.problemsThisWeek}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-500 uppercase">Problems/Month</div>
              <div className="text-xl font-bold text-blue-600">{data.totals.problemsThisMonth}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-500 uppercase">Total Problems</div>
              <div className="text-xl font-bold text-green-600">{data.totals.totalProblems}</div>
            </div>
          </div>
        )}

        {/* Expert Table */}
        {data && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <SortHeader label="Name" sortKeyName="name" />
                    <SortHeader label="Role" sortKeyName="role" />
                    <SortHeader label="Rate" sortKeyName="hourlyRate" />
                    <SortHeader label="Last Active" sortKeyName="lastActiveDay" />
                    <SortHeader label="Hrs/Week" sortKeyName="hoursThisWeek" className="text-right" />
                    <SortHeader label="Hrs/Month" sortKeyName="hoursThisMonth" className="text-right" />
                    <SortHeader label="Total Hrs" sortKeyName="totalHours" className="text-right" />
                    <SortHeader label="Prob/Week" sortKeyName="problemsThisWeek" className="text-right" />
                    <SortHeader label="Prob/Month" sortKeyName="problemsThisMonth" className="text-right" />
                    <SortHeader label="$/Problem" sortKeyName="pricePerProblem" className="text-right" />
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedExperts.map((expert) => (
                    <tr key={expert.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{expert.name}</span>
                          {expert.horizonUserId && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 border border-green-200">
                              H
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          expert.role === 'Contractor'
                            ? 'bg-purple-50 text-purple-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {expert.role}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(expert.hourlyRate)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(expert.lastActiveDay)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-right font-mono text-gray-900">
                        {formatHours(expert.hoursThisWeek)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-right font-mono text-gray-900">
                        {formatHours(expert.hoursThisMonth)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-right font-mono font-medium text-gray-900">
                        {formatHours(expert.totalHours)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-right font-mono text-blue-600">
                        {expert.problemsThisWeek}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-right font-mono text-blue-600">
                        {expert.problemsThisMonth}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-right font-mono text-gray-500">
                        {formatCurrency(expert.pricePerProblem)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {data && sortedExperts.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-500">No experts found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
