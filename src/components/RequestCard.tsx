import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PartnerRequestDTO } from '../types/campus';
import { Avatar } from './Avatar';

interface RequestCardProps {
  request: PartnerRequestDTO;
}

export function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function RequestCard({ request }: RequestCardProps) {
  return (
    <article className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between hover:border-slate-300 transition-colors">
      <div>
        {/* Quiet unboxed metadata row */}
        <div className="flex items-center justify-between gap-3 text-xs text-slate-500 mb-3">
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <span className="font-semibold text-indigo-700">{request.category}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{request.activity}</span>
            <span aria-hidden="true">·</span>
            <span className="shrink-0 tabular-nums">{formatRelativeDate(request.createdAt)}</span>
          </div>
          {request.compatibility && (
            <span className="font-mono tabular-nums text-xs font-semibold text-slate-900 shrink-0">
              {request.compatibility.score}% match
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-slate-900 leading-snug mb-2">
          <Link
            to={`/requests/${request.id}`}
            className="hover:text-indigo-700 transition-colors"
          >
            {request.title}
          </Link>
        </h3>

        {/* Description */}
        <p className="text-sm text-slate-600 leading-relaxed line-clamp-2 mb-5">
          {request.description}
        </p>

        {/* Creator identity */}
        <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
          <Avatar
            name={request.creator.name}
            src={request.creator.profileImage}
            size="md"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {request.creator.name}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {request.college} · {request.creator.year}
            </p>
          </div>
        </div>

        {/* Key specifications */}
        <dl className="grid grid-cols-3 gap-3 pt-4 text-xs">
          <div>
            <dt className="text-slate-400 font-medium mb-0.5">Level</dt>
            <dd className="text-slate-800 font-medium truncate">{request.skillLevel}</dd>
          </div>
          <div>
            <dt className="text-slate-400 font-medium mb-0.5">Availability</dt>
            <dd className="text-slate-800 font-medium truncate">{request.availability}</dd>
          </div>
          <div>
            <dt className="text-slate-400 font-medium mb-0.5">Frequency</dt>
            <dd className="text-slate-800 font-medium truncate">{request.frequency}</dd>
          </div>
        </dl>
      </div>

      {/* Footer action */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500">
          {request.connectionStatus === 'Accepted'
            ? 'Connected'
            : request.connectionStatus === 'Pending'
            ? 'Request sent · Pending'
            : request.connectionStatus === 'Rejected'
            ? 'Request declined'
            : `${request.peopleNeeded} ${request.peopleNeeded === 1 ? 'partner' : 'partners'} needed`}
        </span>
        <Link
          to={`/requests/${request.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-700 hover:text-indigo-800 transition-colors whitespace-nowrap shrink-0"
        >
          View Details
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </article>
  );
}
