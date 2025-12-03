'use client';

import { SheetData } from '@/types/sheets';

interface SummaryStatsProps {
  data: SheetData[];
}

export default function SummaryStats({ data }: SummaryStatsProps) {
  if (!data || data.length === 0) {
    return null;
  }

  const totalIssues = data.reduce((sum, sheet) => sum + sheet.grandTotal, 0);

  // Calculate totals by source
  const peTotal = data.find(s => s.name === 'PE')?.grandTotal || 0;
  const ibTotal = data.find(s => s.name === 'IB')?.grandTotal || 0;

  // Calculate top statuses across both sheets
  const statusTotals = new Map<string, number>();
  data.forEach(sheet => {
    sheet.rows.forEach(row => {
      const current = statusTotals.get(row.status) || 0;
      statusTotals.set(row.status, current + row.total);
    });
  });

  const sortedStatuses = Array.from(statusTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Total Issues */}
      <div className="bg-white border-2 border-gray-800 p-6 rounded-lg">
        <h3 className="text-sm font-semibold text-black uppercase mb-2">Total Issues</h3>
        <p className="text-4xl font-bold text-black">{totalIssues}</p>
        <div className="mt-3 flex gap-4 text-sm">
          <div>
            <span className="text-black">PE:</span>
            <span className="ml-1 font-semibold text-black">{peTotal}</span>
          </div>
          <div>
            <span className="text-black">IB:</span>
            <span className="ml-1 font-semibold text-black">{ibTotal}</span>
          </div>
        </div>
      </div>

      {/* Distribution by Source */}
      <div className="bg-white border-2 border-gray-800 p-6 rounded-lg">
        <h3 className="text-sm font-semibold text-black uppercase mb-2">Distribution</h3>
        <div className="space-y-2 mt-4">
          {data.map(sheet => {
            const percentage = totalIssues > 0 ? ((sheet.grandTotal / totalIssues) * 100).toFixed(1) : 0;
            return (
              <div key={sheet.name} className="flex justify-between items-center">
                <span className="font-medium text-black">{sheet.name}</span>
                <span className="text-2xl font-bold text-black">{percentage}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Statuses */}
      <div className="bg-white border-2 border-gray-800 p-6 rounded-lg">
        <h3 className="text-sm font-semibold text-black uppercase mb-2">Top Statuses</h3>
        <div className="space-y-2 mt-4">
          {sortedStatuses.map(([status, count]) => (
            <div key={status} className="flex justify-between items-center text-sm">
              <span className="font-medium text-black truncate pr-2">{status}</span>
              <span className="font-bold text-black">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
