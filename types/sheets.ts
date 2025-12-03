export interface StatusRow {
  status: string;
  week1: number;
  week2: number;
  week3: number;
  week4: number;
  week5: number;
  week6: number;
  week7: number;
  total: number;
}

export interface ExpertRow {
  expert: string;
  week1: number;
  week2: number;
  week3: number;
  week4: number;
  week5: number;
  week6: number;
  week7: number;
  total: number;
}

export interface SheetData {
  name: string; // "PE" or "IB"
  rows: StatusRow[];
  grandTotal: number;
}

export interface ExpertSheetData {
  name: string; // "PE" or "IB"
  rows: ExpertRow[];
  grandTotal: number;
}

export interface CombinedData {
  sheets: SheetData[];
  expertSheets: ExpertSheetData[];
  lastUpdated: string;
}
