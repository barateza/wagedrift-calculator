import { IncomeEntry, AnalysisResult } from '../types';
import { RAW_INFLATION_DATA } from '../data/inflationData';
import { RAW_EXCHANGE_DATA } from '../data/exchangeData';

// --- Inflation Lookup ---

interface InflationRecord {
  ipca?: number;
  inpc?: number;
  igpm?: number;
}

// Cache the parsed data
let inflationMap: Record<string, InflationRecord> | null = null;
let exchangeMap: Record<string, number> | null = null;

const parseInflationData = () => {
  if (inflationMap) return inflationMap;

  inflationMap = {};
  const lines = RAW_INFLATION_DATA.trim().split('\n');

  lines.forEach(line => {
    // Format: Date;Index;MonthlyVar;...
    // Example: 11/2021;IPCA;0,95;10,74;IBGE (SIDRA)
    const parts = line.split(';');
    if (parts.length < 3) return;

    const dateStr = parts[0].trim(); // MM/YYYY
    const indexName = parts[1].trim().toUpperCase();
    const valueStr = parts[2].trim().replace(',', '.'); // Handle comma decimal

    // Parse date to YYYY-MM
    const [month, year] = dateStr.split('/');
    const key = `${year}-${month.padStart(2, '0')}`;

    const value = parseFloat(valueStr);

    if (!isNaN(value)) {
      if (!inflationMap![key]) {
        inflationMap![key] = {};
      }
      if (indexName === 'IPCA') inflationMap![key].ipca = value;
      if (indexName === 'INPC') inflationMap![key].inpc = value;
      if (indexName === 'IGP-M') inflationMap![key].igpm = value;
    }
  });

  return inflationMap;
};

const parseExchangeData = () => {
  if (exchangeMap) return exchangeMap;

  exchangeMap = {};
  const lines = RAW_EXCHANGE_DATA.trim().split('\n');

  lines.forEach(line => {
    // Format: Date,"Compra","Venda","Fechamento",Source
    // Example: 26/11/2021,"5,5959","5,5965","5,5865",BCB / Yahoo Finance
    // Example with superscript: 02/03/2022¹,"5,1434"...
    
    // We split by " to capture the quoted numbers accurately
    const parts = line.split('"');
    
    if (parts.length < 4) return; // Expecting at least date, empty, val1, empty, val2...

    // Date is in parts[0], removing comma and potential whitespace
    let datePart = parts[0].replace(',', '').trim();
    // Clean superscripts or extra chars from date (keep only digits and /)
    datePart = datePart.replace(/[^\d/]/g, '');

    // Check if we have a valid date part
    if (datePart.length < 10) return;

    const [day, month, year] = datePart.split('/');
    if (!year || !month) return;
    
    const key = `${year}-${month.padStart(2, '0')}`;

    // Index 1 is Compra, Index 3 is Venda (PTAX)
    // We use Venda (PTAX) as the standard reference
    const vendaStr = parts[3].replace(',', '.');
    const value = parseFloat(vendaStr);

    if (!isNaN(value)) {
      // If there are multiple entries for the same month, this will overwrite with the last one found.
      // Given the data is roughly monthly, this is acceptable.
      exchangeMap![key] = value;
    }
  });

  return exchangeMap;
};

export const getKnownInflation = (dateYyyyMm: string, type: 'IPCA' | 'INPC' | 'IGP-M' = 'IPCA'): number | null => {
  const map = parseInflationData();
  const record = map![dateYyyyMm];
  
  if (!record) return null;
  
  if (type === 'IPCA') return record.ipca ?? null;
  if (type === 'INPC') return record.inpc ?? null;
  if (type === 'IGP-M') return record.igpm ?? null;
  
  return null;
};

export const getKnownExchangeRate = (dateYyyyMm: string): number | null => {
  const map = parseExchangeData();
  return map![dateYyyyMm] ?? null;
};

// --- Import / Export ---

export const exportToCSV = (result: AnalysisResult) => {
  if (!result || !result.dataPoints.length) return;

  // Header
  const headers = ['Date', 'Salary (USD)', 'Exchange Rate', 'Inflation (%)', 'Nominal (BRL)', 'Real Value (BRL)', 'Cumulative Factor'];
  const rows = result.dataPoints.map(pt => [
    pt.date,
    pt.salaryForeign,
    pt.exchangeRate,
    pt.inflationRate,
    pt.nominalLocal.toFixed(2),
    pt.realValueLocal.toFixed(2),
    pt.cumulativeInflationFactor.toFixed(4)
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'wage_drift_analysis.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const parseImportFile = async (file: File): Promise<IncomeEntry[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        
        if (file.name.endsWith('.json')) {
          const data = JSON.parse(content);
          if (Array.isArray(data)) {
            // Basic validation
             const entries: IncomeEntry[] = data.map((item: any) => ({
                id: crypto.randomUUID(),
                date: item.date || item.Date,
                salaryForeign: Number(item.salaryForeign || item.salary || item.Salary),
                exchangeRate: Number(item.exchangeRate || item.rate || item.ExchangeRate || 0),
                inflationRate: Number(item.inflationRate || item.inflation || item.Inflation || 0)
             })).filter(e => e.date && !isNaN(e.salaryForeign));
             resolve(entries);
          } else {
            reject(new Error("Invalid JSON format. Expected an array."));
          }
        } else if (file.name.endsWith('.csv')) {
          const lines = content.split('\n');
          const entries: IncomeEntry[] = [];
          
          // Skip header if present (simple check: if first char is not a number)
          const startIdx = isNaN(parseInt(lines[0][0])) ? 1 : 0;

          for (let i = startIdx; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Allow comma or semicolon
            const separator = line.includes(';') ? ';' : ',';
            const parts = line.split(separator);
            
            if (parts.length >= 3) {
              entries.push({
                id: crypto.randomUUID(),
                date: parts[0].trim(),
                salaryForeign: parseFloat(parts[1]),
                exchangeRate: parseFloat(parts[2] || '0'),
                inflationRate: parts[3] ? parseFloat(parts[3]) : 0
              });
            }
          }
          resolve(entries);
        } else {
          reject(new Error("Unsupported file format. Please use .json or .csv"));
        }
      } catch (err) {
        reject(err);
      }
    };
    
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
};
