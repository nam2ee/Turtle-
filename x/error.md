node a.js
Generated DAO PDA: E3AbWE2o3DYB8MUx7Ct7VAXsPYcHmSyBcE2xEWEwuTjr
Bump seed: 252
Wallet public key: 2ByHKBvkybt7jtHYHkCLggkA7vewbTAM84zc5tmz8ZRW
Sending transaction...
Transaction failed: SendTransactionError: Simulation failed. 
Message: Transaction simulation failed: Error processing Instruction 0: invalid instruction data. 
Logs: 
[
  "Program G5658prSBac5RRSsy16qjvp9awxxpa7a4tsZZJrG8kjP invoke [1]",
  "Program G5658prSBac5RRSsy16qjvp9awxxpa7a4tsZZJrG8kjP consumed 1071 of 200000 compute units",
  "Program G5658prSBac5RRSsy16qjvp9awxxpa7a4tsZZJrG8kjP failed: invalid instruction data"
]. 
Catch the `SendTransactionError` and call `getLogs()` on it for full details.
    at Connection.sendEncodedTransaction (/Users/yoonjae/hackathon/sonic/x/node_modules/@solana/web3.js/lib/index.cjs.js:8216:13)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async Connection.sendRawTransaction (/Users/yoonjae/hackathon/sonic/x/node_modules/@solana/web3.js/lib/index.cjs.js:8181:20)
    at async Connection.sendTransaction (/Users/yoonjae/hackathon/sonic/x/node_modules/@solana/web3.js/lib/index.cjs.js:8172:12)
    at async sendAndConfirmTransaction (/Users/yoonjae/hackathon/sonic/x/node_modules/@solana/web3.js/lib/index.cjs.js:2273:21)
    at async initializeDao (/Users/yoonjae/hackathon/sonic/x/a.js:84:25)
    at async /Users/yoonjae/hackathon/sonic/x/a.js:112:7 {
  signature: '',
  transactionMessage: 'Transaction simulation failed: Error processing Instruction 0: invalid instruction data',
  transactionLogs: [
    'Program G5658prSBac5RRSsy16qjvp9awxxpa7a4tsZZJrG8kjP invoke [1]',
    'Program G5658prSBac5RRSsy16qjvp9awxxpa7a4tsZZJrG8kjP consumed 1071 of 200000 compute units',
    'Program G5658prSBac5RRSsy16qjvp9awxxpa7a4tsZZJrG8kjP failed: invalid instruction data'
  ]
}
Error logs:
Program G5658prSBac5RRSsy16qjvp9awxxpa7a4tsZZJrG8kjP invoke [1]
Program G5658prSBac5RRSsy16qjvp9awxxpa7a4tsZZJrG8kjP consumed 1071 of 200000 compute units
Program G5658prSBac5RRSsy16qjvp9awxxpa7a4tsZZJrG8kjP failed: invalid instruction data
Error: SendTransactionError: Simulation failed. 
Message: Transaction simulation failed: Error processing Instruction 0: invalid instruction data. 
Logs: 
[
  "Program G5658prSBac5RRSsy16qjvp9awxxpa7a4tsZZJrG8kjP invoke [1]",
  "Program G5658prSBac5RRSsy16qjvp9awxxpa7a4tsZZJrG8kjP consumed 1071 of 200000 compute units",
  "Program G5658prSBac5RRSsy16qjvp9awxxpa7a4tsZZJrG8kjP failed: invalid instruction data"
]. 
Catch the `SendTransactionError` and call `getLogs()` on it for full details.
    at Connection.sendEncodedTransaction (/Users/yoonjae/hackathon/sonic/x/node_modules/@solana/web3.js/lib/index.cjs.js:8216:13)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async Connection.sendRawTransaction (/Users/yoonjae/hackathon/sonic/x/node_modules/@solana/web3.js/lib/index.cjs.js:8181:20)
    at async Connection.sendTransaction (/Users/yoonjae/hackathon/sonic/x/node_modules/@solana/web3.js/lib/index.cjs.js:8172:12)
    at async sendAndConfirmTransaction (/Users/yoonjae/hackathon/sonic/x/node_modules/@solana/web3.js/lib/index.cjs.js:2273:21)
    at async initializeDao (/Users/yoonjae/hackathon/sonic/x/a.js:84:25)
    at async /Users/yoonjae/hackathon/sonic/x/a.js:112:7 {
  signature: '',
  transactionMessage: 'Transaction simulation failed: Error processing Instruction 0: invalid instruction data',
  transactionLogs: [
    'Program G5658prSBac5RRSsy16qjvp9awxxpa7a4tsZZJrG8kjP invoke [1]',
    'Program G5658prSBac5RRSsy16qjvp9awxxpa7a4tsZZJrG8kjP consumed 1071 of 200000 compute units',
    'Program G5658prSBac5RRSsy16qjvp9awxxpa7a4tsZZJrG8kjP failed: invalid instruction data'
  ]
}