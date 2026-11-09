'use client';

import { useState, useEffect } from 'react';
import {
  Star,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Send,
  Building,
  Sparkles,
  ShieldAlert,
  Search,
  Filter,
  X,
  RefreshCw,
  Phone,
  User,
  Clock,
  ThumbsUp,
} from 'lucide-react';
import { api, Review, ReviewSummary } from '@/lib/api';

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Tab & Filters
  const [filterTab, setFilterTab] = useState<'ALL' | 'ATTENTION' | 'UNANSWERED' | 'ANSWERED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Response Modal State
  const [selectedReviewForResponse, setSelectedReviewForResponse] = useState<Review | null>(null);
  const [responseContent, setResponseContent] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [sumData, reviewList] = await Promise.all([
        api.getReviewSummary(),
        api.getReviews(),
      ]);
      setSummary(sumData);
      setReviews(reviewList);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể tải dữ liệu đánh giá.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Response Submission
  const handleSendResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReviewForResponse || !responseContent.trim()) return;

    try {
      setLoading(true);
      setErrorMsg(null);
      const updated = await api.respondToReview(selectedReviewForResponse._id, responseContent.trim());
      setSuccessMsg(`Đã gửi phản hồi thành công đến khách hàng ${updated.customerName}!`);
      setSelectedReviewForResponse(null);
      setResponseContent('');
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể gửi phản hồi.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Dismiss Attention Alert
  const handleDismissAttention = async (reviewId: string) => {
    try {
      setLoading(true);
      await api.dismissReviewAttention(reviewId);
      setSuccessMsg('Đã gỡ cờ cảnh báo khẩn cấp cho đánh giá này.');
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể cập nhật cờ cảnh báo.');
    } finally {
      setLoading(false);
    }
  };

  // Filtered reviews
  const filteredReviews = reviews.filter((r) => {
    const matchSearch =
      searchQuery === '' ||
      r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.comment.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.customerPhone && r.customerPhone.includes(searchQuery));

    if (!matchSearch) return false;

    if (filterTab === 'ATTENTION') return r.needsAttention;
    if (filterTab === 'UNANSWERED') return !r.staffResponse;
    if (filterTab === 'ANSWERED') return !!r.staffResponse;
    return true;
  });

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Epic E15 • Đánh Giá & Cộng Đồng
            </span>
            <span className="text-slate-400 text-xs">• Phụ trách: Nguyễn Lê Thành Trung</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mt-1 flex items-center gap-3">
            <Star className="w-8 h-8 text-amber-400 fill-amber-400" />
            Đánh Giá Dịch Vụ Đa Tiêu Chí
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Đặc tả BR-reviews 4 tiêu chí chuẩn hóa, cảnh báo sao thấp (dưới hoặc bằng 2 sao) và phản hồi chăm sóc khách hàng.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-sm font-medium transition self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          Làm mới
        </button>
      </div>

      {/* Alert Notices */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Metrics & 4 Criteria Scorecards */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Main Average Score */}
          <div className="bg-[#0f172a]/70 border border-slate-800/80 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Điểm Đánh Giá Chung</span>
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>

            <div className="my-3 flex items-baseline gap-2">
              <span className="text-4xl md:text-5xl font-black text-amber-400">{summary.avgOverall}</span>
              <span className="text-lg text-slate-500 font-bold">/ 5.0</span>
            </div>

            <div className="flex items-center gap-1 text-amber-400 mb-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i <= Math.round(summary.avgOverall) ? 'fill-amber-400 text-amber-400' : 'text-slate-700'
                  }`}
                />
              ))}
              <span className="text-xs text-slate-400 ml-2 font-mono">({summary.totalReviews} lượt)</span>
            </div>

            {summary.needsAttentionCount > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-rose-400 font-bold">
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" /> Cần xử lý gấp:
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40">
                  {summary.needsAttentionCount} phản ánh
                </span>
              </div>
            )}
          </div>

          {/* 4 Criteria Progress Bars (Span 3 Cols) */}
          <div className="lg:col-span-3 bg-[#0d121f] border border-slate-800 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Criteria 1: Cơ Sở Vật Chất */}
            <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-cyan-400" /> Cơ Sở Vật Chất
                </span>
                <span className="font-black text-cyan-400 text-sm">{summary.avgFacility} / 5.0</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
                <div
                  className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(summary.avgFacility / 5) * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-2">Mặt sân, hệ thống chiếu sáng, lưới, khung thành</span>
            </div>

            {/* Criteria 2: Chất Lượng Dịch Vụ */}
            <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <ThumbsUp className="w-4 h-4 text-emerald-400" /> Chất Lượng Dịch Vụ
                </span>
                <span className="font-black text-emerald-400 text-sm">{summary.avgService} / 5.0</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(summary.avgService / 5) * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-2">Thời gian check-in, đặt chỗ, nước uống, thiết bị thuê</span>
            </div>

            {/* Criteria 3: Thái Độ Nhân Viên */}
            <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-indigo-400" /> Thái Độ Nhân Viên
                </span>
                <span className="font-black text-indigo-400 text-sm">{summary.avgStaff} / 5.0</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(summary.avgStaff / 5) * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-2">Thân thiện, nhiệt tình hỗ trợ, giải đáp thắc mắc</span>
            </div>

            {/* Criteria 4: Vệ Sinh Sân Bãi */}
            <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" /> Vệ Sinh Sân Bãi
                </span>
                <span className="font-black text-amber-400 text-sm">{summary.avgCleanliness} / 5.0</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(summary.avgCleanliness / 5) * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-2">Khu vệ sinh, phòng thay đồ, khán đài, thùng rác</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[#0d121f] p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setFilterTab('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              filterTab === 'ALL'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            Tất cả ({reviews.length})
          </button>

          <button
            onClick={() => setFilterTab('ATTENTION')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
              filterTab === 'ATTENTION'
                ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                : 'bg-slate-900 border border-slate-800 text-rose-400 hover:text-rose-300'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Cần Xử Lý Gấp (dưới 2 sao)
            {summary && summary.needsAttentionCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-950 text-white text-[10px]">
                {summary.needsAttentionCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setFilterTab('UNANSWERED')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              filterTab === 'UNANSWERED'
                ? 'bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            Chưa Phản Hồi
          </button>

          <button
            onClick={() => setFilterTab('ANSWERED')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              filterTab === 'ANSWERED'
                ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            Đã Phản Hồi
          </button>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Tìm theo tên, SĐT, nhận xét..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Review Cards List */}
      <div className="space-y-4">
        {filteredReviews.map((r) => {
          return (
            <div
              key={r._id}
              className={`p-6 rounded-3xl border transition space-y-4 ${
                r.needsAttention
                  ? 'bg-rose-950/10 border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.1)]'
                  : 'bg-[#0d121f] border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-slate-950 text-base">
                    {r.customerName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{r.customerName}</span>
                      {r.needsAttention && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Cảnh báo sao thấp
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                      {r.customerPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-500" />
                          {r.customerPhone}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {new Date(r.createdAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Score Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-1.5">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="font-black text-amber-400 text-sm">{r.overallRating}</span>
                  </div>

                  <div className="text-[11px] text-slate-400 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg">
                    CSVC: <span className="font-bold text-white">{r.facilityRating}★</span>
                  </div>
                  <div className="text-[11px] text-slate-400 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg">
                    Dịch vụ: <span className="font-bold text-white">{r.serviceRating}★</span>
                  </div>
                  <div className="text-[11px] text-slate-400 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg">
                    Nhân viên: <span className="font-bold text-white">{r.staffRating}★</span>
                  </div>
                  <div className="text-[11px] text-slate-400 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg">
                    Vệ sinh: <span className="font-bold text-white">{r.cleanlinessRating}★</span>
                  </div>
                </div>
              </div>

              {/* Comment Content */}
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 text-sm text-slate-200">
                &ldquo;{r.comment}&rdquo;
              </div>

              {/* Staff Response (if available) */}
              {r.staffResponse ? (
                <div className="bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center text-xs text-emerald-400 font-bold">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Phản hồi từ {r.staffResponse.responderName}
                    </span>
                    <span className="text-[11px] font-normal text-slate-400">
                      {new Date(r.staffResponse.respondedAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">&ldquo;{r.staffResponse.content}&rdquo;</p>
                </div>
              ) : (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-amber-400 font-medium">Chưa có phản hồi từ tổ hợp</span>
                  <div className="flex items-center gap-2">
                    {r.needsAttention && (
                      <button
                        onClick={() => handleDismissAttention(r._id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                      >
                        Đã Xử Lý Xong
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedReviewForResponse(r);
                        setResponseContent('');
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-md transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Phản Hồi Ngay
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredReviews.length === 0 && (
          <div className="p-12 text-center bg-[#0d121f] border border-slate-800 rounded-3xl">
            <CheckCircle2 className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">Không tìm thấy đánh giá nào</h3>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery ? 'Thử thay đổi từ khóa tìm kiếm.' : 'Chưa có đánh giá nào phù hợp với bộ lọc hiện tại.'}
            </p>
          </div>
        )}
      </div>

      {/* RESPONSE MODAL */}
      {selectedReviewForResponse && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSendResponse}
            className="bg-[#0d121f] border border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl"
          >
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-cyan-400" />
                  Phản Hồi Đánh Giá Khách Hàng
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Gửi lời giải trình hoặc cảm ơn đến khách hàng {selectedReviewForResponse.customerName}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReviewForResponse(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs text-slate-300">
              <span className="font-bold text-amber-400 block mb-1">
                Nhận xét ({selectedReviewForResponse.overallRating}★):
              </span>
              &ldquo;{selectedReviewForResponse.comment}&rdquo;
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase">Nội Dung Phản Hồi (*)</label>
              <textarea
                required
                rows={4}
                placeholder="Cảm ơn quý khách đã đóng góp ý kiến. Tổ hợp Phanta Sports đã..."
                value={responseContent}
                onChange={(e) => setResponseContent(e.target.value)}
                className="w-full mt-1.5 bg-slate-900 border border-slate-800 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500 leading-relaxed"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedReviewForResponse(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 text-xs font-bold transition shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                <Send className="w-3.5 h-3.5" />
                Gửi Phản Hồi
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
