// Thử tải đặt sân (T19). Chạy: k6 run -e BASE_URL=https://staging.example -e TOKENS_FILE=tokens.json k6-booking.example.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

export const options = {
  scenarios: {
    browse_and_book: {
      executor: 'ramping-vus',
      stages: [{ duration: '2m', target: 200 }, { duration: '5m', target: 500 }, { duration: '2m', target: 0 }],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{endpoint:availability}': ['p(95)<400'],
    'http_req_duration{endpoint:hold}': ['p(95)<800'],
  },
};

export default function () {
  const base = __ENV.BASE_URL;
  const headers = { Authorization: `Bearer ${__ENV.TOKEN}`, 'Content-Type': 'application/json' };

  const av = http.get(`${base}/api/v1/availability?date=2026-12-01&sport=football`, { headers, tags: { endpoint: 'availability' } });
  check(av, { 'availability 200': (r) => r.status === 200 });

  const hold = http.post(`${base}/api/v1/bookings/hold`, JSON.stringify({ resourceId: 'F1', startAt: '2026-12-01T12:00:00Z', endAt: '2026-12-01T13:00:00Z' }),
    { headers: { ...headers, 'Idempotency-Key': uuidv4() }, tags: { endpoint: 'hold' } });
  check(hold, { 'hold ok or taken': (r) => r.status === 201 || r.status === 409 }); // 409 SLOT_TAKEN là kết quả hợp lệ khi tranh chấp
  sleep(1);
}
