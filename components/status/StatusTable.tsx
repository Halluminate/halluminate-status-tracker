'use client';

import { SheetData, StatusRow } from '@/types/status';

interface StatusTableProps {
  data: SheetData[];
}

// Status configuration with colors matching the progress bar
const STATUS_CONFIG = [
  { name: 'In-Progress', color: '#3B82F6' },      // blue
  { name: 'Review 1', color: '#06B6D4' },         // cyan
  { name: 'Review 2', color: '#FBBF24' },         // yellow
  { name: 'Trajectory Testing', color: '#F97316' }, // orange
  { name: 'Ready for Delivery', color: '#14B8A6' }, // teal
  { name: 'Delivered', color: '#22C55E' },        // green
  { name: 'Blocked', color: '#EF4444' },          // red
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
  const orderedRows = STATUS_CONFIG
    .map(config => ({
      config,
      row: statusMap.get(config.name)
    }))
    .filter((item): item is { config: typeof STATUS_CONFIG[0], row: StatusRow } =>
      item.row !== undefined && item.row.total > 0
    );

  // Calculate grand total
  const grandTotal = orderedRows.reduce((sum, item) => sum + item.row.total, 0);

  return (
    <div className="space-y-2">
      {orderedRows.map(({ config, row }) => (
        <div
          key={row.status}
          className="flex items-center justify-between px-4 py-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-3">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: config.color }}
            />
            <span className="font-medium text-foreground">{row.status}</span>
          </div>
          <span className="text-xl font-bold text-foreground tabular-nums">{row.total}</span>
        </div>
      ))}

      {/* Total Row */}
      <div className="flex items-center justify-between px-4 py-4 rounded-lg bg-primary/10 border border-primary/20 mt-4">
        <span className="font-semibold text-foreground">Total Problems</span>
        <span className="text-2xl font-bold text-primary tabular-nums">{grandTotal}</span>
      </div>
    </div>
  );
}
