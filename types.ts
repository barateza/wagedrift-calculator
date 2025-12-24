export interface IncomeEntry {
  id: string;
  date: string; // YYYY-MM format
  salaryForeign: number;
  exchangeRate: number;
  inflationRate: number; // Percentage value (e.g., 0.5 for 0.5%)
}

export interface CalculatedData extends IncomeEntry {
  nominalLocal: number; // Salary * Exchange Rate
  cumulativeInflationFactor: number;
  realValueLocal: number; // Nominal * CumulativeFactor
}

export interface AnalysisResult {
  startRealValue: number;
  endRealValue: number;
  driftPercentage: number;
  dataPoints: CalculatedData[];
}
