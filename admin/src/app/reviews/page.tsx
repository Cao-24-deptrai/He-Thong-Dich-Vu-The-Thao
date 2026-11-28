'use client';

import { useState, useEffect } from 'react';
import {
  Star,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Send,
  Building,
  ShieldAlert,
  Search,
  X,
  RefreshCw,
  Phone,
  User,
  Clock,
  ThumbsUp,
  Sparkles,
} from 'lucide-react';
import { api, Review, ReviewSummary } from '@/lib/api';

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [filterTab, setFilterTab] = useState<'ALL' | 'ATTENTION' | 'UNANSWERED' | 'ANSWERED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleSendResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReviewForResponse || !responseContent.trim()) return;

    try {
      setLoading(true);
      setErrorMsg(null);
      const updated = await api.respondToReview(selectedReviewForResponse._id, responseContent.trim());
      setSuccessMsg(`Đã gửi phản hồi thành công đến khách hàng ${updated.customerName}.`);
      setSelectedReviewForResponse(null);
      setResponseContent('');
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể gửi phản hồi.');
    } finally {
      setLoading(false);
    }
  };

  const handleDismissAttention = async (reviewId: string) => {
    try {
      setLoading(true);
      await api.dismissReviewAttention(reviewId);
      setSuccessMsg('Đã gỡ cờ cảnh báo cho đánh giá này.');
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể cập nhật cờ cảnh báo.');
    } finally {
      setLoading(false);
    }
  };

  const filteredReviews = reviews.filter((r) => {
    const matchSearch =
      searchQuery === '' ||
      (r.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.comment || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.customerPhone && r.customerPhone.includes(searchQuery));

    if (!matchSearch) return false;

    if (filterTab === 'ATTENTION') return r.needsAttention;
    if (filterTab === 'UNANSWERED') return !r.staffResponse;
    if (filterTab === 'ANSWERED') return !!r.staffResponse;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-semibold text-2xl text-[var(--text-heading)] flex items-center gap-2.5">
            <Star className="w-6 h-6 text-[var(--burnt-orange)] fill-[var(--burnt-orange)]" strokeWidth={1.75} />
            <span>Đánh giá dịch vụ khách hàng</span>
          </h1>
          <p className="text-xs text-[var(--text-sub)] mt-1">
            Theo dõi mức độ hài lòng theo 4 tiêu chí, cảnh báo đánh giá thấp và phản hồi chăm sóc khách hàng
          </p>
        </div>

        <button
          type="button"
          onClick={fetchData}
          className="phanta-btn-secondary px-3.5 py-2 text-xs flex items-center gap-2 w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[var(--pitch-green)]' : ''}`} strokeWidth={1.75} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Alert Notices */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)} className="text-[var(--text-sub)] hover:text-[var(--text-heading)]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[var(--pitch-green)] flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg(null)} className="text-[var(--text-sub)] hover:text-[var(--text-heading)]">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Metrics & 4 Criteria Scorecards */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="phanta-card p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-[var(--text-sub)]">Điểm đánh giá chung</span>
              <Star className="w-4 h-4 text-[var(--burnt-orange)]" strokeWidth={1.75} />
            </div>

            <div className="my-3 flex items-baseline gap-2 tabular-nums">
              <span className="text-4xl font-heading font-semibold text-[var(--text-heading)]">{summary.avgOverall}</span>
              <span className="text-base text-[var(--text-sub)] font-medium">/ 5.0</span>
            </div>

            <div className="flex items-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i <= Math.round(summary.avgOverall)
                      ? 'fill-[var(--burnt-orange)] text-[var(--burnt-orange)]'
                      : 'text-[var(--text-muted)]'
                  }`}
                  strokeWidth={1.75}
                />
              ))}
              <span className="text-xs text-[var(--text-sub)] ml-2 tabular-nums">({summary.totalReviews} lượt)</span>
            </div>

            {summary.needsAttentionCount > 0 && (
              <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-rose-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" strokeWidth={1.75} />
                  <span>Cần xử lý gấp</span>
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-rose-500/15 border border-rose-500/30 tabular-nums">
                  {summary.needsAttentionCount} phản ánh
                </span>
              </div>
            )}
          </div>

          <div className="lg:col-span-3 phanta-card p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                label: 'Cơ sở vật chất',
                icon: Building,
                score: summary.avgFacility ?? 5.0,
                desc: 'Mặt sân, hệ thống chiếu sáng, lưới, khung thành',
                color: 'bg-[var(--pitch-green)]',
              },
              {
                label: 'Chất lượng dịch vụ',
                icon: ThumbsUp,
                score: summary.avgService ?? 5.0,
                desc: 'Thời gian check-in, đặt chỗ, nước uống, thiết bị thuê',
                color: 'bg-[var(--pitch-green)]',
              },
              {
                label: 'Thái độ nhân viên',
                icon: User,
                score: summary.avgStaff ?? 5.0,
                desc: 'Thân thiện, hỗ trợ nhanh chóng, giải đáp thắc mắc',
                color: 'bg-[var(--pitch-green)]',
              },
              {
                label: 'Vệ sinh sân bãi',
                icon: Sparkles,
                score: summary.avgCleanliness ?? 5.0,
                desc: 'Khu vệ sinh, phòng thay đồ, khán đài, thùng rác',
                color: 'bg-[var(--burnt-orange)]',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="phanta-subcard p-4 flex flex-col justify-between">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-[var(--text-heading)] flex items-center gap-1.5">
                      <Icon className="w-4 h-4 text-[var(--text-sub)]" strokeWidth={1.75} />
                      <span>{item.label}</span>
                    </span>
                    <span className="font-heading font-semibold text-[var(--text-heading)] text-sm tabular-nums">
                      {item.score} / 5.0
                    </span>
                  </div>
                  <div className="w-full bg-[var(--bg-card)] h-2 rounded-full overflow-hidden mt-3 border border-[var(--border-subtle)]">
                    <div
                      className={`${item.color} h-full rounded-full transition-[width] duration-300`}
                      style={{ width: `${(item.score / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)] mt-2">{item.desc}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="phanta-card p-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: `Tất cả (${reviews.length})` },
            {
              id: 'ATTENTION',
              label: 'Cần xử lý gấp',
              badge: summary && summary.needsAttentionCount > 0 ? summary.needsAttentionCount : null,
            },
            { id: 'UNANSWERED', label: 'Chưa phản hồi' },
            { id: 'ANSWERED', label: 'Đã phản hồi' },
          ].map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                filterTab === tab.id
                  ? tab.id === 'ATTENTION'
                    ? 'bg-rose-500 text-white border-transparent'
                    : 'bg-[var(--pitch-green)] text-[#0C0F0C] border-transparent font-semibold'
                  : 'bg-[var(--bg-card-inner)] border-[var(--border-subtle)] text-[var(--text-sub)] hover:text-[var(--text-heading)]'
              }`}
            >
              {tab.id === 'ATTENTION' && <ShieldAlert className="w-3.5 h-3.5" strokeWidth={1.75} />}
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="px-1.5 py-0.5 rounded-md bg-black/20 text-[10px] tabular-nums">{tab.badge}</span>
              )}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-sub)]" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Tìm theo tên, SĐT, nhận xét"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--pitch-green)]"
          />
        </div>
      </div>

      {/* Review Cards List */}
      <div className="space-y-4">
        {filteredReviews.map((r) => (
          <div
            key={r._id}
            className={`phanta-card p-6 space-y-4 ${
              r.needsAttention ? 'border-rose-500/40' : ''
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--bg-card-inner)] border border-[var(--border-color)] flex items-center justify-center font-heading font-semibold text-[var(--pitch-green)] text-base">
                  {r.customerName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-semibold text-[var(--text-heading)] text-sm">{r.customerName}</span>
                    {r.needsAttention && (
                      <span className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-rose-500/15 text-rose-500 border border-rose-500/30 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" strokeWidth={1.75} />
                        <span>Cảnh báo sao thấp</span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--text-sub)] flex items-center gap-3 mt-0.5 tabular-nums">
                    {r.customerPhone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" strokeWidth={1.75} />
                        {r.customerPhone}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" strokeWidth={1.75} />
                      {new Date(r.createdAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Score Pills */}
              <div className="flex flex-wrap items-center gap-2 tabular-nums">
                <div className="px-3 py-1 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-color)] flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 fill-[var(--burnt-orange)] text-[var(--burnt-orange)]" strokeWidth={1.75} />
                  <span className="font-heading font-semibold text-[var(--text-heading)] text-xs">{r.overallRating}</span>
                </div>

                {[
                  { label: 'CSVC', val: r.facilityRating },
                  { label: 'Dịch vụ', val: r.serviceRating },
                  { label: 'Nhân viên', val: r.staffRating },
                  { label: 'Vệ sinh', val: r.cleanlinessRating },
                ].map((sc) => (
                  <div
                    key={sc.label}
                    className="text-[11px] text-[var(--text-sub)] bg-[var(--bg-card-inner)] border border-[var(--border-subtle)] px-2.5 py-1 rounded-lg"
                  >
                    {sc.label}: <span className="font-semibold text-[var(--text-heading)]">{sc.val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="phanta-subcard p-4 text-xs text-[var(--text-main)] leading-relaxed">
              &ldquo;{r.comment}&rdquo;
            </div>

            {r.staffResponse ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl space-y-1.5">
                <div className="flex justify-between items-center text-xs text-[var(--pitch-green)] font-medium">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" strokeWidth={1.75} />
                    <span>Phản hồi từ {r.staffResponse.responderName}</span>
                  </span>
                  <span className="text-[11px] text-[var(--text-sub)] tabular-nums">
                    {new Date(r.staffResponse.respondedAt).toLocaleString('vi-VN')}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-main)]">&ldquo;{r.staffResponse.content}&rdquo;</p>
              </div>
            ) : (
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-[var(--burnt-orange)] font-medium">Chưa có phản hồi từ tổ hợp</span>
                <div className="flex items-center gap-2">
                  {r.needsAttention && (
                    <button
                      type="button"
                      onClick={() => handleDismissAttention(r._id)}
                      className="phanta-btn-secondary px-3 py-1.5 text-xs"
                    >
                      Đã xử lý xong
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedReviewForResponse(r);
                      setResponseContent('');
                    }}
                    className="phanta-btn-primary px-4 py-1.5 text-xs flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>Phản hồi ngay</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {filteredReviews.length === 0 && (
          <div className="phanta-card p-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-[var(--pitch-green)] mx-auto mb-3" strokeWidth={1.5} />
            <h3 className="font-heading font-semibold text-sm text-[var(--text-heading)]">Không tìm thấy đánh giá nào</h3>
            <p className="text-xs text-[var(--text-sub)] mt-1">
              {searchQuery ? 'Thử thay đổi từ khóa tìm kiếm' : 'Chưa có đánh giá nào phù hợp với bộ lọc hiện tại'}
            </p>
          </div>
        )}
      </div>

      {/* RESPONSE MODAL */}
      {selectedReviewForResponse && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSendResponse} className="phanta-card w-full max-w-lg p-6 space-y-4">
            <div className="flex justify-between items-start border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h3 className="font-heading font-semibold text-lg text-[var(--text-heading)] flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[var(--pitch-green)]" strokeWidth={1.75} />
                  <span>Phản hồi đánh giá khách hàng</span>
                </h3>
                <p className="text-xs text-[var(--text-sub)] mt-1">
                  Gửi lời giải trình hoặc cảm ơn đến khách hàng {selectedReviewForResponse.customerName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReviewForResponse(null)}
                className="text-[var(--text-sub)] hover:text-[var(--text-heading)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="phanta-subcard p-3 text-xs text-[var(--text-main)]">
              <span className="font-semibold text-[var(--burnt-orange)] block mb-1 tabular-nums">
                Nhận xét ({selectedReviewForResponse.overallRating} / 5 sao):
              </span>
              &ldquo;{selectedReviewForResponse.comment}&rdquo;
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-sub)]">Nội dung phản hồi</label>
              <textarea
                required
                rows={4}
                placeholder="Cảm ơn quý khách đã đóng góp ý kiến..."
                value={responseContent}
                onChange={(e) => setResponseContent(e.target.value)}
                className="w-full mt-1.5 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl p-3 text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--pitch-green)] leading-relaxed"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setSelectedReviewForResponse(null)}
                className="phanta-btn-secondary px-4 py-2 text-xs"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="phanta-btn-primary px-4 py-2 text-xs flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>Gửi phản hồi</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
