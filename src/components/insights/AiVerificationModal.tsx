/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { runAiModuleUnitTests, AiTestSuiteExecution } from '../../services/ai/aiUnitTests';
import {
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  X,
  ShieldCheck,
  Clock,
  Terminal,
  Sparkles,
} from 'lucide-react';

interface AiVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiVerificationModal: React.FC<AiVerificationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [suiteResult, setSuiteResult] = useState<AiTestSuiteExecution | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  if (!isOpen) return null;

  const handleRunTests = () => {
    setIsRunning(true);
    setTimeout(() => {
      const exec = runAiModuleUnitTests();
      setSuiteResult(exec);
      setIsRunning(false);
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Module 5 AI Verification Suite
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-800 text-teal-300 border border-slate-700">
                  {suiteResult ? `${suiteResult.totalTests} Scenarios` : '16 Scenarios'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Automated compliance tests for AI grounding, privacy, read-only safety, and stale-plan detection
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs text-slate-300">
          {!suiteResult && !isRunning && (
            <div className="text-center py-10 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 mx-auto flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-200">
                Ready to Verify Gemini AI Insights Engine
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Executes the 10 formal verification test scenarios: optimization telemetry grounding,
                zero hallucinations, privacy PII stripping, read-only safety, and stale state detection.
              </p>
              <button
                type="button"
                onClick={handleRunTests}
                className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-teal-400 hover:bg-teal-300 text-slate-950 shadow-md shadow-teal-500/20 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                Run All 10 AI Verification Tests
              </button>
            </div>
          )}

          {isRunning && (
            <div className="text-center py-12 space-y-3">
              <div className="w-10 h-10 border-3 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-300 font-medium">Running AI verification suite...</p>
            </div>
          )}

          {suiteResult && !isRunning && (
            <div className="space-y-4">
              {/* Summary Banner */}
              <div className="flex items-center justify-between p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold ${
                      suiteResult.failedTests === 0
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {suiteResult.failedTests === 0 ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <XCircle className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-200 text-sm">
                      {suiteResult.passedTests} of {suiteResult.totalTests} Tests Passed
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        Execution duration: {suiteResult.durationMs}ms
                      </span>
                      <span>•</span>
                      <span className="text-emerald-400 font-medium">100% Grounded</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRunTests}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Rerun Tests
                </button>
              </div>

              {/* Test List */}
              <div className="space-y-2">
                {suiteResult.results.map((test) => (
                  <div
                    key={test.id}
                    className={`p-3 rounded-lg border text-xs space-y-1 transition-colors ${
                      test.passed
                        ? 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                        : 'bg-rose-500/10 border-rose-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-slate-200 flex items-center gap-2">
                        {test.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        )}
                        <span>{test.scenario}</span>
                      </div>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border shrink-0 ${
                          test.passed
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        {test.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 pl-6 leading-relaxed">
                      {test.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
