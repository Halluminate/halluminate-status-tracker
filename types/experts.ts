// Expert Management Types

export interface Expert {
  id: number;
  name: string;
  ripplingId?: string;
  hourlyRate: number;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Problem {
  id: number;
  problemId: string;
  specNumber?: number;
  environment: 'PE' | 'IB';
  status: ProblemStatus;
  smeId?: number;
  feedbackId?: number;
  qaId?: number;
  contentReviewerId?: number;
  engineerId?: number;
  reviewerId?: number;
  finalReviewerId?: number;
  week?: number;
  problemDoc?: string;
  groundTruth?: string;
  specFolder?: string;
  specDoc?: string;
  specDataFolder?: string;
  dockerContainer?: string;
  prLink?: string;
  blockerReason?: string;
  sonnetPassRate?: string;
  opusPassRate?: string;
  separateEnvironmentInit?: boolean;
  taigaTag?: string;
  explainerVideo?: string;
  taskDescription?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ProblemStatus =
  | 'Delivered'
  | 'QA'
  | 'QA Issues'
  | 'Changes Requested on PR'
  | 'Ready To Build'
  | 'Problem Writeup'
  | 'Problem Feedback'
  | 'Problem QA'
  | 'Feedback Given'
  | 'Blocked'
  | 'Taiga Testing'
  | 'Ready for Taiga'
  | 'Make Harder';

export interface TimeEntry {
  id: number;
  expertId: number;
  weekStart: Date;
  hoursWorked: number;
  hoursApproved?: number;
  submissionStatus?: 'Submitted' | 'Not submitted';
  approvalStatus?: 'Approved' | 'Pending';
  ripplingEntryId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WeeklySnapshot {
  id: number;
  expertId: number;
  weekStart: Date;
  problemsDelivered: number;
  problemsInQa: number;
  problemsInProgress: number;
  problemsBlocked: number;
  totalHours: number;
  totalCost: number;
  createdAt: Date;
}

// Derived/computed types for the UI

export interface ExpertSummary {
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

export interface ExpertWeeklyMetrics {
  expertId: number;
  expertName: string;
  weekStart: Date;
  problemsDeliveredThisWeek: number;
  problemsMovedToQa: number;
  hoursWorked: number;
  cost: number;
  costPerDeliverable: number | null;
  hoursBudgetVariance?: number;
}

export interface PerformanceMetrics {
  expertId: number;
  expertName: string;
  deliveryRate: number;          // % of assigned problems delivered
  onTimeDeliveryRate: number;    // % delivered in assigned week
  qaPassRate: number;            // % that pass QA without changes requested
  avgCostPerProblem: number;
  avgHoursPerProblem: number;
}

// CSV import types

export interface PEProblemRow {
  'Spec #': string;
  'ID': string;
  'Status': string;
  'SME': string;
  'Feedback': string;
  'QA': string;
  'Engineer': string;
  'Final Reviewer': string;
  'Week': string;
  'Sonnet 4.5  Pass @ 10': string;
  'Opus 4.1 Pass @ 10': string;
  'Separate Environment Init': string;
  'Problem Doc': string;
  'Problem Ground Truth': string;
  'Spec Folder': string;
  'Spec Doc': string;
  'Spec Data Folder': string;
  'Docker Container': string;
  'PR Link': string;
  'Blocker Reason': string;
  'Taiga Tag': string;
  'Explainer Video': string;
  'Task Description': string;
  'Notes': string;
}

export interface IBProblemRow {
  'Spec': string;
  'ID': string;
  'Status': string;
  'SME': string;
  'Content Reviewer': string;
  'Engineer': string;
  'Reviewer': string;
  'Week': string;
  'Taiga Score Pass @ 10': string;
  'Problem Doc': string;
  'Ground Truth': string;
  'Spec Folder': string;
  'PR Link': string;
  'Blocker Reason': string;
  'Task Description': string;
}

export interface RipplingTimeRow {
  name: string;
  submissionStatus: 'Submitted' | 'Not submitted';
  approvalStatus: 'Approved' | 'Pending';
  ripplingId: string;
  totalHours: string;
  approvedHours: string;
}

// Expert rate configuration
export const EXPERT_RATES: Record<string, number> = {
  'Alex Ishin': 275,
  'Minesh Patel': 275,
  'Zach Barry': 200,
  'Ryan Diebner': 200,
  'Ryan': 200,
  'Zach': 200,
};

export const DEFAULT_HOURLY_RATE = 150;

export function getExpertRate(name: string): number {
  return EXPERT_RATES[name] ?? DEFAULT_HOURLY_RATE;
}
