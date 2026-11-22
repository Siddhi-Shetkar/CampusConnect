import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, MessageSquare, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { useToast } from '../context/ToastContext';
import { ApiError, connectionsApi, ConnectionsOverviewResponse } from '../services/api';
import { Avatar } from '../components/Avatar';
import { formatRelativeDate } from '../components/RequestCard';

type ConnectionTab = 'connections' | 'received' | 'sent';

export function ConnectionsPage() {
  const { user, refreshPendingCount } = useAuth();
  const { subscribeConnectionUpdates } = useRealtime();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = (searchParams.get('tab') as ConnectionTab) || 'connections';
  const [tab, setTab] = useState<ConnectionTab>(
    ['connections', 'received', 'sent'].includes(initialTab) ? initialTab : 'connections'
  );
  const [data, setData] = useState<ConnectionsOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadConnections = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const overview = await connectionsApi.listOverview();
      setData(overview);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load connections.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  useEffect(() => {
    return subscribeConnectionUpdates(() => {
      loadConnections();
    });
  }, [subscribeConnectionUpdates, loadConnections]);

  const switchTab = (next: ConnectionTab) => {
    setTab(next);
    setSearchParams(next === 'connections' ? {} : { tab: next }, { replace: true });
  };

  const handleRespond = async (connectionId: string, decision: 'Accepted' | 'Rejected') => {
    setBusyId(connectionId);
    try {
      await connectionsApi.respond(connectionId, decision);
      showToast(
        decision === 'Accepted'
          ? 'Partner request accepted! Both of you are now connected.'
          : 'Partner request declined.',
        decision === 'Accepted' ? 'success' : 'info'
      );
      await Promise.all([loadConnections(), refreshPendingCount()]);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Unable to update request.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const pendingReceived = data?.received.filter((c) => c.status === 'Pending') || [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Connections</h1>
          <p className="text-base text-slate-600 mt-1">
            View accepted study, project, and sports partners and respond to incoming requests.
          </p>
        </div>
        <Link
          to="/discover"
          className="px-4 py-2.5 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          Find More Partners
        </Link>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Connections sections"
        className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'connections'}
          onClick={() => switchTab('connections')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            tab === 'connections'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          My Connections{' '}
          <span className="font-mono tabular-nums text-slate-400 ml-1">
            {data?.connections.length ?? 0}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={tab === 'received'}
          onClick={() => switchTab('received')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            tab === 'received'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Received Requests{' '}
          <span
            className={`font-mono tabular-nums ml-1 ${
              pendingReceived.length > 0 ? 'text-indigo-700 font-bold' : 'text-slate-400'
            }`}
          >
            {pendingReceived.length}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={tab === 'sent'}
          onClick={() => switchTab('sent')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            tab === 'sent'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Sent Requests{' '}
          <span className="font-mono tabular-nums text-slate-400 ml-1">
            {data?.sent.length ?? 0}
          </span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-pulse">
          <div className="h-48 bg-slate-200 rounded-xl" />
          <div className="h-48 bg-slate-200 rounded-xl" />
        </div>
      ) : !data ? null : tab === 'connections' ? (
        data.connections.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl py-16 px-6 text-center">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">No connections yet</h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
              Send partner requests on active listings or accept incoming requests to build your
              campus network.
            </p>
            <Link
              to="/discover"
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg"
            >
              Explore Partner Requests
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.connections.map((conn) => {
              const peer = conn.sender.id === user?.id ? conn.receiver : conn.sender;
              return (
                <article
                  key={conn.id}
                  className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <Avatar name={peer.name} src={peer.profileImage} size="lg" />
                        <div className="min-w-0">
                          <h2 className="text-lg font-semibold text-slate-900 truncate">
                            {peer.name}
                          </h2>
                          <p className="text-xs text-slate-500 truncate">
                            {peer.college} · {peer.year}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-emerald-700 shrink-0">
                        Connected
                      </span>
                    </div>

                    {conn.partnerRequest && (
                      <div className="pb-4 mb-4 border-b border-slate-100">
                        <p className="text-xs text-slate-400 font-medium mb-0.5">
                          Connected for
                        </p>
                        <Link
                          to={`/requests/${conn.partnerRequest.id}`}
                          className="text-sm font-semibold text-indigo-700 hover:text-indigo-800"
                        >
                          {conn.partnerRequest.activity} — {conn.partnerRequest.title}
                        </Link>
                      </div>
                    )}

                    <dl className="space-y-3 text-sm">
                      {peer.skills.length > 0 && (
                        <div>
                          <dt className="text-xs font-medium text-slate-500">Skills</dt>
                          <dd className="text-slate-800 mt-0.5">{peer.skills.join(' · ')}</dd>
                        </div>
                      )}
                      {peer.interests.length > 0 && (
                        <div>
                          <dt className="text-xs font-medium text-slate-500">Interests</dt>
                          <dd className="text-slate-800 mt-0.5">{peer.interests.join(' · ')}</dd>
                        </div>
                      )}
                      {peer.availability && (
                        <div>
                          <dt className="text-xs font-medium text-slate-500">Availability</dt>
                          <dd className="text-slate-800 mt-0.5">{peer.availability}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-end">
                    <Link
                      to={`/messages?with=${encodeURIComponent(peer.id)}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Message
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )
      ) : tab === 'received' ? (
        data.received.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl py-16 px-6 text-center">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">No received requests</h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              When other students apply to join your partner requests, they will appear here.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
            {data.received.map((conn) => (
              <div
                key={conn.id}
                className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <Avatar name={conn.sender.name} src={conn.sender.profileImage} size="md" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 mb-1">
                      <span className="font-semibold text-slate-900 text-sm">
                        {conn.sender.name}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{conn.sender.college}</span>
                      <span aria-hidden="true">·</span>
                      <span>{conn.sender.year}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{formatRelativeDate(conn.createdAt)}</span>
                    </div>

                    {conn.partnerRequest && (
                      <Link
                        to={`/requests/${conn.partnerRequest.id}`}
                        className="text-xs font-semibold text-indigo-700 hover:text-indigo-800"
                      >
                        Request: {conn.partnerRequest.title} ({conn.partnerRequest.activity})
                      </Link>
                    )}

                    {conn.message && (
                      <p className="text-sm text-slate-700 mt-1.5">&ldquo;{conn.message}&rdquo;</p>
                    )}

                    {conn.sender.skills.length > 0 && (
                      <p className="text-xs text-slate-500 mt-1.5">
                        Skills: {conn.sender.skills.join(' · ')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {conn.status === 'Pending' ? (
                    <>
                      <button
                        type="button"
                        disabled={busyId === conn.id}
                        onClick={() => handleRespond(conn.id, 'Accepted')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer disabled:opacity-60"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Accept
                      </button>
                      <button
                        type="button"
                        disabled={busyId === conn.id}
                        onClick={() => handleRespond(conn.id, 'Rejected')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer disabled:opacity-60"
                      >
                        <X className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </>
                  ) : (
                    <span
                      className={`text-xs font-semibold ${
                        conn.status === 'Accepted' ? 'text-emerald-700' : 'text-slate-500'
                      }`}
                    >
                      {conn.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : data.sent.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-16 px-6 text-center">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">No sent requests yet</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
            Browse Find Partners and send a request when you spot a matching study, build, or
            sports partner.
          </p>
          <Link
            to="/discover"
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg"
          >
            Find Partners
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {data.sent.map((conn) => (
            <div
              key={conn.id}
              className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <Avatar name={conn.receiver.name} src={conn.receiver.profileImage} size="md" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {conn.receiver.name}{' '}
                    <span className="font-normal text-slate-500">
                      · {conn.receiver.college} · {conn.receiver.year}
                    </span>
                  </p>
                  {conn.partnerRequest && (
                    <Link
                      to={`/requests/${conn.partnerRequest.id}`}
                      className="text-xs font-semibold text-indigo-700 hover:text-indigo-800 mt-0.5 block"
                    >
                      {conn.partnerRequest.title} ({conn.partnerRequest.activity})
                    </Link>
                  )}
                  {conn.message && (
                    <p className="text-xs text-slate-600 mt-1">Your note: &ldquo;{conn.message}&rdquo;</p>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <span
                  className={`text-xs font-semibold ${
                    conn.status === 'Accepted'
                      ? 'text-emerald-700'
                      : conn.status === 'Pending'
                      ? 'text-amber-700'
                      : 'text-slate-500'
                  }`}
                >
                  {conn.status}
                </span>
                <p className="text-xs text-slate-400 tabular-nums mt-0.5">
                  {formatRelativeDate(conn.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
