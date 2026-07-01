import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Clock,
  FileText,
  Trash2,
  Plus,
  ArrowRight,
  RotateCcw,
  X,
} from "lucide-react";
import {
  SessionMeta,
  listSessions,
  deleteSession,
} from "../hooks/usePersistedState";

/**
 * MEP-light™ — Session Manager
 * 
 * Displays:
 *   1. Resume prompt when returning with an active session
 *   2. Session history list with resume / delete actions
 *   3. New session creation
 */

interface SessionManagerProps {
  currentSessionId: string | null;
  onResumeSession: (sessionId: string) => void;
  onStartNew: () => void;
  onDeleteSession: (sessionId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function SessionManager({
  currentSessionId,
  onResumeSession,
  onStartNew,
  onDeleteSession,
  isOpen,
  onClose,
}: SessionManagerProps) {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSessions(listSessions());
    }
  }, [isOpen]);

  const handleDelete = useCallback(
    (id: string) => {
      deleteSession(id);
      onDeleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setConfirmDeleteId(null);
    },
    [onDeleteSession]
  );

  if (!isOpen) return null;

  const pastSessions = sessions.filter((s) => s.id !== currentSessionId);
  const activeSession = sessions.find((s) => s.id === currentSessionId);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-teal-400 flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Assessment Sessions</h2>
              <p className="text-xs text-slate-400">Resume or start a new analysis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
          {/* Active Session */}
          {activeSession && (
            <div className="mb-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-teal-400 mb-2">
                Current Session
              </p>
              <div className="bg-slate-800/60 border border-teal-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-white">
                    {activeSession.companyName || "Untitled Assessment"}
                  </span>
                  <span className="text-[10px] font-mono text-teal-400 bg-teal-950 px-2 py-0.5 rounded">
                    Step {activeSession.currentStep}/{activeSession.totalSteps}
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-1.5 mb-2">
                  <div
                    className="bg-gradient-to-r from-teal-400 to-indigo-400 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${activeSession.completionPct}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  Last updated: {new Date(activeSession.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* Start New */}
          <button
            onClick={() => {
              onStartNew();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-slate-600 hover:border-teal-500/50 hover:bg-slate-800/40 transition mb-5 group"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-800 group-hover:bg-teal-950 flex items-center justify-center transition">
              <Plus className="w-4 h-4 text-slate-400 group-hover:text-teal-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-200 group-hover:text-white">
                Start New Assessment
              </p>
              <p className="text-[11px] text-slate-500">
                Begin a fresh market entry analysis
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-600 ml-auto group-hover:text-teal-400 transition" />
          </button>

          {/* Past Sessions */}
          {pastSessions.length > 0 && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                Past Sessions ({pastSessions.length})
              </p>
              <div className="space-y-2">
                {pastSessions.map((session) => (
                  <div
                    key={session.id}
                    className="bg-slate-800/40 border border-slate-800 rounded-xl p-3 flex items-center gap-3 group hover:border-slate-600 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">
                        {session.companyName || "Untitled Assessment"}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span className="text-[10px] text-slate-500">
                          {new Date(session.updatedAt).toLocaleDateString()}
                        </span>
                        <span className="text-[10px] text-slate-600">•</span>
                        <span className="text-[10px] text-slate-500">
                          Step {session.currentStep}/{session.totalSteps}
                        </span>
                        <span className="text-[10px] text-slate-600">•</span>
                        <span className="text-[10px] text-slate-500">
                          {session.completionPct}% complete
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => {
                          onResumeSession(session.id);
                          onClose();
                        }}
                        className="p-1.5 rounded-lg text-teal-400 hover:bg-teal-950 transition"
                        title="Resume"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      {confirmDeleteId === session.id ? (
                        <button
                          onClick={() => handleDelete(session.id)}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold text-red-400 bg-red-950/50 hover:bg-red-900/50 transition"
                        >
                          Confirm
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(session.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {pastSessions.length === 0 && !activeSession && (
            <div className="text-center py-8">
              <FileText className="w-8 h-8 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400">No previous sessions</p>
              <p className="text-xs text-slate-500 mt-1">
                Start your first market entry assessment above
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
