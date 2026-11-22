import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit3, Trash2, Users, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ApiError, connectionsApi, requestsApi } from '../services/api';
import { ConnectionRequestDTO, PartnerRequestDTO, RequestStatus } from '../types/campus';
import { Avatar } from '../components/Avatar';
import { ConfirmModal } from '../components/ConfirmModal';
import { formatRelativeDate } from '../components/RequestCard';

type StatusTab = 'Active' | 'Filled' | 'Closed' | 'All';

export function MyRequestsPage() {
  const { refreshPendingCount } = useAuth();
  const { showToast } = useToast();

  const [requests, setRequests] = useState<PartnerRequestDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<StatusTab>('Active');

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [interestedByReq, setInterestedByReq] = useState<Record<string, ConnectionRequestDTO[]>>({});
  const [loadingInterestedId, setLoadingInterestedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<PartnerRequestDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadMine = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await requestsApi.listMine();
      setRequests(res.requests);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load your requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMine();
  }, [loadMine]);

  const toggleInterested = async (requestId: string) => {
    if (expandedId === requestId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(requestId);
    setLoadingInterestedId(requestId);
    try {
      const res = await connectionsApi.listInterested(requestId);
      setInterestedByReq((prev) => ({ ...prev, [requestId]: res.interested }));
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : 'Unable to load interested students.',
        'error'
      );
    } finally {
      setLoadingInterestedId(null);
    }
  };

  const handleStatusChange = async (requestId: string, nextStatus: RequestStatus) => {
    setBusyId(requestId);
    try {
      await requestsApi.updateStatus(requestId, nextStatus);
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: nextStatus } : r))
      );
      showToast(`Request marked as ${nextStatus}.`, 'success');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Unable to update status.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await requestsApi.remove(deleteTarget.id);
      setRequests((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      showToast('Partner request deleted.', 'info');
      setDeleteTarget(null);
      await refreshPendingCount();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Unable to delete request.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleRespondToStudent = async (
    requestId: string,
    connectionId: string,
    decision: 'Accepted' | 'Rejected'
  ) => {
    setBusyId(connectionId);
    try {
      const res = await connectionsApi.respond(connectionId, decision);
      setInterestedByReq((prev) => ({
        ...prev,
        [requestId]: (prev[requestId] || []).map((c) =>
          c.id === connectionId ? res.connection : c
        ),
      }));
      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? {
                ...r,
                pendingInterestedCount: Math.max(0, (r.pendingInterestedCount || 1) - 1),
              }
            : r
        )
      );
      showToast(
        decision === 'Accepted'
          ? 'Student accepted! Added to My Connections.'
          : 'Request declined.',
        decision === 'Accepted' ? 'success' : 'info'
      );
      await refreshPendingCount();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Unable to respond.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const counts = {
    Active: requests.filter((r) => r.status === 'Active').length,
    Filled: requests.filter((r) => r.status === 'Filled').length,
    Closed: requests.filter((r) => r.status === 'Closed').length,
    All: requests.length,
  };

  const filtered = tab === 'All' ? requests : requests.filter((r) => r.status === tab);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">My Requests</h1>
          <p className="text-base text-slate-600 mt-1">
            Edit listings, review interested students, and update request status.
          </p>
        </div>
        <Link
          to="/requests/new"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Request
        </Link>
      </div>

      {/* Status Tabs */}
      <div
        role="tablist"
        aria-label="Filter your requests by status"
        className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg"
      >
        {(['Active', 'Filled', 'Closed', 'All'] as StatusTab[]).map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                active ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t} <span className="font-mono tabular-nums text-slate-400 ml-1">{counts[t]}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-44 bg-slate-200 rounded-xl" />
          <div className="h-44 bg-slate-200 rounded-xl" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-16 px-6 text-center">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            No {tab === 'All' ? '' : tab.toLowerCase() + ' '}requests yet
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
            Post a partner request for DSA practice, a hackathon team, or campus sports so peers
            can reach out to you.
          </p>
          <Link
            to="/requests/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Create Request
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {filtered.map((req) => {
            const isExpanded = expandedId === req.id;
            const interestedList = interestedByReq[req.id] || [];
            const statusTextClass =
              req.status === 'Active'
                ? 'text-emerald-700'
                : req.status === 'Filled'
                ? 'text-indigo-700'
                : 'text-slate-500';

            return (
              <article
                key={req.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-semibold ${statusTextClass}`}>{req.status}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-slate-700">{req.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{req.activity}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{formatRelativeDate(req.createdAt)}</span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {req.college} · {req.availability}
                    </span>
                  </div>

                  <h2 className="text-xl font-semibold text-slate-900 mb-2">
                    <Link to={`/requests/${req.id}`} className="hover:text-indigo-700 transition-colors">
                      {req.title}
                    </Link>
                  </h2>
                  <p className="text-sm text-slate-600 leading-relaxed mb-5">{req.description}</p>

                  {/* Action Toolbar */}
                  <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => toggleInterested(req.id)}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-800 cursor-pointer"
                    >
                      <Users className="w-4 h-4" />
                      Interested Students
                      {(req.pendingInterestedCount ?? 0) > 0 && (
                        <span className="font-mono tabular-nums text-xs">
                          ({req.pendingInterestedCount} pending)
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/requests/${req.id}/edit`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                      </Link>

                      {req.status !== 'Filled' && (
                        <button
                          type="button"
                          disabled={busyId === req.id}
                          onClick={() => handleStatusChange(req.id, 'Filled')}
                          className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 rounded-lg cursor-pointer disabled:opacity-60"
                        >
                          Mark Filled
                        </button>
                      )}

                      {req.status !== 'Closed' ? (
                        <button
                          type="button"
                          disabled={busyId === req.id}
                          onClick={() => handleStatusChange(req.id, 'Closed')}
                          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer disabled:opacity-60"
                        >
                          Close
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busyId === req.id}
                          onClick={() => handleStatusChange(req.id, 'Active')}
                          className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-white border border-emerald-200 hover:bg-emerald-50 rounded-lg cursor-pointer disabled:opacity-60"
                        >
                          Reopen
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(req)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {/* Interested Students Drawer */}
                {isExpanded && (
                  <div className="bg-slate-50 border-t border-slate-200 px-6 py-5">
                    {loadingInterestedId === req.id ? (
                      <p className="text-sm text-slate-500">Loading interested students...</p>
                    ) : interestedList.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No students have requested to join this listing yet.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-200">
                        {interestedList.map((conn) => (
                          <div
                            key={conn.id}
                            className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
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
                                {conn.sender.skills.length > 0 && (
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    Skills: {conn.sender.skills.join(' · ')}
                                  </p>
                                )}
                                {conn.message && (
                                  <p className="text-sm text-slate-700 mt-1.5">
                                    &ldquo;{conn.message}&rdquo;
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-2">
                              {conn.status === 'Pending' ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={busyId === conn.id}
                                    onClick={() =>
                                      handleRespondToStudent(req.id, conn.id, 'Accepted')
                                    }
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg cursor-pointer disabled:opacity-60"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    Accept
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busyId === conn.id}
                                    onClick={() =>
                                      handleRespondToStudent(req.id, conn.id, 'Rejected')
                                    }
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer disabled:opacity-60"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    Reject
                                  </button>
                                </>
                              ) : (
                                <span
                                  className={`text-xs font-semibold ${
                                    conn.status === 'Accepted'
                                      ? 'text-emerald-700'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  {conn.status}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete partner request?"
        description={
          deleteTarget
            ? `This will permanently delete "${deleteTarget.title}" and remove any pending partner requests associated with it.`
            : ''
        }
        confirmLabel="Delete Request"
        isDanger
        isSubmitting={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
