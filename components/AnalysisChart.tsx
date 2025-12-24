import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, ComposedChart } from 'recharts';
import { AnalysisResult } from '../types';

interface AnalysisChartProps {
  data: AnalysisResult;
}

export const AnalysisChart: React.FC<AnalysisChartProps> = ({ data }) => {
  let runningIndex = 1.0;

  const chartData = data.dataPoints.map(pt => {
    // Current cumulative inflation percentage from start
    const currentInflation = (runningIndex - 1) * 100;
    
    // Prepare for next iteration
    runningIndex = runningIndex * (1 + (pt.inflationRate / 100));

    return {
      name: pt.date,
      Nominal: parseFloat(pt.nominalLocal.toFixed(2)),
      Real: parseFloat(pt.realValueLocal.toFixed(2)),
      Inflation: parseFloat(currentInflation.toFixed(2))
    };
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'BRL', 
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  return (
    <div className="w-full h-[350px] mt-6">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis 
            dataKey="name" 
            tick={{fontSize: 12, fill: '#64748b'}} 
            tickMargin={10} 
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            yAxisId="left"
            tick={{fontSize: 12, fill: '#64748b'}} 
            tickFormatter={formatCurrency} 
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            tick={{fontSize: 12, fill: '#f59e0b'}} 
            tickFormatter={formatPercentage} 
            axisLine={false}
            tickLine={false}
          />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            formatter={(value: number, name: string) => {
              if (name === 'Cumulative Inflation') return [`${value}%`, name];
              return [`R$ ${value.toLocaleString()}`, name];
            }}
          />
          <Legend wrapperStyle={{paddingTop: '20px'}} />
          
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="Nominal" 
            stroke="#94a3b8" 
            strokeWidth={2} 
            dot={false} 
            strokeDasharray="5 5"
            name="Nominal Value"
          />
          <Area 
            yAxisId="left"
            type="monotone" 
            dataKey="Real" 
            stroke="#0ea5e9" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorReal)" 
            name="Real Purchasing Power"
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="Inflation" 
            stroke="#f59e0b" 
            strokeWidth={2} 
            dot={false}
            name="Cumulative Inflation"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};