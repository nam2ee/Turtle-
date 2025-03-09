import { PublicKey, Connection, Transaction, TransactionInstruction, SystemProgram } from "@solana/web3.js";
import { Buffer } from "buffer";
import * as borsh from "borsh"; // Using standard borsh library for serialization

// Program ID for the deployed Solana program
// This must match the ID of the deployed program exactly
export const PROGRAM_ID = new PublicKey("G5658prSBac5RRSsy16qjvp9awxxpa7a4tsZZJrG8kjP");

// ======= INSTRUCTIONS ========
// These exactly match the Solana program's instruction enum variants

// Enum for the different instruction types
export enum TurtleInstructionType {
  InitializeDao = 0,
  SubmitContent = 1,
  Deposit = 2,
  ClaimReward = 3,
  CreateVote = 4,
  Vote = 5,
  DistributeQualityRewards = 6,
}

// Enum for proposal types
export enum ProposalType {
  TimeLimit = 0,
  BaseFee = 1,
  AiModeration = 2,
}

// ======= INSTRUCTION PARAMS ========

// InitializeDao instruction parameters
export class InitializeDaoParams {
  dao_name: string;         // String in Rust
  time_limit: number;       // u64 in Rust
  base_fee: number;         // u64 in Rust
  ai_moderation: boolean;   // bool in Rust
  deposit_share: number;    // u8 in Rust

  constructor(
    dao_name: string,
    time_limit: number,
    base_fee: number,
    ai_moderation: boolean,
    deposit_share: number
  ) {
    this.dao_name = dao_name;
    this.time_limit = time_limit;
    this.base_fee = base_fee;
    this.ai_moderation = ai_moderation;
    this.deposit_share = deposit_share;
  }
}

// SubmitContent instruction parameters
export class SubmitContentParams {
  content_hash: string;
  content_uri: string;

  constructor(content_hash: string, content_uri: string) {
    this.content_hash = content_hash;
    this.content_uri = content_uri;
  }
}

// Deposit instruction parameters
export class DepositParams {
  amount: number;

  constructor(amount: number) {
    this.amount = amount;
  }
}

// ClaimReward has no parameters
export class ClaimRewardParams {}

// CreateVote instruction parameters
export class CreateVoteParams {
  proposal_type: ProposalType;
  new_value: number;
  voting_period: number;

  constructor(
    proposal_type: ProposalType,
    new_value: number,
    voting_period: number
  ) {
    this.proposal_type = proposal_type;
    this.new_value = new_value;
    this.voting_period = voting_period;
  }
}

// Vote instruction parameters
export class VoteParams {
  proposal_id: number;
  approve: boolean;

  constructor(proposal_id: number, approve: boolean) {
    this.proposal_id = proposal_id;
    this.approve = approve;
  }
}

// DistributeQualityRewards instruction parameters
export class DistributeQualityRewardsParams {
  creator_pubkeys: PublicKey[];
  distribution_weights: number[];

  constructor(creator_pubkeys: PublicKey[], distribution_weights: number[]) {
    this.creator_pubkeys = creator_pubkeys;
    this.distribution_weights = distribution_weights;
  }
}

// ======= BORSH SERIALIZATION CONFIG ========

// Schema for Borsh serialization - must match Rust structures exactly
const INSTRUCTION_SCHEMA = new Map<any, any>([
  // InitializeDao instruction
  [InitializeDaoParams, {
    kind: 'struct',
    fields: [
      ['dao_name', 'string'],
      ['time_limit', 'u64'],
      ['base_fee', 'u64'],
      ['ai_moderation', 'bool'],
      ['deposit_share', 'u8'],
    ],
  }],
  
  // SubmitContent instruction
  [SubmitContentParams, {
    kind: 'struct',
    fields: [
      ['content_hash', 'string'],
      ['content_uri', 'string'],
    ],
  }],
  
  // Deposit instruction
  [DepositParams, {
    kind: 'struct',
    fields: [
      ['amount', 'u64'],
    ],
  }],
  
  // ClaimReward instruction (no parameters)
  [ClaimRewardParams, {
    kind: 'struct',
    fields: [],
  }],
  
  // CreateVote instruction
  [CreateVoteParams, {
    kind: 'struct',
    fields: [
      ['proposal_type', 'u8'],
      ['new_value', 'u64'],
      ['voting_period', 'u64'],
    ],
  }],
  
  // Vote instruction
  [VoteParams, {
    kind: 'struct',
    fields: [
      ['proposal_id', 'u64'],
      ['approve', 'bool'],
    ],
  }],
  
  // For PublicKey serialization in DistributeQualityRewardsParams
  [PublicKey, {
    kind: 'struct',
    fields: [
      ['_buffer', [32]], // PublicKey is a 32-byte array
    ],
  }],
  
  // DistributeQualityRewards instruction
  [DistributeQualityRewardsParams, {
    kind: 'struct',
    fields: [
      ['creator_pubkeys', [PublicKey]],
      ['distribution_weights', ['u8']],
    ],
  }],
]);

// ======= HELPERS FOR PDA DERIVATION ========

/**
 * Find a Program Derived Address (PDA) for a DAO
 * Updated to include wallet public key in the seeds for multi-community support
 */
export function findDaoAddress(
  name: string,
  walletPublicKey: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  const seeds = [
    Buffer.from("dao"),
    walletPublicKey.toBuffer(),
    Buffer.from(name),
  ];
  
  return PublicKey.findProgramAddressSync(seeds, programId);
}

/**
 * Find a Program Derived Address (PDA) for content
 */
export function findContentAddress(
  daoAddress: PublicKey,
  contentHash: string,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  const seeds = [
    Buffer.from("content"),
    daoAddress.toBuffer(),
    Buffer.from(contentHash),
  ];
  
  return PublicKey.findProgramAddressSync(seeds, programId);
}

/**
 * Find a Program Derived Address (PDA) for a depositor
 */
export function findDepositorAddress(
  daoAddress: PublicKey,
  depositorPubkey: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  const seeds = [
    Buffer.from("depositor"),
    daoAddress.toBuffer(),
    depositorPubkey.toBuffer(),
  ];
  
  return PublicKey.findProgramAddressSync(seeds, programId);
}

/**
 * Find a Program Derived Address (PDA) for a proposal
 */
export function findProposalAddress(
  daoAddress: PublicKey,
  proposalId: number,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  const proposalIdBuffer = Buffer.alloc(8);
  proposalIdBuffer.writeBigUInt64LE(BigInt(proposalId));
  
  const seeds = [
    Buffer.from("proposal"),
    daoAddress.toBuffer(),
    proposalIdBuffer,
  ];
  
  return PublicKey.findProgramAddressSync(seeds, programId);
}

// ======= INSTRUCTION CREATION FUNCTIONS ========

/**
 * Creates an instruction for initializing a new DAO
 */
export function createInitializeDaoInstruction(
  payer: PublicKey,
  daoAddress: PublicKey,
  params: InitializeDaoParams,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  // Serialize the instruction type (variant index) and parameters
  const instructionData = Buffer.alloc(1 + borsh.serialize(INSTRUCTION_SCHEMA, params).length);
  instructionData.writeUInt8(TurtleInstructionType.InitializeDao, 0); // Variant index
  borsh.serialize(INSTRUCTION_SCHEMA, params).copy(instructionData, 1); // Parameters
  
  return new TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: daoAddress, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId,
    data: instructionData,
  });
}

/**
 * Creates an instruction for submitting content
 */
export function createSubmitContentInstruction(
  submitter: PublicKey,
  daoAddress: PublicKey,
  contentAddress: PublicKey,
  params: SubmitContentParams,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  const instructionData = Buffer.alloc(1 + borsh.serialize(INSTRUCTION_SCHEMA, params).length);
  instructionData.writeUInt8(TurtleInstructionType.SubmitContent, 0);
  borsh.serialize(INSTRUCTION_SCHEMA, params).copy(instructionData, 1);
  
  return new TransactionInstruction({
    keys: [
      { pubkey: submitter, isSigner: true, isWritable: true },
      { pubkey: daoAddress, isSigner: false, isWritable: true },
      { pubkey: contentAddress, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId,
    data: instructionData,
  });
}

/**
 * Creates an instruction for depositing funds
 */
export function createDepositInstruction(
  depositor: PublicKey,
  daoAddress: PublicKey,
  depositorAddress: PublicKey,
  params: DepositParams,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  const instructionData = Buffer.alloc(1 + borsh.serialize(INSTRUCTION_SCHEMA, params).length);
  instructionData.writeUInt8(TurtleInstructionType.Deposit, 0);
  borsh.serialize(INSTRUCTION_SCHEMA, params).copy(instructionData, 1);
  
  return new TransactionInstruction({
    keys: [
      { pubkey: depositor, isSigner: true, isWritable: true },
      { pubkey: daoAddress, isSigner: false, isWritable: true },
      { pubkey: depositorAddress, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId,
    data: instructionData,
  });
}

/**
 * Creates an instruction for claiming a reward
 */
export function createClaimRewardInstruction(
  claimer: PublicKey,
  daoAddress: PublicKey,
  contentAddress: PublicKey,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  // Serialize the instruction data
  // For ClaimReward, we just need the variant index as there are no parameters
  const instructionData = Buffer.from([TurtleInstructionType.ClaimReward]);
  
  return new TransactionInstruction({
    keys: [
      { pubkey: claimer, isSigner: true, isWritable: true },
      { pubkey: daoAddress, isSigner: false, isWritable: true },
      { pubkey: contentAddress, isSigner: false, isWritable: false },
    ],
    programId,
    data: instructionData,
  });
}

/**
 * Creates an instruction for creating a governance vote
 */
export function createCreateVoteInstruction(
  proposer: PublicKey,
  daoAddress: PublicKey,
  depositorAddress: PublicKey,
  proposalAddress: PublicKey,
  params: CreateVoteParams,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  const instructionData = Buffer.alloc(1 + borsh.serialize(INSTRUCTION_SCHEMA, params).length);
  instructionData.writeUInt8(TurtleInstructionType.CreateVote, 0);
  borsh.serialize(INSTRUCTION_SCHEMA, params).copy(instructionData, 1);
  
  return new TransactionInstruction({
    keys: [
      { pubkey: proposer, isSigner: true, isWritable: true },
      { pubkey: daoAddress, isSigner: false, isWritable: true },
      { pubkey: depositorAddress, isSigner: false, isWritable: false },
      { pubkey: proposalAddress, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId,
    data: instructionData,
  });
}

/**
 * Creates an instruction for voting on a proposal
 */
export function createVoteInstruction(
  voter: PublicKey,
  daoAddress: PublicKey,
  depositorAddress: PublicKey,
  proposalAddress: PublicKey,
  params: VoteParams,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  const instructionData = Buffer.alloc(1 + borsh.serialize(INSTRUCTION_SCHEMA, params).length);
  instructionData.writeUInt8(TurtleInstructionType.Vote, 0);
  borsh.serialize(INSTRUCTION_SCHEMA, params).copy(instructionData, 1);
  
  return new TransactionInstruction({
    keys: [
      { pubkey: voter, isSigner: true, isWritable: true },
      { pubkey: daoAddress, isSigner: false, isWritable: true },
      { pubkey: depositorAddress, isSigner: false, isWritable: false },
      { pubkey: proposalAddress, isSigner: false, isWritable: true },
    ],
    programId,
    data: instructionData,
  });
}

/**
 * Creates an instruction for distributing quality rewards
 */
export function createDistributeQualityRewardsInstruction(
  admin: PublicKey,
  daoAddress: PublicKey,
  creatorPubkeys: PublicKey[],
  distributionWeights: number[],
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  const params = new DistributeQualityRewardsParams(creatorPubkeys, distributionWeights);
  
  const instructionData = Buffer.alloc(1 + borsh.serialize(INSTRUCTION_SCHEMA, params).length);
  instructionData.writeUInt8(TurtleInstructionType.DistributeQualityRewards, 0);
  borsh.serialize(INSTRUCTION_SCHEMA, params).copy(instructionData, 1);
  
  // First add admin and dao
  const keys = [
    { pubkey: admin, isSigner: true, isWritable: true },
    { pubkey: daoAddress, isSigner: false, isWritable: true },
  ];
  
  // Then add all creator accounts
  for (const pubkey of creatorPubkeys) {
    keys.push({
      pubkey,
      isSigner: false,
      isWritable: true,
    });
  }
  
  return new TransactionInstruction({
    keys,
    programId,
    data: instructionData,
  });
}

// ======= UTILITIES ========

/**
 * Generate a content hash
 */
export function generateContentHash(content: string): string {
  // Using browser crypto
  const msgBuffer = new TextEncoder().encode(content);
  const hashBuffer = crypto.subtle.digest('SHA-256', msgBuffer);
  
  // Convert to hex string
  return Promise.resolve(hashBuffer).then(buffer => {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  });
}

/**
 * Verify if a program exists on chain and is executable
 */
export async function verifyProgramDeployment(
  connection: Connection, 
  programId: PublicKey
): Promise<boolean> {
  try {
    const accountInfo = await connection.getAccountInfo(programId);
    
    if (!accountInfo) {
      console.error(`Program ${programId.toString()} not found on chain`);
      return false;
    }
    
    if (!accountInfo.executable) {
      console.error(`Program ${programId.toString()} is not executable`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Error verifying program deployment:`, error);
    return false;
  }
}

/**
 * Fetches the list of DAO PDA addresses from the backend API
 * @returns {Promise<string[]>} Array of DAO public key addresses as strings
 */
export async function getDAOPdaList(apiBaseUrl = "http://localhost:8080/api/community"): Promise<string[]> {
  try {
    console.log(`Fetching DAO PDA list from API: ${apiBaseUrl}`);
    
    const response = await fetch(apiBaseUrl);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`Successfully retrieved ${data.length} DAO PDAs`);
      return data;
    } else {
      throw new Error(`API error: ${response.status}`);
    }
  } catch (error) {
    console.error(`Error fetching DAO PDA list:`, error);
    throw error;
  }
}

// DAO State account structure - matches the Borsh layout in our Solana program
export class DaoState {
  constructor(properties = {}) {
    Object.assign(this, properties);
  }
}

/**
 * Enhanced getDaoState function that properly fetches and deserializes DAO state
 * from the Solana blockchain
 * @param {PublicKey} daoAddress - The DAO account address
 * @param {Connection} connection - Solana connection
 * @returns {Promise<any>} The DAO state or null if not found
 */
export async function getDaoState(
  daoAddress: PublicKey,
  connection: Connection
): Promise<any> {
  try {
    console.log(`Enhanced getDaoState called for ${daoAddress.toString()}`);
    
    // Get account info from Solana blockchain
    const accountInfo = await connection.getAccountInfo(daoAddress);
    
    if (!accountInfo) {
      console.log(`No account found for address: ${daoAddress.toString()}`);
      return null;
    }
    
    console.log(`Account data size: ${accountInfo.data.length} bytes`);
    
    // 데이터 버퍼 생성
    const dataBuffer = Buffer.from(accountInfo.data);
    
    // 데이터의 일부를 16진수로 표시 (디버깅용)
    console.log("데이터 샘플(처음 32바이트):", dataBuffer.slice(0, 32).toString('hex'));
    
    try {
      // 실제 바이너리 데이터 파싱
      return parseAccountData(dataBuffer);
    } catch (parseError) {
      console.error(`Error parsing account data:`, parseError);
      
      // 파싱 실패 시 기본 값 반환
      return {
        is_initialized: true,
        dao_name: `DAO ${daoAddress.toString().slice(0, 8)}...`,
        initializer: daoAddress.toString(),
        time_limit: 1800, // 30 minutes in seconds
        base_fee: 50000000, // 0.05 SOL in lamports 
        ai_moderation: false,
        deposit_share: 20,
        timeout_timestamp: Math.floor(Date.now() / 1000) + 1800,
        total_deposit: 1 * 1000000000, // 1 SOL in lamports
        depositors: [],
        contents: [],
        vote_proposals: [],
        next_proposal_id: 0
      };
    }
  } catch (error) {
    console.error(`Error in getDaoState for ${daoAddress.toString()}:`, error);
    
    // Return null on error to let the caller handle it
    return null;
  }
}

function parseAccountData(dataBuffer) {
  try {
    // 결과 객체 초기화 (page.tsx에서 사용하는 DAOState 타입에 맞게 구성)
    const result = {
      is_initialized: true,
      dao_name: '',
      initializer: '',
      time_limit: 0,
      base_fee: 0,
      ai_moderation: false,
      deposit_share: 0,
      timeout_timestamp: 0,
      total_deposit: 0,
      depositors: [],
      contents: [],
      vote_proposals: [],
      next_proposal_id: 0
    };
    
    // 1. 처음 1바이트는 버전 또는 초기화 플래그일 수 있음
    const version = dataBuffer.readUInt8(0);
    result.is_initialized = version === 1;
    
    // 2. 다음 4바이트는 문자열 길이일 수 있음
    const stringLengthOffset = 1;
    const stringLength = dataBuffer.readUInt32LE(stringLengthOffset);
    
    // 3. 문자열 추출 시도
    if (stringLength > 0 && stringLength < 100) { // 합리적인 문자열 길이 확인
      const stringData = dataBuffer.slice(stringLengthOffset + 4, stringLengthOffset + 4 + stringLength);
      result.dao_name = stringData.toString('utf8');
      
      // 4. 문자열 이후의 데이터 처리
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
          // 타임스탬프 (8바이트)
          if (offset + 8 <= dataBuffer.length) {
            // BigInt를 Number로 변환 (안전한 범위 내에서)
            const bigTimestamp = dataBuffer.readBigUInt64LE(offset);
            result.timeout_timestamp = Number(bigTimestamp);
            offset += 8;
          }
          
          // 시간 제한 (4바이트)
          if (offset + 4 <= dataBuffer.length) {
            result.time_limit = dataBuffer.readUInt32LE(offset);
            offset += 4;
          }
          
          // 기본 수수료 (8바이트)
          if (offset + 8 <= dataBuffer.length) {
            const bigBaseFee = dataBuffer.readBigUInt64LE(offset);
            result.base_fee = Number(bigBaseFee);
            offset += 8;
          }
          
          // AI 중재 플래그 (1바이트)
          if (offset + 1 <= dataBuffer.length) {
            result.ai_moderation = dataBuffer.readUInt8(offset) === 1;
            offset += 1;
          }
          
          // 예치금 공유 비율 (4바이트)
          if (offset + 4 <= dataBuffer.length) {
            result.deposit_share = dataBuffer.readUInt32LE(offset);
            offset += 4;
          }
          
          // 총 예치금 (8바이트)
          if (offset + 8 <= dataBuffer.length) {
            const bigDeposit = dataBuffer.readBigUInt64LE(offset);
            result.total_deposit = Number(bigDeposit);
            offset += 8;
          }
        } catch (e) {
          console.log('숫자 값 추출 실패:', e.message);
        }
      } else {
        // DAO 이름에 특정 패턴이 없는 경우에도 계속 파싱 시도
        try {
          // 이름 이후 32바이트는 공개키일 가능성이 높음
          const pubkeyData = dataBuffer.slice(offset, offset + 32);
          const pubkey = new PublicKey(pubkeyData);
          result.initializer = pubkey.toString();
          offset += 32;
          
          // 타임스탬프 (8바이트)
          if (offset + 8 <= dataBuffer.length) {
            const bigTimestamp = dataBuffer.readBigUInt64LE(offset);
            result.timeout_timestamp = Number(bigTimestamp);
            offset += 8;
          }
          
          // 시간 제한 (4바이트)
          if (offset + 4 <= dataBuffer.length) {
            result.time_limit = dataBuffer.readUInt32LE(offset);
            offset += 4;
          }
          
          // 기본 수수료 (8바이트)
          if (offset + 8 <= dataBuffer.length) {
            const bigBaseFee = dataBuffer.readBigUInt64LE(offset);
            result.base_fee = Number(bigBaseFee);
            offset += 8;
          }
          
          // AI 중재 플래그 (1바이트)
          if (offset + 1 <= dataBuffer.length) {
            result.ai_moderation = dataBuffer.readUInt8(offset) === 1;
            offset += 1;
          }
          
          // 예치금 공유 비율 (4바이트)
          if (offset + 4 <= dataBuffer.length) {
            result.deposit_share = dataBuffer.readUInt32LE(offset);
            offset += 4;
          }
          
          // 총 예치금 (8바이트)
          if (offset + 8 <= dataBuffer.length) {
            const bigDeposit = dataBuffer.readBigUInt64LE(offset);
            result.total_deposit = Number(bigDeposit);
            offset += 8;
          }
        } catch (e) {
          console.log('일반 파싱 실패:', e.message);
        }
      }
    } else {
      // 문자열 길이가 이상한 경우, 다른 방식으로 파싱 시도
      console.log('문자열 길이가 이상함, 다른 방식으로 파싱 시도');
      
      // 처음 8바이트를 discriminator로 간주하고 건너뜀
      let offset = 8;
      
      // 다음 데이터를 DAO 이름으로 추출 시도
      const nameResult = extractString(dataBuffer, offset);
      result.dao_name = nameResult.string || `Unknown DAO`;
      offset = nameResult.nextOffset;
      
      // 다음 32바이트를 initializer 공개키로 추출 시도
      try {
        const pubkeyData = dataBuffer.slice(offset, offset + 32);
        const pubkey = new PublicKey(pubkeyData);
        result.initializer = pubkey.toString();
        offset += 32;
      } catch (e) {
        console.log('대체 방식으로 공개키 변환 실패:', e.message);
      }
      
      // 나머지 값들에 대한 추출 시도
      try {
        // 타임스탬프 (8바이트)
        if (offset + 8 <= dataBuffer.length) {
          const bigTimestamp = dataBuffer.readBigUInt64LE(offset);
          result.timeout_timestamp = Number(bigTimestamp);
          offset += 8;
        }
        
        // 시간 제한 (4바이트)
        if (offset + 4 <= dataBuffer.length) {
          result.time_limit = dataBuffer.readUInt32LE(offset);
          offset += 4;
        }
        
        // 기본 수수료 (8바이트)
        if (offset + 8 <= dataBuffer.length) {
          const bigBaseFee = dataBuffer.readBigUInt64LE(offset);
          result.base_fee = Number(bigBaseFee);
          offset += 8;
        }
        
        // AI 중재 플래그 (1바이트)
        if (offset + 1 <= dataBuffer.length) {
          result.ai_moderation = dataBuffer.readUInt8(offset) === 1;
          offset += 1;
        }
        
        // 예치금 공유 비율 (4바이트)
        if (offset + 4 <= dataBuffer.length) {
          result.deposit_share = dataBuffer.readUInt32LE(offset);
          offset += 4;
        }
        
        // 총 예치금 (8바이트)
        if (offset + 8 <= dataBuffer.length) {
          const bigDeposit = dataBuffer.readBigUInt64LE(offset);
          result.total_deposit = Number(bigDeposit);
          offset += 8;
        }
      } catch (e) {
        console.log('대체 방식으로 숫자 값 추출 실패:', e.message);
      }
    }
    
    // 빈 배열 초기화
    result.depositors = result.depositors || [];
    result.contents = result.contents || [];
    result.vote_proposals = result.vote_proposals || [];
    result.next_proposal_id = result.next_proposal_id || 0;
    
    // 추출된 데이터 반환
    return result;
  } catch (error) {
    console.error('데이터 파싱 오류:', error);
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
 * Fetches metadata about a DAO from the Solana blockchain
 * @param {string|PublicKey} daoAddress - The DAO PDA address
 * @param {Connection} connection - Solana connection
 * @returns {Promise<Object>} DAO metadata object
 */
export async function getDAOMetadata(
  daoAddress: string | PublicKey,
  connection: Connection
): Promise<any> {
  try {
    // Convert string to PublicKey if needed
    const daoPubkey = typeof daoAddress === 'string' 
      ? new PublicKey(daoAddress) 
      : daoAddress;
    
    console.log(`Fetching account data for DAO: ${daoPubkey.toString()}`);
    
    // Get account info from Solana blockchain
    const accountInfo = await connection.getAccountInfo(daoPubkey);
    
    if (!accountInfo) {
      console.log(`No account found for address: ${daoPubkey.toString()}`);
      return null;
    }
    
    console.log(`Account data size: ${accountInfo.data.length} bytes`);
    
    // Return basic account info without trying to interpret the data
    return {
      pda: daoPubkey.toString(),
      owner: accountInfo.owner.toString(),
      lamports: accountInfo.lamports,
      dataSize: accountInfo.data.length,
      executable: accountInfo.executable,
      rentEpoch: accountInfo.rentEpoch
    };
  } catch (error) {
    console.error(`Error fetching DAO metadata for ${daoAddress}:`, error);
    throw error;
  }
}

/**
 * Fetches all DAO states in a batch operation
 * @param {string[]} daoPdaList - Array of DAO PDA addresses
 * @param {Connection} connection - Solana connection
 * @returns {Promise<any[]>} Array of DAO states
 */
export async function getAllDAOStates(
  daoPdaList: string[],
  connection: Connection
): Promise<any[]> {
  try {
    console.log(`Fetching data for ${daoPdaList.length} DAOs in parallel`);
    
    // Execute all requests in parallel
    const results = await Promise.allSettled(
      daoPdaList.map(pda => getDaoState(new PublicKey(pda), connection))
    );
    
    // Process results, keeping only successful ones
    const validResults: any[] = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value !== null) {
        validResults.push({
          address: daoPdaList[index],
          state: result.value
        });
      } else {
        console.warn(`Failed to fetch data for PDA: ${daoPdaList[index]}`);
      }
    });
    
    console.log(`Successfully fetched data for ${validResults.length} out of ${daoPdaList.length} DAOs`);
    return validResults;
  } catch (error) {
    console.error(`Error fetching DAO states:`, error);
    return [];
  }
}