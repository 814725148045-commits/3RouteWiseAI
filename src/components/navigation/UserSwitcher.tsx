/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../../types/user';
import { DEMO_PROFILES } from '../../data/userProfiles';
import {
  Users,
  ChevronDown,
  Building2,
  MapPin,
  Check,
  RotateCcw,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

interface UserSwitcherProps {
  activeProfile: UserProfile;
  onSelectUser: (userId: string) => void;
  onResetActiveUserData: () => void;
}

export const UserSwitcher: React.FC<UserSwitcherProps> = ({
  activeProfile,
  onSelectUser,
  onResetActiveUserData,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      {/* Switcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 transition-all text-xs cursor-pointer shadow-sm group"
        title="Switch Demo User Workspace (Independent Dataset & Depot)"
      >
        {/* User Avatar Circle */}
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] text-white shadow-sm shrink-0"
          style={{ backgroundColor: activeProfile.avatarColor }}
        >
          {activeProfile.name
            .split(' ')
            .map((n) => n[0])
            .join('')}
        </div>

        {/* User Info */}
        <div className="text-left hidden sm:block">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-100 group-hover:text-teal-300 transition-colors">
              {activeProfile.name}
            </span>
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20">
              Demo
            </span>
          </div>
          <div className="text-[10px] text-slate-400 leading-none">
            {activeProfile.companyName} · {activeProfile.city}
          </div>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-slate-900 border border-slate-700/80 p-3 shadow-2xl z-50 text-xs space-y-3 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="border-b border-slate-800 pb-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-100 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-teal-400" />
                Select Dispatch Workspace
              </span>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                Demo Mode
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Each user operates an independent workspace with distinct customer deliveries, time windows, vehicles, capacities, and depot.
            </p>
          </div>

          {/* User List */}
          <div className="space-y-1.5">
            {DEMO_PROFILES.map((profile) => {
              const isSelected = profile.id === activeProfile.id;
              return (
                <div
                  key={profile.id}
                  onClick={() => {
                    onSelectUser(profile.id);
                    setIsOpen(false);
                  }}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-teal-500/10 border-teal-500/40 text-slate-100'
                      : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0"
                        style={{ backgroundColor: profile.avatarColor }}
                      >
                        {profile.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                          <span>{profile.name}</span>
                          <span className="text-[10px] font-normal text-slate-400">
                            ({profile.role})
                          </span>
                        </div>
                        <div className="text-[11px] text-teal-300/90 font-medium">
                          {profile.companyName}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-teal-400 shrink-0" />}
                  </div>

                  <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate">Depot: {profile.depot.address}</span>
                  </div>

                  <div className="mt-1 text-[10px] text-slate-400 italic">
                    "{profile.scenarioTagline}"
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Reset & Disclaimer */}
          <div className="border-t border-slate-800 pt-2 flex items-center justify-between gap-2">
            <button
              onClick={() => {
                onResetActiveUserData();
                setIsOpen(false);
              }}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
              title="Reset current user to initial seed deliveries and fleet"
            >
              <RotateCcw className="w-3 h-3 text-amber-400" />
              <span>Reset {activeProfile.name.split(' ')[0]}'s Data</span>
            </button>
            <span className="text-[10px] text-slate-400 font-mono">Scoped Isolated State</span>
          </div>
        </div>
      )}
    </div>
  );
};
