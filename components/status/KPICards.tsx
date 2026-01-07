'use client';

import { SheetData } from '@/types/status';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle, Clock, FileText } from 'lucide-react';

interface KPICardsProps {
  data: SheetData[];
}

export default function KPICards({ data }: KPICardsProps) {
  if (!data || data.length === 0) {
    return null;
  }

  const totalIssues = data.reduce((sum, sheet) => sum + sheet.grandTotal, 0);
  const peTotal = data.find(s => s.name === 'PE')?.grandTotal || 0;
  const ibTotal = data.find(s => s.name === 'IB')?.grandTotal || 0;

  // Calculate totals by status category
  const statusTotals = new Map<string, number>();
  data.forEach(sheet => {
    sheet.rows.forEach(row => {
      const current = statusTotals.get(row.status) || 0;
      statusTotals.set(row.status, current + row.total);
    });
  });

  // Key metrics
  const delivered = statusTotals.get('Delivered') || 0;
  const inQA = statusTotals.get('QA') || 0;
  const qaIssues = statusTotals.get('QA Issues') || 0;
  const blocked = statusTotals.get('Blocked') || 0;
  const inProgress = (statusTotals.get('Problem Writeup') || 0) +
                     (statusTotals.get('Problem Feedback') || 0) +
                     (statusTotals.get('Problem QA') || 0);

  // Calculate week-over-week trends (week7 vs week6)
  const getWeekTrend = (status: string) => {
    let week7 = 0, week6 = 0;
    data.forEach(sheet => {
      const row = sheet.rows.find(r => r.status === status);
      if (row) {
        week7 += row.week7;
        week6 += row.week6;
      }
    });
    if (week6 === 0) return { change: 0, trend: 'neutral' as const };
    const change = ((week7 - week6) / week6) * 100;
    return {
      change: Math.round(change),
      trend: change > 0 ? 'up' as const : change < 0 ? 'down' as const : 'neutral' as const
    };
  };

  const deliveredTrend = getWeekTrend('Delivered');
  const qaTrend = getWeekTrend('QA');

  const TrendBadge = ({ change, trend, inverse = false }: { change: number; trend: 'up' | 'down' | 'neutral'; inverse?: boolean }) => {
    const isPositive = inverse ? trend === 'down' : trend === 'up';
    const isNegative = inverse ? trend === 'up' : trend === 'down';

    if (trend === 'neutral') {
      return (
        <Badge variant="secondary" className="gap-1">
          <Minus className="h-3 w-3" />
          0%
        </Badge>
      );
    }

    return (
      <Badge
        variant={isPositive ? 'default' : 'destructive'}
        className={`gap-1 ${isPositive ? 'bg-green-600 hover:bg-green-700' : ''}`}
      >
        {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {change > 0 ? '+' : ''}{change}%
      </Badge>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Total Problems */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Problems</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{totalIssues}</div>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-xs text-muted-foreground">
              PE: <span className="font-semibold text-foreground">{peTotal}</span>
            </span>
            <span className="text-xs text-muted-foreground">
              IB: <span className="font-semibold text-foreground">{ibTotal}</span>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Delivered */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Delivered</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">{delivered}</div>
          <div className="flex items-center gap-2 mt-2">
            <TrendBadge {...deliveredTrend} />
            <span className="text-xs text-muted-foreground">vs last week</span>
          </div>
        </CardContent>
      </Card>

      {/* In QA Pipeline */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">In QA Pipeline</CardTitle>
          <Clock className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-600">{inQA}</div>
          <div className="flex items-center gap-2 mt-2">
            <TrendBadge {...qaTrend} />
            <span className="text-xs text-muted-foreground">vs last week</span>
          </div>
        </CardContent>
      </Card>

      {/* Issues & Blocked */}
      <Card className={blocked > 0 ? 'border-destructive' : ''}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
          <AlertCircle className={`h-4 w-4 ${blocked > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-3xl font-bold ${blocked > 0 ? 'text-destructive' : ''}`}>
            {qaIssues + blocked}
          </div>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-xs text-muted-foreground">
              QA Issues: <span className="font-semibold text-foreground">{qaIssues}</span>
            </span>
            <span className="text-xs text-muted-foreground">
              Blocked: <span className={`font-semibold ${blocked > 0 ? 'text-destructive' : 'text-foreground'}`}>{blocked}</span>
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
