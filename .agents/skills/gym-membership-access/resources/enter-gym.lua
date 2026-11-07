-- Vào phòng gym: kiểm tra anti-passback và sức chứa NGUYÊN TỬ.
-- KEYS[1] = gym:inside (ZSET, score = thời điểm vào, ms)
-- ARGV[1]=userId  ARGV[2]=capacity  ARGV[3]=nowMs  ARGV[4]=antiPassback ('1'|'0')
-- Trả: số người sau khi vào (>0) | -1 đã ở trong phòng (anti-passback) | -2 phòng đầy
if redis.call('ZSCORE', KEYS[1], ARGV[1]) then
  if ARGV[4] == '1' then return -1 end
  return redis.call('ZCARD', KEYS[1])
end
if redis.call('ZCARD', KEYS[1]) >= tonumber(ARGV[2]) then
  return -2
end
redis.call('ZADD', KEYS[1], ARGV[3], ARGV[1])
return redis.call('ZCARD', KEYS[1])
