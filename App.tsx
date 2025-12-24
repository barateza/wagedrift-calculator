import React, { useState } from 'react';
import { HashRouter } from 'react-router-dom';
import { Calculator, TrendingUp, TrendingDown, Info, Download } from 'lucide-react';
import { IncomeTable } from './components/IncomeTable';
import { AnalysisChart } from './components/AnalysisChart';
import { AIInsights } from './components/AIInsights';
import { calculateDrift } from './services/calculationService';
import { exportToCSV } from './services/ioService';
import { IncomeEntry, AnalysisResult } from './types';

const INITIAL_DATA: IncomeEntry[] = [
  { id: '1', date: '2023-01', salaryForeign: 3000, exchangeRate: 5.20, inflationRate: 0.53 },
  { id: '2', date: '2023-02', salaryForeign: 3000, exchangeRate: 5.15, inflationRate: 0.84 },
  { id: '3', date: '2023-03', salaryForeign: 3000, exchangeRate: 5.25, inflationRate: 0.71 },
  { id: '4', date: '2023-04', salaryForeign: 3200, exchangeRate: 5.00, inflationRate: 0.61 },
];

export default function App() {
  const [entries, setEntries] = useState<IncomeEntry[]>(INITIAL_DATA);
  const [results, setResults] = useState<AnalysisResult | null>(null);

  const handleCalculate = () => {
    const analysis = calculateDrift(entries);
    setResults(analysis);
    // Smooth scroll to results
    setTimeout(() => {
        document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <HashRouter>
      <div className="min-h-screen pb-20">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-brand-600 p-1.5 rounded-lg text-white">
                <Calculator size={20} />
              </div>
              <h1 className="font-bold text-lg text-slate-800 tracking-tight">WageDrift</h1>
            </div>
            <div className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              Privacy Mode: On
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
          
          {/* Intro Card */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
            <h2 className="text-2xl font-bold mb-2">Real Wage Calculator</h2>
            <p className="text-slate-300 max-w-xl">
              Calculate how inflation and exchange rates affect your true purchasing power over time. 
              Find out if your salary increases are actually keeping up with the cost of living.
            </p>
          </div>

          {/* Input Section */}
          <IncomeTable 
            entries={entries} 
            setEntries={setEntries} 
            onCalculate={handleCalculate}
          />

          {/* Results Section */}
          {results && (
            <div id="results-section" className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-2">
                   <h2 className="text-2xl font-bold text-slate-800">2. Analysis Results</h2>
                </div>
                <button 
                  onClick={() => exportToCSV(results)}
                  className="text-sm bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all"
                >
                  <Download size={16} />
                  Export CSV
                </button>
              </div>

              {/* KPI Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Initial Power</span>
                  <div className="text-2xl font-bold text-slate-800 mt-1">
                    R$ {results.startRealValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Base Purchasing Power</div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Current Power</span>
                  <div className="text-2xl font-bold text-slate-800 mt-1">
                    R$ {results.endRealValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Adjusted for Inflation</div>
                </div>

                <div className={`p-5 rounded-xl border shadow-sm ${
                  results.driftPercentage >= 0 
                    ? 'bg-green-50 border-green-100' 
                    : 'bg-red-50 border-red-100'
                }`}>
                  <span className={`text-sm font-bold uppercase tracking-wider ${
                     results.driftPercentage >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>Total Drift</span>
                  <div className={`text-3xl font-bold mt-1 flex items-center gap-2 ${
                    results.driftPercentage >= 0 ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {results.driftPercentage >= 0 ? <TrendingUp size={28}/> : <TrendingDown size={28}/>}
                    {results.driftPercentage > 0 ? '+' : ''}{results.driftPercentage.toFixed(2)}%
                  </div>
                  <div className={`text-xs mt-1 font-medium ${
                     results.driftPercentage >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {results.driftPercentage >= 0 ? 'Purchasing Power Gained' : 'Purchasing Power Lost'}
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                 <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-slate-700">Wage Drift Visualization</h3>
                    <div className="group relative">
                        <Info size={16} className="text-slate-400 cursor-help"/>
                        <div className="absolute right-0 w-64 p-2 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            The blue area shows your Real Purchasing Power (adjusted for accumulated inflation). The dashed line is your Nominal wage (face value).
                        </div>
                    </div>
                 </div>
                 <AnalysisChart data={results} />
              </div>

              {/* AI Insights */}
              <AIInsights analysis={results} />
            </div>
          )}
        </main>
      </div>
    </HashRouter>
  );
}
