import React from 'react';
import { UserRole, UserProfile } from '../backend/types.ts';
import { BookOpen, Shield, CheckCircle2, RefreshCw } from 'lucide-react';

interface HeaderProps {
  currentUser: UserProfile;
  activeRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  isSwitching: boolean;
  workerRunning: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  activeRole,
  onRoleChange,
  isSwitching,
  workerRunning,
}) => {
  const roleColors: Record<UserRole, string> = {
    reader: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    writer: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    editor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    admin: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  };

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-bold">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-serif tracking-tight text-xl font-bold text-slate-100">readAday</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">Backend Engine</span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">Supabase &bull; PostgreSQL &bull; Edge Functions &bull; RLS</p>
          </div>
        </div>

        {/* Status Indicators & Role Switcher */}
        <div className="flex items-center space-x-4">
          {/* Worker Status Indicator */}
          <div className="hidden md:flex items-center space-x-2 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs">
            <span className={`h-2 w-2 rounded-full ${workerRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></span>
            <span className="text-slate-400">Scheduler:</span>
            <span className="text-slate-200 font-medium">{workerRunning ? 'Active (Cron 30s)' : 'Idle'}</span>
          </div>

          {/* Active Testing Role Selector */}
          <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-800 p-1 rounded-lg">
            <span className="text-xs text-slate-400 pl-2 pr-1 hidden sm:inline flex items-center">
              <Shield className="h-3.5 w-3.5 mr-1 text-slate-500" />
              Role:
            </span>
            {(['reader', 'writer', 'editor', 'admin'] as UserRole[]).map((r) => {
              const isActive = activeRole === r;
              return (
                <button
                  key={r}
                  onClick={() => onRoleChange(r)}
                  disabled={isSwitching}
                  className={`text-xs px-2.5 py-1 rounded font-medium capitalize transition-all ${
                    isActive
                      ? `${roleColors[r]} border shadow-sm`
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {r}
                </button>
              );
            })}
          </div>

          {/* Current User Avatar */}
          <div className="flex items-center space-x-2 border-l border-slate-800 pl-3">
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.fullName}
              className="h-8 w-8 rounded-full object-cover border border-slate-700"
            />
            <div className="hidden lg:block text-left">
              <div className="text-xs font-medium text-slate-200 truncate max-w-[130px]">{currentUser.fullName}</div>
              <div className="text-[10px] text-slate-500 capitalize">{currentUser.role} Account</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
