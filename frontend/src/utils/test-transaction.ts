import { 
  PublicKey, 
  Connection, 
  Transaction, 
  TransactionInstruction, 
  SystemProgram 
} from "@solana/web3.js";
import { TURTLE_PROGRAM_ID } from "./constants";

// This is the raw buffer we'll send to the program
// Carefully crafted to match the format in the working a.js example
export function createTestInstruction(wallet: PublicKey): TransactionInstruction {
  // Use a test name for DAO
  const testName = "test";
  const description = "Test DAO for diagnostic purposes";
  
  // Find the DAO PDA with the correct seed format
  const [daoAddress, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("dao"), Buffer.from(testName), wallet.toBuffer()],
    TURTLE_PROGRAM_ID
  );
  
  console.log(`Generated DAO PDA: ${daoAddress.toString()}, bump: ${bump}`);
  
  // Create instruction data exactly like in the working a.js example
  const nameBuffer = Buffer.from(testName);
  const descBuffer = Buffer.from(description);
  
  // Create the instruction data in the exact format expected by the program
  const instructionData = Buffer.concat([
    Buffer.from([0]), // Instruction index: 0 = initialize_dao
    Buffer.from([bump]), // bump seed
    Buffer.from(new Uint8Array([nameBuffer.length])), // name length (1 byte)
    nameBuffer,
    Buffer.from(new Uint8Array([descBuffer.length])), // description length (1 byte)
    descBuffer
  ]);
  
  console.log(`Created raw instruction buffer: ${Buffer.from(instructionData).toString('hex')}`);
  console.log(`Using test DAO address: ${daoAddress.toString()}`);
  
  // Create the instruction with exactly the accounts from the Solana program
  return new TransactionInstruction({
    keys: [
      // These MUST exactly match the accounts array in process_instruction when it processes
      // the InitializeDao variant - check lib.rs for this structure
      { pubkey: wallet, isSigner: true, isWritable: true },           // payer
      { pubkey: daoAddress, isSigner: false, isWritable: true },      // dao_account
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
    ],
    programId: TURTLE_PROGRAM_ID,
    data: instructionData,
  });
}

// Helper function to create and send a test transaction
export async function sendTestTransaction(
  connection: Connection,
  wallet: any // Using any type because different wallets have different structures
): Promise<string> {
  if (!wallet.publicKey) {
    throw new Error("Wallet not connected");
  }
  
  console.log("Creating test transaction...");
  
  // Create the test instruction
  const instruction = createTestInstruction(wallet.publicKey);
  
  // Create transaction
  const transaction = new Transaction().add(instruction);
  
  // Get latest blockhash
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = wallet.publicKey;
  
  console.log("Transaction created with instruction:", {
    programId: instruction.programId.toString(),
    accounts: instruction.keys.map(k => ({
      pubkey: k.pubkey.toString(),
      isSigner: k.isSigner,
      isWritable: k.isWritable
    })),
    data: Buffer.from(instruction.data).toString('hex')
  });
  
  // Different wallets have different signing methods
  try {
    console.log("Attempting to sign and send transaction...");
    
    // Try using sendTransaction first (most common)
    if (wallet.sendTransaction) {
      console.log("Using wallet.sendTransaction method with skipPreflight=true");
      const signature = await wallet.sendTransaction(transaction, connection, {
        skipPreflight: true, // Skip preflight checks to avoid simulation errors
        preflightCommitment: 'processed'
      });
      console.log("Transaction sent successfully with signature:", signature);
      return signature;
    }
    
    // If sendTransaction is not available, try signTransaction + sendRawTransaction
    if (wallet.signTransaction) {
      console.log("Using wallet.signTransaction method");
      const signedTransaction = await wallet.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(
        signedTransaction.serialize(),
        { 
          skipPreflight: true, // Skip preflight checks to avoid simulation errors
          preflightCommitment: 'processed'
        }
      );
      console.log("Transaction sent successfully with signature:", signature);
      return signature;
    }
    
    throw new Error("Wallet doesn't support transaction signing");
  } catch (error) {
    console.error("Error sending test transaction:", error);
    throw error;
  }
}