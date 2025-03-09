import { PublicKey } from "@solana/web3.js";
import { Buffer } from "buffer";

// Custom implementation of BinaryReader and BinaryWriter since borsh package is problematic

export class BinaryReader {
  private buffer: Buffer;
  private offset: number;

  constructor(buffer: Buffer) {
    this.buffer = buffer;
    this.offset = 0;
  }

  readU8(): number {
    const value = this.buffer.readUInt8(this.offset);
    this.offset += 1;
    return value;
  }

  readU32(): number {
    const value = this.buffer.readUInt32LE(this.offset);
    this.offset += 4;
    return value;
  }

  readU64(): bigint {
    const value = this.buffer.readBigUInt64LE(this.offset);
    this.offset += 8;
    return value;
  }

  readBool(): boolean {
    const value = this.readU8();
    return value !== 0;
  }

  readFixedArray(length: number): Uint8Array {
    const array = new Uint8Array(this.buffer.subarray(this.offset, this.offset + length));
    this.offset += length;
    return array;
  }

  readString(): string {
    const length = this.readU32();
    const bytes = this.readFixedArray(length);
    return Buffer.from(bytes).toString('utf8');
  }

  readPubkey(): PublicKey {
    const array = this.readFixedArray(32);
    return new PublicKey(array);
  }
}

export class BinaryWriter {
  private buffer: Buffer;
  private length: number;

  constructor() {
    this.buffer = Buffer.alloc(1024); // Start with 1KB buffer
    this.length = 0;
  }

  private ensureCapacity(additionalBytes: number) {
    if (this.length + additionalBytes > this.buffer.length) {
      const newBuffer = Buffer.alloc(this.buffer.length * 2);
      this.buffer.copy(newBuffer);
      this.buffer = newBuffer;
    }
  }

  writeU8(value: number): void {
    this.ensureCapacity(1);
    this.buffer.writeUInt8(value, this.length);
    this.length += 1;
  }

  writeByte(value: number): void {
    this.writeU8(value);
  }

  writeU32(value: number): void {
    this.ensureCapacity(4);
    this.buffer.writeUInt32LE(value, this.length);
    this.length += 4;
  }

  writeU64(value: number | bigint | string): void {
    this.ensureCapacity(8);
    
    // Make sure we have a proper BigInt to prevent type mixing issues
    let bigIntValue: bigint;
    
    if (typeof value === 'bigint') {
      bigIntValue = value;
    } else if (typeof value === 'number') {
      bigIntValue = BigInt(Math.floor(value)); // Ensure we have an integer
      console.log(`Converting number ${value} to BigInt ${bigIntValue}`);
    } else if (typeof value === 'string') {
      // Try to parse the string as a BigInt
      try {
        bigIntValue = BigInt(value);
        console.log(`Converting string ${value} to BigInt ${bigIntValue}`);
      } catch (error) {
        console.error(`Failed to convert string ${value} to BigInt, using 0`);
        bigIntValue = BigInt(0);
      }
    } else {
      console.error(`Unexpected value type for U64: ${typeof value}, using 0`);
      bigIntValue = BigInt(0);
    }
    
    // Write the BigInt value to the buffer
    this.buffer.writeBigUInt64LE(bigIntValue, this.length);
    this.length += 8;
  }

  writeBool(value: boolean): void {
    this.writeU8(value ? 1 : 0);
  }

  writeFixedArray(array: Uint8Array): void {
    this.ensureCapacity(array.length);
    Buffer.from(array).copy(this.buffer, this.length);
    this.length += array.length;
  }

  writeString(str: string): void {
    const bytes = Buffer.from(str, 'utf8');
    this.writeU32(bytes.length);
    this.writeFixedArray(bytes);
  }

  writePubkey(value: PublicKey): void {
    this.writeFixedArray(value.toBytes());
  }

  toArray(): Uint8Array {
    return new Uint8Array(this.buffer.subarray(0, this.length));
  }
}

// Define serializeUnchecked method for Serialize classes
export interface Serialize {
  serialize: () => Uint8Array;
}

// Helper to deserialize from Buffer
export function deserializeUnchecked<T>(
  schema: any,
  classType: { new (...args: any[]): T },
  buffer: Buffer
): T {
  const reader = new BinaryReader(buffer);
  
  // Create an instance of the class
  const result = new classType();
  
  // For each field in the schema, read the corresponding value
  Object.keys(schema.struct).forEach((fieldName) => {
    const fieldType = schema.struct[fieldName];
    let value;
    
    // Convert object field types to strings to avoid deserialize errors
    const typeString = typeof fieldType === 'object' ? JSON.stringify(fieldType) : fieldType;
    
    // Check for array type
    if (fieldType === 'array' || (typeof fieldType === 'object' && fieldType.array)) {
      // Skip arrays in this basic implementation - we'll handle them with mock data
      console.log(`Skipping array field ${fieldName} during deserialization`);
      value = []; // Default to empty array
    } else if (fieldType === 'u8') {
      value = reader.readU8();
    } else if (fieldType === 'u32') {
      value = reader.readU32();
    } else if (fieldType === 'u64') {
      // Read as BigInt but safely convert to Number if within safe integer range
      const bigIntValue = reader.readU64();
      
      // Check if the value fits within safe integer range
      if (bigIntValue <= BigInt(Number.MAX_SAFE_INTEGER)) {
        value = Number(bigIntValue); // Safe conversion to Number
      } else {
        console.warn(`BigInt value ${bigIntValue} exceeds safe integer range, using string representation`);
        value = bigIntValue.toString(); // Use string representation for very large numbers
      }
    } else if (fieldType === 'bool') {
      value = reader.readBool();
    } else if (fieldType === 'string') {
      value = reader.readString();
    } else if (fieldType === 'pubkey') {
      value = reader.readPubkey();
    } else {
      console.warn(`Skipping unsupported field type: ${typeString} for field ${fieldName}`);
      // Use appropriate default values based on field name
      if (fieldName === 'depositors' || fieldName === 'contents' || fieldName === 'vote_proposals') {
        value = []; // Default to empty array for collection fields
      } else {
        value = null; // Default to null for other unknown fields
      }
    }
    
    (result as any)[fieldName] = value;
  });
  
  return result;
}

// Instruction classes

// ⚠️ IMPORTANT: These must exactly match the enum variants in the Solana program
// See TurtleInstruction enum in solana_program/src/lib.rs

// This needs to match the exact order in the Solana program from Contract.md
export enum TurtleInstructionType {
  InitializeDao = 0,
  Deposit = 1,
  SubmitContent = 2,
  CreateVote = 3,
  CastVote = 4,
  ProcessTimeout = 5,
}

// This needs to match the exact order of VoteType enum in Contract.md
export enum VoteTypeEnum {
  ChangeTimeLimit = 0,
  ChangeBaseFee = 1,
  ChangeAiModeration = 2,
  ContentQualityRating = 3,
}

// Exact match to the Solana program's InitializeDao struct
export class InitializeDaoParams implements Serialize {
  dao_name: string;      // String in Rust - added for multiple DAOs per wallet
  time_limit: number;    // u64 in Rust
  base_fee: number;      // u64 in Rust
  ai_moderation: boolean; // bool in Rust
  deposit_share: number;  // u8 in Rust

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

  static schema = {
    struct: {
      dao_name: "string",
      time_limit: "u64",
      base_fee: "u64",
      ai_moderation: "bool",
      deposit_share: "u8",
    },
  };

  serialize(): Uint8Array {
    const writer = new BinaryWriter();
    
    // 명령어 식별자 (TurtleInstruction::InitializeDao = 0)
    writer.writeU8(TurtleInstructionType.InitializeDao);
    
    // 매개변수 직렬화 전에 로그 출력
    console.log("Serializing InitializeDao with parameters:", {
      dao_name: this.dao_name,
      time_limit: this.time_limit,
      base_fee: this.base_fee,
      ai_moderation: this.ai_moderation,
      deposit_share: this.deposit_share
    });
    
    // 매개변수 직렬화
    writer.writeString(this.dao_name);
    writer.writeU64(BigInt(this.time_limit));
    writer.writeU64(BigInt(this.base_fee));
    writer.writeBool(this.ai_moderation);
    writer.writeU8(this.deposit_share);
    
    const result = writer.toArray();
    console.log("Serialized data (hex):", Buffer.from(result).toString('hex'));
    return result;
  }
  
}

export class SubmitContentParams implements Serialize {
  text: string;
  image_uri: string;

  constructor(text: string, image_uri: string) {
    this.text = text;
    this.image_uri = image_uri;
  }

  static schema = {
    struct: {
      text: "string",
      image_uri: "string",
    },
  };

  serialize(): Uint8Array {
    const writer = new BinaryWriter();
    // First byte is the instruction type (variant index in the enum)
    writer.writeU8(TurtleInstructionType.SubmitContent);
    // Match the Rust BorshSerialize implementation
    writer.writeString(this.text);
    writer.writeString(this.image_uri);
    return writer.toArray();
  }
}

export class DepositParams implements Serialize {
  amount: number;

  constructor(amount: number) {
    this.amount = amount;
  }

  static schema = {
    struct: {
      amount: "u64",
    },
  };

  serialize(): Uint8Array {
    const writer = new BinaryWriter();
    // First byte is the instruction type (variant index in the enum)
    writer.writeU8(TurtleInstructionType.Deposit);
    // Match the Rust BorshSerialize implementation
    writer.writeU64(BigInt(this.amount));
    return writer.toArray();
  }
}

export class ClaimRewardParams implements Serialize {
  constructor() {}

  static schema = {
    struct: {},
  };

  serialize(): Uint8Array {
    const writer = new BinaryWriter();
    // First byte is the instruction type (variant index in the enum)
    writer.writeU8(TurtleInstructionType.ClaimReward);
    // No parameters for ClaimReward
    return writer.toArray();
  }
}

export class CreateVoteParams implements Serialize {
  title: string;
  description: string;
  vote_type: VoteTypeEnum;
  options: string[];
  voting_period: number;

  constructor(
    title: string,
    description: string,
    vote_type: VoteTypeEnum,
    options: string[],
    voting_period: number
  ) {
    this.title = title;
    this.description = description;
    this.vote_type = vote_type;
    this.options = options;
    this.voting_period = voting_period;
  }

  static schema = {
    struct: {
      title: "string",
      description: "string",
      vote_type: "u8",
      options: { array: { type: "string" } },
      voting_period: "u64",
    },
  };

  serialize(): Uint8Array {
    const writer = new BinaryWriter();
    // First byte is the instruction type (variant index in the enum)
    writer.writeU8(TurtleInstructionType.CreateVote);
    
    // Match the Rust BorshSerialize implementation for CreateVote
    writer.writeString(this.title);
    writer.writeString(this.description);
    writer.writeU8(this.vote_type);
    
    // Write options array (Vec<String>)
    writer.writeU32(this.options.length);
    this.options.forEach(option => {
      writer.writeString(option);
    });
    
    // Write voting period
    writer.writeU64(BigInt(this.voting_period));
    
    return writer.toArray();
  }
}

export class CastVoteParams implements Serialize {
  proposal_id: number;
  option_index: number;

  constructor(proposal_id: number, option_index: number) {
    this.proposal_id = proposal_id;
    this.option_index = option_index;
  }

  static schema = {
    struct: {
      proposal_id: "u64",
      option_index: "u8",
    },
  };

  serialize(): Uint8Array {
    const writer = new BinaryWriter();
    // First byte is the instruction type (variant index in the enum)
    writer.writeU8(TurtleInstructionType.CastVote);
    // Match the Rust BorshSerialize implementation
    writer.writeU64(BigInt(this.proposal_id));
    writer.writeU8(this.option_index);
    return writer.toArray();
  }
}

export class ProcessTimeoutParams implements Serialize {
  // No parameters needed for this instruction
  constructor() {}

  static schema = {
    struct: {},
  };

  serialize(): Uint8Array {
    const writer = new BinaryWriter();
    // First byte is the instruction type (variant index in the enum)
    writer.writeU8(TurtleInstructionType.ProcessTimeout);
    // No parameters for ProcessTimeout
    return writer.toArray();
  }
}

// Account classes
export class DaoStateAccount {
  is_initialized: boolean;
  dao_name: string;
  initializer: PublicKey;
  time_limit: number;
  base_fee: number;
  ai_moderation: boolean;
  deposit_share: number; 
  timeout_timestamp: number;
  total_deposit: number;
  // Note: These vector fields can't be fully represented in this structure
  // as they're dynamically sized in the actual contract
  depositors: any[];
  contents: any[];
  vote_proposals: any[];
  next_proposal_id: number;

  constructor(props?: {
    is_initialized?: boolean;
    dao_name?: string;
    initializer?: PublicKey;
    time_limit?: number;
    base_fee?: number;
    ai_moderation?: boolean;
    deposit_share?: number;
    timeout_timestamp?: number;
    total_deposit?: number;
    depositors?: any[];
    contents?: any[];
    vote_proposals?: any[];
    next_proposal_id?: number;
  }) {
    this.is_initialized = props?.is_initialized ?? false;
    this.dao_name = props?.dao_name ?? "";
    this.initializer = props?.initializer ?? new PublicKey(0);
    this.time_limit = props?.time_limit ?? 0;
    this.base_fee = props?.base_fee ?? 0;
    this.ai_moderation = props?.ai_moderation ?? false;
    this.deposit_share = props?.deposit_share ?? 0;
    this.timeout_timestamp = props?.timeout_timestamp ?? 0;
    this.total_deposit = props?.total_deposit ?? 0;
    this.depositors = props?.depositors ?? [];
    this.contents = props?.contents ?? [];
    this.vote_proposals = props?.vote_proposals ?? [];
    this.next_proposal_id = props?.next_proposal_id ?? 0;
  }

  static schema = {
    struct: {
      is_initialized: "bool",
      dao_name: "string",
      initializer: "pubkey",
      time_limit: "u64",
      base_fee: "u64",
      ai_moderation: "bool",
      deposit_share: "u8",
      timeout_timestamp: "u64",
      total_deposit: "u64",
      // Note: These vector fields are simplified to basic array types
      // The actual deserialization will skip these and assign empty arrays
      depositors: "array",
      contents: "array",
      vote_proposals: "array",
      next_proposal_id: "u64",
    },
  };

  static deserialize(buffer: Buffer): DaoStateAccount {
    try {
      return deserializeUnchecked(
        this.schema,
        DaoStateAccount,
        buffer
      );
    } catch (error) {
      console.error("Failed to deserialize DaoStateAccount:", error);
      throw error;
    }
  }
}

export class ContentAccount {
  author: PublicKey;
  text: string;
  image_uri: string;
  timestamp: number;
  vote_count: number;

  constructor(props?: {
    author?: PublicKey;
    text?: string;
    image_uri?: string;
    timestamp?: number;
    vote_count?: number;
  }) {
    this.author = props?.author ?? new PublicKey(0);
    this.text = props?.text ?? "";
    this.image_uri = props?.image_uri ?? "";
    this.timestamp = props?.timestamp ?? 0;
    this.vote_count = props?.vote_count ?? 0;
  }

  static schema = {
    struct: {
      author: "pubkey",
      text: "string",
      image_uri: "string",
      timestamp: "u64",
      vote_count: "u64",
    },
  };

  static deserialize(buffer: Buffer): ContentAccount {
    try {
      return deserializeUnchecked(
        this.schema,
        ContentAccount,
        buffer
      );
    } catch (error) {
      console.error("Failed to deserialize ContentAccount:", error);
      throw error;
    }
  }
}

export class DepositorInfo {
  depositor: PublicKey;
  amount: number;
  timestamp: number;
  locked_until: number;

  constructor(props?: {
    depositor?: PublicKey;
    amount?: number;
    timestamp?: number;
    locked_until?: number;
  }) {
    this.depositor = props?.depositor ?? new PublicKey(0);
    this.amount = props?.amount ?? 0;
    this.timestamp = props?.timestamp ?? 0;
    this.locked_until = props?.locked_until ?? 0;
  }

  static schema = {
    struct: {
      depositor: "pubkey",
      amount: "u64",
      timestamp: "u64",
      locked_until: "u64",
    },
  };

  static deserialize(buffer: Buffer): DepositorInfo {
    try {
      return deserializeUnchecked(
        this.schema,
        DepositorInfo,
        buffer
      );
    } catch (error) {
      console.error("Failed to deserialize DepositorInfo:", error);
      throw error;
    }
  }
}

export enum VoteStatus {
  Active = 0,
  Completed = 1,
  Executed = 2,
}

export class VoteInfo {
  voter: PublicKey;
  option_index: number;
  voting_power: number;

  constructor(props?: {
    voter?: PublicKey;
    option_index?: number;
    voting_power?: number;
  }) {
    this.voter = props?.voter ?? new PublicKey(0);
    this.option_index = props?.option_index ?? 0;
    this.voting_power = props?.voting_power ?? 0;
  }

  static schema = {
    struct: {
      voter: "pubkey",
      option_index: "u8",
      voting_power: "u64",
    },
  };
}

export class VoteProposal {
  proposal_id: number;
  proposer: PublicKey;
  title: string;
  description: string;
  vote_type: VoteTypeEnum;
  options: string[];
  start_time: number;
  end_time: number;
  votes: VoteInfo[];
  status: VoteStatus;

  constructor(props?: {
    proposal_id?: number;
    proposer?: PublicKey;
    title?: string;
    description?: string;
    vote_type?: VoteTypeEnum;
    options?: string[];
    start_time?: number;
    end_time?: number;
    votes?: VoteInfo[];
    status?: VoteStatus;
  }) {
    this.proposal_id = props?.proposal_id ?? 0;
    this.proposer = props?.proposer ?? new PublicKey(0);
    this.title = props?.title ?? "";
    this.description = props?.description ?? "";
    this.vote_type = props?.vote_type ?? VoteTypeEnum.ChangeTimeLimit;
    this.options = props?.options ?? [];
    this.start_time = props?.start_time ?? 0;
    this.end_time = props?.end_time ?? 0;
    this.votes = props?.votes ?? [];
    this.status = props?.status ?? VoteStatus.Active;
  }

  static schema = {
    struct: {
      proposal_id: "u64",
      proposer: "pubkey",
      title: "string",
      description: "string",
      vote_type: "u8",
      options: { array: { type: "string" } },
      start_time: "u64",
      end_time: "u64",
      votes: { array: { type: VoteInfo } },
      status: "u8",
    },
  };

  static deserialize(buffer: Buffer): VoteProposal {
    try {
      return deserializeUnchecked(
        this.schema,
        VoteProposal,
        buffer
      );
    } catch (error) {
      console.error("Failed to deserialize VoteProposal:", error);
      throw error;
    }
  }
}