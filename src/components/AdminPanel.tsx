/**
 * MEP-light™ — Admin Panel
 * 
 * Full-page user management dashboard for Administrators.
 * 
 * Features:
 *   - Stats summary (total users, by role)
 *   - Searchable user table with filters
 *   - Role editing via dropdown
 *   - User deactivation (soft-delete)
 *   - Create new user modal
 *   - Back to main app navigation
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Search,
  ChevronLeft,
  UserPlus,
  Shield,
  X,
  AlertTriangle,
  CheckCircle2,
  Ban,
  Globe2,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import { apiClient } from "../lib/apiClient";
import type { UserProfile, UserStatsResponse } from "../lib/apiClient";

// ─── Types ──────────────────────────────────────────────────────────

interface AdminPanelProps {
  onBack: () => void;
}

// ─── Role Badge Component ───────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    Administrator: "bg-indigo-950/60 text-indigo-300 border-indigo-500/40",
    Consultant: "bg-emerald-950/60 text-emerald-300 border-emerald-500/40",
    Viewer: "bg-slate-800/60 text-slate-300 border-slate-600/40",
  };

  return (
    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${styles[role] || styles.Viewer}`}>
      {role}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-950/40 text-emerald-400 border-emerald-600/30",
    deactivated: "bg-red-950/40 text-red-400 border-red-600/30",
    invited: "bg-amber-950/40 text-amber-400 border-amber-600/30",
  };

  return (
    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${styles[status] || styles.active}`}>
      {status}
    </span>
  );
}

// ─── Main Admin Panel ───────────────────────────────────────────────

export default function AdminPanel({ onBack }: AdminPanelProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<UserStatsResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string>("");
  const [confirmDeactivate, setConfirmDeactivate] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.users.list({
        q: searchQuery || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        limit: 100,
      });
      setUsers(data.users);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message || "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, roleFilter, statusFilter, refreshKey]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiClient.users.stats();
      setStats(data);
    } catch {
      // Stats are non-critical
    }
  }, [refreshKey]);

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, [fetchUsers, fetchStats]);

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await apiClient.users.update(userId, { role: newRole });
      setEditingUserId(null);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      setError(`Failed to update role: ${err.message}`);
    }
  };

  const handleDeactivate = async (userId: string) => {
    try {
      await apiClient.users.deactivate(userId);
      setConfirmDeactivate(null);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      setError(`Failed to deactivate user: ${err.message}`);
    }
  };

  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans">
      {/* ─── Header ──────────────────────────────────────────── */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-600 px-3 py-1.5 rounded-lg transition cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Back to App
            </button>
            <div className="w-px h-6 bg-slate-800" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-md">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold font-display text-white leading-none">Admin Panel</h1>
                <p className="text-[10px] text-slate-500 font-mono">User Management & Access Control</p>
              </div>
            </div>
          </div>
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-600 px-3 py-1.5 rounded-lg transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ─── Stats Cards ──────────────────────────────────── */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatsCard
              label="Total Users"
              value={stats.total}
              icon={<Users className="w-5 h-5 text-indigo-400" />}
              accent="indigo"
            />
            <StatsCard
              label="Administrators"
              value={stats.byRole?.Administrator || 0}
              icon={<Shield className="w-5 h-5 text-purple-400" />}
              accent="purple"
            />
            <StatsCard
              label="Consultants"
              value={stats.byRole?.Consultant || 0}
              icon={<BarChart3 className="w-5 h-5 text-emerald-400" />}
              accent="emerald"
            />
            <StatsCard
              label="Viewers"
              value={stats.byRole?.Viewer || 0}
              icon={<Globe2 className="w-5 h-5 text-slate-400" />}
              accent="slate"
            />
          </div>
        )}

        {/* ─── Search & Filters ─────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by email, name, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition"
              id="admin-search-input"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-300 px-3 py-2.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="">All Roles</option>
            <option value="Administrator">Administrator</option>
            <option value="Consultant">Consultant</option>
            <option value="Viewer">Viewer</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-300 px-3 py-2.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="deactivated">Deactivated</option>
            <option value="invited">Invited</option>
          </select>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition shadow-lg shadow-indigo-900/30 cursor-pointer"
            id="create-user-btn"
          >
            <UserPlus className="w-4 h-4" />
            Add User
          </button>
        </div>

        {/* ─── Error Banner ─────────────────────────────────── */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-950/30 border border-red-800/40 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ─── User Table ───────────────────────────────────── */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60">
                  <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-slate-500">User</th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-slate-500">Role</th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-slate-500">Status</th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-slate-500 hidden md:table-cell">Company</th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-slate-500 hidden lg:table-cell">Sessions</th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-slate-500 hidden lg:table-cell">Last Login</th>
                  <th className="text-right px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="flex items-center justify-center gap-2 text-slate-500">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Loading users...</span>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500 text-sm">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.userId} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                      {/* User */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-700" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-xs font-bold text-white">
                              {(u.displayName || u.email).charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-white">{u.displayName || "—"}</p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        {editingUserId === u.userId ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={editingRole}
                              onChange={(e) => setEditingRole(e.target.value)}
                              className="bg-slate-800 border border-indigo-500 rounded text-xs text-white px-2 py-1 focus:outline-none cursor-pointer"
                            >
                              <option value="Viewer">Viewer</option>
                              <option value="Consultant">Consultant</option>
                              <option value="Administrator">Administrator</option>
                            </select>
                            <button
                              onClick={() => handleUpdateRole(u.userId, editingRole)}
                              className="text-emerald-400 hover:text-emerald-300 cursor-pointer"
                              title="Save"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingUserId(null)}
                              className="text-slate-400 hover:text-slate-300 cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <RoleBadge role={u.role} />
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge status={u.status} />
                      </td>

                      {/* Company */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-sm text-slate-400">{u.companyName || "—"}</span>
                      </td>

                      {/* Sessions */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-sm text-slate-400 font-mono">{u.totalSessions}</span>
                      </td>

                      {/* Last Login */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-slate-500 font-mono">
                          {u.lastLoginAt
                            ? new Date(u.lastLoginAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Never"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {editingUserId !== u.userId && (
                            <button
                              onClick={() => {
                                setEditingUserId(u.userId);
                                setEditingRole(u.role);
                              }}
                              className="text-xs text-slate-400 hover:text-indigo-300 px-2 py-1 rounded hover:bg-indigo-950/30 transition cursor-pointer"
                              title="Edit role"
                            >
                              Edit
                            </button>
                          )}
                          {u.status === "active" && (
                            <>
                              {confirmDeactivate === u.userId ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleDeactivate(u.userId)}
                                    className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-950/30 transition cursor-pointer"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeactivate(null)}
                                    className="text-xs text-slate-400 hover:text-slate-300 px-1 py-1 cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeactivate(u.userId)}
                                  className="text-xs text-slate-500 hover:text-red-400 px-2 py-1 rounded hover:bg-red-950/20 transition cursor-pointer"
                                  title="Deactivate"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer with count */}
          <div className="px-4 py-3 border-t border-slate-800 bg-slate-900/40 flex items-center justify-between">
            <p className="text-xs text-slate-500 font-mono">
              Showing {users.length} of {total} user{total !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </main>

      {/* ─── Create User Modal ──────────────────────────────── */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

// ─── Stats Card ─────────────────────────────────────────────────────

function StatsCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className={`bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:border-${accent}-500/30 transition`}>
      <div className="flex items-center justify-between mb-2">
        {icon}
        <span className="text-2xl font-bold font-display text-white">{value}</span>
      </div>
      <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">{label}</p>
    </div>
  );
}

// ─── Create User Modal ──────────────────────────────────────────────

function CreateUserModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Viewer");
  const [displayName, setDisplayName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await apiClient.users.create({
        email,
        role,
        displayName: displayName || undefined,
        companyName: companyName || undefined,
      });
      onCreated();
    } catch (err: any) {
      setError(err.message || "Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200]">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Add New User</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
              Email Address *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="user@company.com"
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
              id="create-user-email"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Full name (auto-generated if empty)"
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
              Company
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Organization name"
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="Viewer">Viewer — Read-only dashboard access</option>
              <option value="Consultant">Consultant — Full CRUD, scoring, PDF export</option>
              <option value="Administrator">Administrator — Unrestricted management</option>
            </select>
          </div>

          {error && (
            <div className="px-3 py-2 bg-red-950/30 border border-red-800/40 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !email}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition shadow-lg shadow-indigo-900/30 cursor-pointer"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {isSubmitting ? "Creating..." : "Create User"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm text-slate-400 hover:text-slate-200 border border-slate-700 rounded-lg hover:border-slate-600 transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
