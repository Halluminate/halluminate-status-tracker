'use client';

import { SheetData, StatusRow } from '@/types/status';

interface StatusTableProps {
  data: SheetData[];
}

// Define status order for display
const STATUS_ORDER = [
  'In-Progress',
  'Review 1',
  'Review 2',
  'Trajectory Testing',
  'Ready for Delivery',
  'Delivered',
  'Blocked',
];

export default function StatusTable({ data }: StatusTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
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
        existing.total += row.total;
      } else {
        statusMap.set(row.status, { ...row });
      }
    });
  });

  // Get rows in defined order, filter out zeros
  const orderedRows = STATUS_ORDER
    .map(status => statusMap.get(status))
    .filter((row): row is StatusRow => row !== undefined && row.total > 0);

  // Calculate grand total
  const grandTotal = orderedRows.reduce((sum, row) => sum + row.total, 0);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse border border-border">
        <thead>
          <tr className="bg-primary text-primary-foreground">
            <th className="border border-border px-4 py-3 text-left font-semibold">Status</th>
            <th className="border border-border px-4 py-3 text-center font-semibold bg-primary/80 w-32">Total</th>
          </tr>
        </thead>
        <tbody>
          {orderedRows.map((row, idx) => (
            <tr key={row.status} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/50'}>
              <td className="border border-border px-4 py-2 font-medium text-foreground">{row.status}</td>
              <td className="border border-border px-4 py-2 text-center font-bold bg-muted text-foreground">{row.total}</td>
            </tr>
          ))}

          {/* Grand Total Row */}
          <tr className="bg-primary text-primary-foreground font-bold">
            <td className="border border-border px-4 py-3">Total</td>
            <td className="border border-border px-4 py-3 text-center bg-primary/80">{grandTotal}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
