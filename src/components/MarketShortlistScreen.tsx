import React, { useState } from "react";
import { Market, DEFAULT_MARKETS, AppMode } from "../types";
import { Plus, Trash2, Edit2, Check, CheckSquare, Square, Info } from "lucide-react";

interface Props {
  selectedMarketIds: string[];
  customMarkets: Market[];
  onToggleMarket: (marketId: string) => void;
  onAddCustomMarket: (name: string, description: string) => void;
  onDeleteCustomMarket: (marketId: string) => void;
  onUpdateMarketDescription: (marketId: string, newDesc: string) => void;
  appMode: AppMode;
}

export default function MarketShortlistScreen({
  selectedMarketIds,
  customMarkets,
  onToggleMarket,
  onAddCustomMarket,
  onDeleteCustomMarket,
  onUpdateMarketDescription,
  appMode,
}: Props) {
  const [newMarketName, setNewMarketName] = useState("");
  const [newMarketDesc, setNewMarketDesc] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDesc, setEditingDesc] = useState("");
  const [activeDetailId, setActiveDetailId] = useState<string | null>("uae");

  const allMarkets = [...DEFAULT_MARKETS, ...customMarkets];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMarketName.trim()) return;
    onAddCustomMarket(
      newMarketName.trim(),
      newMarketDesc.trim() || "Custom market entered by user."
    );
    setNewMarketName("");
    setNewMarketDesc("");
    setIsAdding(false);
  };

  const startEditing = (m: Market) => {
    setEditingId(m.id);
    setEditingDesc(m.description);
  };

  const saveEditing = (id: string) => {
    onUpdateMarketDescription(id, editingDesc);
    setEditingId(null);
  };

  const validationCountError =
    selectedMarketIds.length < 3 || selectedMarketIds.length > 5;

  return (
    <div
      className="space-y-8 animate-fade-slide-in"
      id="market-shortlist-container"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold font-display text-white tracking-tight">
            Potential Markets
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Select 3 to 5 markets to compare. Click any card to view
            context notes.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <span
            className={`text-sm font-semibold px-3 py-1.5 rounded-lg border font-mono ${
              validationCountError
                ? "bg-rose-950/40 text-rose-400 border-rose-900/60"
                : "bg-emerald-950/40 text-emerald-400 border-emerald-900/60"
            }`}
          >
            Selected: {selectedMarketIds.length} (Requires 3–5)
          </span>

          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer"
              id="add-custom-market-btn"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Market</span>
            </button>
          )}
        </div>
      </div>

      {/* Inline Form */}
      {isAdding && (
        <form
          onSubmit={handleCreate}
          className="bg-slate-900 border border-indigo-900/40 rounded-xl p-5 space-y-4 animate-fade-in"
        >
          <h3 className="text-sm font-semibold text-indigo-300 font-display">
            Add Custom Target Market
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 block">
                Market Name
              </label>
              <input
                type="text"
                placeholder="e.g. Saudi Arabia"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                value={newMarketName}
                onChange={(e) => setNewMarketName(e.target.value)}
                required
                id="new-market-name-input"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 block">
                Strategic Context
              </label>
              <input
                type="text"
                placeholder="e.g. High import reliance, key gateway"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                value={newMarketDesc}
                onChange={(e) => setNewMarketDesc(e.target.value)}
                id="new-market-desc-input"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 text-xs">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-slate-400 hover:text-slate-200 px-3 py-2 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-lg cursor-pointer"
            >
              Save Market
            </button>
          </div>
        </form>
      )}

      {/* Markets Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allMarkets.map((market) => {
          const isSelected = selectedMarketIds.includes(market.id);
          const isActiveDetail = activeDetailId === market.id;

          return (
            <div
              key={market.id}
              className={`p-5 rounded-xl border transition-all flex flex-col justify-between cursor-pointer group ${
                isSelected
                  ? "bg-indigo-950/20 border-indigo-500/80 shadow-md"
                  : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90"
              } ${isActiveDetail ? "ring-2 ring-indigo-500/30" : ""}`}
              onClick={() => setActiveDetailId(market.id)}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleMarket(market.id);
                      }}
                      className="text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer"
                      id={`toggle-${market.id}`}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-indigo-500 stroke-[2.5]" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-600 hover:text-slate-400" />
                      )}
                    </button>
                    <span className="text-lg font-semibold text-slate-100 font-display">
                      {market.name}
                    </span>
                    {market.type && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {market.type}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDetailId(market.id);
                      }}
                      className="text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
                      title="View Notes"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                    {!market.isDefault && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCustomMarket(market.id);
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                  {market.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>
                  {market.isDefault ? "GLOBAL DATABASE" : "CUSTOM ENTRY"}
                </span>
                {isSelected && (
                  <span className="text-indigo-400 font-bold">
                    ACTIVE SCAN
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Context Detail View */}
      {activeDetailId && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 animate-fade-in">
          {(() => {
            const m = allMarkets.find((x) => x.id === activeDetailId);
            if (!m) return null;
            const isEditing = editingId === m.id;

            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    <h3 className="text-sm uppercase font-semibold text-indigo-400 tracking-wider">
                      Strategic Context Notes — {m.name}
                    </h3>
                  </div>

                  {appMode === "free-demo" ? null : !isEditing ? (
                    <button
                      onClick={() => startEditing(m)}
                      className="text-slate-400 hover:text-indigo-400 flex items-center space-x-1 text-xs cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => saveEditing(m.id)}
                      className="text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 text-xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </button>
                  )}
                </div>

                {appMode === "free-demo" ? (
                  <p className="text-sm text-slate-400 leading-relaxed bg-slate-950/40 p-4 rounded-lg border border-slate-800/40 italic">
                    Custom market context requires the Consultant tier.
                  </p>
                ) : isEditing ? (
                  <textarea
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 min-h-24"
                    value={editingDesc}
                    onChange={(e) => setEditingDesc(e.target.value)}
                  />
                ) : (
                  <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-4 rounded-lg border border-slate-800/40">
                    {m.description}
                  </p>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Validation warning */}
      {validationCountError && (
        <div className="bg-rose-950/15 border border-rose-900/50 rounded-lg p-4 flex items-center space-x-3 text-rose-300 text-sm">
          <span>
            ⚠️ <strong>Configuration Alert:</strong> Select between{" "}
            <strong>3 and 5</strong> markets to generate comparative
            matrices.
          </span>
        </div>
      )}
    </div>
  );
}
