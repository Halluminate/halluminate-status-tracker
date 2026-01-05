// Bonus Management Types - Updated structure matching December 15-31 format

// ============================================
// INPUT TYPES
// ============================================

export interface WeeklyBonusInput {
  id: number;
  expertId: number;
  periodName: string;  // e.g., "December 15 - 31"
  periodStart: Date;
  periodEnd: Date;

  // Writer bonus inputs
  writerQualifyingProblems: number;
  writerPerProblemRate: number;  // default $100

  // Review 1 bonus inputs
  review1QualifyingProblems: number;
  review1PerProblemRate: number;  // default $50

  // Review 2 bonus inputs
  review2QualifyingProblems: number;
  review2PerProblemRate: number;  // default $50

  // Hours percentage bonus inputs
  totalHours: number;
  hourlyRate: number;
  percentBonusRate: number;  // default 0.20 (20%)

  // Salary increase bonus inputs
  hoursAtOldSalary: number;
  oldHourlyRate?: number;
  newHourlyRate?: number;

  // Referral bonus inputs
  initialReferralCount: number;
  referralBonusAmount: number;  // default $300

  // Data bonus inputs
  dataFilesCount: number;
  pricePerDataFile: number;  // default $200

  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// CALCULATION TYPES
// ============================================

export interface WeeklyBonusCalculation {
  id: number;
  expertId: number;
  periodName: string;
  periodStart: Date;
  periodEnd: Date;

  // Calculated bonuses
  writerBonus: number;
  review1Bonus: number;
  review2Bonus: number;
  hoursPercentageBonus: number;
  salaryIncreaseBonus: number;
  referralBonus: number;
  dataBonus: number;

  // Totals
  totalBonus: number;
  baseEarnings: number;
  totalOwed: number;

  // Payment tracking
  isPaid: boolean;
  paidDate?: Date;
  paymentNotes?: string;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// CONFIGURATION TYPES
// ============================================

export interface BonusParameters {
  writerPerProblem: number;      // default $100
  review1PerProblem: number;     // default $50
  review2PerProblem: number;     // default $50
  hoursPercentRate: number;      // default 0.20 (20%)
  referralBonusAmount: number;   // default $300
  defaultDataFilePrice: number;  // default $200
}

export interface ExpertBonusConfig {
  id: number;
  expertId: number;
  expertCode?: string;
  startDate?: Date;
  baseRate?: number;
  currentRate?: number;
  rateEffectiveDate?: Date;
  is20PercentEligible: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// SUMMARY/UI TYPES
// ============================================

export interface ExpertBonusSummary {
  expertId: number;
  expertName: string;
  periodName: string;
  periodStart: Date;
  periodEnd: Date;

  // Input data
  writerQualifyingProblems: number;
  review1QualifyingProblems: number;
  review2QualifyingProblems: number;
  totalHours: number;
  hoursAtOldSalary: number;
  initialReferralCount: number;
  dataFilesCount: number;

  // Calculated bonuses
  writerBonus: number;
  review1Bonus: number;
  review2Bonus: number;
  hoursPercentageBonus: number;
  salaryIncreaseBonus: number;
  referralBonus: number;
  dataBonus: number;

  // Totals
  totalBonus: number;
  baseEarnings: number;
  totalOwed: number;
  isPaid: boolean;
}

export interface PeriodBonusSummary {
  periodName: string;
  periodStart: Date;
  periodEnd: Date;
  experts: ExpertBonusSummary[];
  totals: {
    writerBonus: number;
    review1Bonus: number;
    review2Bonus: number;
    hoursPercentageBonus: number;
    salaryIncreaseBonus: number;
    referralBonus: number;
    dataBonus: number;
    totalBonus: number;
    baseEarnings: number;
    totalOwed: number;
    totalPaid: number;
    totalUnpaid: number;
  };
}

// ============================================
// EXCEL IMPORT TYPES
// ============================================

export interface ExcelBonusRow {
  person: string;

  // Writer (columns B-D in red section)
  writerQualifyingProblems?: number;
  writerPerProblemBonus?: number;
  writerBonus?: number;

  // Review 1 (columns E-G in orange section)
  review1QualifyingProblems?: number;
  review1PerProblemBonus?: number;
  review1Bonus?: number;

  // Review 2 (columns H-J in yellow section)
  review2QualifyingProblems?: number;
  review2PerProblemBonus?: number;
  review2Bonus?: number;

  // Hours Percentage (columns K-M in green section)
  totalHours?: number;
  percentBonus?: number;
  hoursPercentageBonus?: number;

  // Salary Increase (columns N-P in blue section)
  hoursAtOldSalary?: number;
  changeInHourly?: number;
  salaryIncreaseBonus?: number;

  // Referral (columns Q-S in purple section)
  initialReferralCount?: number;
  initialReferralBonusAmount?: number;
  initialReferralBonus?: number;

  // Data (columns T-V in gray section)
  dataFiles?: number;
  pricePerFile?: number;
  dataBonus?: number;
}

// ============================================
// SYNC/ERROR TRACKING TYPES
// ============================================

export interface SyncRun {
  id: number;
  source: 'horizon' | 'rippling' | 'excel' | 'sheets';
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'success' | 'partial' | 'failed';
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  errorsCount: number;
  errorSummary?: Record<string, any>;
}

export interface SyncError {
  id: number;
  syncRunId: number;
  errorType: 'validation' | 'connection' | 'parse' | 'conflict';
  severity: 'warning' | 'error' | 'critical';
  sourceRecord?: Record<string, any>;
  errorMessage: string;
  stackTrace?: string;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface DataConflict {
  id: number;
  expertId?: number;
  fieldName: string;
  weekNumber?: number;
  sourceA: string;
  sourceAValue?: string;
  sourceB: string;
  sourceBValue?: string;
  resolvedValue?: string;
  resolutionRule?: 'rippling_wins' | 'manual' | 'latest_wins';
  createdAt: Date;
  resolvedAt?: Date;
}

// ============================================
// HORIZON METRICS TYPES
// ============================================

export interface HorizonMetrics {
  id: number;
  expertId: number;
  fetchDate: Date;
  timeWindow: 'week' | 'month' | 'quarter' | 'all';
  velocity: number;
  activeDays: number;
  responsivenessHours: number;
  complexityScore: number;
  consistencyScore: number;
  overallScore: number;
  problemsDelivered: number;
  problemsInProgress: number;
  createdAt: Date;
}
