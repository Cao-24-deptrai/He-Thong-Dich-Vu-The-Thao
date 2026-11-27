'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  ArrowLeft,
  CalendarCheck,
  CreditCard,
  Info,
  Clock,
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
      // ignore silent failure
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setItems((prev) => prev.map((it) => ({ ...it, isRead: true })));
      setUnreadCount(0);
    } catch {
      // ignore silent failure
    }
  };

  const renderIcon = (type: string) => {
    if (type === 'PAYMENT') return <CreditCard className="w-4 h-4 text-[#00B562] dark:text-[#9CFF93]" />;
    if (type === 'BOOKING') return <CalendarCheck className="w-4 h-4 text-[#00B562] dark:text-[#9CFF93]" />;
    return <Info className="w-4 h-4 text-[#00B562] dark:text-[#9CFF93]" />;
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/home"
            className="inline-flex items-center space-x-1.5 text-xs font-medium text-[#758A80] dark:text-[#A1A79F] hover:text-[#00B562] dark:hover:text-[#9CFF93] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại trang chủ</span>
          </Link>
          <div className="flex items-center space-x-3">
            <h1 className="font-heading font-bold text-2xl sm:text-3xl uppercase tracking-tight text-[#171C1A] dark:text-white">
              Thông báo
            </h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#00B562] text-white dark:bg-[#9CFF93] dark:text-[#0C0F0C]">
                {unreadCount} chưa đọc
              </span>
            )}
          </div>
        </div>

        {items.length > 0 && unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-[#E3E8E6] dark:border-white/15 bg-white dark:bg-[#191C14] hover:border-[#00B562] dark:hover:border-[#9CFF93] text-xs font-semibold text-[#171C1A] dark:text-white transition-colors"
          >
            <CheckCheck className="w-4 h-4 text-[#00B562] dark:text-[#9CFF93]" />
            <span>Đánh dấu đã đọc tất cả</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-sm text-[#758A80] dark:text-[#A1A79F]">
          Đang tải thông báo...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#191C14] p-10 text-center space-y-2.5">
          <Bell className="w-9 h-9 mx-auto text-[#758A80] dark:text-[#A1A79F] opacity-60" />
          <p className="font-heading font-bold text-base text-[#171C1A] dark:text-white">
            Chưa có thông báo nào
          </p>
          <p className="text-xs text-[#758A80] dark:text-[#A1A79F] max-w-md mx-auto">
            Khi vé đặt sân được xác nhận thanh toán, hủy vé hoặc check-in thành công tại sân, thông báo sẽ xuất hiện tại đây.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <button
              key={item._id}
              type="button"
              onClick={() => handleMarkRead(item._id, item.isRead)}
              className={`w-full text-left p-4 sm:p-5 rounded-2xl border transition-colors flex items-start space-x-3.5 ${
                item.isRead
                  ? 'border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#191C14] opacity-80'
                  : 'border-[#00B562]/40 dark:border-[#9CFF93]/40 bg-[#E6F8F0]/40 dark:bg-[#121512]'
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-[#E6F8F0] dark:bg-[#22261E] flex items-center justify-center shrink-0 mt-0.5">
                {renderIcon(item.type)}
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-heading font-bold text-sm text-[#171C1A] dark:text-white">
                    {item.title}
                  </p>
                  {!item.isRead && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#00B562] text-white dark:bg-[#9CFF93] dark:text-[#0C0F0C] shrink-0">
                      Mới
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#3B4540] dark:text-[#D1D5DB] leading-relaxed">
                  {item.body}
                </p>
                <p className="text-[11px] text-[#758A80] dark:text-[#A1A79F] flex items-center space-x-1 pt-0.5">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(item.createdAt).toLocaleString('vi-VN')}</span>
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
