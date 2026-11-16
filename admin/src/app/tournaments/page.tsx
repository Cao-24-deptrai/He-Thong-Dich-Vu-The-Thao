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
  Medal
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
      alert('Bốc thăm và sinh nhánh đấu thành công (F16.4)!');
      handleSelectTournament(selectedTournament);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatch) return;
    setUpdatingResult(true);
    try {
      const token = api.getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/tournaments/matches/${selectedMatch._id}/result`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            score1: Number(score1),
            score2: Number(score2),
          }),
        },
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Lỗi cập nhật tỷ số');
      }
      alert('Đã cập nhật kết quả và tự động thăng hạng đội thắng (F16.6)!');
      setSelectedMatch(null);
      handleSelectTournament(selectedTournament);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingResult(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Trophy className="w-7 h-7 text-amber-400" />
            Quản Trị Giải Đấu Thể Thao & Esports (M16)
          </h1>
          <p className="text-slate-400 text-sm">
            Quản lý đăng ký đội, bốc thăm chia nhánh Single/Double Elimination và cập nhật kết quả trực tuyến
          </p>
        </div>

        {selectedTournament && (
          <button
            onClick={handleGenerateBracket}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-semibold transition shadow-lg shadow-amber-900/30"
          >
            <GitBranch className="w-4 h-4" />
            Bốc Thăm Sinh Nhánh Đấu (F16.4)
          </button>
        )}
      </div>

      {/* Tournament Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-800">
        {tournaments.map((t) => (
          <button
            key={t._id}
            onClick={() => handleSelectTournament(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition flex items-center gap-2 ${
              selectedTournament?._id === t._id
                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy className="w-4 h-4" />
            {t.name}
          </button>
        ))}
      </div>

      {/* Tournament Detail & Matches Grid */}
      {selectedTournament && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-4 border-b border-slate-800">
            <div>
              <p className="text-xs text-slate-400">Loại hình / Môn</p>
              <p className="text-white font-semibold">{selectedTournament.sportOrGame} ({selectedTournament.type})</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Thể thức thi đấu</p>
              <p className="text-emerald-400 font-semibold">{selectedTournament.format}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Tổng giải thưởng</p>
              <p className="text-amber-400 font-bold">{selectedTournament.prizePool?.toLocaleString('vi-VN')} đ</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Trạng thái giải</p>
              <span className="inline-block px-2 py-0.5 bg-slate-800 text-xs font-semibold text-slate-300 rounded">
                {selectedTournament.status}
              </span>
            </div>
          </div>

          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-amber-400" />
            Nhánh Đấu & Các Trận Đấu
          </h3>

          {matches.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/80">
              Chưa có trận đấu nào được sinh. Vui lòng bấm &quot;Bốc Thăm Sinh Nhánh Đấu&quot; sau khi đủ số đội đăng ký.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {matches.map((m) => {
                const isCompleted = m.status === 'COMPLETED';
                return (
                  <div key={m._id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-amber-400">{m.matchCode} (Vòng {m.round})</span>
                      <span className={`px-2 py-0.5 rounded ${isCompleted ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                        {m.status}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-sm">
                      <div className={`flex justify-between p-2 rounded ${m.winnerId === m.team1Id ? 'bg-emerald-950/40 text-emerald-300 font-bold' : 'text-slate-300'}`}>
                        <span>{m.team1Name || 'Chờ xác định'}</span>
                        <span>{m.score1}</span>
                      </div>
                      <div className={`flex justify-between p-2 rounded ${m.winnerId === m.team2Id ? 'bg-emerald-950/40 text-emerald-300 font-bold' : 'text-slate-300'}`}>
                        <span>{m.team2Name || 'Chờ xác định'}</span>
                        <span>{m.score2}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedMatch(m);
                        setScore1(m.score1 || 0);
                        setScore2(m.score2 || 0);
                      }}
                      className="w-full py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded transition"
                    >
                      Cập Nhật Tỷ Số
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal Cập nhật tỷ số */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-sm w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">Nhập Tỷ Số Trận Đấu</h2>
            <p className="text-xs text-slate-400">{selectedMatch.matchCode} - Vòng {selectedMatch.round}</p>

            <form onSubmit={handleUpdateScore} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">{selectedMatch.team1Name || 'Đội 1'}</label>
                <input
                  type="number"
                  min="0"
                  value={score1}
                  onChange={(e) => setScore1(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-lg font-bold"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">{selectedMatch.team2Name || 'Đội 2'}</label>
                <input
                  type="number"
                  min="0"
                  value={score2}
                  onChange={(e) => setScore2(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-lg font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedMatch(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg text-sm"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={updatingResult}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-semibold"
                >
                  {updatingResult ? 'Đang lưu...' : 'Lưu Kết Quả'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
