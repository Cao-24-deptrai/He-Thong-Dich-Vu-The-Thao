// k6/booking-stress-test.js
// Kịch bản kiểm thử tải k6 mô phỏng 100+ Virtual Users (VUs) đồng thời (Mục 7.1 của spec)

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom Metrics
const successfulBookings = new Counter('successful_bookings');
const conflictBookings = new Counter('conflict_bookings_409');
const errorBookings = new Counter('error_bookings_500');
const holdSlotLatency = new Trend('hold_slot_latency');

export const options = {
  scenarios: {
    // 100 concurrent users hitting the booking endpoint simultaneously
    concurrent_slot_race: {
      executor: 'per-vu-iterations',
      vus: 100,
      iterations: 1,
      maxDuration: '30s',
    },
  },
  thresholds: {
    // Ensure 95% of requests complete within 500ms
    http_req_duration: ['p(95)<500'],
    // We expect EXACTLY 1 booking to succeed and 99 to receive 409 Conflict
    successful_bookings: ['count==1'],
    conflict_bookings_409: ['count>=90'],
    error_bookings_500: ['count==0'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';
const VENUE_ID = __ENV.VENUE_ID || '66e2c9a1b2c3d4e5f6a7b8c9';
const BOOKING_DATE = __ENV.BOOKING_DATE || '2026-10-25';
const START_TIME = '19:00';
const END_TIME = '20:00';

export function setup() {
  console.log(`Bắt đầu k6 stress test kết nối tới: ${BASE_URL}`);
  console.log(`Mục tiêu: 100 VUs đồng thời tranh chấp slot ${START_TIME} - ${END_TIME}`);

  // Đăng ký 1 user mẫu để lấy JWT token
  const rand = Math.floor(Math.random() * 900000) + 100000;
  const loginRes = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({
      phone: `099${rand}`,
      password: 'Pass@123456',
      fullName: 'K6 Stress Tester',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  let token = '';
  try {
    const data = JSON.parse(loginRes.body);
    token = data.accessToken || data.access_token;
  } catch (e) {
    console.error('Không thể parse token từ register');
  }

  return { token };
}

export default function (data) {
  const payload = JSON.stringify({
    venueId: VENUE_ID,
    bookingDate: BOOKING_DATE,
    startTime: START_TIME,
    endTime: END_TIME,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.token}`,
    },
  };

  const start = Date.now();
  const res = http.post(`${BASE_URL}/bookings/hold`, payload, params);
  holdSlotLatency.add(Date.now() - start);

  if (res.status === 201) {
    successfulBookings.add(1);
    check(res, {
      'Thành công giữ chỗ duy nhất (201)': (r) => r.status === 201,
    });
  } else if (res.status === 409) {
    conflictBookings.add(1);
    check(res, {
      'Chặn đặt trùng đúng chuẩn (409 Conflict)': (r) => r.status === 409,
    });
  } else {
    errorBookings.add(1);
    console.error(`Lỗi bất thường HTTP ${res.status}: ${res.body}`);
  }
}

export function teardown(data) {
  console.log('🏁 Hoàn thành k6 stress test.');
}
