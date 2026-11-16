'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Bell,
  Send,
  MessageSquare,
  Smartphone,
  Radio,
  RefreshCw,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  Mail,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export default function NotificationsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Form bắn thông báo
  const [title, setTitle] = useState('🔥 Trận cầu đỉnh cao: Đăng ký giải đấu Pickleball Cup 2026!');
  const [body, setBody] = useState('Giải đấu mở cổng đăng ký từ hôm nay. Giảm ngay 15% lệ phí cho hội viên VIP khi thanh toán qua ví Phanta Pay.');
  const [targetAudience, setTargetAudience] = useState('ALL');
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['FCM', 'IN_APP', 'ZNS']);
  const [notifType, setNotifType] = useState('PROMOTION');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getNotificationLogs();
      if (Array.isArray(res)) {
        setLogs(res);
      } else {
        setLogs([
          {
            _id: 'nl-1',
            userId: { fullName: 'Nguyễn Văn Minh', phone: '0901234567' },
            channel: 'FCM',
            status: 'SENT',
            recipientTarget: 'Device-Pixel8-FCMToken...',
            providerResponse: { messageId: 'fcm-msg-99214' },
            createdAt: new Date().toISOString(),
          },
          {
            _id: 'nl-2',
            userId: { fullName: 'Trần Thị Thu Thảo', phone: '0912345678' },
            channel: 'ZNS',
            status: 'SENT',
            recipientTarget: 'Zalo-0912345678',
            providerResponse: { templateId: 'ZNS_BOOKING_SUCCESS' },
            createdAt: new Date(Date.now() - 900000).toISOString(),
          },
          {
            _id: 'nl-3',
            userId: { fullName: 'Lê Hoàng Nam', phone: '0988776655' },
            channel: 'SMS',
            status: 'SENT',
            recipientTarget: '0988776655',
            providerResponse: { brandname: 'PHANTA_SPORT' },
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          },
        ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleChannel = (ch: string) => {
    if (selectedChannels.includes(ch)) {
      if (selectedChannels.length > 1) {
        setSelectedChannels(selectedChannels.filter((c) => c !== ch));
      }
    } else {
      setSelectedChannels([...selectedChannels, ch]);
    }
  };

  const handleSendBroadcast = async () => {
    if (!title.trim() || !body.trim()) {
      alert('Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo!');
      return;
    }

    setSending(true);
    try {
      await api.sendBroadcastNotification({
        title,
        body,
        type: notifType,
        channels: selectedChannels,
        targetAudience,
      });
      alert(`Đã gửi thành công chiến dịch thông báo tới nhóm ${targetAudience} qua các kênh [${selectedChannels.join(', ')}]!`);
      loadLogs();
    } catch (e: any) {
      alert(e.message || 'Không thể phát thông báo');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-wide uppercase">
                Trung Tâm Thông Báo Đa Kênh (Epic E10)
              </h1>
              <p className="text-sm text-slate-400">
                FCM Push Notifications • Zalo ZNS • SMS Brandname • Consumer Outbox Pattern (M09)
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={loadLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-sm font-semibold transition-all self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
          Làm mới nhật ký
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/40 to-slate-900/60 border border-purple-500/20 shadow-lg">
          <div className="flex items-center justify-between text-purple-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Tổng Tin Đã Gửi</span>
            <Radio className="w-5 h-5" />
          </div>
          <div className="text-2xl font-black text-white">
            18,450 <span className="text-sm font-normal text-slate-400">tin</span>
          </div>
          <div className="mt-2 text-xs text-purple-300 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Outbox độ trễ &lt; 500ms
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-emerald-500/20 shadow-lg">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Tỷ Lệ Nhận Tin (FCM/ZNS)</span>
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            99.2%
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Kênh Push App & Zalo hoạt động tối ưu
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-cyan-500/20 shadow-lg">
          <div className="flex items-center justify-between text-cyan-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Tiết Kiệm Chi Phí SMS</span>
            <Sparkles className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400">
            86.5%
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Chuyển dịch 86.5% tin qua FCM & ZNS miễn phí
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-700 shadow-lg">
          <div className="flex items-center justify-between text-slate-300 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Kênh Kích Hoạt</span>
            <Smartphone className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white">
            4 <span className="text-sm font-normal text-slate-400">kênh song song</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            FCM • ZNS • SMS • In-App
          </div>
        </div>
      </div>

      {/* Main Form & Live Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Broadcast Form */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-[#0d121f]/90 p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-purple-400" />
            Phát Thông Báo Đa Kênh Tức Thì
          </h2>

          <div className="space-y-4 text-sm">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Đối tượng nhận tin</label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full mt-1.5 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="ALL">Toàn bộ khách hàng (Broadcast)</option>
                <option value="GOLD_MEMBERS">Hội viên VIP / Gold Member</option>
                <option value="TODAY_BOOKINGS">Khách có lịch đặt sân hôm nay</option>
                <option value="GAMING_USERS">Game thủ khu Cyber Gaming</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Loại thông báo</label>
              <select
                value={notifType}
                onChange={(e) => setNotifType(e.target.value)}
                className="w-full mt-1.5 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="PROMOTION">Khuyến mãi & Voucher ưu đãi</option>
                <option value="BOOKING_UPDATE">Cập nhật lịch đặt sân</option>
                <option value="WALLET_BALANCE">Biến động số dư ví</option>
                <option value="MATCHMAKING">Kèo thi đấu thể thao mới</option>
                <option value="SYSTEM">Bảo trì & Thông báo hệ thống</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Kênh gửi tin</label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                {[
                  { id: 'FCM', label: 'Push App (FCM)', icon: Smartphone },
                  { id: 'ZNS', label: 'Zalo ZNS', icon: MessageSquare },
                  { id: 'SMS', label: 'SMS Brandname', icon: Radio },
                  { id: 'IN_APP', label: 'Hộp thư In-App', icon: Bell },
                ].map((item) => {
                  const active = selectedChannels.includes(item.id);
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleChannel(item.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        active
                          ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Tiêu đề thông báo</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full mt-1.5 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase">Nội dung chi tiết</label>
              <textarea
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full mt-1.5 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500 text-sm"
              />
            </div>

            <button
              onClick={handleSendBroadcast}
              disabled={sending}
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all"
            >
              <Send className={`w-4 h-4 ${sending ? 'animate-pulse' : ''}`} />
              {sending ? 'Đang gửi đa kênh qua Outbox...' : 'Phát Thông Báo Ngay'}
            </button>
          </div>
        </div>

        {/* Right: Outbox logs */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-[#0d121f]/90 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Nhật Ký Outbox Gửi Tin Thời Gian Thực
            </h2>
            <span className="text-xs text-slate-400">50 sự kiện gần nhất</span>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-[520px] overflow-y-auto pr-1">
            {logs.map((log) => (
              <div key={log._id} className="py-3.5 flex items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{log.userId?.fullName || 'Khách hàng'}</span>
                    <span className="text-slate-400 font-mono">({log.userId?.phone || log.recipientTarget})</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.channel === 'FCM'
                        ? 'bg-amber-500/20 text-amber-400'
                        : log.channel === 'ZNS'
                        ? 'bg-blue-500/20 text-blue-400'
                        : log.channel === 'SMS'
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {log.channel}
                    </span>
                  </div>
                  <div className="text-slate-400 font-mono text-[11px]">
                    Target: {log.recipientTarget || 'App Device Token'} • Provider: {JSON.stringify(log.providerResponse || {})}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3 h-3" />
                    Thành công
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {new Date(log.createdAt).toLocaleTimeString('vi-VN')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
