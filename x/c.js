const { Connection, PublicKey } = require('@solana/web3.js');
const axios = require('axios');

// 1. 연결 설정 - devnet 사용
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// 2. API 엔드포인트 설정
const API_BASE_URL = "http://localhost:8080/api/community";

/**
 * API에서 DAO PDA 목록을 가져오는 함수
 */
async function getDAOPdaList() {
  try {
    console.log(`API에서 DAO PDA 목록 가져오기 시작...`);
    
    const response = await axios.get(API_BASE_URL);
    
    if (response.status === 200) {
      console.log(`DAO PDA 목록 가져오기 성공!`);
      return response.data;
    } else {
      throw new Error(`API 응답 오류: ${response.status}`);
    }
  } catch (error) {
    console.error(`DAO PDA 목록 가져오기 실패:`, error);
    throw error;
  }
}

/**
 * 바이너리 데이터에서 문자열 추출
 */
function extractString(buffer, offset) {
  try {
    // 문자열 길이 읽기 (4바이트, 리틀 엔디안)
    const length = buffer.readUInt32LE(offset);
    
    // 길이가 너무 크면 잘못된 값일 수 있음
    if (length > 1000 || length <= 0) {
      return { string: '', nextOffset: offset + 4 };
    }
    
    // 문자열 데이터 추출
    const stringData = buffer.slice(offset + 4, offset + 4 + length);
    
    return {
      string: stringData.toString('utf8'),
      nextOffset: offset + 4 + length
    };
  } catch (error) {
    console.error('문자열 추출 오류:', error);
    return { string: '', nextOffset: offset };
  }
}

/**
 * 바이너리 데이터 파싱 함수
 */
function parseAccountData(dataBuffer) {
  try {
    // 결과 객체 초기화
    const result = {
      discriminator: '',
      dao_name: '',
      initializer: '',
      segments: {}
    };
    
    // 1. 처음 1바이트는 버전 또는 초기화 플래그일 수 있음
    result.version = dataBuffer.readUInt8(0);
    
    // 2. 다음 4바이트는 문자열 길이일 수 있음
    const stringLengthOffset = 1;
    const stringLength = dataBuffer.readUInt32LE(stringLengthOffset);
    
    // 3. 문자열 추출 시도
    if (stringLength > 0 && stringLength < 100) { // 합리적인 문자열 길이 확인
      const stringData = dataBuffer.slice(stringLengthOffset + 4, stringLengthOffset + 4 + stringLength);
      result.dao_name = stringData.toString('utf8');
      
      // 4. 문자열 이후의 데이터를 세그먼트로 분리
      let offset = stringLengthOffset + 4 + stringLength;
      
      // 데이터 샘플에서 보이는 패턴 분석
      if (result.dao_name.includes('EQW')) {
        console.log(`DAO 이름 발견: ${result.dao_name}`);
        
        // 이름 이후 32바이트는 공개키일 가능성이 높음
        try {
          const pubkeyData = dataBuffer.slice(offset, offset + 32);
          const pubkey = new PublicKey(pubkeyData);
          result.initializer = pubkey.toString();
          offset += 32;
        } catch (e) {
          console.log('공개키 변환 실패:', e.message);
        }
        
        // 숫자 값 추출 시도
        try {
          if (offset + 8 <= dataBuffer.length) {
            // BigInt를 문자열로 변환
            result.timestamp = dataBuffer.readBigUInt64LE(offset).toString();
            offset += 8;
          }
          
          if (offset + 8 <= dataBuffer.length) {
            result.value = dataBuffer.readBigUInt64LE(offset).toString();
            offset += 8;
          }
        } catch (e) {
          console.log('숫자 값 추출 실패:', e.message);
        }
      }
      
      // 5. 추가 세그먼트 추출
      for (let i = 0; i < 5 && offset + 32 <= dataBuffer.length; i++) {
        const segment = dataBuffer.slice(offset, offset + 32);
        result.segments[`segment_${i}`] = segment.toString('hex');
        offset += 32;
      }
    } else {
      // 문자열 길이가 이상한 경우, 다른 방식으로 파싱 시도
      console.log('문자열 길이가 이상함, 다른 방식으로 파싱 시도');
      
      // 처음 8바이트를 discriminator로 간주
      result.discriminator = dataBuffer.slice(0, 8).toString('hex');
      
      // 나머지 데이터를 세그먼트로 분할
      let offset = 8;
      for (let i = 0; i < 5 && offset + 32 <= dataBuffer.length; i++) {
        const segment = dataBuffer.slice(offset, offset + 32);
        result.segments[`segment_${i}`] = segment.toString('hex');
        offset += 32;
      }
    }
    
    // 6. 추출된 데이터 반환
    return result;
  } catch (error) {
    console.error('데이터 파싱 오류:', error);
    return { error: '데이터 파싱 실패', raw_hex: dataBuffer.toString('hex').substring(0, 100) + '...' };
  }
}

/**
 * Solana 블록체인에서 DAO 메타데이터를 가져오는 함수
 */
async function getDAOMetadata(daoPda) {
  try {
    // PDA 문자열을 PublicKey 객체로 변환
    const daoPubkey = new PublicKey(daoPda);
    console.log(`DAO PDA: ${daoPubkey.toString()}`);
    
    // Solana 블록체인에서 계정 데이터 가져오기
    const accountInfo = await connection.getAccountInfo(daoPubkey);
    
    if (!accountInfo) {
      throw new Error(`계정 데이터를 찾을 수 없음: ${daoPda}`);
    }
    
    console.log(`계정 데이터 크기: ${accountInfo.data.length} 바이트`);
    
    // 데이터 버퍼 생성
    const dataBuffer = Buffer.from(accountInfo.data);
    
    // 데이터의 일부를 16진수로 표시 (디버깅용)
    console.log("데이터 샘플(처음 32바이트):", dataBuffer.slice(0, 32).toString('hex'));
    
    // 데이터 파싱 시도
    const parsedData = parseAccountData(dataBuffer);
    
    return {
      pda: daoPda,
      owner: accountInfo.owner.toString(),
      lamports: accountInfo.lamports,
      dataSize: accountInfo.data.length,
      state: parsedData,
      // 처음 100바이트만 16진수로 표시
      data_hex_preview: dataBuffer.toString('hex').substring(0, 100) + '...'
    };
  } catch (error) {
    console.error(`DAO 메타데이터 가져오기 실패:`, error);
    throw error;
  }
}

/**
 * 여러 DAO의 메타데이터를 가져오는 함수
 */
async function getAllDAOMetadata(daoPdaList) {
  try {
    console.log(`${daoPdaList.length}개의 DAO 메타데이터 가져오기 시작...`);
    
    // 병렬로 모든 요청 실행
    const results = await Promise.all(
      daoPdaList.map(pda => getDAOMetadata(pda))
    );
    
    console.log(`모든 DAO 메타데이터 가져오기 완료!`);
    return results;
  } catch (error) {
    console.error(`DAO 메타데이터 일괄 가져오기 실패:`, error);
    throw error;
  }
}

/**
 * 메인 실행 함수
 */
async function main() {
  try {
    // API에서 DAO PDA 목록 가져오기
    console.log("===== API에서 DAO PDA 목록 가져오기 =====");
    const daoPdaList = await getDAOPdaList();
    console.log("PDA 목록:", daoPdaList);
    
    if (!daoPdaList || daoPdaList.length === 0) {
      console.log("PDA 목록이 비어 있습니다.");
      return;
    }
    
    // 단일 DAO 메타데이터 가져오기
    console.log("\n===== 단일 DAO 메타데이터 가져오기 =====");
    const singleDAOMetadata = await getDAOMetadata(daoPdaList[0]);
    
    // BigInt 값을 문자열로 변환하는 replacer 함수 사용
    console.log(JSON.stringify(singleDAOMetadata, (key, value) => 
      typeof value === 'bigint' ? value.toString() : value, 2));
    
    // 모든 DAO 메타데이터 가져오기
    console.log("\n===== 모든 DAO 메타데이터 가져오기 =====");
    const allDAOMetadata = await getAllDAOMetadata(daoPdaList);
    
    // BigInt 값을 문자열로 변환하는 replacer 함수 사용
    console.log(JSON.stringify(allDAOMetadata, (key, value) => 
      typeof value === 'bigint' ? value.toString() : value, 2));
    
  } catch (error) {
    console.error('실행 중 오류 발생:', error);
  }
}

// 실행
main();
