'use client';

import { useState } from 'react';
import { Bell, Bot, Activity, Shield, Check, X, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatRelativeTime } from '@sly/ui';
import { useApiClient } from '@/lib/api-client';
import { getApiErrorMessage } from '@/lib/api-error';
import type { Notification } from '@sly/api-client';

const notificationIcons = {
  agent_action: Bot,
  stream_alert: Activity,
  compliance: Shield,
  system: Bell,
};

const notificationColors = {
  agent_action: 'bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400',
  stream_alert: 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400',
  compliance: 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400',
  system: 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400',
};

export function NotificationsCenter() {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
  };

  const {
    data: listData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api!.notifications.list({ limit: 30 }),
    enabled: !!api,
    refetchInterval: 45000,
    refetchOnWindowFocus: true,
  });

  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => api!.notifications.unreadCount(),
    enabled: !!api,
    refetchInterval: 45000,
    refetchOnWindowFocus: true,
  });

  const notifications: Notification[] = (listData as any)?.data ?? [];
  const unreadCount = unreadData?.count ?? 0;

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api!.notifications.markRead(id),
    onSuccess: invalidate,
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api!.notifications.markAllRead(),
    onSuccess: invalidate,
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => api!.notifications.dismiss(id),
    onSuccess: invalidate,
  });

  const markAsRead = (id: string) => markReadMutation.mutate(id);
  const markAllAsRead = () => markAllReadMutation.mutate();
  const dismissNotification = (id: string) => dismissMutation.mutate(id);

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        data-tour="header-notifications"
        aria-label="Notifications"
        className="relative p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl z-50 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="max-h-[400px] overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-8 h-8 text-gray-300 dark:text-gray-700 mx-auto mb-3 animate-spin" />
                  <p className="text-gray-500 dark:text-gray-400">Loading notifications…</p>
                </div>
              ) : isError ? (
                <div className="p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-red-300 dark:text-red-800 mx-auto mb-3" />
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {getApiErrorMessage(error, "Couldn't load notifications")}
                  </p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">You&apos;re all caught up</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-800">
                  {notifications.map((notification) => {
                    const Icon = notificationIcons[notification.type];
                    const content = (
                      <div
                        className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                          !notification.read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${notificationColors[notification.type]}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {notification.title}
                              </h4>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  dismissNotification(notification.id);
                                }}
                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3 text-gray-400" />
                              </button>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-400">
                                {formatRelativeTime(notification.timestamp)}
                              </span>
                              {!notification.read && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    markAsRead(notification.id);
                                  }}
                                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" />
                                  Mark read
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );

                    if (notification.href) {
                      return (
                        <Link
                          key={notification.id}
                          href={notification.href}
                          onClick={() => {
                            markAsRead(notification.id);
                            setIsOpen(false);
                          }}
                          className="block group"
                        >
                          {content}
                        </Link>
                      );
                    }

                    return (
                      <div key={notification.id} className="group">
                        {content}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
              <Link
                href="/dashboard/settings"
                onClick={() => setIsOpen(false)}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Notification settings
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
