'use client';

import { Fragment } from 'react';
import { SheetData, StatusRow } from '@/types/status';

interface StatusTableProps {
  data: SheetData[];
}

// Define status sections matching Horizon workflow statuses
const STATUS_SECTIONS = {
  'In Progress': [
    'In-Progress',
  ],
  'Review': [
    'Review 1',
    'Review 2',
  ],
  'Pre-Delivery': [
    'Ready for Delivery',
    'Trajectory Testing',
  ],
  'Delivered': [
    'Delivered',
  ],
  'Blocked': [
    'Blocked',
  ],
};

export default function StatusTable({ data }: StatusTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-black">
        No data available
      </div>
    );
  }

  // Combine all rows from both sheets and aggregate by status
  const statusMap = new Map<string, StatusRow>();

  data.forEach(sheet => {
    sheet.rows.forEach(row => {
      const existing = statusMap.get(row.status);
      if (existing) {
        // Combine with existing
        existing.total += row.total;
      } else {
        // Add new entry
        statusMap.set(row.status, { ...row });
      }
    });
  });

  // Group statuses by section
  const renderSection = (sectionName: string, statuses: string[]) => {
    const sectionRows = statuses
      .map(status => statusMap.get(status))
      .filter(row => row !== undefined) as StatusRow[];

    if (sectionRows.length === 0) return null;

    // Calculate section subtotal
    const subtotal = {
      total: sectionRows.reduce((sum, row) => sum + row.total, 0),
    };

    return (
      <Fragment key={sectionName}>
        {/* Section Header */}
        <tr className="bg-gray-600">
          <td colSpan={2} className="border border-gray-300 px-4 py-2 font-bold text-white">
            {sectionName}
          </td>
        </tr>

        {/* Section Rows */}
        {sectionRows.map((row, idx) => (
          <tr key={row.status} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
            <td className="border border-gray-300 px-4 py-2 font-medium text-black pl-8">{row.status}</td>
            <td className="border border-gray-300 px-4 py-2 text-center font-bold bg-gray-100 text-black">{row.total}</td>
          </tr>
        ))}

        {/* Subtotal Row */}
        <tr className="bg-gray-300 font-bold">
          <td className="border border-gray-300 px-4 py-2 text-black">Subtotal</td>
          <td className="border border-gray-300 px-4 py-2 text-center bg-gray-400 text-black">{subtotal.total}</td>
        </tr>
      </Fragment>
    );
  };

  // Calculate grand total across all statuses
  const grandTotal = {
    total: Array.from(statusMap.values()).reduce((sum, row) => sum + row.total, 0),
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-800 text-white">
            <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Status</th>
            <th className="border border-gray-300 px-4 py-3 text-center font-semibold bg-gray-900">Total</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(STATUS_SECTIONS).map(([sectionName, statuses]) =>
            renderSection(sectionName, statuses)
          )}

          {/* Grand Total Row */}
          <tr className="bg-gray-800 text-white font-bold">
            <td className="border border-gray-300 px-4 py-3">Grand Total</td>
            <td className="border border-gray-300 px-4 py-3 text-center bg-gray-900">{grandTotal.total}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
