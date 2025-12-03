'use client';

import React, { useEffect, useState } from 'react';

interface ExpertSummary {
  id: number;
  name: string;
  hourlyRate: number;
  problemsInProgress: number;
  problemsDelivered: number;
  totalProblemsAssigned: number;
  totalHours: number;
  totalCost: number;
  costPerAssigned: number | null;
  costPerDelivered: number | null;
}

interface DashboardData {
  experts: ExpertSummary[];
  statusCounts: Record<string, number>;
  totals: {
    totalExperts: number;
    totalHours: number;
    totalCost: number;
    totalProblems: number;
    totalProblemsDelivered: number;
    totalProblemsInProgress: number;
  };
}

type SortKey = keyof ExpertSummary;
type SortDirection = 'asc' | 'desc';

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('totalCost');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showImport, setShowImport] = useState(false);
  const [importType, setImportType] = useState<'pe-csv' | 'ib-csv' | 'rippling'>('rippling');
  const [importData, setImportData] = useState('');
  const [importFilePath, setImportFilePath] = useState('');
  const [weekStart, setWeekStart] = useState('');
  const [importResult, setImportResult] = useState<{ imported?: number; errors?: string[] } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ pe?: { synced: number; errors: string[] }; ib?: { synced: number; errors: string[] } } | null>(null);
  const [expandedExpert, setExpandedExpert] = useState<number | null>(null);
  const [expertBreakdown, setExpertBreakdown] = useState<Record<string, number> | null>(null);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch('/api/experts');
    if (res.ok) {
      const json = await res.json();
      setData(json);
      setError(null);
    } else {
      setError('Failed to load data');
    }
    setLoading(false);
  };

  useEffect(() => {
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

  const handleImport = async () => {
    setImportResult(null);
    const body: Record<string, string> = { type: importType };

    if (importType === 'rippling') {
      body.data = importData;
      if (weekStart) body.weekStart = weekStart;
    } else {
      body.filePath = importFilePath;
    }

    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const result = await res.json();
    setImportResult(result);

    if (res.ok) {
      fetchData();
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);

    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const result = await res.json();
    setSyncResult(result);
    setSyncing(false);

    if (res.ok) {
      fetchData();
    }
  };

  const handleExpertClick = async (expertId: number) => {
    if (expandedExpert === expertId) {
      setExpandedExpert(null);
      setExpertBreakdown(null);
      return;
    }

    setExpandedExpert(expertId);
    setLoadingBreakdown(true);

    const res = await fetch(`/api/experts/${expertId}/breakdown`);
    if (res.ok) {
      const data = await res.json();
      setExpertBreakdown(data.breakdown);
    }
    setLoadingBreakdown(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Delivered':
        return 'bg-green-100 text-green-800';
      case 'Problem Writeup':
      case 'Problem Feedback':
      case 'Problem QA':
      case 'Feedback Requested':
        return 'bg-blue-100 text-blue-800';
      case 'QA':
      case 'QA Issues':
        return 'bg-yellow-100 text-yellow-800';
      case 'Blocked':
        return 'bg-red-100 text-red-800';
      case 'Taiga Testing':
      case 'Ready for Taiga':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const sortedExperts = data?.experts
    ? [...data.experts].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        const multiplier = sortDirection === 'asc' ? 1 : -1;

        // Handle null values - push them to the bottom
        if (aVal === null && bVal === null) return 0;
        if (aVal === null) return 1;
        if (bVal === null) return -1;

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

  const formatHours = (value: number) => {
    return value.toFixed(1) + 'h';
  };

  const SortHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Expert Management</h1>
            <p className="text-gray-900 mt-1">Problem Delivery Tracking</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {syncing ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Syncing...
                </>
              ) : (
                'Sync from Sheets'
              )}
            </button>
            <button
              onClick={() => setShowImport(!showImport)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {showImport ? 'Hide Import' : 'Import Data'}
            </button>
          </div>
        </div>

        {/* Sync Result */}
        {syncResult && (
          <div className={`rounded-lg p-4 mb-6 ${syncResult.pe?.errors?.length || syncResult.ib?.errors?.length ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
            <div className="flex items-center gap-2">
              <span className="font-medium">Sync Complete:</span>
              {syncResult.pe && <span>PE: {syncResult.pe.synced} problems</span>}
              {syncResult.pe && syncResult.ib && <span>|</span>}
              {syncResult.ib && <span>IB: {syncResult.ib.synced} problems</span>}
              <button onClick={() => setSyncResult(null)} className="ml-auto text-gray-500 hover:text-gray-700">&times;</button>
            </div>
            {(syncResult.pe?.errors?.length || syncResult.ib?.errors?.length) ? (
              <div className="text-sm text-yellow-700 mt-2">
                {syncResult.pe?.errors?.map((e, i) => <div key={`pe-${i}`}>PE: {e}</div>)}
                {syncResult.ib?.errors?.map((e, i) => <div key={`ib-${i}`}>IB: {e}</div>)}
              </div>
            ) : null}
          </div>
        )}

        {/* Import Panel */}
        {showImport && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Import Data</h2>
            <div className="flex gap-4 mb-4">
              <button
                onClick={() => setImportType('rippling')}
                className={`px-3 py-1 rounded ${
                  importType === 'rippling'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Rippling Time
              </button>
              <button
                onClick={() => setImportType('pe-csv')}
                className={`px-3 py-1 rounded ${
                  importType === 'pe-csv'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                PE Catalog CSV
              </button>
              <button
                onClick={() => setImportType('ib-csv')}
                className={`px-3 py-1 rounded ${
                  importType === 'ib-csv'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                IB Catalog CSV
              </button>
            </div>

            {importType === 'rippling' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Week Start Date (optional)
                  </label>
                  <input
                    type="date"
                    value={weekStart}
                    onChange={(e) => setWeekStart(e.target.value)}
                    className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Paste Rippling Time Data
                  </label>
                  <textarea
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder="Paste the time tracking data from Rippling here..."
                    className="w-full h-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CSV File Path
                </label>
                <input
                  type="text"
                  value={importFilePath}
                  onChange={(e) => setImportFilePath(e.target.value)}
                  placeholder="/path/to/catalog.csv"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            <div className="mt-4 flex items-center gap-4">
              <button
                onClick={handleImport}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Import
              </button>
              {importResult && (
                <span className={importResult.errors?.length ? 'text-red-600' : 'text-green-600'}>
                  {importResult.imported !== undefined && `Imported ${importResult.imported} records`}
                  {importResult.errors?.length ? ` (${importResult.errors.length} errors)` : ''}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Summary Cards */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-sm font-medium text-gray-900">Total Experts</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{data.totals.totalExperts}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-sm font-medium text-gray-900">Total Hours</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {formatHours(data.totals.totalHours)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-sm font-medium text-gray-900">Total Cost</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(data.totals.totalCost)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-sm font-medium text-gray-900">Total Problems</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                {data.totals.totalProblems}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-sm font-medium text-gray-900">In Progress</div>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                {data.totals.totalProblemsInProgress}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-sm font-medium text-gray-900">Delivered</div>
              <div className="text-2xl font-bold text-green-600 mt-1">
                {data.totals.totalProblemsDelivered}
              </div>
            </div>
          </div>
        )}


        {/* Expert Table */}
        {data && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Expert Performance</h2>
              <p className="text-sm text-gray-900">Click column headers to sort</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <SortHeader label="Name" sortKeyName="name" />
                    <SortHeader label="Rate" sortKeyName="hourlyRate" />
                    <SortHeader label="Total Assigned" sortKeyName="totalProblemsAssigned" />
                    <SortHeader label="In Progress" sortKeyName="problemsInProgress" />
                    <SortHeader label="Delivered" sortKeyName="problemsDelivered" />
                    <SortHeader label="Hours" sortKeyName="totalHours" />
                    <SortHeader label="Cost" sortKeyName="totalCost" />
                    <SortHeader label="Cost/Assigned" sortKeyName="costPerAssigned" />
                    <SortHeader label="Cost/Delivered" sortKeyName="costPerDelivered" />
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedExperts.map((expert) => {
                    const isExpanded = expandedExpert === expert.id;
                    return (
                      <React.Fragment key={expert.id}>
                        <tr
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleExpertClick(expert.id)}
                        >
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                ▶
                              </span>
                              <div className="font-medium text-gray-900">{expert.name}</div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-gray-500">
                            {formatCurrency(expert.hourlyRate)}/hr
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-gray-500">
                            {expert.totalProblemsAssigned}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${expert.problemsInProgress > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                              {expert.problemsInProgress}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {expert.problemsDelivered}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-gray-500">
                            {formatHours(expert.totalHours)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap font-medium text-gray-900">
                            {formatCurrency(expert.totalCost)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-gray-500">
                            {expert.costPerAssigned ? formatCurrency(expert.costPerAssigned) : '-'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-gray-500">
                            {expert.costPerDelivered ? formatCurrency(expert.costPerDelivered) : '-'}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${expert.id}-breakdown`}>
                            <td colSpan={9} className="px-0 py-0 bg-gray-50">
                              {loadingBreakdown ? (
                                <div className="px-4 py-3 text-gray-500">Loading...</div>
                              ) : expertBreakdown && Object.keys(expertBreakdown).length > 0 ? (
                                <table className="min-w-full">
                                  <thead>
                                    <tr className="bg-gray-100">
                                      {Object.keys(expertBreakdown).map((status) => (
                                        <th key={status} className="px-4 py-2 text-xs font-medium text-gray-700 text-center">
                                          {status}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr>
                                      {Object.entries(expertBreakdown).map(([status, count]) => (
                                        <td key={status} className="px-4 py-2 text-center">
                                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                                            {count}
                                          </span>
                                        </td>
                                      ))}
                                    </tr>
                                  </tbody>
                                </table>
                              ) : (
                                <div className="px-4 py-3 text-gray-500">No problems assigned</div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
        )}

        {/* Empty State */}
        {data && sortedExperts.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-500">No data yet. Import CSV files or Rippling data to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
