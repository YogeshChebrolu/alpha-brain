'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, CheckCheck, X, Lightbulb, Zap, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications } from '@/lib/hooks/useNotifications';

/**
 * Notification Center Component
 * Bell icon with dropdown showing recent notifications
 */
export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    dismiss,
    refresh,
  } = useNotifications({ limit: 10, includeRead: true });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification: typeof notifications[0]) => {
    // Mark as read
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigate to the linked page
    if (notification.link) {
      router.push(notification.link);
    }

    setIsOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'idea_reminder':
        return <Lightbulb className="w-4 h-4 text-amber-500" />;
      case 'action_reminder':
        return <Zap className="w-4 h-4 text-blue-500" />;
      default:
        return <Bell className="w-4 h-4 text-neutral-500" />;
    }
  };

  const handleBellClick = () => {
    const willOpen = !isOpen;
    setIsOpen(willOpen);

    // Refresh notifications when opening dropdown
    if (willOpen) {
      refresh();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={handleBellClick}
        className="relative flex items-center justify-center w-10 h-10 rounded-lg text-neutral-700 hover:bg-neutral-100 transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-neutral-200 overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
            <h3 className="font-semibold text-neutral-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-neutral-500 hover:text-neutral-700 flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-neutral-400">
                <Bell className="w-8 h-8 mb-2" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`relative flex items-start gap-3 px-4 py-3 hover:bg-neutral-50 cursor-pointer transition-colors ${
                    !notification.read ? 'bg-blue-50/50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  {/* Unread indicator */}
                  {!notification.read && (
                    <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  )}

                  {/* Icon */}
                  <div className="flex-shrink-0 w-8 h-8 bg-neutral-100 rounded-lg flex items-center justify-center mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm ${
                        !notification.read ? 'font-medium text-neutral-900' : 'text-neutral-700'
                      }`}
                    >
                      {notification.title}
                    </p>
                    {notification.body && (
                      <p className="text-xs text-neutral-500 truncate mt-0.5">
                        {notification.body}
                      </p>
                    )}
                    <p className="text-xs text-neutral-400 mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>

                  {/* Dismiss button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dismiss(notification.id);
                    }}
                    className="flex-shrink-0 p-1 hover:bg-neutral-200 rounded transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-neutral-400" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-neutral-100 bg-neutral-50">
              <button
                onClick={() => {
                  router.push('/settings');
                  setIsOpen(false);
                }}
                className="text-xs text-neutral-500 hover:text-neutral-700"
              >
                Notification settings
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
