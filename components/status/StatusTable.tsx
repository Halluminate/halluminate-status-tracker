'use client';

import { Fragment } from 'react';
import { SheetData, StatusRow } from '@/types/status';

interface StatusTableProps {
  data: SheetData[];
}

// Define status sections
const STATUS_SECTIONS = {
  'Expert Problems': [
    'Problem Writeup',
    'Problem Feedback',
    'Problem QA',
    'Feedback Given',
  ],
  'Code Ready Problems': [
    'Ready To Build',
    'Changes Requested on PR',
  ],
  'Quality Assurance': [
    'QA',
    'Ready for Taiga',
    'Taiga Testing',
  ],
  'Delivered Problems': [
    'Delivered',
  ],
  'Issue Problems': [
    'Blocked',
    'QA Issues',
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
        existing.week1 += row.week1;
        existing.week2 += row.week2;
        existing.week3 += row.week3;
        existing.week4 += row.week4;
        existing.week5 += row.week5;
        existing.week6 += row.week6;
        existing.week7 += row.week7;
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
      week1: sectionRows.reduce((sum, row) => sum + row.week1, 0),
      week2: sectionRows.reduce((sum, row) => sum + row.week2, 0),
      week3: sectionRows.reduce((sum, row) => sum + row.week3, 0),
      week4: sectionRows.reduce((sum, row) => sum + row.week4, 0),
      week5: sectionRows.reduce((sum, row) => sum + row.week5, 0),
      week6: sectionRows.reduce((sum, row) => sum + row.week6, 0),
      week7: sectionRows.reduce((sum, row) => sum + row.week7, 0),
      total: sectionRows.reduce((sum, row) => sum + row.total, 0),
    };

    return (
      <Fragment key={sectionName}>
        {/* Section Header */}
        <tr className="bg-gray-600">
          <td colSpan={9} className="border border-gray-300 px-4 py-2 font-bold text-white">
            {sectionName}
          </td>
        </tr>

        {/* Section Rows */}
        {sectionRows.map((row, idx) => (
          <tr key={row.status} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
            <td className="border border-gray-300 px-4 py-2 font-medium text-black pl-8">{row.status}</td>
            <td className="border border-gray-300 px-4 py-2 text-center text-black">{row.week1 || ''}</td>
            <td className="border border-gray-300 px-4 py-2 text-center text-black">{row.week2 || ''}</td>
            <td className="border border-gray-300 px-4 py-2 text-center text-black">{row.week3 || ''}</td>
            <td className="border border-gray-300 px-4 py-2 text-center text-black">{row.week4 || ''}</td>
            <td className="border border-gray-300 px-4 py-2 text-center text-black">{row.week5 || ''}</td>
            <td className="border border-gray-300 px-4 py-2 text-center text-black">{row.week6 || ''}</td>
            <td className="border border-gray-300 px-4 py-2 text-center text-black">{row.week7 || ''}</td>
            <td className="border border-gray-300 px-4 py-2 text-center font-bold bg-gray-100 text-black">{row.total}</td>
          </tr>
        ))}

        {/* Subtotal Row */}
        <tr className="bg-gray-300 font-bold">
          <td className="border border-gray-300 px-4 py-2 text-black">Subtotal</td>
          <td className="border border-gray-300 px-4 py-2 text-center text-black">{subtotal.week1 || ''}</td>
          <td className="border border-gray-300 px-4 py-2 text-center text-black">{subtotal.week2 || ''}</td>
          <td className="border border-gray-300 px-4 py-2 text-center text-black">{subtotal.week3 || ''}</td>
          <td className="border border-gray-300 px-4 py-2 text-center text-black">{subtotal.week4 || ''}</td>
          <td className="border border-gray-300 px-4 py-2 text-center text-black">{subtotal.week5 || ''}</td>
          <td className="border border-gray-300 px-4 py-2 text-center text-black">{subtotal.week6 || ''}</td>
          <td className="border border-gray-300 px-4 py-2 text-center text-black">{subtotal.week7 || ''}</td>
          <td className="border border-gray-300 px-4 py-2 text-center bg-gray-400 text-black">{subtotal.total}</td>
        </tr>
      </Fragment>
    );
  };

  // Calculate grand total across all statuses
  const grandTotal = {
    week1: Array.from(statusMap.values()).reduce((sum, row) => sum + row.week1, 0),
    week2: Array.from(statusMap.values()).reduce((sum, row) => sum + row.week2, 0),
    week3: Array.from(statusMap.values()).reduce((sum, row) => sum + row.week3, 0),
    week4: Array.from(statusMap.values()).reduce((sum, row) => sum + row.week4, 0),
    week5: Array.from(statusMap.values()).reduce((sum, row) => sum + row.week5, 0),
    week6: Array.from(statusMap.values()).reduce((sum, row) => sum + row.week6, 0),
    week7: Array.from(statusMap.values()).reduce((sum, row) => sum + row.week7, 0),
    total: Array.from(statusMap.values()).reduce((sum, row) => sum + row.total, 0),
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-800 text-white">
            <th className="border border-gray-300 px-4 py-3 text-left font-semibold">Status</th>
            <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Week 1</th>
            <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Week 2</th>
            <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Week 3</th>
            <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Week 4</th>
            <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Week 5</th>
            <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Week 6</th>
            <th className="border border-gray-300 px-4 py-3 text-center font-semibold">Week 7</th>
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
            <td className="border border-gray-300 px-4 py-3 text-center">{grandTotal.week1}</td>
            <td className="border border-gray-300 px-4 py-3 text-center">{grandTotal.week2}</td>
            <td className="border border-gray-300 px-4 py-3 text-center">{grandTotal.week3}</td>
            <td className="border border-gray-300 px-4 py-3 text-center">{grandTotal.week4}</td>
            <td className="border border-gray-300 px-4 py-3 text-center">{grandTotal.week5}</td>
            <td className="border border-gray-300 px-4 py-3 text-center">{grandTotal.week6}</td>
            <td className="border border-gray-300 px-4 py-3 text-center">{grandTotal.week7}</td>
            <td className="border border-gray-300 px-4 py-3 text-center bg-gray-900">{grandTotal.total}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
