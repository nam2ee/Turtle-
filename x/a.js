const { 
    Connection, 
    PublicKey, 
    Keypair, 
    Transaction, 
    TransactionInstruction, 
    SystemProgram, 
    sendAndConfirmTransaction,
    LAMPORTS_PER_SOL
  } = require('@solana/web3.js');


  // 1. 연결 설정
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
  // 2. 지갑 설정
  const secretKey = Uint8Array.from([
    245,81,209,104,76,77,95,231,103,234,20,135,36,227,111,175,
    27,93,70,111,39,99,249,127,201,189,185,57,235,241,124,136,
    43,193,107,115,209,148,248,24,172,136,8,137,91,104,139,124,
    242,114,47,99,26,217,210,94,182,182,40,35,149,80,28,102
  ]);
  
  const wallet = Keypair.fromSecretKey(secretKey);
  console.log(`지갑 주소: ${wallet.publicKey.toString()}`);
  
  // 3. 프로그램 ID 및 DAO PDA 설정
  const PROGRAM_ID = new PublicKey("G5658prSBac5RRSsy16qjvp9awxxpa7a4tsZZJrG8kjP");
  const dao_pda = new PublicKey("723V6xuAvJVnmkod73pZkpxcethhd6fdxboDDJQEPU6g");
  
  // 디버깅 함수: 버퍼 내용 출력
  function logBuffer(buffer, name = "버퍼") {
    console.log(`${name} (${buffer.length} 바이트):`, 
      Buffer.from(buffer).toString('hex').match(/../g).join(' '));
  }
  
  // 1. 자금 예치 함수 - 가장 간단한 형태로 구현
  async function deposit(amount) {
    try {
      // 인스트럭션 데이터: [1] (명령어) + amount (u64, 리틀 엔디안)
      const instructionData = Buffer.alloc(9);
      instructionData[0] = 1; // Deposit instruction
      instructionData.writeBigUInt64LE(BigInt(amount), 1);
      
      logBuffer(instructionData, "예치 명령 데이터");
  
      // 트랜잭션 인스트럭션 생성
      const depositInstruction = new TransactionInstruction({
        keys: [
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: dao_pda, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
        ],
        programId: PROGRAM_ID,
        data: instructionData
      });
  
      // 트랜잭션 전송
      const transaction = new Transaction().add(depositInstruction);
      const txid = await sendAndConfirmTransaction(connection, transaction, [wallet]);
      console.log(`${amount / LAMPORTS_PER_SOL} SOL 예치 완료! 트랜잭션 ID: ${txid}`);
      return txid;
    } catch (error) {
      console.error(`예치 실패:`, error);
      if (error.transactionLogs) {
        console.error("로그:", error.transactionLogs);
      }
      throw error;
    }
  }
  
  // 2. 콘텐츠 제출 함수 - 간소화된 형태
  async function submitContent(text, imageUri) {
    try {
      // 명령어(1바이트) + text 길이(4바이트) + text + imageUri 길이(4바이트) + imageUri
      const textBytes = Buffer.from(text);
      const imageUriBytes = Buffer.from(imageUri);
      
      const instructionData = Buffer.alloc(9 + textBytes.length + imageUriBytes.length);
      let offset = 0;
      
      // 명령어
      instructionData[offset] = 2; // SubmitContent instruction
      offset += 1;
      
      // text 길이 + 내용
      instructionData.writeUInt32LE(textBytes.length, offset);
      offset += 4;
      textBytes.copy(instructionData, offset);
      offset += textBytes.length;
      
      // imageUri 길이 + 내용
      instructionData.writeUInt32LE(imageUriBytes.length, offset);
      offset += 4;
      imageUriBytes.copy(instructionData, offset);
      
      logBuffer(instructionData, "콘텐츠 제출 명령 데이터");
  
      // 트랜잭션 인스트럭션 생성
      const submitContentInstruction = new TransactionInstruction({
        keys: [
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: dao_pda, isSigner: false, isWritable: true }
        ],
        programId: PROGRAM_ID,
        data: instructionData
      });
  
      // 트랜잭션 전송
      const transaction = new Transaction().add(submitContentInstruction);
      const txid = await sendAndConfirmTransaction(connection, transaction, [wallet]);
      console.log(`콘텐츠 제출 완료! 트랜잭션 ID: ${txid}`);
      return txid;
    } catch (error) {
      console.error(`콘텐츠 제출 실패:`, error);
      if (error.transactionLogs) {
        console.error("로그:", error.transactionLogs);
      }
      throw error;
    }
  }
  
  // 3. 투표 제안 생성 함수 - 수정된 직렬화
// 3. 투표 제안 생성 함수 - 정확한 직렬화와 1주일 검증 추가
async function createVote(title, description, voteTypeIndex, options, votingPeriod) {
    try {
      // 투표 기간이 최소 1주일이 되도록 확인
      const ONE_WEEK_SECONDS = 7 * 24 * 60 * 60; // 604,800초
      const validVotingPeriod = Math.max(votingPeriod, ONE_WEEK_SECONDS);
      console.log(`투표 기간: ${validVotingPeriod}초 (${validVotingPeriod / (24 * 60 * 60)} 일)`);
  
      // 필요한 바이트 크기 계산
      const titleBytes = Buffer.from(title);
      const descBytes = Buffer.from(description);
      
      // 옵션 문자열의 총 바이트 계산
      let optionsTotalBytes = 4; // Vec 길이 (4바이트)
      const optionBuffers = options.map(opt => {
        const buf = Buffer.from(opt);
        optionsTotalBytes += 4 + buf.length; // 각 문자열 길이(4바이트) + 내용
        return buf;
      });
      
      // 총 인스트럭션 데이터 크기 계산
      // 1(명령어) + 4+title길이 + 4+desc길이 + 1(voteType) + optionsTotalBytes + 8(votingPeriod)
      const totalSize = 1 + 4 + titleBytes.length + 4 + descBytes.length + 1 + optionsTotalBytes + 8;
      const instructionData = Buffer.alloc(totalSize);
      
      let offset = 0;
      
      // 1. 명령어 (CreateVote = 3)
      instructionData[offset] = 3;
      offset += 1;
      
      // 2. 제목 (길이 + 내용)
      instructionData.writeUInt32LE(titleBytes.length, offset);
      offset += 4;
      titleBytes.copy(instructionData, offset);
      offset += titleBytes.length;
      
      // 3. 설명 (길이 + 내용)
      instructionData.writeUInt32LE(descBytes.length, offset);
      offset += 4;
      descBytes.copy(instructionData, offset);
      offset += descBytes.length;
      
      // 4. 투표 유형 (VoteType enum, 0-3 사이의 값)
      instructionData[offset] = voteTypeIndex;
      offset += 1;
      
      // 5. 옵션 배열 (Vec<String>)
      instructionData.writeUInt32LE(options.length, offset); // 배열 길이
      offset += 4;
      
      // 각 옵션 추가
      for (const optBuffer of optionBuffers) {
        instructionData.writeUInt32LE(optBuffer.length, offset); // 문자열 길이
        offset += 4;
        optBuffer.copy(instructionData, offset); // 문자열 내용
        offset += optBuffer.length;
      }
      
      // 6. 투표 기간 (u64, 리틀 엔디안)
      instructionData.writeBigUInt64LE(BigInt(validVotingPeriod), offset);
      
      // 디버깅 - 데이터 확인
      logBuffer(instructionData, "투표 생성 명령 데이터");
      
      // 트랜잭션 인스트럭션 생성
      const createVoteInstruction = new TransactionInstruction({
        keys: [
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: dao_pda, isSigner: false, isWritable: true }
        ],
        programId: PROGRAM_ID,
        data: instructionData
      });
      
      // 트랜잭션 전송
      const transaction = new Transaction().add(createVoteInstruction);
      
      // 자세한 로그를 위한 옵션 추가
      const txid = await sendAndConfirmTransaction(
        connection, 
        transaction, 
        [wallet],
        {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          commitment: 'confirmed'
        }
      );
      
      console.log(`투표 제안 생성 완료! 트랜잭션 ID: ${txid}`);
      return txid;
    } catch (error) {
      console.error(`투표 제안 생성 실패:`, error);
      
      // 더 자세한 로그 확인 시도
      if (error.logs) {
        console.error("프로그램 로그:", error.logs);
      } else if (error.signature) {
        try {
          const txDetails = await connection.getTransaction(error.signature);
          console.log("트랜잭션 상세 로그:", txDetails?.meta?.logMessages);
        } catch (e) {
          console.error("로그 가져오기 실패:", e);
        }
      }
      
      throw error;
    }
  }
  
  
  // DAO 상태 조회 함수
  async function getDAOState() {
    try {
      const accountInfo = await connection.getAccountInfo(dao_pda);
      if (!accountInfo) {
        console.log('DAO 계정을 찾을 수 없습니다');
        return null;
      }
      
      console.log('DAO 계정 데이터 크기:', accountInfo.data.length, '바이트');
      return accountInfo;
    } catch (error) {
      console.error('DAO 상태 조회 실패:', error);
      return null;
    }
  }
  
  // 메인 실행 함수
  async function main() {
    try {
      // 계정 잔액 확인
      const balance = await connection.getBalance(wallet.publicKey);
      console.log(`지갑 잔액: ${balance / LAMPORTS_PER_SOL} SOL`);
      console.log(`DAO PDA: ${dao_pda.toString()}`);
      
      // DAO 상태 조회
      await getDAOState();
      
      // 함수 하나만 선택해서 테스트
      const action = process.argv[2] || 'deposit';
      
      switch(action) {
        case 'deposit':
          // 자금 예치 (0.01 SOL)
          await deposit(LAMPORTS_PER_SOL * 0.01);
          break;
        
        case 'content':
          // 콘텐츠 제출
          await submitContent(
            "이것은 테스트 콘텐츠입니다", 
            "https://example.com/image.png"
          );
          break;
        
        case 'vote':
          // 투표 제안 생성 (1시간 투표 기간)
          const oneHour = 60 * 60;
          await createVote(
            "기본 수수료 변경",
            "DAO의 기본 수수료율을 변경하는 제안입니다",
            1, // 1: ChangeBaseFee
            ["5", "10", "15"],
            oneHour
          );
          break;
          
        default:
          console.log('지원되는 명령: deposit, content, vote');
      }
      
      console.log('실행 완료!');
    } catch (error) {
      console.error('실행 중 오류 발생:', error);
    }
  }
  
  // 실행
  main();
  