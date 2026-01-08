'use client';

import React, { useEffect, useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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

interface Metadata {
  weekStart: string;
  weekEnd: string;
  monthStart: string;
  monthEnd: string;
  lastRipplingSync: string | null;
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
  metadata: Metadata;
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

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
  };

  const formatSyncTime = (syncTime: string | null) => {
    if (!syncTime) return 'Never';
    const date = new Date(syncTime);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const SortHeader = ({ label, sortKeyName, className = '', tooltip }: { label: string; sortKeyName: SortKey; className?: string; tooltip?: React.ReactNode }) => {
    const header = (
      <th
        className={`px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/50 ${className}`}
        onClick={() => handleSort(sortKeyName)}
      >
        <div className="flex items-center gap-1">
          {label}
          {sortKey === sortKeyName && (
            <span className="text-primary">{sortDirection === 'asc' ? '↑' : '↓'}</span>
          )}
        </div>
      </th>
    );

    if (tooltip) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            {header}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      );
    }

    return header;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-destructive">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1600px] mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Expert Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Hours from Rippling timecards • Problems from Horizon
            {data?.metadata?.lastRipplingSync && (
              <span className="ml-2">• Last sync: {formatSyncTime(data.metadata.lastRipplingSync)}</span>
            )}
          </p>
        </div>

        {/* Summary Stats */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
            <div className="bg-muted rounded-lg p-4">
              <div className="text-xs font-medium text-muted-foreground uppercase">Experts</div>
              <div className="text-xl font-bold text-foreground">{data.totals.totalExperts}</div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="bg-muted rounded-lg p-4 cursor-help">
                  <div className="text-xs font-medium text-muted-foreground uppercase">Hours/Week</div>
                  <div className="text-xl font-bold text-foreground">{formatHours(data.totals.hoursThisWeek)}</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">
                  <div className="font-medium">{formatDateRange(data.metadata.weekStart, data.metadata.weekEnd)}</div>
                  <div className="text-muted-foreground">Last Rippling sync: {formatSyncTime(data.metadata.lastRipplingSync)}</div>
                </div>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="bg-muted rounded-lg p-4 cursor-help">
                  <div className="text-xs font-medium text-muted-foreground uppercase">Hours/Month</div>
                  <div className="text-xl font-bold text-foreground">{formatHours(data.totals.hoursThisMonth)}</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">
                  <div className="font-medium">{formatDateRange(data.metadata.monthStart, data.metadata.monthEnd)}</div>
                  <div className="text-muted-foreground">Last Rippling sync: {formatSyncTime(data.metadata.lastRipplingSync)}</div>
                </div>
              </TooltipContent>
            </Tooltip>
            <div className="bg-muted rounded-lg p-4">
              <div className="text-xs font-medium text-muted-foreground uppercase">Total Hours</div>
              <div className="text-xl font-bold text-foreground">{formatHours(data.totals.totalHours)}</div>
            </div>
            <div className="bg-muted rounded-lg p-4">
              <div className="text-xs font-medium text-muted-foreground uppercase">Problems/Week</div>
              <div className="text-xl font-bold text-primary">{data.totals.problemsThisWeek}</div>
            </div>
            <div className="bg-muted rounded-lg p-4">
              <div className="text-xs font-medium text-muted-foreground uppercase">Problems/Month</div>
              <div className="text-xl font-bold text-primary">{data.totals.problemsThisMonth}</div>
            </div>
            <div className="bg-muted rounded-lg p-4">
              <div className="text-xs font-medium text-muted-foreground uppercase">Total Problems</div>
              <div className="text-xl font-bold text-green-500">{data.totals.totalProblems}</div>
            </div>
          </div>
        )}

        {/* Expert Table */}
        {data && (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <SortHeader label="Name" sortKeyName="name" />
                    <SortHeader label="Role" sortKeyName="role" />
                    <SortHeader label="Rate" sortKeyName="hourlyRate" />
                    <SortHeader label="Last Active" sortKeyName="lastActiveDay" />
                    <SortHeader
                      label="Hrs/Week"
                      sortKeyName="hoursThisWeek"
                      className="text-right"
                      tooltip={
                        <div className="text-sm">
                          <div className="font-medium">{formatDateRange(data.metadata.weekStart, data.metadata.weekEnd)}</div>
                          <div className="text-muted-foreground">Last Rippling sync: {formatSyncTime(data.metadata.lastRipplingSync)}</div>
                        </div>
                      }
                    />
                    <SortHeader
                      label="Hrs/Month"
                      sortKeyName="hoursThisMonth"
                      className="text-right"
                      tooltip={
                        <div className="text-sm">
                          <div className="font-medium">{formatDateRange(data.metadata.monthStart, data.metadata.monthEnd)}</div>
                          <div className="text-muted-foreground">Last Rippling sync: {formatSyncTime(data.metadata.lastRipplingSync)}</div>
                        </div>
                      }
                    />
                    <SortHeader label="Total Hrs" sortKeyName="totalHours" className="text-right" />
                    <SortHeader label="Prob/Week" sortKeyName="problemsThisWeek" className="text-right" />
                    <SortHeader label="Prob/Month" sortKeyName="problemsThisMonth" className="text-right" />
                    <SortHeader label="$/Problem" sortKeyName="pricePerProblem" className="text-right" />
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {sortedExperts.map((expert) => (
                    <tr key={expert.id} className="hover:bg-muted/50">
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{expert.name}</span>
                          {expert.horizonUserId && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                              H
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          expert.role === 'Contractor'
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {expert.role}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                        {formatCurrency(expert.hourlyRate)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(expert.lastActiveDay)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-right font-mono text-foreground">
                        {formatHours(expert.hoursThisWeek)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-right font-mono text-foreground">
                        {formatHours(expert.hoursThisMonth)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-right font-mono font-medium text-foreground">
                        {formatHours(expert.totalHours)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-right font-mono text-primary">
                        {expert.problemsThisWeek}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-right font-mono text-primary">
                        {expert.problemsThisMonth}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-right font-mono text-muted-foreground">
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
          <div className="bg-card rounded-lg shadow-sm border border-border p-12 text-center">
            <p className="text-muted-foreground">No experts found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
