-- Nhả khóa chỉ khi đúng token (tránh nhả nhầm khóa của lượt đặt khác).
-- KEYS: các khóa; ARGV[1] = token. Trả số khóa đã nhả.
local n = 0
for i = 1, #KEYS do
  if redis.call('GET', KEYS[i]) == ARGV[1] then
    redis.call('DEL', KEYS[i])
    n = n + 1
  end
end
return n
