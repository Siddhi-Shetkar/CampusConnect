import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BellRing,
  BookOpen,
  Code2,
  Compass,
  MessageSquare,
  Plus,
  Trophy,
  Check,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { useToast } from '../context/ToastContext';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { ApiError, connectionsApi, usersApi } from '../services/api';
import { ActivityCategory, DashboardSummaryDTO } from '../types/campus';
import { Avatar } from '../components/Avatar';
import { RequestCard } from '../components/RequestCard';

const ACTION_TRACKS: Array<{
  title: string;
  description: string;
  category: ActivityCategory;
  icon: typeof BookOpen;
}> = [
  {
    title: 'Learn',
    description: 'DSA practice, exam prep, study groups & labs',
    category: 'Learning',
    icon: BookOpen,
  },
  {
    title: 'Build',
    description: 'Hackathon squads, side projects & contests',
    category: 'Building',
    icon: Code2,
  },
  {
    title: 'Play',
    description: 'Badminton, football, cricket, running & gym',
    category: 'Sports',
    icon: Trophy,
  },
  {
    title: 'Explore',
    description: 'Clubs, photography, music & creative teams',
    category: 'Other',
    icon: Compass,
  },
];

export function DashboardPage() {
  const { user, refreshPendingCount } = useAuth();
  const { subscribeConnectionUpdates } = useRealtime();
  const { showToast } = useToast();
  const push = usePushNotifications(Boolean(user));
  const [dismissPushPrompt, setDismissPushPrompt] = useState(false);
  const [data, setData] = useState<DashboardSummaryDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyConnId, setBusyConnId] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setError('');
      const summary = await usersApi.getDashboard();
      setData(summary);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    return subscribeConnectionUpdates(() => {
      loadDashboard();
    });
  }, [subscribeConnectionUpdates, loadDashboard]);

  const handleRespond = async (connectionId: string, status: 'Accepted' | 'Rejected') => {
    setBusyConnId(connectionId);
    try {
      await connectionsApi.respond(connectionId, status);
      showToast(
        status === 'Accepted'
          ? 'Connection accepted! You are now connected.'
          : 'Partner request declined.',
        status === 'Accepted' ? 'success' : 'info'
      );
      await Promise.all([loadDashboard(), refreshPendingCount()]);
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : 'Unable to respond to request.',
        'error'
      );
    } finally {
      setBusyConnId(null);
    }
  };

  const firstName = user?.name.split(' ')[0] || 'there';
  const profileIncomplete =
    !user?.bio || !user?.availability || (user?.skills.length ?? 0) === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Hey, {firstName}! 👋
          </h1>
          <p className="text-base text-slate-600 mt-1">
            What would you like to do today?
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/discover"
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Find Partners
          </Link>
          <Link
            to="/requests/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            Create Request
          </Link>
        </div>
      </div>

      {/* Gentle phone push notification prompt when permission hasn't been decided yet */}
      {!dismissPushPrompt &&
        push.isSupported &&
        !push.isSubscribed &&
        push.permission === 'default' && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <BellRing className="w-5 h-5 text-indigo-700 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Enable phone push notifications
                </p>
                <p className="text-sm text-slate-600 mt-0.5">
                  Get notified instantly on your phone when a student sends a connection request,
                  accepts yours, or messages you—even when the browser is closed.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={push.busy}
                onClick={async () => {
                  const res = await push.enablePush();
                  showToast(res.message, res.ok ? 'success' : 'error');
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
              >
                {push.busy ? 'Enabling...' : 'Enable Notifications'}
              </button>
              <button
                type="button"
                onClick={() => setDismissPushPrompt(true)}
                aria-label="Dismiss notification prompt"
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Later
              </button>
            </div>
          </div>
        )}

      {/* Gentle profile completion prompt for accurate rule-based matching */}
      {profileIncomplete && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Complete your profile for accurate partner matching
            </p>
            <p className="text-sm text-slate-600 mt-0.5">
              Add your skills, interests, preferred activities, and weekly availability to unlock
              real compatibility scores.
            </p>
          </div>
          <Link
            to="/profile"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-700 hover:text-indigo-800 whitespace-nowrap shrink-0"
          >
            Edit Profile
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Four Main Category Cards */}
      <section aria-label="Activity tracks">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ACTION_TRACKS.map((track) => {
            const Icon = track.icon;
            return (
              <Link
                key={track.title}
                to={`/discover?category=${encodeURIComponent(track.category)}`}
                className="group bg-white border border-slate-200 rounded-xl p-6 hover:border-indigo-300 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-lg bg-slate-900 group-hover:bg-indigo-700 text-white flex items-center justify-center transition-colors mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
                    {track.title}
                  </h2>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    {track.description}
                  </p>
                </div>
                <span className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 group-hover:text-indigo-700 transition-colors">
                  Explore requests
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-44 bg-slate-200 rounded-xl" />
            <div className="h-44 bg-slate-200 rounded-xl" />
          </div>
          <div className="space-y-4">
            <div className="h-48 bg-slate-200 rounded-xl" />
            <div className="h-48 bg-slate-200 rounded-xl" />
          </div>
        </div>
      ) : data ? (
        <>
          {/* Concise KPI overview bar */}
          <div className="grid grid-cols-3 bg-white border border-slate-200 rounded-xl divide-x divide-slate-200">
            <Link
              to="/my-requests"
              className="p-5 hover:bg-slate-50 transition-colors first:rounded-l-xl"
            >
              <p className="text-xs font-medium text-slate-500">My Active Requests</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {data.stats.activeRequestsCount}
              </p>
            </Link>
            <Link to="/connections?tab=received" className="p-5 hover:bg-slate-50 transition-colors">
              <p className="text-xs font-medium text-slate-500">Pending Requests</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-indigo-700 mt-1">
                {data.stats.pendingReceivedCount}
              </p>
            </Link>
            <Link
              to="/connections"
              className="p-5 hover:bg-slate-50 transition-colors last:rounded-r-xl"
            >
              <p className="text-xs font-medium text-slate-500">My Connections</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {data.stats.connectionsCount}
              </p>
            </Link>
          </div>

          {/* Pending Connection Requests (if any) */}
          {data.pendingReceivedRequests.length > 0 && (
            <section className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Pending connection requests
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Students waiting to connect on your partner requests
                  </p>
                </div>
                <Link
                  to="/connections?tab=received"
                  className="text-sm font-semibold text-indigo-700 hover:text-indigo-800"
                >
                  View all
                </Link>
              </div>

              <div className="divide-y divide-slate-100">
                {data.pendingReceivedRequests.map((conn) => (
                  <div
                    key={conn.id}
                    className="py-4 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <Avatar
                        name={conn.sender.name}
                        src={conn.sender.profileImage}
                        size="md"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">
                          {conn.sender.name}{' '}
                          <span className="font-normal text-slate-500">
                            · {conn.sender.college} · {conn.sender.year}
                          </span>
                        </p>
                        {conn.partnerRequest && (
                          <p className="text-xs text-indigo-700 font-medium mt-0.5">
                            For: {conn.partnerRequest.title}
                          </p>
                        )}
                        {conn.message && (
                          <p className="text-sm text-slate-600 mt-1">&ldquo;{conn.message}&rdquo;</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={busyConnId === conn.id}
                        onClick={() => handleRespond(conn.id, 'Accepted')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Accept
                      </button>
                      <button
                        type="button"
                        disabled={busyConnId === conn.id}
                        onClick={() => handleRespond(conn.id, 'Rejected')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                      >
                        <X className="w-3.5 h-3.5" />
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Main 2-column content area */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Recently posted requests */}
            <section className="lg:col-span-8 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    Recently posted requests
                  </h2>
                  <p className="text-sm text-slate-500">
                    Latest open opportunities from students across campuses
                  </p>
                </div>
                <Link
                  to="/discover"
                  className="text-sm font-semibold text-indigo-700 hover:text-indigo-800 inline-flex items-center gap-1 whitespace-nowrap"
                >
                  Browse all
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {data.recentRequests.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
                  <p className="text-sm font-medium text-slate-900 mb-1">
                    No requests yet. Be the first to find your partner!
                  </p>
                  <p className="text-sm text-slate-500 mb-4">
                    Post what you want to learn, build, or play so other students can connect with
                    you.
                  </p>
                  <Link
                    to="/requests/new"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg"
                  >
                    Create Request
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {data.recentRequests.slice(0, 4).map((req) => (
                    <RequestCard key={req.id} request={req} />
                  ))}
                </div>
              )}
            </section>

            {/* Right Sidebar: Recommended Partners, My Active Requests, My Connections */}
            <aside className="lg:col-span-4 space-y-6">
              {/* Recommended Partners */}
              <section className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-slate-900">
                    Recommended partners
                  </h2>
                  <Link
                    to="/discover?sort=match"
                    className="text-xs font-semibold text-indigo-700 hover:text-indigo-800"
                  >
                    See matches
                  </Link>
                </div>

                {data.recommendedPartners.length === 0 ? (
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Add your skills, interests, and availability on your{' '}
                    <Link to="/profile" className="text-indigo-700 font-medium hover:underline">
                      profile
                    </Link>{' '}
                    to see rule-based partner recommendations.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {data.recommendedPartners.map((rec) => (
                      <div key={rec.user.id} className="py-3.5 first:pt-0 last:pb-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar
                              name={rec.user.name}
                              src={rec.user.profileImage}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {rec.user.name}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {rec.user.college} · {rec.user.year}
                              </p>
                            </div>
                          </div>
                          <span className="font-mono tabular-nums text-xs font-semibold text-indigo-700 shrink-0">
                            {rec.compatibility.score}%
                          </span>
                        </div>
                        {rec.compatibility.reasons.length > 0 && (
                          <p className="text-xs text-slate-500 mt-2">
                            {rec.compatibility.reasons.join(' · ')}
                          </p>
                        )}
                        {rec.latestRequestId && (
                          <Link
                            to={`/requests/${rec.latestRequestId}`}
                            className="mt-2 inline-block text-xs font-semibold text-indigo-700 hover:text-indigo-800 truncate max-w-full"
                          >
                            View: {rec.latestRequestTitle}
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* My Active Requests */}
              <section className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-slate-900">My active requests</h2>
                  <Link
                    to="/my-requests"
                    className="text-xs font-semibold text-indigo-700 hover:text-indigo-800"
                  >
                    Manage
                  </Link>
                </div>

                {data.myActiveRequests.length === 0 ? (
                  <div className="text-sm text-slate-500">
                    <p className="mb-3">You don&apos;t have any active requests yet.</p>
                    <Link
                      to="/requests/new"
                      className="text-xs font-semibold text-indigo-700 hover:text-indigo-800"
                    >
                      Post your first request →
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {data.myActiveRequests.slice(0, 3).map((req) => (
                      <div key={req.id} className="py-3 first:pt-0 last:pb-0">
                        <Link
                          to={`/requests/${req.id}`}
                          className="text-sm font-medium text-slate-900 hover:text-indigo-700 block truncate"
                        >
                          {req.title}
                        </Link>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {req.activity} · {req.availability}
                          {(req.pendingInterestedCount ?? 0) > 0 && (
                            <span className="text-indigo-700 font-semibold">
                              {' '}
                              · {req.pendingInterestedCount} interested
                            </span>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* My Connections */}
              <section className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-slate-900">My connections</h2>
                  <Link
                    to="/connections"
                    className="text-xs font-semibold text-indigo-700 hover:text-indigo-800"
                  >
                    View all
                  </Link>
                </div>

                {data.myConnections.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Accepted partner requests will appear here.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {data.myConnections.slice(0, 4).map((conn) => {
                      const peer = conn.sender.id === user?.id ? conn.receiver : conn.sender;
                      return (
                        <Link
                          key={conn.id}
                          to={`/messages?with=${encodeURIComponent(peer.id)}`}
                          className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar name={peer.name} src={peer.profileImage} size="sm" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 group-hover:text-indigo-700 truncate transition-colors">
                                {peer.name}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {peer.college}
                                {conn.partnerRequest?.activity
                                  ? ` · ${conn.partnerRequest.activity}`
                                  : ''}
                              </p>
                            </div>
                          </div>
                          <MessageSquare className="w-4 h-4 text-slate-400 group-hover:text-indigo-700 shrink-0 transition-colors" />
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>
            </aside>
          </div>
        </>
      ) : null}
    </div>
  );
}
