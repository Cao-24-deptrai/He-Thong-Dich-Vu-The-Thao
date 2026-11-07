-- Ra khỏi phòng gym. KEYS[1]=gym:inside, ARGV[1]=userId. Trả số người còn lại.
redis.call('ZREM', KEYS[1], ARGV[1])
return redis.call('ZCARD', KEYS[1])
