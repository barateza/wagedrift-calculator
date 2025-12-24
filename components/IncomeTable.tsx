import React, { useRef, useState } from 'react';
import { Trash2, Plus, ArrowUpRight, Upload, FileText, AlertCircle } from 'lucide-react';
import { IncomeEntry } from '../types';
import { getKnownInflation, getKnownExchangeRate, parseImportFile } from '../services/ioService';

interface IncomeTableProps {
  entries: IncomeEntry[];
  setEntries: React.Dispatch<React.SetStateAction<IncomeEntry[]>>;
  onCalculate: () => void;
}

export const IncomeTable: React.FC<IncomeTableProps> = ({ entries, setEntries, onCalculate }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleAddRow = () => {
    const lastEntry = entries[entries.length - 1];
    
    // Auto-increment month logic
    let nextDate = '2023-01';
    if (lastEntry) {
        const [y, m] = lastEntry.date.split('-').map(Number);
        let nextM = m + 1;
        let nextY = y;
        if (nextM > 12) {
            nextM = 1;
            nextY++;
        }
        nextDate = `${nextY}-${String(nextM).padStart(2, '0')}`;
    }
    
    const knownInflation = getKnownInflation(nextDate);
    const knownExchange = getKnownExchangeRate(nextDate);

    const newRow: IncomeEntry = {
      id: crypto.randomUUID(),
      date: nextDate,
      salaryForeign: lastEntry ? lastEntry.salaryForeign : 3000,
      exchangeRate: knownExchange ?? (lastEntry ? lastEntry.exchangeRate : 5.0),
      inflationRate: knownInflation ?? 0.5,
    };
    setEntries([...entries, newRow]);
  };

  const handleRemoveRow = (id: string) => {
    if (entries.length <= 1) return;
    setEntries(entries.filter(e => e.id !== id));
  };

  const handleChange = (id: string, field: keyof IncomeEntry, value: string | number) => {
    setEntries(entries.map(e => {
      if (e.id === id) {
        const updated = { ...e, [field]: value };
        
        // Auto-lookup inflation and exchange rate if date changes
        if (field === 'date' && typeof value === 'string') {
           const knownInf = getKnownInflation(value);
           if (knownInf !== null) updated.inflationRate = knownInf;
           
           const knownEx = getKnownExchangeRate(value);
           if (knownEx !== null) updated.exchangeRate = knownEx;
        }
        return updated;
      }
      return e;
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setImportError(null);
      const importedEntries = await parseImportFile(file);
      if (importedEntries.length > 0) {
        // Auto-fill inflation and exchange rate for imported entries if missing or 0
        const enhancedEntries = importedEntries.map(entry => {
            if (!entry.inflationRate) {
                const known = getKnownInflation(entry.date);
                if (known !== null) entry.inflationRate = known;
            }
            if (!entry.exchangeRate) {
                const known = getKnownExchangeRate(entry.date);
                if (known !== null) entry.exchangeRate = known;
            }
            return entry;
        });

        setEntries(enhancedEntries);
      } else {
        setImportError("No valid entries found in file.");
      }
    } catch (err) {
      setImportError("Failed to import file. Check format.");
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">1. Income Log</h2>
          <p className="text-slate-500 text-sm mt-1">
            Enter your monthly salary. Exchange Rate and Inflation auto-fills if data is available.
          </p>
        </div>
        
        <div className="flex gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".csv,.json" 
              className="hidden" 
            />
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
                <Upload size={16} />
                Import Data
            </button>
            <button 
                onClick={onCalculate}
                className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2 rounded-lg font-medium shadow-md shadow-brand-600/20 transition-all flex items-center gap-2"
            >
                <ArrowUpRight size={18} />
                Calculate Drift
            </button>
        </div>
      </div>

      {importError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mx-6 mt-4 flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle size={16} />
            {importError}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600 text-sm font-semibold border-b border-slate-200">
              <th className="p-4 w-32">Date</th>
              <th className="p-4 w-40">Salary (USD)</th>
              <th className="p-4 w-40">Exch. Rate</th>
              <th className="p-4 w-40">Inflation (%)</th>
              <th className="p-4 w-16 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="p-3">
                  <input 
                    type="month" 
                    value={entry.date}
                    onChange={(e) => handleChange(entry.id, 'date', e.target.value)}
                    className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:ring-brand-500 focus:border-brand-500 block p-2"
                  />
                </td>
                <td className="p-3">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-slate-500 sm:text-sm">$</span>
                    </div>
                    <input 
                      type="number" 
                      value={entry.salaryForeign}
                      onChange={(e) => handleChange(entry.id, 'salaryForeign', parseFloat(e.target.value) || 0)}
                      className="w-full pl-7 bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:ring-brand-500 focus:border-brand-500 block p-2"
                    />
                  </div>
                </td>
                <td className="p-3">
                  <input 
                    type="number" 
                    step="0.0001"
                    value={entry.exchangeRate}
                    onChange={(e) => handleChange(entry.id, 'exchangeRate', parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:ring-brand-500 focus:border-brand-500 block p-2"
                  />
                </td>
                <td className="p-3">
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.01"
                      value={entry.inflationRate}
                      onChange={(e) => handleChange(entry.id, 'inflationRate', parseFloat(e.target.value) || 0)}
                      className="w-full pr-7 bg-white border border-slate-300 text-slate-900 text-sm rounded-md focus:ring-brand-500 focus:border-brand-500 block p-2"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <span className="text-slate-500 sm:text-sm">%</span>
                    </div>
                  </div>
                </td>
                <td className="p-3 text-center">
                  <button 
                    onClick={() => handleRemoveRow(entry.id)}
                    disabled={entries.length === 1}
                    className="text-slate-400 hover:text-red-500 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors p-2"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="p-4 bg-slate-50 border-t border-slate-200">
        <button 
          onClick={handleAddRow}
          className="w-full sm:w-auto text-sm flex items-center justify-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium py-2 px-4 rounded-lg transition-all shadow-sm"
        >
          <Plus size={16} />
          Add Month
        </button>
      </div>
    </div>
  );
};
