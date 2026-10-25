import React, { useState, useEffect, useRef } from 'react';
import {
  Save,
  Play,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  History,
  Image as ImageIcon,
  CheckCircle2,
  Upload,
  Undo2,
  Redo2,
  MessageSquare,
  ShieldAlert,
  Send,
  HelpCircle,
  Check,
  Edit2,
  X,
  FileUp,
} from 'lucide-react';
import { Campaign, Brand, DraftRevision, AuditRun, Finding, BrandRule } from '../types';
import { NavPage } from './Navigation';
import { useToast } from './Toast';

interface ContentEditorViewProps {
  campaign: Campaign | null;
  brand: Brand | null;
  rules: BrandRule[];
  latestAudit: AuditRun | null;
  onSaveDraft: (content: string) => Promise<void>;
  onRunAudit: () => Promise<void>;
  onApplyCorrection: (finding: Finding, replacementText: string) => Promise<void>;
  onDismissFinding: (findingId: string, reason: string) => void;
  isAuditing: boolean;
  setActivePage: (page: NavPage) => void;
  revisions: DraftRevision[];
}

export const ContentEditorView: React.FC<ContentEditorViewProps> = ({
  campaign,
  brand,
  rules,
  latestAudit,
  onSaveDraft,
  onRunAudit,
  onApplyCorrection,
  onDismissFinding,
  isAuditing,
  setActivePage,
  revisions,
}) => {
  const { success, warning, error } = useToast();

  const [draft, setDraft] = useState('');
  const [historyStack, setHistoryStack] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showRevisions, setShowRevisions] = useState(false);
  const [visualAssetUrl, setVisualAssetUrl] = useState<string | null>(null);
  const [activeRightTab, setActiveRightTab] = useState<'assistant' | 'inspector'>('inspector');
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);

  // Assistant Chat State
  const [chatMessages, setChatMessages] = useState<
    { role: 'user' | 'assistant'; text: string; timestamp: string }[]
  >([
    {
      role: 'assistant',
      text: `Hello! I am your live brand governance assistant for ${brand?.name || 'your brand'}. Ask me how to phrase specific claims, why a sentence was flagged, or which disclaimers are mandatory.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isAssistantThinking, setIsAssistantThinking] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Finding Inline Edit
  const [editingFindingId, setEditingFindingId] = useState<string | null>(null);
  const [editedReplacement, setEditedReplacement] = useState('');
  const [dismissReason, setDismissReason] = useState('');
  const [showDismissModal, setShowDismissModal] = useState(false);

  // Drag & drop state
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  useEffect(() => {
    if (campaign) {
      const initial = campaign.currentDraft || '';
      setDraft(initial);
      setHistoryStack([initial]);
      setHistoryIndex(0);
      setVisualAssetUrl(campaign.visualAssetUrl || null);
      setHasUnsavedChanges(false);

      if (latestAudit && latestAudit.validatedFindings.length > 0) {
        setSelectedFindingId(latestAudit.validatedFindings[0].id);
        setActiveRightTab('inspector');
      }
    }
  }, [campaign?.id]);

  // Keyboard shortcut Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasUnsavedChanges) {
          handleSave();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [draft, hasUnsavedChanges, historyIndex, historyStack]);

  if (!campaign || !brand) {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-3">
        <h2 className="text-base font-semibold text-stone-800">No campaign selected</h2>
        <p className="text-xs text-stone-500">Select or create a campaign to edit content.</p>
        <button
          onClick={() => setActivePage('campaigns')}
          className="px-3.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100"
        >
          View Campaigns
        </button>
      </div>
    );
  }

  const isAuditStale =
    latestAudit &&
    (campaign.draftVersion !== latestAudit.draftVersion || draft !== campaign.currentDraft);

  const wordsCount = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  const charsCount = draft.length;

  const pushToHistory = (newText: string) => {
    const updated = historyStack.slice(0, historyIndex + 1);
    updated.push(newText);
    setHistoryStack(updated);
    setHistoryIndex(updated.length - 1);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setDraft(val);
    setHasUnsavedChanges(true);
    pushToHistory(val);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = historyStack[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setDraft(prev);
      setHasUnsavedChanges(true);
    }
  };

  const handleRedo = () => {
    if (historyIndex < historyStack.length - 1) {
      const next = historyStack[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setDraft(next);
      setHasUnsavedChanges(true);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveDraft(draft);
      setHasUnsavedChanges(false);
      success('Draft Saved', `Draft v${campaign.draftVersion} updated successfully.`);
    } catch (err: any) {
      error('Save Failed', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Drag and drop text files into editor
  const handleDropFile = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setDraft(text);
          setHasUnsavedChanges(true);
          pushToHistory(text);
          success('Document Imported', `Imported ${file.name} into editor.`);
        }
      };
      reader.readAsText(file);
    }
  };

  // Live Assistant Chat
  const handleSendChat = async (presetQuery?: string) => {
    const query = presetQuery || chatInput.trim();
    if (!query) return;

    const userMsg = {
      role: 'user' as const,
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    if (!presetQuery) setChatInput('');
    setIsAssistantThinking(true);

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: brand.id,
          draft,
          query,
          activeFindings: latestAudit?.validatedFindings || [],
          history: chatMessages.slice(-6).map((m) => ({ role: m.role, text: m.text })),
        }),
      });

      const json = await res.json();
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: json.reply || 'Analysis complete.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setTimeout(() => {
        chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Unable to reach the assistant service at this moment. You can still inspect approved rules in the Inspector tab.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsAssistantThinking(false);
    }
  };

  const selectedFinding = latestAudit?.validatedFindings.find((f) => f.id === selectedFindingId) || latestAudit?.validatedFindings[0];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      {/* Top Action Bar */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs">
            v{campaign.draftVersion}
          </div>
          <div>
            <h1 className="text-base font-bold text-stone-900 leading-none">{campaign.name}</h1>
            <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-1">
              <span>{brand.name}</span>
              <span>·</span>
              <span className="capitalize">{campaign.contentType.replace('_', ' ')}</span>
              <span>·</span>
              <span>{campaign.language.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowRevisions(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors shadow-2xs"
          >
            <History className="w-3.5 h-3.5 text-stone-500" />
            <span>Revisions ({revisions.length})</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving || !hasUnsavedChanges}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 disabled:opacity-40 rounded-lg transition-colors cursor-pointer"
            title="Save draft (Ctrl+S)"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
          </button>

          <button
            onClick={onRunAudit}
            disabled={isAuditing}
            className="flex items-center gap-2 px-4 py-1.5 bg-[#4338CA] hover:bg-[#3730A3] disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            {isAuditing ? (
              <>
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>Auditing Draft...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Compliance Audit</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stale Audit Warning */}
      {isAuditStale && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-amber-900 font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Draft was edited. Existing audit results are outdated. Re-run audit before sign-off.</span>
          </div>
          <button
            onClick={onRunAudit}
            disabled={isAuditing}
            className="px-2.5 py-1 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded transition-colors shrink-0"
          >
            Re-run Audit
          </button>
        </div>
      )}

      {/* Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT PANEL: CONTENT EDITOR (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingOver(true);
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={handleDropFile}
            className={`bg-white border rounded-xl shadow-2xs overflow-hidden flex flex-col transition-all ${
              isDraggingOver ? 'border-indigo-600 ring-2 ring-indigo-600/20 bg-indigo-50/20' : 'border-stone-200'
            }`}
          >
            {/* Editor Toolbar */}
            <div className="px-4 py-2 border-b border-stone-200 bg-stone-50/80 flex items-center justify-between text-xs text-stone-500">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className="p-1 hover:bg-stone-200/70 disabled:opacity-30 rounded text-stone-600"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={historyIndex >= historyStack.length - 1}
                  className="p-1 hover:bg-stone-200/70 disabled:opacity-30 rounded text-stone-600"
                  title="Redo (Ctrl+Y)"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
                <span className="text-stone-300">|</span>
                <span className="font-semibold text-stone-700">Campaign Draft Copy</span>
                {hasUnsavedChanges && (
                  <span className="text-[10px] text-amber-600 font-medium bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    Unsaved
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 font-mono tabular-nums text-[11px]">
                <span>{wordsCount} words</span>
                <span>·</span>
                <span>{charsCount} characters</span>
              </div>
            </div>

            {/* Draft Input */}
            <div className="relative">
              <textarea
                value={draft}
                onChange={handleTextChange}
                placeholder="Write, paste, or drag & drop marketing copy here..."
                rows={16}
                className="w-full p-4 text-sm font-mono leading-relaxed text-stone-900 focus:outline-none resize-y min-h-[360px] bg-transparent"
              />
              {isDraggingOver && (
                <div className="absolute inset-0 bg-indigo-50/90 backdrop-blur-2xs flex flex-col items-center justify-center text-indigo-700 pointer-events-none">
                  <FileUp className="w-8 h-8 animate-bounce mb-2" />
                  <span className="font-bold text-sm">Drop document to import copy</span>
                </div>
              )}
            </div>

            {/* Bottom Status */}
            <div className="px-4 py-2 border-t border-stone-100 bg-stone-50/50 flex items-center justify-between text-[11px] text-stone-400">
              <span>Supports direct typing, copy-pasting, or dropping .txt / .md files</span>
              <span>Shortcuts: Ctrl+S (Save), Ctrl+Z (Undo)</span>
            </div>
          </div>

          {/* Quick Violations Jump Bar */}
          {latestAudit && latestAudit.validatedFindings.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-xl p-3 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-stone-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                  <span>Detected Violations ({latestAudit.validatedFindings.length})</span>
                </span>
                <span className="text-[11px] text-stone-400">Click to inspect & fix</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {latestAudit.validatedFindings.map((f) => {
                  const isSelected = selectedFindingId === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => {
                        setSelectedFindingId(f.id);
                        setActiveRightTab('inspector');
                      }}
                      className={`px-2.5 py-1 rounded text-xs font-mono transition-colors text-left truncate max-w-xs ${
                        isSelected
                          ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                          : f.severity === 'critical'
                          ? 'bg-red-50 text-red-800 hover:bg-red-100 border border-red-200'
                          : f.severity === 'major'
                          ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200'
                      }`}
                    >
                      "{f.quotedText.substring(0, 32)}..."
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: LIVE AUDIT ASSISTANT & FINDING INSPECTOR (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-stone-200 rounded-xl shadow-2xs overflow-hidden flex flex-col h-[520px]">
          {/* Right Panel Tabs */}
          <div className="px-3 pt-2 border-b border-stone-200 bg-stone-50/80 flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => setActiveRightTab('inspector')}
                className={`px-3 py-2 font-semibold rounded-t-lg transition-colors border-b-2 -mb-[1px] ${
                  activeRightTab === 'inspector'
                    ? 'bg-white border-indigo-600 text-indigo-900 shadow-2xs'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                Finding Inspector
              </button>
              <button
                onClick={() => setActiveRightTab('assistant')}
                className={`px-3 py-2 font-semibold rounded-t-lg transition-colors border-b-2 -mb-[1px] ${
                  activeRightTab === 'assistant'
                    ? 'bg-white border-indigo-600 text-indigo-900 shadow-2xs'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                Live Audit Assistant
              </button>
            </div>
          </div>

          {/* TAB 1: FINDING INSPECTOR */}
          {activeRightTab === 'inspector' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {selectedFinding ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          selectedFinding.severity === 'critical'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : selectedFinding.severity === 'major'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {selectedFinding.severity}
                      </span>
                      <span className="text-[11px] font-mono text-stone-400">
                        Rule ID: {selectedFinding.ruleId}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-stone-900 mt-2">
                      {selectedFinding.ruleDescription}
                    </h3>
                  </div>

                  {/* Flagged sentence */}
                  <div className="p-3 bg-red-50/70 border border-red-200 rounded-lg space-y-1">
                    <span className="text-[10px] uppercase font-bold text-red-900">
                      Problematic Sentence:
                    </span>
                    <p className="font-mono text-red-950 font-medium">"{selectedFinding.quotedText}"</p>
                  </div>

                  {/* Why it was flagged */}
                  <div className="space-y-1">
                    <span className="font-semibold text-stone-700 block">Why it was flagged:</span>
                    <p className="text-stone-600 leading-relaxed">{selectedFinding.explanation}</p>
                  </div>

                  {/* Policy Evidence */}
                  <div className="space-y-1">
                    <span className="font-semibold text-stone-700 block">Source Evidence:</span>
                    <p className="text-stone-600 italic bg-stone-50 p-2.5 rounded border border-stone-200/60 font-mono text-[11px]">
                      "{selectedFinding.evidence}"
                    </p>
                  </div>

                  {/* Proposed Correction & Actions */}
                  <div className="pt-3 border-t border-stone-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-emerald-800 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Authorized Replacement:</span>
                      </span>
                      {editingFindingId !== selectedFinding.id && (
                        <button
                          onClick={() => {
                            setEditingFindingId(selectedFinding.id);
                            setEditedReplacement(selectedFinding.suggestedCorrection || '');
                          }}
                          className="text-stone-500 hover:text-stone-800 text-[11px] font-semibold flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>

                    {editingFindingId === selectedFinding.id ? (
                      <div className="space-y-2">
                        <textarea
                          rows={2}
                          value={editedReplacement}
                          onChange={(e) => setEditedReplacement(e.target.value)}
                          className="w-full p-2 border border-stone-300 rounded-lg font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingFindingId(null)}
                            className="px-2.5 py-1 text-stone-600 hover:text-stone-800"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={async () => {
                              await onApplyCorrection(selectedFinding, editedReplacement);
                              setEditingFindingId(null);
                              success('Correction Applied', 'Updated draft with custom correction.');
                            }}
                            className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg shadow-xs"
                          >
                            Apply to Draft
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-2">
                        <p className="font-mono text-emerald-950 font-medium">
                          "{selectedFinding.userCorrection || selectedFinding.suggestedCorrection || 'No automatic replacement available.'}"
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={async () => {
                              await onApplyCorrection(
                                selectedFinding,
                                selectedFinding.userCorrection || selectedFinding.suggestedCorrection || ''
                              );
                              success('Correction Accepted', 'Draft has been updated. Re-audit recommended.');
                            }}
                            className="flex-1 py-1 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Accept Correction</span>
                          </button>
                          <button
                            onClick={() => setShowDismissModal(true)}
                            className="py-1 px-3 text-stone-600 hover:text-stone-900 bg-white border border-stone-200 rounded-lg font-medium"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-stone-400 p-6 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-stone-300" />
                  <p className="font-semibold text-stone-700">No finding selected</p>
                  <p className="text-[11px] text-stone-400">
                    Run an audit to inspect compliance violations, or switch to the Live Assistant.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LIVE AUDIT ASSISTANT */}
          {activeRightTab === 'assistant' && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Preset Query Chips */}
              <div className="p-2 border-b border-stone-100 bg-stone-50/50 flex flex-wrap gap-1 text-[11px]">
                <button
                  onClick={() => handleSendChat('Why is "100% protection" prohibited?')}
                  className="px-2 py-0.5 bg-white border border-stone-200 rounded text-stone-600 hover:border-indigo-400 transition-colors"
                >
                  Why is 100% UV prohibited?
                </button>
                <button
                  onClick={() => handleSendChat('What mandatory disclaimers apply?')}
                  className="px-2 py-0.5 bg-white border border-stone-200 rounded text-stone-600 hover:border-indigo-400 transition-colors"
                >
                  Required disclaimers?
                </button>
                <button
                  onClick={() => handleSendChat('Suggest a safer way to express dark spot reduction.')}
                  className="px-2 py-0.5 bg-white border border-stone-200 rounded text-stone-600 hover:border-indigo-400 transition-colors"
                >
                  Safe dark spot phrasing?
                </button>
              </div>

              {/* Chat Message Stream */}
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`p-3 rounded-xl max-w-[85%] leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-[#4338CA] text-white rounded-br-xs'
                          : 'bg-stone-100 text-stone-800 rounded-bl-xs'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[10px] text-stone-400 mt-0.5 px-1">{msg.timestamp}</span>
                  </div>
                ))}

                {isAssistantThinking && (
                  <div className="flex items-center gap-2 text-xs text-stone-400 p-2">
                    <span className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <span>Consulting brand governance rules...</span>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-2.5 border-t border-stone-200 bg-white flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Ask a question about brand rules or phrasing..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                  className="flex-1 px-3 py-1.5 border border-stone-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
                <button
                  onClick={() => handleSendChat()}
                  disabled={!chatInput.trim() || isAssistantThinking}
                  className="p-1.5 bg-[#4338CA] hover:bg-[#3730A3] disabled:opacity-40 text-white rounded-lg transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dismiss with Reason Modal */}
      {showDismissModal && selectedFinding && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-stone-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="text-base font-bold text-stone-900">Dismiss Finding</h3>
              <button onClick={() => setShowDismissModal(false)} className="text-stone-400 hover:text-stone-600">
                ✕
              </button>
            </div>
            <p className="text-xs text-stone-600">
              Dismissing records your justification in the governance audit trail. Critical violations will
              still block automated release.
            </p>
            <div className="text-xs">
              <label className="font-semibold text-stone-700 block mb-1">Reason for Dismissal</label>
              <textarea
                rows={3}
                placeholder="e.g., Claim is supported by authorized clinical trial doc #419..."
                value={dismissReason}
                onChange={(e) => setDismissReason(e.target.value)}
                className="w-full p-2 border border-stone-300 rounded-lg text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                onClick={() => setShowDismissModal(false)}
                className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDismissFinding(selectedFinding.id, dismissReason);
                  setShowDismissModal(false);
                  setDismissReason('');
                  warning('Finding Dismissed', 'Recorded dismissal in audit trail.');
                }}
                className="px-3.5 py-1.5 bg-stone-800 hover:bg-stone-900 text-white text-xs font-semibold rounded-lg"
              >
                Confirm Dismissal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revision History Modal */}
      {showRevisions && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-stone-200 max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                <h3 className="text-base font-bold text-stone-900">Draft Revision History</h3>
              </div>
              <button onClick={() => setShowRevisions(false)} className="text-stone-400 hover:text-stone-600 font-bold">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3">
              {revisions.map((rev) => (
                <div key={rev.id} className="border border-stone-200 rounded-lg p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 font-mono">Draft v{rev.version}</span>
                    <span className="text-[11px] text-stone-400">
                      {new Date(rev.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-stone-50 p-2 rounded text-[11px] font-mono text-stone-700 line-clamp-3">
                    {rev.content}
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => {
                        setDraft(rev.content);
                        setHasUnsavedChanges(true);
                        pushToHistory(rev.content);
                        setShowRevisions(false);
                        success('Draft Restored', `Restored draft v${rev.version}.`);
                      }}
                      className="px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 rounded"
                    >
                      Restore This Version
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
