'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Expert {
  id: number;
  name: string;
  hourly_rate: number;
  email?: string;
}

interface ExpertSummary {
  id: number;
  name: string;
  hourlyRate: number;
  problemsInProgress: number;
  problemsDelivered: number;
  totalProblemsAssigned: number;
  totalHours: number;
  totalCost: number;
}

interface WeeklyBreakdown {
  week: number | null;
  count: number;
  statuses: Record<string, number>;
}

interface Problem {
  id: number;
  problem_id: string;
  spec_number: number;
  environment: 'PE' | 'IB';
  status: string;
  week: number | null;
  problem_doc?: string;
  pr_link?: string;
  sme_name?: string;
  engineer_name?: string;
  reviewer_name?: string;
}

interface TimeEntry {
  id: number;
  week_start: string;
  hours_worked: number;
  hours_approved?: number;
  submission_status?: string;
  approval_status?: string;
}

interface ExpertData {
  expert: Expert;
  summary: ExpertSummary;
  weeklyBreakdown: WeeklyBreakdown[];
  statusBreakdown: Record<string, number>;
  problems: Problem[];
  timeEntries: TimeEntry[];
}

export default function ExpertDetailPage() {
  const params = useParams();
  const [data, setData] = useState<ExpertData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const res = await fetch(`/api/experts/${params.id}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setError(null);
      } else {
        setError('Failed to load expert data');
      }
      setLoading(false);
    }
    fetchData();
  }, [params.id]);

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
      case 'Ready To Build':
      case 'Changes Requested on PR':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500">{error || 'Expert not found'}</div>
      </div>
    );
  }

  const { expert, summary, weeklyBreakdown, statusBreakdown, problems, timeEntries } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/experts" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            &larr; Back to Experts
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{expert.name}</h1>
          <p className="text-gray-600 mt-1">
            {formatCurrency(expert.hourly_rate)}/hr
            {expert.email && <span className="ml-4">{expert.email}</span>}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-sm font-medium text-gray-500">Total Assigned</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{summary?.totalProblemsAssigned || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-sm font-medium text-gray-500">In Progress</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">{summary?.problemsInProgress || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-sm font-medium text-gray-500">Delivered</div>
            <div className="text-2xl font-bold text-green-600 mt-1">{summary?.problemsDelivered || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-sm font-medium text-gray-500">Total Hours</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{formatHours(summary?.totalHours || 0)}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-sm font-medium text-gray-500">Total Cost</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summary?.totalCost || 0)}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-sm font-medium text-gray-500">Cost/Delivered</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {summary?.problemsDelivered && summary.problemsDelivered > 0
                ? formatCurrency((summary?.totalCost || 0) / summary.problemsDelivered)
                : '-'}
            </div>
          </div>
        </div>

        {/* Weekly Breakdown */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Problems by Week</h2>
          {weeklyBreakdown.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Week</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status Breakdown</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {weeklyBreakdown.map((week, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap font-medium text-gray-900">
                        {week.week === null ? 'Unassigned' : `Week ${week.week}`}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                          {week.count}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(week.statuses).map(([status, count]) => (
                            <span
                              key={status}
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}
                            >
                              {status}: {count}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No problems assigned</p>
          )}
        </div>

        {/* Status Breakdown */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Summary</h2>
          {Object.keys(statusBreakdown).length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {Object.entries(statusBreakdown).map(([status, count]) => (
                <div
                  key={status}
                  className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium ${getStatusColor(status)}`}
                >
                  <span className="font-semibold mr-2">{count}</span>
                  {status}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No problems assigned</p>
          )}
        </div>

        {/* Problems List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">All Problems ({problems.length})</h2>
          </div>
          {problems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Week</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Env</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spec</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Problem ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Links</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {problems.map((problem) => (
                    <tr key={problem.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {problem.week === null ? '-' : `W${problem.week}`}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          problem.environment === 'PE' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {problem.environment}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{problem.spec_number}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{problem.problem_id}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(problem.status)}`}>
                          {problem.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          {problem.problem_doc && (
                            <a
                              href={problem.problem_doc}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Doc
                            </a>
                          )}
                          {problem.pr_link && (
                            <a
                              href={problem.pr_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              PR
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-8 text-center text-gray-500">No problems assigned</div>
          )}
        </div>

        {/* Time Entries */}
        {timeEntries.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Time Entries</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Week Start</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours Worked</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours Approved</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {timeEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{entry.week_start}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{formatHours(entry.hours_worked)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {entry.hours_approved ? formatHours(entry.hours_approved) : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {entry.approval_status || entry.submission_status || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
