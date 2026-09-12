// admin/src/app/matchmaking/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Users, Filter, Calendar, MapPin, XCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function MatchmakingAdminPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSport, setSelectedSport] = useState<string>('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const sports = [
    { label: 'Tất cả', value: '' },
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
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-lg shadow-purple-500/20">
              <Users className="w-6 h-6" />
            </div>
            Cáp Kèo & Tìm Đồng Đội Thể Thao (Matchmaking)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi các trận giao hữu, kết nối người chơi và quản lý bài đăng cáp kèo (Mục 6.3)
          </p>
        </div>

        <button
          onClick={loadMatches}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {actionMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          {actionMessage}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
        {sports.map((s) => (
          <button
            key={s.value}
            onClick={() => setSelectedSport(s.value)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedSport === s.value
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Grid of Match Requests */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Đang tải danh sách cáp kèo...</div>
      ) : matches.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <p className="text-slate-500 font-medium">Chưa có bài đăng cáp kèo nào phù hợp.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map((m) => {
            const isFull = m.status === 'FULL' || m.slotsFilled >= m.slotsNeeded;
            const isClosed = m.status === 'CLOSED';

            return (
              <div
                key={m._id}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-purple-50 text-purple-700 border border-purple-200">
                      {m.sportType}
                    </span>

                    {isClosed ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500">
                        Đã đóng
                      </span>
                    ) : isFull ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Đủ người (FULL)
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
                        Đang tìm (+{m.slotsNeeded - m.slotsFilled})
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-900 text-base mb-2">
                    {m.locationDescription || 'Giao lưu thể thao thân thiện'}
                  </h3>

                  <div className="space-y-2 text-xs text-slate-600 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>{new Date(m.matchDate).toLocaleString('vi-VN')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span>
                        Người tham gia:{' '}
                        <strong className="text-slate-900 font-mono">
                          {m.slotsFilled} / {m.slotsNeeded}
                        </strong>{' '}
                        người
                      </span>
                    </div>
                  </div>

                  {/* Creator Info */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 mb-4">
                    <p className="font-semibold text-slate-800">
                      Chủ kèo: {m.creatorId?.fullName || 'Ẩn danh'}
                    </p>
                    <p className="text-slate-400 font-mono">{m.creatorId?.phone || 'N/A'}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Tạo: {new Date(m.createdAt).toLocaleDateString('vi-VN')}
                  </span>

                  {!isClosed && (
                    <button
                      onClick={() => handleCancelMatch(m._id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg text-xs font-bold transition-all border border-rose-200"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Đóng kèo
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
