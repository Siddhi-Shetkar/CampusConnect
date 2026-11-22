import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellRing, CheckCheck, Download, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { useToast } from '../context/ToastContext';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Avatar } from './Avatar';
import { formatRelativeDate } from './RequestCard';
import { NotificationDTO } from '../types/campus';

export function NotificationBell() {
  const { user } = useAuth();
  const {
    notifications,
    unreadNotificationsCount,
    markNotificationRead,
    markAllNotificationsRead,
    refreshNotifications,
  } = useRealtime();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const push = usePushNotifications(Boolean(user));
  const pwa = usePWAInstall();

  const [open, setOpen] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onOutsideClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onOutsideClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const handleToggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) refreshNotifications();
      return next;
    });
  };

  const handleOpenNotification = async (notif: NotificationDTO) => {
    if (!notif.read) {
      await markNotificationRead(notif.id);
    }
    setOpen(false);
    navigate(notif.link || '/dashboard');
  };

  const handleEnablePush = async () => {
    const res = await push.enablePush();
    showToast(res.message, res.ok ? 'success' : 'error');
  };

  const handleTestPush = async () => {
    const res = await push.sendTestPush();
    showToast(res.message, res.ok ? 'success' : 'info');
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label={`Notifications${unreadNotificationsCount > 0 ? ` (${unreadNotificationsCount} unread)` : ''}`}
        aria-expanded={open}
        className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
      >
        <Bell className="w-5 h-5" />
        {unreadNotificationsCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-700 text-white text-[10px] font-mono tabular-nums font-bold flex items-center justify-center">
            {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notification Center"
          className="fixed sm:absolute right-3 sm:right-0 left-3 sm:left-auto top-16 sm:top-full sm:mt-2 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-900/10 z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
              <p className="text-xs text-slate-500 tabular-nums">
                {unreadNotificationsCount > 0
                  ? `${unreadNotificationsCount} unread`
                  : 'All caught up'}
              </p>
            </div>
            {unreadNotificationsCount > 0 && (
              <button
                type="button"
                onClick={markAllNotificationsRead}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-800 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification Items */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm font-medium text-slate-800">No notifications yet</p>
                <p className="text-xs text-slate-500 mt-1">
                  Connection requests, acceptances, and new messages will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  type="button"
                  onClick={() => handleOpenNotification(notif)}
                  className={`w-full text-left px-4 py-3.5 hover:bg-slate-50 transition-colors flex items-start gap-3 cursor-pointer ${
                    notif.read ? 'bg-white' : 'bg-indigo-50/40'
                  }`}
                >
                  <Avatar
                    name={notif.actor?.name || 'CampusConnect'}
                    src={notif.actor?.profileImage}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-xs leading-snug ${
                          notif.read
                            ? 'font-medium text-slate-800'
                            : 'font-semibold text-slate-900'
                        }`}
                      >
                        {notif.title}
                      </p>
                      <span className="text-[11px] text-slate-400 tabular-nums shrink-0">
                        {formatRelativeDate(notif.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{notif.body}</p>
                    {!notif.read && (
                      <p className="text-[11px] font-semibold text-indigo-700 mt-1">Unread</p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Phone Push & PWA Footer */}
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {push.isSubscribed ? (
                  <BellRing className="w-4 h-4 text-emerald-700 shrink-0" />
                ) : (
                  <Smartphone className="w-4 h-4 text-slate-600 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    Phone Push Alerts
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {push.isSubscribed
                      ? 'Active on this device'
                      : push.permission === 'denied'
                      ? 'Blocked in browser settings'
                      : !push.isSupported
                      ? 'Use Chrome/Android or install PWA'
                      : 'Get notified when app is closed'}
                  </p>
                </div>
              </div>

              {push.isSubscribed ? (
                <button
                  type="button"
                  disabled={push.busy}
                  onClick={handleTestPush}
                  className="px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 rounded-md whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
                >
                  Send Test
                </button>
              ) : (
                push.isSupported &&
                push.permission !== 'denied' && (
                  <button
                    type="button"
                    disabled={push.busy}
                    onClick={handleEnablePush}
                    className="px-2.5 py-1.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-md whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
                  >
                    {push.busy ? 'Enabling...' : 'Enable'}
                  </button>
                )
              )}
            </div>

            {push.error && (
              <p className="text-[11px] text-rose-700 leading-snug">{push.error}</p>
            )}

            {!pwa.isInstalled && (pwa.isInstallable || pwa.isIOS) && (
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-600">
                  Install CampusConnect on your home screen
                </span>
                {pwa.isInstallable ? (
                  <button
                    type="button"
                    onClick={() => pwa.install()}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Install App
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowIOSGuide((p) => !p)}
                    className="text-xs font-semibold text-indigo-700 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    iOS Steps
                  </button>
                )}
              </div>
            )}

            {showIOSGuide && (
              <p className="text-[11px] text-slate-600 bg-white border border-slate-200 rounded-md p-2.5 leading-relaxed">
                On iPhone/iPad Safari: tap the <strong>Share</strong> icon, then choose{' '}
                <strong>Add to Home Screen</strong>. Open the installed app to enable push
                notifications.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
