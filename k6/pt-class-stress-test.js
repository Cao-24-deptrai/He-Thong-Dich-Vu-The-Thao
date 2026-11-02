// k6/pt-class-stress-test.js
// Kiểm thử tải k6 mô phỏng 50 Virtual Users (VUs) đồng thời đăng ký lớp học giới hạn chỗ (M11)

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom Metrics
const successfulClassBookings = new Counter('successful_class_bookings');
const fullClassRejections = new Counter('full_class_rejections_400');
const conflictRegistrations409 = new Counter('conflict_registrations_409');
const errorClassBookings500 = new Counter('error_class_bookings_500');
const classBookingLatency = new Trend('class_booking_latency');

export const options = {
  scenarios: {
    // 50 VUs race for a class with capacity = 10
    class_capacity_race: {
      executor: 'per-vu-iterations',
      vus: 50,
      iterations: 1,
      maxDuration: '30s',
    },
  },
  thresholds: {
    // Ensure 95% of registrations respond within 500ms
    http_req_duration: ['p(95)<500'],
    class_booking_latency: ['p(95)<500'],
    // Zero 500 crashes
    error_class_bookings_500: ['count==0'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';
const CLASS_SESSION_ID = __ENV.CLASS_SESSION_ID || 'session-hiit-01';

export function setup() {
  console.log(`[k6 Class Stress] Bắt đầu kiểm thử tải đăng ký lớp học tại: ${BASE_URL}`);

  // Fetch active sessions
  const res = http.get(`${BASE_URL}/pt-classes/sessions`);
  let sessions = [];
  try {
    sessions = JSON.parse(res.body);
    console.log(`[k6 Class Stress] Tải ${sessions.length} buổi học.`);
  } catch (e) {
    console.error('Không thể parse danh sách sessions:', e);
  }

  const targetSessionId = (sessions.length > 0 && sessions[0]._id) ? sessions[0]._id : CLASS_SESSION_ID;

  return { targetSessionId };
}

export default function (data) {
  // Mỗi VU tạo một tài khoản riêng biệt để giả lập 50 học viên khác nhau
  const rand = Math.floor(Math.random() * 9000000) + 1000000;
  const userPhone = `091${rand}`;

  const regRes = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({
      phone: userPhone,
      password: 'UserPass@123',
      fullName: `Học Viên Vu ${__VU}`,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  let token = '';
  try {
    const authData = JSON.parse(regRes.body);
    token = authData.accessToken || authData.access_token;
  } catch (e) {
    console.error(`VU ${__VU} không lấy được token:`, e);
    return;
  }

  const payload = JSON.stringify({
    notes: 'K6 Stress Testing Registration',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };

  const start = Date.now();
  const res = http.post(`${BASE_URL}/pt-classes/sessions/${data.targetSessionId}/register`, payload, params);
  classBookingLatency.add(Date.now() - start);

  if (res.status === 201) {
    successfulClassBookings.add(1);
    check(res, {
      'Đăng ký lớp học thành công (201)': (r) => r.status === 201,
    });
  } else if (res.status === 400) {
    // 400: Lớp đã đủ sĩ số (Class full)
    fullClassRejections.add(1);
    check(res, {
      'Chặn vượt quá sĩ số lớp học (400 Bad Request)': (r) => r.status === 400,
    });
  } else if (res.status === 409) {
    // 409: Trùng lịch hoặc đã đăng ký trước đó
    conflictRegistrations409.add(1);
    check(res, {
      'Chặn đăng ký trùng buổi học (409 Conflict)': (r) => r.status === 409,
    });
  } else {
    errorClassBookings500.add(1);
    console.error(`VU ${__VU} gặp lỗi HTTP ${res.status}: ${res.body}`);
  }
}
