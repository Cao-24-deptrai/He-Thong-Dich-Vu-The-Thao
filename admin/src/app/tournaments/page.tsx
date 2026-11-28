'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { 
  Trophy, 
  Plus, 
  GitBranch, 
  CheckCircle2, 
  Users, 
  Calendar,
  Gamepad2,
  Medal,
  RefreshCw,
  Sparkles,
  Award,
  Clock
} from 'lucide-react';

export default function TournamentsAdminPage() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<any | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Score update modal
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [updatingResult, setUpdatingResult] = useState(false);

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/tournaments`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setTournaments(list);
      if (list.length > 0 && !selectedTournament) {
        handleSelectTournament(list[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTournament = async (t: any) => {
    setSelectedTournament(t);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/tournaments/${t._id}/matches`);
      const data = await res.json();
      setMatches(Array.isArray(data) ? data : []);
    } catch (e) {
      setMatches([]);
    }
  };

  const handleGenerateBracket = async () => {
    if (!selectedTournament) return;
    try {
      const token = api.getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/tournaments/${selectedTournament._id}/generate-bracket`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Lỗi sinh nhánh đấu');
      }
      alert('Bốc thăm và sinh nhánh đấu giải thành công!');
      handleSelectTournament(selectedTournament);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-2xl text-[var(--text-heading)] flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-amber-400" />
            <span>Giải Đấu Thể Thao & Esports</span>
          </h1>
          <p className="text-xs text-[var(--text-sub)] mt-1">
            Quản trị giải đấu, bốc thăm tự động nhánh đấu loại trực tiếp (Bracket) và cập nhật tỷ số trận đấu
          </p>
        </div>

        <button
          onClick={loadTournaments}
          className="phanta-btn-secondary px-3.5 py-2 flex items-center gap-2 text-xs w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới danh sách</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Danh sách giải đấu */}
        <div className="phanta-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-base text-[var(--text-heading)] flex items-center gap-2">
              <span>Các giải đấu hiện hành</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-heading font-extrabold bg-amber-500/15 text-amber-400 border border-amber-500/30 tabular-nums">
                {tournaments.length}
              </span>
            </h2>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-[var(--pitch-green)]" />
              <p className="text-xs text-[var(--text-sub)]">Đang tải giải đấu...</p>
            </div>
          ) : tournaments.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--text-sub)]">
              Chưa có giải đấu nào được khởi tạo.
            </div>
          ) : (
            <div className="space-y-2.5">
              {tournaments.map((t) => {
                const isSelected = selectedTournament?._id === t._id;
                return (
                  <button
                    key={t._id}
                    type="button"
                    onClick={() => handleSelectTournament(t)}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-[var(--bg-card-inner)] border-[var(--pitch-green)] shadow-md'
                        : 'bg-[var(--bg-card-inner)]/50 border-[var(--border-subtle)] hover:border-[var(--border-color)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-heading font-bold text-sm text-[var(--text-heading)]">
                        {t.name}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400">
                        {t.sportType || 'BÓNG ĐÁ'}
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--text-sub)] mt-1 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{t.participants?.length || 8} đội</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{t.startDate ? new Date(t.startDate).toLocaleDateString('vi-VN') : 'Sắp diễn ra'}</span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Cây nhánh đấu & Trận đấu */}
        <div className="lg:col-span-2 phanta-card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
            <div>
              <h2 className="font-heading font-bold text-base text-[var(--text-heading)] flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-[var(--pitch-green)]" />
                <span>Nhánh đấu: {selectedTournament?.name || 'Chọn giải đấu'}</span>
              </h2>
              <p className="text-xs text-[var(--text-sub)] mt-0.5">
                Quy cách loại trực tiếp (Single Elimination)
              </p>
            </div>

            <button
              onClick={handleGenerateBracket}
              disabled={!selectedTournament}
              className="phanta-btn-primary px-3.5 py-2 text-xs flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Bốc thăm nhánh đấu</span>
            </button>
          </div>

          {matches.length === 0 ? (
            <div className="py-16 text-center text-xs text-[var(--text-sub)]">
              Chưa có lịch thi đấu. Hãy nhấn &quot;Bốc thăm nhánh đấu&quot; để tạo cây phân cặp tự động.
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map((m, idx) => (
                <div
                  key={m._id || idx}
                  className="p-4 rounded-xl bg-[var(--bg-card-inner)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center font-heading font-bold text-xs text-[var(--text-sub)] tabular-nums">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-heading font-bold text-xs text-[var(--text-heading)]">
                        {m.team1Name || 'Đội A'} vs {m.team2Name || 'Đội B'}
                      </div>
                      <div className="text-[11px] text-[var(--text-sub)] mt-0.5 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        <span>Vòng {m.round || 1}</span>
                        <span>-</span>
                        <span>Sân Phanta Arena</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="font-heading font-black text-base text-[var(--pitch-green)] tabular-nums bg-black/20 px-3 py-1 rounded-lg">
                      {m.score1 ?? 0} : {m.score2 ?? 0}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
