import React, { useState, useEffect } from 'react';
import { WriterApplication, UserRole, Comment } from '../backend/types.ts';
import { Users, PenTool, CheckCircle, XCircle, Flag, ThumbsUp, MessageSquare, ShieldAlert } from 'lucide-react';

interface CommunityViewProps {
  activeRole: UserRole;
  activeUserId: string;
}

export const CommunityView: React.FC<CommunityViewProps> = ({ activeRole, activeUserId }) => {
  const isPrivileged = activeRole === 'editor' || activeRole === 'admin';
  const [activeTab, setActiveTab] = useState<'writers' | 'reports'>('writers');
  const [applications, setApplications] = useState<WriterApplication[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  // Apply Form
  const [bio, setBio] = useState('');
  const [sampleUrl, setSampleUrl] = useState('');
  const [topics, setTopics] = useState('neuroplasticity, deep-work');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Content Report Form
  const [reportType, setReportType] = useState<'article' | 'comment'>('article');
  const [reportTargetId, setReportTargetId] = useState('art-ed-1');
  const [reportReason, setReportReason] = useState<'copyright' | 'misinformation' | 'spam' | 'harassment'>('misinformation');
  const [reportDetails, setReportDetails] = useState('');

  const fetchCommunityData = async () => {
    try {
      if (isPrivileged) {
        const resA = await fetch('/api/community/applications', {
          headers: { 'x-readaday-user-id': activeUserId },
        });
        const dataA = await resA.json();
        setApplications(dataA.applications || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCommunityData();
  }, [activeRole, activeUserId]);

  const handleApplyWriter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/community/apply-writer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-readaday-user-id': activeUserId,
        },
        body: JSON.stringify({
          bio,
          sampleUrls: [sampleUrl].filter(Boolean),
          topics: topics.split(',').map((t) => t.trim()),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStatusMsg('Application submitted to the editorial review board.');
      setBio('');
      setSampleUrl('');
      fetchCommunityData();
    } catch (err: any) {
      setStatusMsg(`Error: ${err.message}`);
    }
  };

  const handleReviewApplication = async (appId: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`/api/community/applications/${appId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-readaday-user-id': activeUserId,
        },
        body: JSON.stringify({
          status,
          reviewerNotes: status === 'approved' ? 'Approved based on portfolio strength.' : 'Needs more published work.',
        }),
      });
      if (res.ok) {
        fetchCommunityData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/community/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-readaday-user-id': activeUserId,
        },
        body: JSON.stringify({
          targetType: reportType,
          targetId: reportTargetId,
          reason: reportReason,
          details: reportDetails,
        }),
      });
      if (res.ok) {
        setReportDetails('');
        alert('Abuse report submitted for editorial moderation review.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-serif font-bold text-slate-100">Community & Writer Moderation</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Independent publishing with editorial rigor. Readers apply for writer privileges,
            and submissions are moderated before publishing to the Community feed.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Writer Application / Review Desk */}
        <div className="space-y-4">
          <h3 className="text-sm font-serif font-bold text-slate-200">
            {isPrivileged ? 'Editorial Writer Application Queue' : 'Apply for Writer Privileges'}
          </h3>

          {isPrivileged ? (
            <div className="space-y-3">
              {applications.length > 0 ? (
                applications.map((app) => (
                  <div key={app.id} className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-100 text-sm">{app.userName}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        app.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                        app.status === 'rejected' ? 'bg-rose-500/10 text-rose-400' :
                        'bg-amber-500/10 text-amber-400'
                      }`}>
                        {app.status.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400">{app.bio}</p>

                    <div className="text-[11px] text-slate-500 font-mono">
                      Topics: {app.topics.join(', ')}
                    </div>

                    {app.status === 'pending' && (
                      <div className="flex items-center space-x-2 pt-2 border-t border-slate-800">
                        <button
                          onClick={() => handleReviewApplication(app.id, 'approved')}
                          className="text-xs px-3 py-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 font-bold rounded"
                        >
                          Approve Writer
                        </button>
                        <button
                          onClick={() => handleReviewApplication(app.id, 'rejected')}
                          className="text-xs px-3 py-1 bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white rounded"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-xs text-slate-400">
                  No pending writer applications.
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleApplyWriter} className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
              {statusMsg && (
                <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
                  {statusMsg}
                </div>
              )}
              <p className="text-xs text-slate-400">
                Writers on readAday publish in-depth independent essays, reviews, and syntheses.
              </p>
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">Author Bio & Background</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe your writing focus, domain expertise, and publications..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 p-2 rounded"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 mb-1">Portfolio or Substack / GitHub URL</label>
                <input
                  type="url"
                  placeholder="https://example.com/essays"
                  value={sampleUrl}
                  onChange={(e) => setSampleUrl(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 p-2 rounded"
                />
              </div>

              <button
                type="submit"
                className="text-xs px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded"
              >
                Submit Writer Application
              </button>
            </form>
          )}
        </div>

        {/* Content Moderation & Abuse Reporting Form */}
        <div className="space-y-4">
          <h3 className="text-sm font-serif font-bold text-slate-200 flex items-center">
            <Flag className="h-4 w-4 mr-1.5 text-rose-400" />
            Content Reporting & Abuse Moderation
          </h3>

          <form onSubmit={handleSubmitReport} className="p-5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-3">
            <p className="text-xs text-slate-400">
              Report intellectual property infringement, misinformation, or community policy violations.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Target Type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 p-2 rounded"
                >
                  <option value="article">Article</option>
                  <option value="comment">Comment</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Violation Reason</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 p-2 rounded"
                >
                  <option value="copyright">Copyright Infringement</option>
                  <option value="misinformation">Misinformation / Accuracy</option>
                  <option value="spam">Spam / Low Quality</option>
                  <option value="harassment">Harassment</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Report Details</label>
              <textarea
                rows={2}
                placeholder="Explain the specific issue for editorial moderators..."
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 p-2 rounded"
              />
            </div>

            <button
              type="submit"
              className="text-xs px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white font-medium rounded"
            >
              Submit Content Report
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
