import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { Buffer } from "buffer";

import { TURTLE_PROGRAM_ID } from "./constants";

// Simple implementation of the Turtle program interaction that doesn't use simulation

export class SimpleTurtleProgram {
  connection: Connection;
  programId: PublicKey;
  wallet: WalletContextState;

  constructor(
    connection: Connection,
    programId: PublicKey = TURTLE_PROGRAM_ID,
    wallet: WalletContextState
  ) {
    this.connection = connection;
    this.programId = programId;
    this.wallet = wallet;
  }

  // Helper function to find DAO PDA address
  findDaoAddress(name: string): [PublicKey, number] {
    const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, "").substring(0, 32);
    console.log(`Finding DAO address for wallet: ${this.wallet.publicKey?.toString()}`);
    
    if (!this.wallet.publicKey) {
      throw new Error("Wallet not connected");
    }
    
    // Match the seed format used in the Solana program lib.rs:
    // &[name_bytes, initializer_info.key.as_ref()]
    // where name_bytes = b"dao"
    const seeds = [
      Buffer.from("dao"), 
      this.wallet.publicKey.toBuffer()
    ];
    
    return PublicKey.findProgramAddressSync(seeds, this.programId);
  }

  // Send transaction without simulation
  async sendTransaction(instruction: TransactionInstruction): Promise<string> {
    console.log("Sending transaction without simulation...");
    
    if (!this.wallet.publicKey) {
      throw new Error("Wallet not connected");
    }
    
    // Create transaction
    const transaction = new Transaction().add(instruction);
    
    // Get recent blockhash
    const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = this.wallet.publicKey;
    
    // Log transaction details
    console.log("Transaction details:", {
      programId: instruction.programId.toString(),
      keys: instruction.keys.map(k => ({
        pubkey: k.pubkey.toString(),
        isSigner: k.isSigner,
        isWritable: k.isWritable
      })),
      data: Buffer.from(instruction.data).toString('hex')
    });
    
    try {
      // Send transaction
      console.log("Sending transaction...");
      
      let signature: string;
      
      if (this.wallet.sendTransaction) {
        signature = await this.wallet.sendTransaction(transaction, this.connection, {
          skipPreflight: true
        });
      } else if (this.wallet.signTransaction) {
        const signedTx = await this.wallet.signTransaction(transaction);
        signature = await this.connection.sendRawTransaction(signedTx.serialize(), {
          skipPreflight: true
        });
      } else {
        throw new Error("Wallet doesn't support transaction signing");
      }
      
      console.log("Transaction sent:", signature);
      return signature;
    } catch (error) {
      console.error("Error sending transaction:", error);
      throw error;
    }
  }

  // Initialize a new DAO
  async initializeDao(
    name: string,
    timeLimit: number,
    baseFee: number,
    aiModeration: boolean,
    depositShare: number
  ): Promise<string> {
    if (!this.wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    console.log(`Initializing DAO: ${name}`);
    
    // Sanitize name
    const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, "").substring(0, 32);
    
    // Find DAO address with the correct seed format to match the Solana program
    const [daoAddress, bump] = this.findDaoAddress(sanitizedName);
    console.log(`DAO address: ${daoAddress.toString()}, bump: ${bump}`);
    
    // Create instruction data matching the Solana program's expectations
    // Based on the TurtleInstruction::InitializeDao variant in lib.rs
    const buffer = new Uint8Array(19); // 1 + 8 + 8 + 1 + 1
    let offset = 0;
    
    // Instruction variant (0 = InitializeDao)
    buffer[offset++] = 0;
    
    // Time limit (u64, little-endian)
    const timeLimitBigInt = BigInt(timeLimit);
    for (let i = 0; i < 8; i++) {
      buffer[offset++] = Number((timeLimitBigInt >> BigInt(i * 8)) & BigInt(0xFF));
    }
    
    // Base fee (u64, little-endian)
    const baseFeeBigInt = BigInt(baseFee);
    for (let i = 0; i < 8; i++) {
      buffer[offset++] = Number((baseFeeBigInt >> BigInt(i * 8)) & BigInt(0xFF));
    }
    
    // AI moderation (bool)
    buffer[offset++] = aiModeration ? 1 : 0;
    
    // Deposit share (u8)
    buffer[offset++] = depositShare;
    
    console.log("Instruction data (hex):", Buffer.from(buffer).toString('hex'));
    
    // Create instruction with the correct account structure from lib.rs
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true }, // initializer_info
        { pubkey: daoAddress, isSigner: false, isWritable: true }, // dao_account_info
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program_info
      ],
      programId: this.programId,
      data: buffer,
    });
    
    // Send transaction
    const signature = await this.sendTransaction(instruction);
    console.log(`DAO initialized with signature: ${signature}`);
    
    return daoAddress.toString();
  }
  
  // Helper function to find depositor address
  findDepositorAddress(daoAddress: PublicKey, depositorPubkey: PublicKey): [PublicKey, number] {
    console.log(`Finding depositor address for DAO: ${daoAddress.toString()} and wallet: ${depositorPubkey.toString()}`);
    
    const seeds = [
      Buffer.from("depositor"),
      daoAddress.toBuffer(),
      depositorPubkey.toBuffer()
    ];
    
    return PublicKey.findProgramAddressSync(seeds, this.programId);
  }
  
  // Deposit SOL to a community
  async deposit(
    daoAddress: PublicKey,
    amount: number // in lamports
  ): Promise<string> {
    if (!this.wallet.publicKey) {
      throw new Error("Wallet not connected");
    }

    console.log(`Depositing ${amount} lamports to DAO: ${daoAddress.toString()}`);
    console.log(`From wallet: ${this.wallet.publicKey.toString()}`);

    // Find the depositor account PDA
    const [depositorAddress, bump] = this.findDepositorAddress(
      daoAddress,
      this.wallet.publicKey
    );
    
    console.log(`Depositor PDA: ${depositorAddress.toString()} with bump: ${bump}`);
    
    // Create instruction data manually - variant 2 (Deposit) + amount (u64)
    const buffer = new Uint8Array(9); // 1 + 8 bytes
    let offset = 0;
    
    // Instruction variant (2 = Deposit)
    buffer[offset++] = 2;
    
    // Amount (u64, little-endian)
    const amountBigInt = BigInt(amount);
    for (let i = 0; i < 8; i++) {
      buffer[offset++] = Number((amountBigInt >> BigInt(i * 8)) & BigInt(0xFF));
    }
    
    console.log("Deposit instruction data (hex):", Buffer.from(buffer).toString('hex'));
    
    // Create instruction with the exact accounts required
    const instruction = new TransactionInstruction({
      keys: [
        // The depositor needs to be a signer and writable (to pay)
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        // The DAO account receives the deposit
        { pubkey: daoAddress, isSigner: false, isWritable: true },
        // The depositor state account tracks deposit info
        { pubkey: depositorAddress, isSigner: false, isWritable: true },
        // System program needed for transfers
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: buffer,
    });
    
    // Send transaction
    const signature = await this.sendTransaction(instruction);
    console.log(`Deposit transaction sent: ${signature}`);
    
    return depositorAddress.toString();
  }
}