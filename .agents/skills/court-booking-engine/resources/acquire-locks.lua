-- Khóa nguyên tử TẤT CẢ ô giờ hoặc không khóa gì (lớp 1 chống trùng).
-- KEYS: danh sách khóa dạng lock:slot:{unitId}:{YYYY-MM-DD}:{slotIndex}
-- ARGV[1] = token (bookingId), ARGV[2] = TTL giây (= thời gian giữ chỗ)
-- Trả 1 nếu khóa được tất cả, 0 nếu có ô đang bị khóa.
-- Lưu ý Redis Cluster: mọi khóa phải cùng hash slot (dùng hash tag, ví dụ lock:{slot}:...) hoặc chạy Redis đơn nút.
for i = 1, #KEYS do
  if redis.call('EXISTS', KEYS[i]) == 1 then
    return 0
  end
end
for i = 1, #KEYS do
  redis.call('SET', KEYS[i], ARGV[1], 'EX', tonumber(ARGV[2]))
end
return 1
