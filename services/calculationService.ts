import { IncomeEntry, AnalysisResult, CalculatedData } from '../types';

export const calculateDrift = (entries: IncomeEntry[]): AnalysisResult | null => {
  if (entries.length === 0) return null;

  // 1. Sort entries by date ascending
  const sortedEntries = [...entries].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const dataPoints: CalculatedData[] = [];

  // 2. Initialize the cumulative factor logic
  // The logic: We want to know what past money is worth in TODAY's terms (or end date terms).
  // We iterate backwards to build the cumulative inflation factor.
  
  const n = sortedEntries.length;
  // Initialize an array to store factors corresponding to the sorted entries
  const factors = new Array(n).fill(1.0);
  
  let currentCumulative = 1.0;
  
  // Iterate backwards from the last entry to the first
  // The last entry has a factor of 1.0 (it is the current baseline)
  // The second to last entry is multiplied by (1 + last_entry_inflation)
  for (let i = n - 2; i >= 0; i--) {
    // Inflation of the *next* month affects the purchasing power of the *current* month relative to the end.
    // However, the prototype logic was: item.realFactor = cumulativeFactor; cumulativeFactor *= (1 + item.inf);
    // Let's stick closely to the standard Real Value formula:
    // Real Value = Nominal * (CPI_End / CPI_Date)
    // Here, we simulate the CPI ratio using cumulative monthly inflation.
    
    // Using the user's prototype logic approach:
    // We process from end to start to build the multiplier.
    const nextEntry = sortedEntries[i + 1];
    currentCumulative = currentCumulative * (1 + (nextEntry.inflationRate / 100));
    factors[i] = currentCumulative;
  }

  // 3. Build the calculated data
  sortedEntries.forEach((entry, index) => {
    const nominal = entry.salaryForeign * entry.exchangeRate;
    const factor = factors[index]; 
    
    dataPoints.push({
      ...entry,
      nominalLocal: nominal,
      cumulativeInflationFactor: factor,
      realValueLocal: nominal * factor
    });
  });

  const startPoint = dataPoints[0];
  const endPoint = dataPoints[dataPoints.length - 1];

  const drift = ((endPoint.realValueLocal - startPoint.realValueLocal) / startPoint.realValueLocal) * 100;

  return {
    startRealValue: startPoint.realValueLocal,
    endRealValue: endPoint.realValueLocal,
    driftPercentage: drift,
    dataPoints
  };
};