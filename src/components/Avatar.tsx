import { useState } from 'react';

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl',
};

const TONE_PALETTE = [
  'bg-slate-900 text-white',
  'bg-indigo-700 text-white',
  'bg-slate-700 text-white',
  'bg-indigo-900 text-indigo-50',
  'bg-slate-800 text-slate-100',
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'CC';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getToneIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % 997;
  }
  return Math.abs(hash) % TONE_PALETTE.length;
}

export function Avatar({ name, src, size = 'md', className = '' }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const sizeClass = SIZE_CLASSES[size];
  const toneClass = TONE_PALETTE[getToneIndex(name)];

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={`${name} profile`}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`${sizeClass} rounded-full object-cover border border-slate-200/80 shrink-0 bg-slate-100 ${className}`}
      />
    );
  }

  return (
    <div
      aria-label={name}
      className={`${sizeClass} ${toneClass} rounded-full flex items-center justify-center font-semibold tracking-tight shrink-0 select-none ${className}`}
    >
      {getInitials(name)}
    </div>
  );
}
