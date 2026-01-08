'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Info, Search, X } from 'lucide-react';
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
  reviewsThisWeek: number;
  reviewsThisMonth: number;
  totalReviews: number;
  trajThisWeek: number;
  trajThisMonth: number;
  totalTraj: number;
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
    totalReviews: number;
    reviewsThisWeek: number;
    reviewsThisMonth: number;
    totalTraj: number;
    trajThisWeek: number;
    trajThisMonth: number;
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
  const [searchQuery, setSearchQuery] = useState('');

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

  // Filter experts by search query, then sort
  const sortedExperts = useMemo(() => {
    if (!data?.experts) return [];

    // Filter by search query (case-insensitive, matches name or role)
    const filtered = searchQuery.trim()
      ? data.experts.filter(expert =>
          expert.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          expert.role.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : data.experts;

    // Sort filtered results
    return [...filtered].sort((a, b) => {
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
    });
  }, [data?.experts, searchQuery, sortKey, sortDirection]);

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
    return (
      <th
        className={`px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/50 ${className}`}
        onClick={() => handleSort(sortKeyName)}
      >
        <div className="flex items-center gap-1">
          {label}
          {sortKey === sortKeyName && (
            <span className="text-primary">{sortDirection === 'asc' ? '↑' : '↓'}</span>
          )}
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="ml-1 text-muted-foreground/70 hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </th>
    );
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <div className="bg-muted rounded-lg p-4">
              <div className="text-xs font-medium text-muted-foreground uppercase">Experts</div>
              <div className="text-xl font-bold text-foreground">{data.totals.totalExperts}</div>
            </div>
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase">
                Hours/Week
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground/70 hover:text-foreground">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-sm">
                      <div className="font-medium">{formatDateRange(data.metadata.weekStart, data.metadata.weekEnd)}</div>
                      <div className="text-muted-foreground">Last Rippling sync: {formatSyncTime(data.metadata.lastRipplingSync)}</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="text-xl font-bold text-foreground">{formatHours(data.totals.hoursThisWeek)}</div>
            </div>
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

        {/* Search Bar */}
        {data && (
          <div className="mb-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-background rounded"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
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
                    <SortHeader label="Total Hrs" sortKeyName="totalHours" className="text-right" />
                    <SortHeader label="Prob/Week" sortKeyName="problemsThisWeek" className="text-right" />
                    <SortHeader label="Prob/Month" sortKeyName="problemsThisMonth" className="text-right" />
                    <SortHeader label="Rev/Week" sortKeyName="reviewsThisWeek" className="text-right" />
                    <SortHeader label="Rev/Month" sortKeyName="reviewsThisMonth" className="text-right" />
                    <SortHeader label="Total Rev" sortKeyName="totalReviews" className="text-right" />
                    <SortHeader label="Traj/Month" sortKeyName="trajThisMonth" className="text-right" />
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
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-right font-mono font-medium text-foreground">
                        {formatHours(expert.totalHours)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-right font-mono text-primary">
                        {expert.problemsThisWeek}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-right font-mono text-primary">
                        {expert.problemsThisMonth}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-right font-mono text-orange-400">
                        {expert.reviewsThisWeek || ''}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-right font-mono text-orange-400">
                        {expert.reviewsThisMonth || ''}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-right font-mono font-medium text-orange-400">
                        {expert.totalReviews || ''}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-right font-mono text-teal-400">
                        {expert.trajThisMonth || ''}
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
            <p className="text-muted-foreground">
              {searchQuery
                ? `No experts matching "${searchQuery}"`
                : 'No experts found.'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-sm text-primary hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
