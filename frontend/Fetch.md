const { Connection, PublicKey } = require('@solana/web3.js');
const axios = require('axios');
const borsh = require('borsh');

// 1. 연결 설정 - devnet 사용
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// 2. API 엔드포인트 설정
const API_BASE_URL = "http://localhost:8080/api/community";

// 3. DAO 상태를 위한 Borsh 스키마 정의 (Rust 코드에서 가져옴)
// 참고: 이것은 간소화된 버전입니다. 실제 스키마는 더 복잡할 수 있습니다.
class VoteType {}
class VoteStatus {}
class DepositorInfo {}
class Content {}
class VoteInfo {}
class VoteProposal {}

class DaoState {
  constructor(properties) {
    Object.assign(this, properties);
  }
}

// Borsh 스키마 정의
const schema = new Map([
  [
    DaoState,
    {
      kind: 'struct',
      fields: [
        ['is_initialized', 'bool'],
        ['dao_name', 'string'],
        ['initializer', [32]], // Pubkey는 32바이트
        ['time_limit', 'u64'],
        ['base_fee', 'u64'],
        ['ai_moderation', 'bool'],
        ['deposit_share', 'u8'],
        ['timeout_timestamp', 'u64'],
        ['total_deposit', 'u64'],
        ['depositors', [DepositorInfo]],
        ['contents', [Content]],
        ['vote_proposals', [VoteProposal]],
        ['next_proposal_id', 'u64'],
      ]
    }
  ],
  // 다른 클래스에 대한 스키마도 여기에 정의
]);

/**
 * API에서 DAO PDA 목록을 가져오는 함수
 * @returns {Promise<string[]>} - DAO PDA 주소 문자열 배열
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
 * Solana 블록체인에서 DAO 메타데이터를 가져오는 함수
 * @param {string} daoPda - DAO의 PDA 주소 문자열
 * @returns {Promise<Object>} - DAO 메타데이터 객체
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
    
    // Borsh를 사용하여 계정 데이터 역직렬화 시도
    try {
      // 참고: 실제 데이터 구조에 맞게 수정 필요
      // const daoState = borsh.deserialize(schema, DaoState, accountInfo.data);
      
      // 간단한 메타데이터 객체 생성 (실제 역직렬화가 어려울 수 있으므로)
      const metadata = {
        pda: daoPda,
        owner: accountInfo.owner.toString(),
        lamports: accountInfo.lamports,
        dataSize: accountInfo.data.length,
        executable: accountInfo.executable,
        rentEpoch: accountInfo.rentEpoch,
        // 실제 데이터 구조가 복잡하므로 일단 기본 정보만 반환
      };
      
      console.log(`DAO 메타데이터 가져오기 성공!`);
      return metadata;
    } catch (deserializeError) {
      console.error(`데이터 역직렬화 오류:`, deserializeError);
      
      // 역직렬화에 실패하더라도 기본 계정 정보는 반환
      return {
        pda: daoPda,
        owner: accountInfo.owner.toString(),
        lamports: accountInfo.lamports,
        dataSize: accountInfo.data.length,
        error: "데이터 역직렬화 실패"
      };
    }
  } catch (error) {
    console.error(`DAO 메타데이터 가져오기 실패:`, error);
    throw error;
  }
}

/**
 * 여러 DAO의 메타데이터를 가져오는 함수
 * @param {string[]} daoPdaList - DAO PDA 주소 문자열 배열
 * @returns {Promise<Object[]>} - DAO 메타데이터 객체 배열
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
    console.log(JSON.stringify(singleDAOMetadata, null, 2));
    
    // 모든 DAO 메타데이터 가져오기
    console.log("\n===== 모든 DAO 메타데이터 가져오기 =====");
    const allDAOMetadata = await getAllDAOMetadata(daoPdaList);
    console.log(JSON.stringify(allDAOMetadata, null, 2));
    
  } catch (error) {
    console.error('실행 중 오류 발생:', error);
  }
}

// 실행
main();
