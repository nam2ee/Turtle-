const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');

// 제공된 비밀키 배열
const secretKeyArray = [14,105,243,243,233,23,159,9,252,136,234,31,255,31,9,89,181,244,173,155,66,116,163,24,239,210,34,19,58,62,78,34,128,169,228,151,31,135,18,134,54,186,44,4,9,152,169,154,9,224,153,93,195,173,93,184,58,136,214,75,224,226,83,95];

// Uint8Array로 변환
const secretKey = new Uint8Array(secretKeyArray);

// 키페어 생성
const keypair = Keypair.fromSecretKey(secretKey);

// 공개키 출력
console.log("공개키:", keypair.publicKey.toString());

// 비밀키를 Base58로 인코딩
const base58SecretKey = bs58.encode(secretKey);
console.log("Base58 비밀키:", base58SecretKey);
