import React, { useState, useEffect } from 'react';
import {
  Settings,
  Play,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Cpu,
  Database,
  Key,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { RegressionTestOutput } from '../engine/regressionTests';

interface SettingsViewProps {
  onRunRegressionTests: () => Promise<{
    summary: { total: number; passed: number; failed: number };
    tests: RegressionTestOutput[];
  }>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onRunRegressionTests }) => {
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<{
    summary: { total: number; passed: number; failed: number };
    tests: RegressionTestOutput[];
  } | null>(null);
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<any>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setSystemStatus(data))
      .catch((err) => console.error('Failed to load health:', err));

    // Auto-run regression tests once on mount for instant verification
    handleRunTests();
  }, []);

  const handleRunTests = async () => {
    setIsRunningTests(true);
    try {
      const res = await onRunRegressionTests();
      setTestResults(res);
    } finally {
      setIsRunningTests(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-stone-200 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
            Settings & Regression Test Suite
          </h1>
          <p className="text-xs text-stone-500 mt-1 max-w-2xl">
            Verify audit engine invariants, deterministic logic, brand isolation, evidence
            validation, and scoring reproducibility against all mandatory test specifications.
          </p>
        </div>

        <button
          onClick={handleRunTests}
          disabled={isRunningTests}
          className="flex items-center gap-2 px-4 py-2 bg-[#4338CA] hover:bg-[#3730A3] disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          {isRunningTests ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Running Invariants...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Mandatory Regression Tests (A–L)</span>
            </>
          )}
        </button>
      </div>

      {/* System Infrastructure Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-stone-800">
            <Cpu className="w-4 h-4 text-indigo-600" />
            <span>Audit Pipeline Architecture</span>
          </div>
          <div className="text-xs text-stone-600">
            Hybrid Engine: Deterministic Parser + Gemini 3.8 Flash Semantic Reasoner
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Engine Core Online</span>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-stone-800">
            <Key className="w-4 h-4 text-indigo-600" />
            <span>Gemini API Environment</span>
          </div>
          <div className="text-xs text-stone-600">
            {systemStatus?.geminiConfigured
              ? 'GEMINI_API_KEY detected in server environment.'
              : 'Using fallback semantic & deterministic pipeline.'}
          </div>
          <div className="text-[11px] font-semibold text-stone-500">
            Model: <code className="text-indigo-700">gemini-3.8-flash</code>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-stone-800">
            <Database className="w-4 h-4 text-indigo-600" />
            <span>Persistence & Brand Isolation</span>
          </div>
          <div className="text-xs text-stone-600">
            File-backed JSON Database with multi-tenant isolation.
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Strict Isolation Active</span>
          </div>
        </div>
      </div>

      {/* Regression Tests Results Section */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Automated Regression Test Suite Results</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              12 Mandatory Invariant Tests (Section 20 of specification)
            </p>
          </div>

          {testResults && (
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {testResults.summary.passed} Passed
              </span>
              {testResults.summary.failed > 0 && (
                <span className="text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200">
                  {testResults.summary.failed} Failed
                </span>
              )}
            </div>
          )}
        </div>

        {isRunningTests ? (
          <div className="p-12 text-center text-xs text-stone-500 space-y-2">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="font-medium text-stone-700">Executing automated invariant tests...</p>
          </div>
        ) : !testResults ? (
          <div className="p-10 text-center text-xs text-stone-500">
            Click "Run Mandatory Regression Tests" above to verify the engine.
          </div>
        ) : (
          <div className="divide-y divide-stone-100 text-xs">
            {testResults.tests.map((test) => {
              const isExpanded = expandedTestId === test.id;
              return (
                <div key={test.id} className="p-4 hover:bg-stone-50/50 transition-colors">
                  <div
                    className="flex items-start justify-between gap-4 cursor-pointer"
                    onClick={() => setExpandedTestId(isExpanded ? null : test.id)}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {test.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-stone-800 text-[11px]">
                            {test.id}
                          </span>
                          <span className="text-stone-300">·</span>
                          <span className="font-semibold text-stone-900">{test.name}</span>
                        </div>
                        <p className="text-stone-600 mt-1">{test.actual}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`font-semibold uppercase text-[10px] px-2 py-0.5 rounded ${
                          test.passed
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-red-50 text-red-800'
                        }`}
                      >
                        {test.passed ? 'PASSED' : 'FAILED'}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-stone-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-stone-400" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-stone-100 pl-7 space-y-2 text-[11px]">
                      <div>
                        <span className="font-semibold text-stone-700 block">Expected Invariant:</span>
                        <span className="text-stone-600">{test.expected}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-stone-700 block">Evaluation Details:</span>
                        <span className="text-stone-500 font-mono">{test.details}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
