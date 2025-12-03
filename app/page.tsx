'use client';

import { useEffect, useState } from 'react';
import StatusTable from '@/components/status/StatusTable';
import ExpertTable from '@/components/status/ExpertTable';
import SummaryStats from '@/components/status/SummaryStats';
import { CombinedData } from '@/types/status';

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
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Project Status Tracker</h1>
            {data && (
              <p className="text-sm text-gray-500 mt-1">
                Last updated: {new Date(data.lastUpdated).toLocaleString()}
              </p>
            )}
          </div>
          <div className="flex gap-4 items-center">
            {/* Filter Dropdown */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'All' | 'PE' | 'IB')}
              className="px-4 py-2 border-2 border-gray-800 rounded-lg bg-white text-black font-medium focus:outline-none focus:ring-2 focus:ring-gray-600"
            >
              <option value="All">All</option>
              <option value="PE">PE</option>
              <option value="IB">IB</option>
            </select>
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && !data && (
          <div className="flex items-center justify-center py-12">
            <div className="text-lg text-gray-600">Loading data...</div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-8">
            <h3 className="text-red-800 font-semibold mb-2">Error loading data</h3>
            <p className="text-red-600">{error}</p>
            <p className="text-sm text-red-500 mt-2">
              Make sure you have configured the Google Sheets API credentials in .env.local
            </p>
          </div>
        )}

        {/* Dashboard Content */}
        {filteredData && !loading && (
          <>
            <SummaryStats data={filteredData.sheets} />

            {/* View Toggle */}
            <div className="mb-6 flex gap-2">
              <button
                onClick={() => setView('weekly')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  view === 'weekly'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Weekly Progress View
              </button>
              <button
                onClick={() => setView('expert')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  view === 'expert'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Expert View
              </button>
            </div>

            {/* Content based on view */}
            <div className="bg-white border-2 border-gray-800 rounded-lg p-6">
              {view === 'weekly' ? (
                <>
                  <h2 className="text-xl font-bold text-black mb-4">Weekly Progress Overview</h2>
                  <StatusTable data={filteredData.sheets} />
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-black mb-4">Expert Overview</h2>
                  <ExpertTable data={filteredData.expertSheets} />
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
