'use client';

import { useState, useEffect, useCallback } from 'react';
import { NotificationWithContext } from '@/types/notification.types';

interface UseNotificationsOptions {
  limit?: number;
  includeRead?: boolean;
}

interface UseNotificationsReturn {
  notifications: NotificationWithContext[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismiss: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing in-app notifications
 * Fetches notifications on mount and provides refresh capability
 */
export function useNotifications(
  options: UseNotificationsOptions = {}
): UseNotificationsReturn {
  const { limit = 20, includeRead = true } = options;

  const [notifications, setNotifications] = useState<NotificationWithContext[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/notifications?limit=${limit}&includeRead=${includeRead}`
      );
      if (!res.ok) throw new Error('Failed to fetch notifications');
      const data = await res.json();
      setNotifications(data.notifications || []);

      // Fetch unread count separately
      const countRes = await fetch('/api/notifications?countOnly=true');
      if (countRes.ok) {
        const countData = await countRes.json();
        setUnreadCount(countData.count || 0);
      }
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [limit, includeRead]);

  // Mark a notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
      });
      if (!res.ok) throw new Error('Failed to mark as read');

      // Optimistically update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, read: true, read_at: new Date().toISOString() } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'PUT',
      });
      if (!res.ok) throw new Error('Failed to mark all as read');

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  }, []);

  // Dismiss a notification
  const dismiss = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/dismiss`, {
        method: 'PUT',
      });
      if (!res.ok) throw new Error('Failed to dismiss');

      // Remove from local state
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount((prev) =>
        notifications.find((n) => n.id === id && !n.read)
          ? Math.max(0, prev - 1)
          : prev
      );
    } catch (err) {
      console.error('Error dismissing notification:', err);
    }
  }, [notifications]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    dismiss,
    refresh: fetchNotifications,
  };
}
