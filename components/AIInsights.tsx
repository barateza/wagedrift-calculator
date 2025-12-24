import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { AnalysisResult } from '../types';

interface AIInsightsProps {
  analysis: AnalysisResult;
}

export const AIInsights: React.FC<AIInsightsProps> = ({ analysis }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateInsights = async () => {
    if (!process.env.API_KEY) {
      setError("No API Key detected. This is a demo feature.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `
        You are a senior financial analyst.
        Analyze the following wage drift data for a remote worker earning in foreign currency.
        
        Data Summary:
        - Start Date: ${analysis.dataPoints[0].date}
        - End Date: ${analysis.dataPoints[analysis.dataPoints.length - 1].date}
        - Initial Real Value (Local Currency): ${analysis.startRealValue.toFixed(2)}
        - Current Real Value (Local Currency): ${analysis.endRealValue.toFixed(2)}
        - Total Purchasing Power Drift: ${analysis.driftPercentage.toFixed(2)}%
        
        Trend Data (Last 3 months):
        ${analysis.dataPoints.slice(-3).map(d => `- ${d.date}: Nominal ${d.nominalLocal.toFixed(0)}, Inflation ${d.inflationRate}%`).join('\n')}

        Please provide:
        1. A brief assessment of their purchasing power situation.
        2. Specifically, if the drift is negative, explain what that means practically.
        3. Two concise, actionable recommendations for negotiation or financial planning.
        
        Keep the tone professional but empathetic. Max 200 words. Format with simple markdown.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setInsight(response.text || "No insights generated.");
    } catch (err) {
      console.error(err);
      setError("Failed to generate insights. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-indigo-900 flex items-center gap-2">
          <Sparkles className="text-indigo-600" size={20} />
          AI Financial Analyst
        </h3>
        {!insight && !loading && (
          <button 
            onClick={generateInsights}
            className="text-xs font-medium bg-indigo-600 text-white px-3 py-1.5 rounded-full hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Generate Analysis
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-indigo-600 py-4">
          <Loader2 className="animate-spin" size={20} />
          <span className="text-sm font-medium">Analyzing inflation trends...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {insight && (
        <div className="prose prose-sm prose-indigo max-w-none text-slate-700">
           <div dangerouslySetInnerHTML={{ __html: insight.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
        </div>
      )}
    </div>
  );
};