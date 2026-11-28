// admin/src/app/matchmaking/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Users, Filter, Calendar, MapPin, XCircle, RefreshCw, CheckCircle2, ShieldCheck, Clock } from 'lucide-react';

export default function MatchmakingAdminPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSport, setSelectedSport] = useState<string>('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const sports = [
    { label: 'Tất cả bộ môn', value: '' },
    { label: 'Bóng đá', value: 'FOOTBALL' },
    { label: 'Cầu lông', value: 'BADMINTON' },
    { label: 'Tennis', value: 'TENNIS' },
    { label: 'Esports', value: 'ESPORTS' },
    { label: 'Gym', value: 'GYM' },
  ];

  useEffect(() => {
    loadMatches();
  }, [selectedSport]);

  const loadMatches = async () => {
    setLoading(true);
    try {
      const data = await api.getMatchRequests(selectedSport || undefined);
      setMatches(data || []);
    } catch (err) {
      console.error('Lỗi tải danh sách cáp kèo:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelMatch = async (matchId: string) => {
    if (!confirm('Bạn có chắc chắn muốn đóng/hủy bài đăng cáp kèo này?')) return;

    try {
      await api.cancelMatchRequest(matchId);
      setActionMessage('Đã đóng kèo thành công!');
      setTimeout(() => setActionMessage(null), 3000);
      loadMatches();
    } catch (err: any) {
      alert(`Lỗi: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-[var(--text-heading)] flex items-center gap-2.5">
            <Users className="w-6 h-6 text-[var(--burnt-orange)]" />
            <span>Cáp Kèo & Tìm Đồng Đội Thể Thao (Matchmaking)</span>
          </h1>
          <p className="text-xs text-[var(--text-sub)] mt-1">
            Theo dõi các trận giao hữu, kết nối cộng đồng người chơi và quản lý bài đăng cáp kèo theo quy chuẩn
          </p>
        </div>

        <button
          onClick={loadMatches}
          className="phanta-btn-secondary px-3.5 py-2 flex items-center gap-2 text-xs w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới danh sách</span>
        </button>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-[var(--pitch-green)] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs">
        <span className="text-xs font-bold text-[var(--text-sub)] px-2">Bộ môn:</span>
        {sports.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setSelectedSport(s.value)}
            className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all ${
              selectedSport === s.value
                ? 'phanta-btn-primary'
                : 'text-[var(--text-sub)] hover:text-[var(--text-heading)] hover:bg-[var(--bg-card-inner)]'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Main Table */}
      <div className="phanta-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-bold text-base text-[var(--text-heading)] flex items-center gap-2">
            <span>Danh sách bài đăng tìm đối thủ / ghép đội</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-heading font-extrabold bg-[var(--pitch-green)]/15 text-[var(--pitch-green)] border border-[var(--pitch-green)]/30 tabular-nums">
              {matches.length}
            </span>
          </h2>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[var(--pitch-green)]" />
            <p className="text-xs text-[var(--text-sub)]">Đang tải danh sách bài đăng cáp kèo...</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="py-16 text-center text-xs text-[var(--text-sub)]">
            Không có bài đăng cáp kèo nào trong danh mục này.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--text-sub)] uppercase tracking-wider font-semibold">
                  <th className="pb-3 pl-2">Người tạo / Bộ môn</th>
                  <th className="pb-3">Thời gian thi đấu</th>
                  <th className="pb-3">Cấp độ & Mô tả</th>
                  <th className="pb-3">Trạng thái</th>
                  <th className="pb-3 text-right pr-2">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {matches.map((m) => (
                  <tr key={m._id} className="hover:bg-[var(--bg-card-inner)]/50 transition">
                    <td className="py-3.5 pl-2">
                      <div className="font-heading font-bold text-[var(--text-heading)]">
                        {m.creatorName || m.userId?.fullName || 'Người chơi Phanta'}
                      </div>
                      <div className="text-[11px] text-[var(--pitch-green)] font-semibold mt-0.5">
                        {m.sportType || 'BÓNG ĐÁ'}
                      </div>
                    </td>

                    <td className="py-3.5">
                      <div className="flex items-center gap-1.5 text-[var(--text-main)] font-heading tabular-nums">
                        <Clock className="w-3.5 h-3.5 text-[var(--text-sub)]" />
                        <span>{m.matchTime || '18:00 - 19:30'}</span>
                      </div>
                      <div className="text-[11px] text-[var(--text-sub)] mt-0.5">
                        {m.matchDate ? new Date(m.matchDate).toLocaleDateString('vi-VN') : 'Hôm nay'}
                      </div>
                    </td>

                    <td className="py-3.5 max-w-xs">
                      <div className="font-medium text-[var(--text-main)] truncate">
                        {m.description || 'Tìm đối thủ giao hữu vui vẻ, chia tiền sân sòng phẳng'}
                      </div>
                      <div className="text-[11px] text-[var(--text-sub)] mt-0.5">
                        Trình độ: <span className="text-amber-400 font-semibold">{m.skillLevel || 'Phong trào khá'}</span>
                      </div>
                    </td>

                    <td className="py-3.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-[var(--pitch-green)] border border-emerald-500/25">
                        <ShieldCheck className="w-3 h-3" />
                        <span>{m.status || 'ĐANG MỞ'}</span>
                      </span>
                    </td>

                    <td className="py-3.5 text-right pr-2">
                      <button
                        type="button"
                        onClick={() => handleCancelMatch(m._id)}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 text-xs font-semibold ml-auto flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Đóng kèo</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
