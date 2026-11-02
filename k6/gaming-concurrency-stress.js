// k6/gaming-concurrency-stress.js
// Kiểm thử tải k6 mô phỏng 100 máy gaming & 100 Virtual Users (VUs) tranh chấp phiên chơi (M14)

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom Metrics
const successfulSessions = new Counter('successful_gaming_sessions');
const rejectedSessions = new Counter('rejected_gaming_sessions');
const conflictSessions409 = new Counter('conflict_sessions_409');
const errorSessions500 = new Counter('error_sessions_500');
const sessionStartLatency = new Trend('gaming_session_start_latency');

export const options = {
  scenarios: {
    // 100 concurrent VUs hitting gaming machines simultaneously
    concurrent_gaming_race: {
      executor: 'per-vu-iterations',
      vus: 100,
      iterations: 1,
      maxDuration: '30s',
    },
  },
  thresholds: {
    // Ensure 95% of machine session activations complete within 500ms
    http_req_duration: ['p(95)<500'],
    gaming_session_start_latency: ['p(95)<500'],
    // 0 server crashes (500)
    error_sessions_500: ['count==0'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

export function setup() {
  console.log(`[k6 Gaming Stress] Bắt đầu kiểm thử tải kết nối tới: ${BASE_URL}`);

  // Fetch available machines list
  const res = http.get(`${BASE_URL}/gaming/machines`);
  let machines = [];
  try {
    machines = JSON.parse(res.body);
    console.log(`[k6 Gaming Stress] Tải thành công ${machines.length} máy gaming từ hệ thống.`);
  } catch (e) {
    console.error('Không thể parse danh sách gaming machines:', e);
  }

  // Pre-register test user
  const rand = Math.floor(Math.random() * 900000) + 100000;
  const regRes = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({
      phone: `097${rand}`,
      password: 'Pass@123456',
      fullName: 'Gamer Stress Tester',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  let token = '';
  try {
    const data = JSON.parse(regRes.body);
    token = data.accessToken || data.access_token;
  } catch (e) {
    console.error('Không thể đăng ký tài khoản test:', e);
  }

  return { token, machines };
}

export default function (data) {
  // If no machines returned from API, fallback to mock machineId
  const machineList = data.machines || [];
  const targetMachine = machineList[__VU % (machineList.length || 1)] || { _id: '66e2c9a1b2c3d4e5f6a7b8c9' };

  const payload = JSON.stringify({
    machineId: targetMachine._id,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.token}`,
    },
  };

  const start = Date.now();
  const res = http.post(`${BASE_URL}/gaming/sessions/start`, payload, params);
  sessionStartLatency.add(Date.now() - start);

  if (res.status === 201) {
    successfulSessions.add(1);
    check(res, {
      'Khởi động phiên chơi thành công (201)': (r) => r.status === 201,
    });
  } else if (res.status === 409) {
    // 409 Conflict: Machine occupied or User already has active session (Rule 1)
    conflictSessions409.add(1);
    check(res, {
      'Chặn xung đột phiên chơi đồng thời đúng chuẩn (409 Conflict)': (r) => r.status === 409,
    });
  } else if (res.status === 400) {
    // Insufficient wallet balance
    rejectedSessions.add(1);
    check(res, {
      'Chặn số dư ví không đủ (400 Bad Request)': (r) => r.status === 400,
    });
  } else {
    errorSessions500.add(1);
    console.error(`Lỗi bất thường HTTP ${res.status}: ${res.body}`);
  }
}
