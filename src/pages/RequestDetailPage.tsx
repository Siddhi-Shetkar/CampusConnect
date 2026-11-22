import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock, Send, Edit3, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ApiError, connectionsApi, requestsApi } from '../services/api';
import { PartnerRequestDTO } from '../types/campus';
import { Avatar } from '../components/Avatar';
import { formatRelativeDate } from '../components/RequestCard';

export function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [request, setRequest] = useState<PartnerRequestDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setError('');

    requestsApi
      .getById(id)
      .then((res) => {
        if (active) setRequest(res.request);
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof ApiError ? err.message : 'Unable to load request details.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, user?.id]);

  const handleSendPartnerRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;

    if (!user) {
      navigate('/login', { state: { from: `/requests/${request.id}` } });
      return;
    }

    setSending(true);
    try {
      const res = await connectionsApi.send(request.id, note.trim());
      setRequest((prev) =>
        prev
          ? {
              ...prev,
              connectionStatus: res.connection.status,
              connectionId: res.connection.id,
            }
          : prev
      );
      setNote('');
      showToast(`Partner request sent to ${request.creator.name}!`, 'success');
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : 'Unable to send partner request.',
        'error'
      );
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse space-y-6">
        <div className="h-6 w-40 bg-slate-200 rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 h-96 bg-slate-200 rounded-xl" />
          <div className="lg:col-span-4 h-80 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Request unavailable</h1>
        <p className="text-sm text-slate-600 mb-6">{error || 'This partner request was not found.'}</p>
        <Link
          to="/discover"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg"
        >
          Back to Find Partners
        </Link>
      </div>
    );
  }

  const isOwner = Boolean(user && user.id === request.creator.id);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link
        to="/discover"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Find Partners
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Request Details */}
        <article className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-8">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 mb-3">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-indigo-700">{request.category}</span>
                <span aria-hidden="true">·</span>
                <span>{request.activity}</span>
                <span aria-hidden="true">·</span>
                <span>Status: {request.status}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">Posted {formatRelativeDate(request.createdAt)}</span>
              </div>
              {request.compatibility && (
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {request.compatibility.score}% compatibility
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-snug">
              {request.title}
            </h1>
          </div>

          {/* Description */}
          <div>
            <h2 className="text-sm font-semibold text-slate-900 mb-2">About this request</h2>
            <p className="text-base text-slate-700 leading-relaxed whitespace-pre-line">
              {request.description}
            </p>
          </div>

          {/* Requirements Grid */}
          <div className="pt-6 border-t border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">
              Requirements &amp; Schedule
            </h2>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              <div>
                <dt className="text-xs font-medium text-slate-500 mb-1">Skill Level</dt>
                <dd className="text-sm font-semibold text-slate-900">{request.skillLevel}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500 mb-1">Availability</dt>
                <dd className="text-sm font-semibold text-slate-900">{request.availability}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500 mb-1">Frequency</dt>
                <dd className="text-sm font-semibold text-slate-900">{request.frequency}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500 mb-1">College / Campus</dt>
                <dd className="text-sm font-semibold text-slate-900">{request.college}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500 mb-1">Partners Needed</dt>
                <dd className="text-sm font-semibold font-mono tabular-nums text-slate-900">
                  {request.peopleNeeded}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500 mb-1">Activity Track</dt>
                <dd className="text-sm font-semibold text-slate-900">{request.activity}</dd>
              </div>
            </dl>
          </div>

          {/* Rule-based compatibility breakdown (only shown when computed from real data) */}
          {request.compatibility && request.compatibility.reasons.length > 0 && (
            <div className="pt-6 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-slate-900">Why this matches your profile</h2>
                <span className="font-mono tabular-nums text-sm font-bold text-indigo-700">
                  {request.compatibility.score}%
                </span>
              </div>
              <ul className="space-y-1.5 text-sm text-slate-600">
                {request.compatibility.reasons.map((reason) => (
                  <li key={reason} className="flex items-center gap-2">
                    <span className="text-indigo-600" aria-hidden="true">
                      —
                    </span>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action / Connection Panel */}
          <div className="pt-6 border-t border-slate-200">
            {isOwner ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">This is your request</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Manage interested students or edit details from My Requests.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    to={`/requests/${request.id}/edit`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit Request
                  </Link>
                  <Link
                    to="/my-requests"
                    className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
                  >
                    Manage Requests
                  </Link>
                </div>
              </div>
            ) : request.status !== 'Active' ? (
              <p className="text-sm font-medium text-slate-600">
                This request is currently marked as <strong className="text-slate-900">{request.status}</strong> and is not accepting new partner requests.
              </p>
            ) : request.connectionStatus === 'Accepted' ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 text-emerald-700">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Connected with {request.creator.name}
                    </p>
                    <p className="text-xs text-slate-600">
                      Your partner request was accepted. View details in Connections.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Link
                    to={`/messages?with=${encodeURIComponent(request.creator.id)}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Message
                  </Link>
                  <Link
                    to="/connections"
                    className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg"
                  >
                    Connections
                  </Link>
                </div>
              </div>
            ) : request.connectionStatus === 'Pending' ? (
              <div className="flex items-center gap-2.5 text-amber-700">
                <Clock className="w-5 h-5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Partner request sent · Pending response
                  </p>
                  <p className="text-xs text-slate-600">
                    {request.creator.name} will see your request and can accept or decline it.
                  </p>
                </div>
              </div>
            ) : request.connectionStatus === 'Rejected' ? (
              <p className="text-sm text-slate-600">
                Your earlier partner request for this listing was declined.
              </p>
            ) : (
              <form onSubmit={handleSendPartnerRequest} className="space-y-4">
                <div>
                  <label
                    htmlFor="partner-note"
                    className="block text-sm font-medium text-slate-800 mb-1.5"
                  >
                    Introduce yourself (optional)
                  </label>
                  <textarea
                    id="partner-note"
                    rows={3}
                    maxLength={400}
                    placeholder={`Hi ${request.creator.name.split(' ')[0]}, I'm also looking to practice ${request.activity} around ${request.availability}...`}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                >
                  <Send className="w-4 h-4" />
                  {sending
                    ? 'Sending request...'
                    : user
                    ? 'Send Partner Request'
                    : 'Sign in to Send Partner Request'}
                </button>
              </form>
            )}
          </div>
        </article>

        {/* Creator Profile Sidebar */}
        <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3.5">
            <Avatar
              name={request.creator.name}
              src={request.creator.profileImage}
              size="lg"
            />
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500">Posted by</p>
              <h2 className="text-lg font-semibold text-slate-900 truncate">
                {request.creator.name}
              </h2>
              <p className="text-xs text-slate-600 truncate">
                {request.creator.college} · {request.creator.year}
              </p>
            </div>
          </div>

          {request.creator.bio && (
            <p className="text-sm text-slate-600 leading-relaxed">{request.creator.bio}</p>
          )}

          <dl className="space-y-4 pt-4 border-t border-slate-100 text-sm">
            <div>
              <dt className="text-xs font-medium text-slate-500 mb-1">Typical Availability</dt>
              <dd className="text-slate-800 font-medium">
                {request.creator.availability || request.availability}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500 mb-1">Experience Level</dt>
              <dd className="text-slate-800 font-medium">{request.creator.skillLevel}</dd>
            </div>
            {request.creator.skills.length > 0 && (
              <div>
                <dt className="text-xs font-medium text-slate-500 mb-1">Skills</dt>
                <dd className="text-slate-800 leading-relaxed">
                  {request.creator.skills.join(' · ')}
                </dd>
              </div>
            )}
            {request.creator.interests.length > 0 && (
              <div>
                <dt className="text-xs font-medium text-slate-500 mb-1">Interests</dt>
                <dd className="text-slate-800 leading-relaxed">
                  {request.creator.interests.join(' · ')}
                </dd>
              </div>
            )}
          </dl>
        </aside>
      </div>
    </div>
  );
}
