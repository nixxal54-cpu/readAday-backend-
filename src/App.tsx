/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserRole, UserProfile, Article } from './backend/types.ts';
import { Header } from './components/Header.tsx';
import { FeedMonitor } from './components/FeedMonitor.tsx';
import { EditorialDesk } from './components/EditorialDesk.tsx';
import { NewsEngineView } from './components/NewsEngineView.tsx';
import { RabbitHoleView } from './components/RabbitHoleView.tsx';
import { ReaderFeaturesView } from './components/ReaderFeaturesView.tsx';
import { CommunityView } from './components/CommunityView.tsx';
import { DatabaseRlsView } from './components/DatabaseRlsView.tsx';
import { ApiExplorerView } from './components/ApiExplorerView.tsx';
import { ArticleDetailModal } from './components/ArticleDetailModal.tsx';
import {
  Layers,
  PenTool,
  Rss,
  Compass,
  Bookmark,
  Users,
  Database,
  Terminal,
} from 'lucide-react';

export default function App() {
  const [activeRole, setActiveRole] = useState<UserRole>('admin');
  const [currentUser, setCurrentUser] = useState<UserProfile>({
    id: 'usr-admin-1',
    email: 'admin@readaday.internal',
    fullName: 'Alexander Wright',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    role: 'admin',
    settings: {
      emailNotifications: true,
      readingTheme: 'dark',
      fontSize: 16,
      preferredCategories: [],
    },
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  });

  const [activeTab, setActiveTab] = useState<
    'feeds' | 'editorial' | 'news' | 'rabbithole' | 'reader' | 'community' | 'db' | 'api'
  >('feeds');

  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [schedulerStatus, setSchedulerStatus] = useState<any>({ isRunning: true });

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'x-readaday-user-id': currentUser.id },
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        setActiveRole(data.user.role);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchScheduler = async () => {
    try {
      const res = await fetch('/api/system/scheduler');
      if (res.ok) {
        const data = await res.json();
        setSchedulerStatus(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchScheduler();
  }, []);

  const handleRoleChange = async (newRole: UserRole) => {
    setIsSwitchingRole(true);
    try {
      const res = await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data.activeUser);
        setActiveRole(newRole);
        setFeedRefreshKey((k) => k + 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSwitchingRole(false);
    }
  };

  const navItems = [
    { id: 'feeds', label: 'Feed Isolation Monitor', icon: Layers },
    { id: 'editorial', label: 'Editorial Desk', icon: PenTool },
    { id: 'news', label: 'News Engine (RSS)', icon: Rss },
    { id: 'rabbithole', label: 'Rabbit Hole Discovery', icon: Compass },
    { id: 'reader', label: 'Reader & Private Notes', icon: Bookmark },
    { id: 'community', label: 'Community & Writers', icon: Users },
    { id: 'db', label: 'PostgreSQL & RLS', icon: Database },
    { id: 'api', label: 'API Playground', icon: Terminal },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Header */}
      <Header
        currentUser={currentUser}
        activeRole={activeRole}
        onRoleChange={handleRoleChange}
        isSwitching={isSwitchingRole}
        workerRunning={schedulerStatus.isRunning}
      />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 flex flex-col space-y-6">
        {/* Navigation Bar */}
        <nav className="flex items-center space-x-1.5 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 text-xs font-medium px-3.5 py-2 rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Dynamic Content Views */}
        <main className="flex-1">
          {activeTab === 'feeds' && (
            <FeedMonitor
              key={feedRefreshKey}
              onSelectArticle={(art) => setSelectedArticle(art)}
              activeUserId={currentUser.id}
            />
          )}

          {activeTab === 'editorial' && (
            <EditorialDesk
              activeRole={activeRole}
              activeUserId={currentUser.id}
              onRefreshFeed={() => setFeedRefreshKey((k) => k + 1)}
            />
          )}

          {activeTab === 'news' && (
            <NewsEngineView
              activeUserId={currentUser.id}
              onRefreshFeed={() => setFeedRefreshKey((k) => k + 1)}
            />
          )}

          {activeTab === 'rabbithole' && (
            <RabbitHoleView
              activeUserId={currentUser.id}
              onSelectArticle={(art) => setSelectedArticle(art)}
            />
          )}

          {activeTab === 'reader' && (
            <ReaderFeaturesView
              activeUserId={currentUser.id}
              onSelectArticle={(art) => setSelectedArticle(art)}
            />
          )}

          {activeTab === 'community' && (
            <CommunityView
              activeRole={activeRole}
              activeUserId={currentUser.id}
            />
          )}

          {activeTab === 'db' && <DatabaseRlsView />}

          {activeTab === 'api' && <ApiExplorerView activeUserId={currentUser.id} />}
        </main>
      </div>

      {/* Article Detail Reader Modal */}
      <ArticleDetailModal
        article={selectedArticle}
        onClose={() => setSelectedArticle(null)}
        activeUserId={currentUser.id}
        activeRole={activeRole}
        onOpenRabbitHole={(artId) => {
          setActiveTab('rabbithole');
        }}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <p>readAday Backend Engine &bull; PostgreSQL 16 &bull; Supabase RLS &bull; Edge Functions</p>
      </footer>
    </div>
  );
}
