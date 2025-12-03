'use client';

import { useState } from 'react';
import { ExpertSheetData, ExpertRow } from '@/types/status';

interface ExpertTableProps {
  data: ExpertSheetData[];
}

type SortField = 'expert' | 'week1' | 'week2' | 'week3' | 'week4' | 'week5' | 'week6' | 'week7' | 'weekNA' | 'total';

export default function ExpertTable({ data }: ExpertTableProps) {
  const [sortField, setSortField] = useState<SortField>('expert');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-black">
        No data available
      </div>
    );
  }

  // Combine all rows from both sheets and aggregate by expert
  const expertMap = new Map<string, ExpertRow>();

  data.forEach(sheet => {
    sheet.rows.forEach(row => {
      const existing = expertMap.get(row.expert);
      if (existing) {
        // Combine with existing
        existing.week1 += row.week1;
        existing.week2 += row.week2;
        existing.week3 += row.week3;
        existing.week4 += row.week4;
        existing.week5 += row.week5;
        existing.week6 += row.week6;
        existing.week7 += row.week7;
        existing.weekNA += row.weekNA;
        existing.total += row.total;
      } else {
        // Add new entry
        expertMap.set(row.expert, { ...row });
      }
    });
  });

  // Convert map to array and apply sorting
  const experts = Array.from(expertMap.values()).sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    if (sortField === 'expert') {
      aValue = a.expert;
      bValue = b.expert;
      const comparison = aValue.localeCompare(bValue);
      return sortDirection === 'asc' ? comparison : -comparison;
    } else {
      aValue = a[sortField];
      bValue = b[sortField];
      const comparison = aValue - bValue;
      return sortDirection === 'asc' ? comparison : -comparison;
    }
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to descending for numbers, ascending for name
      setSortField(field);
      setSortDirection(field === 'expert' ? 'asc' : 'desc');
    }
  };

  // Helper function to determine cell background color
  const getCellClass = (value: number) => {
    return value >= 5 ? 'bg-green-200' : '';
  };

  // Calculate grand total across all experts
  const grandTotal = {
    week1: experts.reduce((sum, row) => sum + row.week1, 0),
    week2: experts.reduce((sum, row) => sum + row.week2, 0),
    week3: experts.reduce((sum, row) => sum + row.week3, 0),
    week4: experts.reduce((sum, row) => sum + row.week4, 0),
    week5: experts.reduce((sum, row) => sum + row.week5, 0),
    week6: experts.reduce((sum, row) => sum + row.week6, 0),
    week7: experts.reduce((sum, row) => sum + row.week7, 0),
    weekNA: experts.reduce((sum, row) => sum + row.weekNA, 0),
    total: experts.reduce((sum, row) => sum + row.total, 0),
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-800 text-white">
            <th
              className="border border-gray-300 px-4 py-3 text-left font-semibold cursor-pointer hover:bg-gray-700"
              onClick={() => handleSort('expert')}
            >
              Expert {getSortIcon('expert')}
            </th>
            <th
              className="border border-gray-300 px-4 py-3 text-center font-semibold cursor-pointer hover:bg-gray-700"
              onClick={() => handleSort('week1')}
            >
              Week 1 {getSortIcon('week1')}
            </th>
            <th
              className="border border-gray-300 px-4 py-3 text-center font-semibold cursor-pointer hover:bg-gray-700"
              onClick={() => handleSort('week2')}
            >
              Week 2 {getSortIcon('week2')}
            </th>
            <th
              className="border border-gray-300 px-4 py-3 text-center font-semibold cursor-pointer hover:bg-gray-700"
              onClick={() => handleSort('week3')}
            >
              Week 3 {getSortIcon('week3')}
            </th>
            <th
              className="border border-gray-300 px-4 py-3 text-center font-semibold cursor-pointer hover:bg-gray-700"
              onClick={() => handleSort('week4')}
            >
              Week 4 {getSortIcon('week4')}
            </th>
            <th
              className="border border-gray-300 px-4 py-3 text-center font-semibold cursor-pointer hover:bg-gray-700"
              onClick={() => handleSort('week5')}
            >
              Week 5 {getSortIcon('week5')}
            </th>
            <th
              className="border border-gray-300 px-4 py-3 text-center font-semibold cursor-pointer hover:bg-gray-700"
              onClick={() => handleSort('week6')}
            >
              Week 6 {getSortIcon('week6')}
            </th>
            <th
              className="border border-gray-300 px-4 py-3 text-center font-semibold cursor-pointer hover:bg-gray-700"
              onClick={() => handleSort('week7')}
            >
              Week 7 {getSortIcon('week7')}
            </th>
            <th
              className="border border-gray-300 px-4 py-3 text-center font-semibold cursor-pointer hover:bg-gray-700"
              onClick={() => handleSort('weekNA')}
            >
              Week NA {getSortIcon('weekNA')}
            </th>
            <th
              className="border border-gray-300 px-4 py-3 text-center font-semibold bg-gray-900 cursor-pointer hover:bg-gray-800"
              onClick={() => handleSort('total')}
            >
              Total {getSortIcon('total')}
            </th>
          </tr>
        </thead>
        <tbody>
          {/* Expert Rows */}
          {experts.map((row, idx) => (
            <tr key={row.expert} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="border border-gray-300 px-4 py-2 font-medium text-black">{row.expert}</td>
              <td className={`border border-gray-300 px-4 py-2 text-center text-black ${getCellClass(row.week1)}`}>{row.week1 || ''}</td>
              <td className={`border border-gray-300 px-4 py-2 text-center text-black ${getCellClass(row.week2)}`}>{row.week2 || ''}</td>
              <td className={`border border-gray-300 px-4 py-2 text-center text-black ${getCellClass(row.week3)}`}>{row.week3 || ''}</td>
              <td className={`border border-gray-300 px-4 py-2 text-center text-black ${getCellClass(row.week4)}`}>{row.week4 || ''}</td>
              <td className={`border border-gray-300 px-4 py-2 text-center text-black ${getCellClass(row.week5)}`}>{row.week5 || ''}</td>
              <td className={`border border-gray-300 px-4 py-2 text-center text-black ${getCellClass(row.week6)}`}>{row.week6 || ''}</td>
              <td className={`border border-gray-300 px-4 py-2 text-center text-black ${getCellClass(row.week7)}`}>{row.week7 || ''}</td>
              <td className={`border border-gray-300 px-4 py-2 text-center text-black ${getCellClass(row.weekNA)}`}>{row.weekNA || ''}</td>
              <td className="border border-gray-300 px-4 py-2 text-center font-bold bg-gray-100 text-black">{row.total}</td>
            </tr>
          ))}

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
            <td className="border border-gray-300 px-4 py-3 text-center">{grandTotal.weekNA}</td>
            <td className="border border-gray-300 px-4 py-3 text-center bg-gray-900">{grandTotal.total}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
