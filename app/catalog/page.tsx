'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DetailedProblem {
  id: number;
  problemId: string;
  specNumber: string | null;
  environment: 'PE' | 'IB';
  status: string;
  week: number | null;
  smeName: string | null;
  feedbackName: string | null;
  qaName: string | null;
  engineerName: string | null;
  contentReviewerName: string | null;
  reviewerName: string | null;
  finalReviewerName: string | null;
  problemDoc: string | null;
  groundTruth: string | null;
  specFolder: string | null;
  specDoc: string | null;
  specDataFolder: string | null;
  dockerContainer: string | null;
  prLink: string | null;
  blockerReason: string | null;
  sonnetPassRate: number | null;
  opusPassRate: number | null;
  separateEnvironmentInit: boolean;
  taigaTag: string | null;
  explainerVideo: string | null;
  taskDescription: string | null;
  notes: string | null;
}

type SortField = keyof DetailedProblem;

export default function CatalogPage() {
  const [problems, setProblems] = useState<DetailedProblem[]>([]);
  const [filteredProblems, setFilteredProblems] = useState<DetailedProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'All' | 'PE' | 'IB'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('problemId');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [problems, filter, searchTerm, sortField, sortDirection]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/catalog');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to fetch data');
      }
      const result = await response.json();
      setProblems(result.problems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...problems];

    // Environment filter
    if (filter !== 'All') {
      filtered = filtered.filter(p => p.environment === filter);
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.problemId?.toLowerCase().includes(term) ||
        p.specNumber?.toLowerCase().includes(term) ||
        p.status?.toLowerCase().includes(term) ||
        p.smeName?.toLowerCase().includes(term) ||
        p.engineerName?.toLowerCase().includes(term) ||
        p.taskDescription?.toLowerCase().includes(term)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    setFilteredProblems(filtered);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('delivered')) return 'bg-green-100 text-green-800';
    if (statusLower.includes('qa') || statusLower.includes('testing')) return 'bg-blue-100 text-blue-800';
    if (statusLower.includes('blocked')) return 'bg-red-100 text-red-800';
    if (statusLower.includes('ready')) return 'bg-yellow-100 text-yellow-800';
    if (statusLower.includes('writeup') || statusLower.includes('feedback')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1800px] mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Problem Catalog</h1>
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-4 items-center">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'All' | 'PE' | 'IB')}
              className="px-4 py-2 border-2 border-gray-800 rounded-lg bg-white text-black font-medium focus:outline-none focus:ring-2 focus:ring-gray-600"
            >
              <option value="All">All Environments</option>
              <option value="PE">PE Only</option>
              <option value="IB">IB Only</option>
            </select>

            <input
              type="text"
              placeholder="Search problems..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border-2 border-gray-800 rounded-lg bg-white text-black focus:outline-none focus:ring-2 focus:ring-gray-600"
            />

            <div className="text-sm text-gray-600">
              Showing {filteredProblems.length} of {problems.length} problems
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && !problems.length && (
          <div className="flex items-center justify-center py-12">
            <div className="text-lg text-gray-600">Loading catalog...</div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-8">
            <h3 className="text-red-800 font-semibold mb-2">Error loading data</h3>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Table */}
        {!loading && filteredProblems.length > 0 && (
          <div className="bg-white border-2 border-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-800 text-white sticky top-0">
                  <tr>
                    <th
                      className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                      onClick={() => handleSort('environment')}
                    >
                      Env {getSortIcon('environment')}
                    </th>
                    <th
                      className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                      onClick={() => handleSort('specNumber')}
                    >
                      Spec # {getSortIcon('specNumber')}
                    </th>
                    <th
                      className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                      onClick={() => handleSort('problemId')}
                    >
                      ID {getSortIcon('problemId')}
                    </th>
                    <th
                      className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                      onClick={() => handleSort('status')}
                    >
                      Status {getSortIcon('status')}
                    </th>
                    <th
                      className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                      onClick={() => handleSort('smeName')}
                    >
                      SME {getSortIcon('smeName')}
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                      Feedback
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                      QA
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                      Engineer
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                      Final Reviewer
                    </th>
                    <th
                      className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-gray-700"
                      onClick={() => handleSort('week')}
                    >
                      Week {getSortIcon('week')}
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider">
                      Separate Init
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                      Problem Doc
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                      Spec Doc
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                      Docker
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                      PR Link
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProblems.map((problem, idx) => (
                    <tr key={problem.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        {problem.environment}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                        {problem.specNumber || '-'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                        {problem.problemId}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(problem.status)}`}>
                          {problem.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                        {problem.smeName || '-'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                        {problem.feedbackName || '-'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                        {problem.qaName || '-'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                        {problem.engineerName || '-'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700">
                        {problem.finalReviewerName || '-'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-center text-gray-700">
                        {problem.week || '-'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-center">
                        {problem.separateEnvironmentInit ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700 max-w-[200px] truncate">
                        {problem.problemDoc ? (
                          <a
                            href={problem.problemDoc}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            View
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700 max-w-[200px] truncate">
                        {problem.specDoc ? (
                          <a
                            href={problem.specDoc}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            View
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700 max-w-[150px] truncate">
                        {problem.dockerContainer || '-'}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700 max-w-[200px] truncate">
                        {problem.prLink ? (
                          <a
                            href={problem.prLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            View PR
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700 max-w-[300px]">
                        <div className="truncate" title={problem.notes || ''}>
                          {problem.notes || '-'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredProblems.length === 0 && problems.length > 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No problems match your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
