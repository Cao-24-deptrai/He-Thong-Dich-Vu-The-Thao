'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  CalendarCheck,
  CreditCard,
  Info,
  Clock,
  RefreshCw,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { api } from '@/lib/api';

interface NotificationItem {
  _id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, any>;
}

export default function CustomerNotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = async () => {
    try {
      setError(null);
      const res = await api.getMyNotifications(1, 30);
      setItems(res.items || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err: any) {
      setError(err?.data?.message || err?.message || 'Không thể tải danh sách thông báo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const user = api.getUser();
    if (!user) {
      router.replace('/login');
      return;
    }
    loadNotifications();
  }, [router]);

  const handleMarkRead = async (id: string, isRead: boolean) => {
    if (isRead) return;
    try {
      await api.markNotificationRead(id);
      setItems((prev) => prev.map((it) => (it._id === id ? { ...it, isRead: true } : it)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setItems((prev) => prev.map((it) => ({ ...it, isRead: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const renderIcon = (type: string) => {
    if (type === 'PAYMENT') return <CreditCard className="w-4 h-4 text-[var(--pitch-green)]" />;
    if (type === 'BOOKING') return <CalendarCheck className="w-4 h-4 text-[var(--burnt-orange)]" />;
    return <Info className="w-4 h-4 text-sky-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-[var(--text-heading)] flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-[var(--burnt-orange)]" />
            <span>Thông Báo Hệ Thống & Cảnh Báo Khẩn</span>
          </h1>
          <p className="text-xs text-[var(--text-sub)] mt-1">
            Trung tâm kiểm soát thông báo giao dịch, cảnh báo xung đột lịch và tin tức vận hành gửi tới người dùng
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="phanta-btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5"
            >
              <CheckCheck className="w-3.5 h-3.5 text-[var(--pitch-green)]" />
              <span>Đánh dấu đã đọc tất cả</span>
            </button>
          )}

          <button
            onClick={loadNotifications}
            className="phanta-btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="phanta-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-bold text-base text-[var(--text-heading)] flex items-center gap-2">
            <span>Hộp thư thông báo</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-heading font-extrabold bg-[var(--pitch-green)]/15 text-[var(--pitch-green)] border border-[var(--pitch-green)]/30 tabular-nums">
              {unreadCount} chưa đọc
            </span>
          </h2>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[var(--pitch-green)]" />
            <p className="text-xs text-[var(--text-sub)]">Đang tải danh sách thông báo...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-xs text-[var(--text-sub)]">
            Hộp thư trống, không có thông báo mới nào.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((it) => (
              <div
                key={it._id}
                onClick={() => handleMarkRead(it._id, it.isRead)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                  it.isRead
                    ? 'bg-[var(--bg-card-inner)]/50 border-[var(--border-subtle)] opacity-75'
                    : 'bg-[var(--bg-card-inner)] border-[var(--pitch-green)]/40 shadow-xs'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  {renderIcon(it.type)}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-heading font-bold text-xs text-[var(--text-heading)]">
                      {it.title}
                    </h4>
                    <span className="text-[10px] text-[var(--text-sub)] flex items-center gap-1 font-heading tabular-nums">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(it.createdAt).toLocaleString('vi-VN')}</span>
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-main)] leading-relaxed">
                    {it.body}
                  </p>
                </div>

                {!it.isRead && (
                  <span className="w-2 h-2 rounded-full bg-[var(--pitch-green)] flex-shrink-0 mt-2" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
