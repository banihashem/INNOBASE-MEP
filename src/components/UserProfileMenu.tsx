/**
 * MEP-light™ — User Profile Menu
 * 
 * Header dropdown showing:
 *   - User avatar, name, email
 *   - Role badge (color-coded)
 *   - Admin Panel link (Administrator only)
 *   - Sign Out action
 * 
 * Fetches profile from backend on mount to sync role and metadata.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  User,
  ChevronDown,
  Shield,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import type { AuthUser } from "../lib/auth";
import { apiClient } from "../lib/apiClient";

// ─── Types ──────────────────────────────────────────────────────────

interface UserProfileMenuProps {
  onOpenAdmin?: () => void;
}

// ─── Role Badge Colors ──────────────────────────────────────────────

const ROLE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Administrator: {
    bg: "bg-indigo-950/60",
    text: "text-indigo-300",
    border: "border-indigo-500/40",
  },
  Consultant: {
    bg: "bg-emerald-950/60",
    text: "text-emerald-300",
    border: "border-emerald-500/40",
  },
  Viewer: {
    bg: "bg-slate-800/60",
    text: "text-slate-300",
    border: "border-slate-600/40",
  },
};

// ─── Component ──────────────────────────────────────────────────────

export default function UserProfileMenu({ onOpenAdmin }: UserProfileMenuProps) {
  const { user, signOut, updateUserRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [backendProfile, setBackendProfile] = useState<any>(null);
  const [profileError, setProfileError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch backend profile on mount to sync role
  useEffect(() => {
    if (!user) return;

    apiClient.users.me()
      .then((data) => {
        setBackendProfile(data.user);
        if (data.user.role && data.user.role !== user.role) {
          updateUserRole(data.user.role);
        }
      })
      .catch(() => {
        setProfileError(true);
      });
  }, [user?.email]);

  if (!user) return null;

  const displayName = backendProfile?.displayName || user.name || user.email.split("@")[0];
  const email = user.email;
  const avatarUrl = backendProfile?.avatarUrl || user.picture;
  const role = backendProfile?.role || user.role || "Viewer";
  const roleStyle = ROLE_STYLES[role] || ROLE_STYLES.Viewer;
  const isAdmin = role === "Administrator";
  const totalSessions = backendProfile?.totalSessions || 0;

  const handleSignOut = () => {
    setIsOpen(false);
    signOut();
  };

  const handleOpenAdmin = () => {
    setIsOpen(false);
    onOpenAdmin?.();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-600 bg-slate-900/50 hover:bg-slate-800/50 transition-all cursor-pointer"
        id="user-profile-menu-trigger"
      >
        {/* Avatar */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-700"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-white" />
          </div>
        )}

        {/* Name (hidden on mobile) */}
        <span className="hidden sm:block text-xs text-slate-300 font-medium max-w-[120px] truncate">
          {displayName}
        </span>

        {/* Role Badge */}
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border} font-bold uppercase tracking-wider`}>
          {role === "Administrator" ? "Admin" : role}
        </span>

        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl shadow-black/40 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2">
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/80">
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/30"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                <p className="text-xs text-slate-400 truncate">{email}</p>
              </div>
            </div>

            {/* Role & Stats */}
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border} font-bold uppercase tracking-wider`}>
                <Shield className="w-3 h-3 inline mr-1" />
                {role}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {totalSessions} session{totalSessions !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            {/* Admin Panel — only for Administrators */}
            {isAdmin && onOpenAdmin && (
              <button
                onClick={handleOpenAdmin}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-indigo-950/40 hover:text-indigo-200 transition-colors cursor-pointer"
                id="admin-panel-link"
              >
                <Users className="w-4 h-4 text-indigo-400" />
                <span>Admin Panel</span>
                <span className="ml-auto text-[10px] font-mono text-indigo-400/60 bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-900/30">
                  ADMIN
                </span>
              </button>
            )}

            {/* Account Settings (placeholder) */}
            <button
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors cursor-pointer"
              onClick={() => setIsOpen(false)}
            >
              <Settings className="w-4 h-4 text-slate-500" />
              <span>Account Settings</span>
            </button>

            {/* Divider */}
            <div className="border-t border-slate-800 my-1" />

            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-colors cursor-pointer"
              id="sign-out-btn"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>

          {/* Footer */}
          {profileError && (
            <div className="px-4 py-2 border-t border-slate-800 bg-amber-950/20">
              <p className="text-[10px] text-amber-400/80 font-mono">
                ⚠ Backend profile sync unavailable — using local data
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
