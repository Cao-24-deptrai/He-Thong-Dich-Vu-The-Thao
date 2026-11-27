'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, QrCode, Footprints, ShieldAlert, Clock } from 'lucide-react';

const RULES = [
  {
    icon: QrCode,
    title: 'Quy định Check-in & Ra vào sân',
    items: [
      'Người chơi có mặt trước giờ đặt 10–15 phút để quét mã QR tại cổng xoay hoặc quầy lễ tân.',
      'Mã QR động làm mới mỗi 60 giây; vui lòng không chụp ảnh màn hình gửi cho người khác để tránh lỗi xác thực.',
    ],
  },
  {
    icon: Footprints,
    title: 'Trang phục & Giày thi đấu',
    items: [
      'Sân cầu lông, pickleball, bóng rổ trong nhà yêu cầu sử dụng giày thể thao đế không để lại vết (non-marking).',
      'Sân bóng đá cỏ nhân tạo sử dụng giày đinh TF/AG phù hợp, không sử dụng đinh sắt.',
    ],
  },
  {
    icon: ShieldAlert,
    title: 'An toàn & Bảo quản cơ sở vật chất',
    items: [
      'Không mang đồ uống có cồn, chất dễ cháy nổ hoặc vật sắc nhọn vào khu vực sân tập.',
      'Người chơi tự bảo quản tư trang cá nhân; mọi hư hỏng thiết bị do cố ý sẽ được xử lý theo nội quy cơ sở.',
    ],
  },
  {
    icon: Clock,
    title: 'Thời gian sử dụng sân',
    items: [
      'Kết thúc trận đấu và rời sân đúng giờ đã đặt để nhường lượt cho khung giờ kế tiếp.',
      'Nếu có nhu cầu gia hạn thêm giờ, vui lòng kiểm tra lịch trống trên ứng dụng hoặc báo trước với nhân viên quầy.',
    ],
  },
];

export default function VenueRulesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
      <div className="space-y-2">
        <Link
          href="/home"
          className="inline-flex items-center space-x-2 text-xs font-medium text-[#758A80] dark:text-[#A1A79F] hover:text-[#00B562] dark:hover:text-[#9CFF93] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại trang chủ</span>
        </Link>
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#171C1A] dark:text-white">
          Quy định sân bãi
        </h1>
        <p className="text-sm text-[#758A80] dark:text-[#A1A79F]">
          Tổng hợp các quy định chung nhằm giữ an toàn, công bằng và chất lượng mặt sân cho mọi người chơi.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {RULES.map((section) => {
          const Icon = section.icon;
          return (
            <section
              key={section.title}
              className="rounded-2xl border border-[#E3E8E6] dark:border-white/10 bg-white dark:bg-[#191C14] p-6 space-y-3"
            >
              <div className="flex items-center space-x-2.5">
                <Icon className="w-4 h-4 text-[#00B562] dark:text-[#9CFF93] shrink-0" />
                <h2 className="font-heading font-semibold text-base text-[#171C1A] dark:text-white">
                  {section.title}
                </h2>
              </div>
              <ul className="space-y-2 text-xs sm:text-sm text-[#3B4540] dark:text-[#D1D5DB] leading-relaxed list-disc pl-4">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
