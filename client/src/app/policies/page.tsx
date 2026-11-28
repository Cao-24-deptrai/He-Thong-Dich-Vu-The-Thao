'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, CreditCard, RotateCcw, Shield, Cookie } from 'lucide-react';

const POLICIES = [
  {
    icon: CreditCard,
    title: 'Chính sách giữ chỗ & Thanh toán VietQR',
    items: [
      'Mỗi lượt chọn khung giờ được giữ chỗ tối đa 10 phút để hoàn tất chuyển khoản VietQR.',
      'Sau khi hệ thống ghi nhận thanh toán thành công, vé điện tử và mã QR check-in được cấp ngay lập tức.',
      'Nếu quá 10 phút chưa thanh toán, khung giờ tự động mở lại cho người chơi khác.',
    ],
  },
  {
    icon: RotateCcw,
    title: 'Chính sách hủy vé & Hoàn tiền',
    items: [
      'Hoàn 100% giá trị vé khi hủy trước giờ chơi từ 24 tiếng trở lên.',
      'Hoàn 50% giá trị vé khi hủy trong khoảng từ 2 tiếng đến dưới 24 tiếng trước giờ chơi.',
      'Không hỗ trợ hoàn tiền khi hủy sát giờ (dưới 2 tiếng), trừ trường hợp thời tiết bất khả kháng hoặc sự cố từ cơ sở.',
    ],
  },
  {
    icon: Shield,
    title: 'Chính sách bảo mật thông tin',
    items: [
      'Phanta chỉ thu thập họ tên, số điện thoại và email nhằm xác thực đặt sân, xuất vé QR và hỗ trợ hoàn tiền.',
      'Dữ liệu cá nhân được bảo vệ và không chia sẻ cho bên thứ ba ngoài phạm vi vận hành đặt sân.',
    ],
  },
  {
    icon: Cookie,
    title: 'Chính sách Cookie & Lưu trữ cục bộ',
    items: [
      'Hệ thống sử dụng cookie và bộ nhớ cục bộ (localStorage) để duy trì phiên đăng nhập an toàn và ghi nhớ chế độ Sáng/Tối.',
    ],
  },
];

export default function PhantaPoliciesPage() {
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
          Chính sách của Phanta
        </h1>
        <p className="text-sm text-[#758A80] dark:text-[#A1A79F]">
          Tổng hợp các chính sách về giữ chỗ, thanh toán, hoàn tiền và bảo vệ quyền riêng tư của người chơi.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {POLICIES.map((section) => {
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
