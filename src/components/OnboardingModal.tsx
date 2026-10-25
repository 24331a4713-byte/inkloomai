import React, { useState } from 'react';
import { Sparkles, ArrowRight, ArrowLeft, Check, ShieldCheck, BookOpen, Megaphone, CheckCircle2 } from 'lucide-react';
import { Brand } from '../types';
import { NavPage } from './Navigation';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  brand: Brand | null;
  setActivePage: (page: NavPage) => void;
  onRunAudit: () => Promise<void>;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  brand,
  setActivePage,
  onRunAudit,
}) => {
  const [step, setStep] = useState(1);

  if (!isOpen) return null;

  const handleNext = () => {
    if (step < 6) {
      setStep(step + 1);
    } else {
      onClose();
    }
  };

  const handleAction = async () => {
    if (step === 2) {
      setActivePage('brands');
      onClose();
    } else if (step === 3 || step === 4) {
      setActivePage('guidelines');
      onClose();
    } else if (step === 5) {
      setActivePage('editor');
      onClose();
    } else if (step === 6) {
      setActivePage('editor');
      onClose();
      await onRunAudit();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-stone-200 max-w-xl w-full p-6 shadow-2xl space-y-6">
        {/* Step indicator */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-700">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>INKLOOM AI Guided Walkthrough · Step {step} of 6</span>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-semibold text-stone-400 hover:text-stone-600"
          >
            Skip Walkthrough
          </button>
        </div>

        {/* Step Content */}
        {step === 1 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-stone-900">
              Welcome to INKLOOM AI Brand Governance
            </h2>
            <p className="text-xs text-stone-600 leading-relaxed">
              Inkloom AI empowers enterprise marketing teams to verify draft advertising copy, social posts,
              and landing pages against authorized brand guidelines, required terminology, and compliance policies before release.
            </p>
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs space-y-2">
              <div className="font-semibold text-stone-800">Our 3 Core Invariants:</div>
              <ul className="space-y-1.5 text-stone-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span><strong>Deterministic Integrity:</strong> Exact prohibited phrases and disclaimers are matched precisely.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span><strong>Strict Brand Isolation:</strong> Rules from one brand never govern another brand.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span><strong>Zero Hallucinated Approvals:</strong> Every cited violation requires verbatim draft evidence.</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-stone-900">Step 2: Select or Create Brand</h2>
            <p className="text-xs text-stone-600 leading-relaxed">
              Every marketing campaign belongs to an explicitly chosen brand with isolated
              color palettes, naming rules, and approval hierarchies.
            </p>
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-900">
              Currently active governing brand: <strong>{brand?.name || 'None selected'}</strong>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-stone-900">Step 3: Upload Brand Guidelines</h2>
            <p className="text-xs text-stone-600 leading-relaxed">
              Upload PDF, Markdown, or plain text guidelines. The platform ingests source documents, preserves
              text excerpts, and prepares candidate rules.
            </p>
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-600">
              Note: The quality and veracity of any audit depends strictly on your approved guidelines.
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-stone-900">Step 4: Review Extracted Rules</h2>
            <p className="text-xs text-stone-600 leading-relaxed">
              A heading like "Avoid Misleading Claims" is never turned into a blanket ban on the word "claims".
              You review candidate rules and explicitly activate only authorized checks.
            </p>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-stone-900">Step 5: Write or Paste Draft Content</h2>
            <p className="text-xs text-stone-600 leading-relaxed">
              Open the Content Editor to draft marketing copy, save revisions, and track word and character counts.
              Editing draft text automatically marks previous audits as stale.
            </p>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-stone-900">Step 6: Run Your First Compliance Audit</h2>
            <p className="text-xs text-stone-600 leading-relaxed">
              Click "Run Compliance Audit" to evaluate the draft through deterministic pattern matching,
              Gemini 3.8 Flash semantic reasoning, and mathematical score calculation.
            </p>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 font-medium">
              Ready! You can immediately audit the pre-loaded Solaria sunscreen campaign.
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-stone-100 text-xs">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-stone-600 hover:text-stone-900 font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                onClick={handleAction}
                className="px-3 py-1.5 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg font-semibold transition-colors"
              >
                Go to this step now
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#4338CA] hover:bg-[#3730A3] text-white font-semibold rounded-lg shadow-xs transition-colors"
            >
              <span>{step === 6 ? 'Get Started' : 'Next Step'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
