'use client';

import { useEffect, useState } from 'react';
import StatusTable from '@/components/status/StatusTable';
import ExpertTable from '@/components/status/ExpertTable';
import KPICards from '@/components/status/KPICards';
import { CombinedData } from '@/types/status';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, AlertCircle } from 'lucide-react';

export default function Home() {
  const [data, setData] = useState<CombinedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'All' | 'PE' | 'IB'>('All');
  const [view, setView] = useState<'weekly' | 'expert'>('weekly');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/sheets');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to fetch data');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Filter data based on selection
  const filteredData = data ? {
    ...data,
    sheets: filter === 'All'
      ? data.sheets
      : data.sheets.filter(sheet => sheet.name === filter),
    expertSheets: filter === 'All'
      ? data.expertSheets
      : data.expertSheets.filter(sheet => sheet.name === filter)
  } : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Problem Management</h1>
            {data && (
              <p className="text-sm text-muted-foreground mt-1">
                Last updated: {new Date(data.lastUpdated).toLocaleString()}
              </p>
            )}
          </div>
          <div className="flex gap-3 items-center">
            {/* Filter Dropdown */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'All' | 'PE' | 'IB')}
              className="px-4 py-2 border border-input rounded-md bg-background text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="All">All</option>
              <option value="PE">PE</option>
              <option value="IB">IB</option>
            </select>
            <Button
              onClick={fetchData}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading && !data && (
          <div className="flex items-center justify-center py-12">
            <div className="text-lg text-muted-foreground">Loading data...</div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-destructive mb-8">
            <CardHeader className="pb-3">
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Error loading data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-destructive/80">{error}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Make sure you have configured the Google Sheets API credentials in .env.local
              </p>
            </CardContent>
          </Card>
        )}

        {/* Dashboard Content */}
        {filteredData && !loading && (
          <>
            {/* Status Distribution Progress Tracker */}
            {(() => {
              // Get counts for each status
              const getStatusCount = (status: string) => {
                return filteredData.sheets.reduce((sum, sheet) => {
                  const row = sheet.rows.find(r => r.status === status);
                  return sum + (row?.total || 0);
                }, 0);
              };

              const statuses = [
                { name: 'In-Progress', count: getStatusCount('In-Progress'), color: '#3B82F6' }, // blue
                { name: 'Review 1', count: getStatusCount('Review 1'), color: '#06B6D4' }, // cyan
                { name: 'Review 2', count: getStatusCount('Review 2'), color: '#FBBF24' }, // yellow
                { name: 'Trajectory Testing', count: getStatusCount('Trajectory Testing'), color: '#F97316' }, // orange
                { name: 'Ready for Delivery', count: getStatusCount('Ready for Delivery'), color: '#14B8A6' }, // teal
                { name: 'Delivered', count: getStatusCount('Delivered'), color: '#22C55E' }, // green
                { name: 'Blocked', count: getStatusCount('Blocked'), color: '#EF4444' }, // red
              ];

              const totalProblems = statuses.reduce((sum, s) => sum + s.count, 0);
              const goal = 500;

              return (
                <div className="mb-8 p-6 bg-card border border-border rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-lg font-semibold text-foreground">Status Distribution</h2>
                    <div className="text-right">
                      <span className="text-3xl font-bold text-foreground">{totalProblems}</span>
                      <span className="text-lg text-muted-foreground"> problems</span>
                    </div>
                  </div>

                  {/* Stacked Progress Bar */}
                  <div className="w-full bg-muted rounded-full h-4 overflow-hidden flex">
                    {statuses.map((status) => {
                      const widthPercent = totalProblems > 0 ? (status.count / goal) * 100 : 0;
                      if (status.count === 0) return null;
                      return (
                        <div
                          key={status.name}
                          className="h-full transition-all duration-500"
                          style={{
                            width: `${widthPercent}%`,
                            backgroundColor: status.color,
                          }}
                          title={`${status.name}: ${status.count}`}
                        />
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
                    {statuses.map((status) => (
                      <div key={status.name} className="flex items-center gap-1.5 text-sm">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        <span className="text-muted-foreground">{status.name}</span>
                        <span className="font-medium text-foreground">{status.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <KPICards data={filteredData.sheets} />

            {/* View Toggle */}
            <div className="mb-6 flex gap-2">
              <Button
                onClick={() => setView('weekly')}
                variant={view === 'weekly' ? 'default' : 'secondary'}
                className="px-6"
              >
                Weekly Progress View
              </Button>
              <Button
                onClick={() => setView('expert')}
                variant={view === 'expert' ? 'default' : 'secondary'}
                className="px-6"
              >
                Expert View
              </Button>
            </div>

            {/* Content based on view */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {view === 'weekly' ? 'Weekly Progress Overview' : 'Expert Overview'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {view === 'weekly' ? (
                  <StatusTable data={filteredData.sheets} />
                ) : (
                  <ExpertTable data={filteredData.expertSheets} />
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
