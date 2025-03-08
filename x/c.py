import base58

# 제공된 비밀키 배열
secret_key_array = [156,167,232,111,184,181,16,153,149,192,92,106,41,115,131,27,174,125,236,255,54,38,110,0,129,106,68,13,246,77,39,83,41,70,223,79,157,166,111,30,213,25,144,78,13,230,15,198,62,36,193,111,209,204,248,92,36,80,104,185,181,129,31,96]

# 바이트로 변환
secret_key_bytes = bytes(secret_key_array)

# Base58로 인코딩
base58_secret_key = base58.b58encode(secret_key_bytes).decode('utf-8')

print("Base58 비밀키:", base58_secret_key)
