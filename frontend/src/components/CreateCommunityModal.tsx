"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction, 
  SystemProgram, 
  LAMPORTS_PER_SOL
} from "@solana/web3.js";
import axios from "axios";
import { Button } from "./Button";


// 프로그램 ID 설정 (제공된 코드에서 가져옴)
const PROGRAM_ID = new PublicKey("G5658prSBac5RRSsy16qjvp9awxxpa7a4tsZZJrG8kjP");

// 타입 정의
type CreateCommunityModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (communityData: {
    name: string;
    description: string;
    bountyAmount: number;
    timeLimit: number;
    baseFee: number;
    socialLinks: {
      github?: string;
      twitter?: string;
      telegram?: string;
    };
    profileImage?: string;
    pda?: string; // 생성된 PDA 추가
  }) => void;
};

// 백엔드 연동을 위한 타입
interface CommunityData {
  admin: string;
  time_limit: number;
  base_fee: number;
  ai_moderation: boolean;
  deposit_share: number;
  last_activity_timestamp: number;
  total_deposit: number;
  active_proposal_count: number;
  content_count: number;
  depositor_count: number;
}

interface DepositorData {
  pubkey: string;
  amount: number;
  locked_until: number;
  voting_power: number;
}

interface DaopdaData {
  address: string;
}

// InitializeDao 명령어를 생성하는 함수
function createInitializeDaoInstruction(
  walletPubkey: PublicKey,
  daoPda: PublicKey,
  daoName: string,
  timeLimit: number,
  baseFee: number,
  aiModeration: boolean = false,
  depositShare: number = 0
): TransactionInstruction {
  // 명령어 데이터 생성 - InitializeDao는 명령어 코드 0
  
  // 1. 문자열과 바이트 데이터 준비
  const nameBytes = Buffer.from(daoName);
  
  // 2. 총 명령어 데이터 크기 계산
  // 1(명령어) + 4(문자열 길이) + daoName 길이 + 8(time_limit) + 8(base_fee) + 1(ai_moderation) + 1(deposit_share)
  const instructionData = Buffer.alloc(1 + 4 + nameBytes.length + 8 + 8 + 1 + 1);
  let offset = 0;
  
  // 3. 명령어 코드(0) 기록
  instructionData[offset] = 0; // InitializeDao instruction
  offset += 1;
  
  // 4. DAO 이름 길이와 내용 기록
  instructionData.writeUInt32LE(nameBytes.length, offset);
  offset += 4;
  nameBytes.copy(instructionData, offset);
  offset += nameBytes.length;
  
  // 5. time_limit 기록 (u64, 리틀 엔디안)
  instructionData.writeBigUInt64LE(BigInt(timeLimit), offset);
  offset += 8;
  
  // 6. base_fee 기록 (u64, 리틀 엔디안)
  instructionData.writeBigUInt64LE(BigInt(baseFee), offset);
  offset += 8;
  
  // 7. ai_moderation 기록 (bool, 1바이트)
  instructionData[offset] = aiModeration ? 1 : 0;
  offset += 1;
  
  // 8. deposit_share 기록 (u8, 1바이트)
  instructionData[offset] = depositShare;
  
  // 9. 트랜잭션 인스트럭션 생성
  return new TransactionInstruction({
    keys: [
      { pubkey: walletPubkey, isSigner: true, isWritable: true },
      { pubkey: daoPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    programId: PROGRAM_ID,
    data: instructionData
  });
}

// 예치(Deposit) 명령어를 생성하는 함수
function createDepositInstruction(
  walletPubkey: PublicKey,
  daoPda: PublicKey,
  amount: number
): TransactionInstruction {
  // 예시 코드와 동일하게 구현
  const instructionData = Buffer.alloc(9);
  instructionData[0] = 1; // Deposit instruction
  instructionData.writeBigUInt64LE(BigInt(amount), 1);
  
  return new TransactionInstruction({
    keys: [
      { pubkey: walletPubkey, isSigner: true, isWritable: true },
      { pubkey: daoPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    programId: PROGRAM_ID,
    data: instructionData
  });
}

// 디버깅 함수: 버퍼 내용 출력
function logBuffer(buffer: Buffer, name = "버퍼") {
  console.log(`${name} (${buffer.length} 바이트):`, 
    Buffer.from(buffer).toString('hex').match(/../g)?.join(' '));
}

export function CreateCommunityModal({ isOpen, onClose, onSubmit }: CreateCommunityModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bountyAmount, setBountyAmount] = useState(1);
  const [timeLimit, setTimeLimit] = useState(30);
  const [baseFee, setBaseFee] = useState(0.05);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // SNS Integration
  const [githubUsername, setGithubUsername] = useState("");
  const [twitterUsername, setTwitterUsername] = useState("");
  const [telegramUsername, setTelegramUsername] = useState("");
  const [profileImage, setProfileImage] = useState("");
  
  // For demo purposes only - in real app would be replaced with actual authentication
  const [isGithubConnected, setIsGithubConnected] = useState(false);
  const [isTwitterConnected, setIsTwitterConnected] = useState(false);
  const [isTelegramConnected, setIsTelegramConnected] = useState(false);
  
  // 솔라나 지갑 연동
  const wallet = useWallet();


  // 폼 초기화 함수
  const resetForm = () => {
    setName("");
    setDescription("");
    setBountyAmount(1);
    setTimeLimit(30);
    setBaseFee(0.05);
    setGithubUsername("");
    setTwitterUsername("");
    setTelegramUsername("");
    setProfileImage("");
    setIsGithubConnected(false);
    setIsTwitterConnected(false);
    setIsTelegramConnected(false);
    setError(null);
  };
  
  // 백엔드에 PDA 저장
  const savePdaToBackend = async (pda: string) => {
    try {
      const daopdaData: DaopdaData = {
        address: pda
      };
      
      await axios.post('http://localhost:8080/api/dao/pda', daopdaData);
      console.log("PDA 정보 저장 완료:", pda);
    } catch (err) {
      console.error("PDA 저장 중 오류 발생:", err);
      throw new Error("PDA 정보 저장에 실패했습니다.");
    }
  };

  // 백엔드에 커뮤니티 정보 저장
  const saveCommunityToBackend = async (pda: string, communityData: CommunityData) => {
    try {
      await axios.post(`http://localhost:8080/api/dao/community?pda=${pda}`, communityData);
      console.log("커뮤니티 정보 저장 완료:", communityData);
    } catch (err) {
      console.error("커뮤니티 정보 저장 중 오류 발생:", err);
      throw new Error("커뮤니티 정보 저장에 실패했습니다.");
    }
  };

  // 예치금 전송 함수
  const depositToNewCommunity = async (pdaString: string, amount: number) => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error("지갑이 연결되어 있지 않습니다.");
    }
    
    try {
      // 1. PublicKey 객체 생성
      const daoPda = new PublicKey(pdaString);
      
      // 2. 솔라나 연결 설정
      const connection = new Connection("https://api.devnet.solana.com", "confirmed");
      
      // 3. 예치 명령어 생성
      const depositInstruction = createDepositInstruction(
        wallet.publicKey,
        daoPda,
        amount
      );
      
      // 디버깅용
      logBuffer(depositInstruction.data, "예치 명령 데이터");
      
      // 4. 트랜잭션 생성
      const transaction = new Transaction();
      
      // 5. 최근 블록해시 가져오기 (트랜잭션 만료시간 설정) - 이 부분이 누락됨
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;
      
      // 6. 인스트럭션 추가
      transaction.add(depositInstruction);
      
      // 7. 트랜잭션 서명
      const signedTransaction = await wallet.signTransaction(transaction);
      
      // 8. 트랜잭션 전송 및 확인
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      await connection.confirmTransaction(signature);
      
      console.log(`${amount / LAMPORTS_PER_SOL} SOL 예치 완료, 트랜잭션 ID:`, signature);
      
      // 9. 백엔드에 예치자 정보 저장
      const currentTime = Math.floor(Date.now() / 1000);
      const lockPeriod = timeLimit * 60; // timeLimit(분)을 초 단위로 변환
      
      const depositorData: DepositorData = {
        pubkey: wallet.publicKey.toString(),
        amount: amount,
        locked_until: currentTime + lockPeriod,
        voting_power: amount
      };
      
      await axios.post(`http://localhost:8080/api/dao/depositor?pda=${pdaString}`, depositorData);
      
      return signature;
    } catch (err) {
      console.error("예치금 처리 중 오류 발생:", err);
      throw new Error("예치금 처리에 실패했습니다.");
    }
  };

  
  // 커뮤니티 생성 및 예치금 처리 함수
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!wallet.connected || !wallet.publicKey || !wallet.signTransaction) {
      setError("지갑이 연결되어 있지 않습니다.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // 1. PDA 생성 (DAO 계정 주소)
      const daoName = name.trim();
      const timeLimitSeconds = timeLimit * 60; // 분을 초로 변환
      const baseFeePercentage = Math.floor(baseFee * 100); // 백분율로 변환 (0.05 -> 5%)
      const depositAmount = bountyAmount * LAMPORTS_PER_SOL; // SOL을 lamports로 변환
      
      // DAO PDA 생성
      const [daoPda, bumpSeed] = await PublicKey.findProgramAddress(
        [
          Buffer.from("dao"),
          wallet.publicKey.toBuffer(),
          Buffer.from(daoName)
        ],
        PROGRAM_ID
      );
      
      console.log("생성될 DAO PDA:", daoPda.toString());
      console.log("Bump seed:", bumpSeed);
      
      // 2. 솔라나 연결 설정
      const connection = new Connection("https://api.devnet.solana.com", "confirmed");
      
      // 3. DAO 초기화 트랜잭션 생성
      const initializeDaoInstruction = createInitializeDaoInstruction(
        wallet.publicKey,
        daoPda,
        daoName,
        timeLimitSeconds,
        baseFeePercentage,
        false, // ai_moderation
        0 // deposit_share
      );
      
      // 디버깅용
      logBuffer(initializeDaoInstruction.data, "DAO 초기화 명령 데이터");
      
      // 4. 트랜잭션 생성 및 서명
      const transaction = new Transaction().add(initializeDaoInstruction);
      
      // 최근 블록해시 가져오기 (트랜잭션 만료시간 설정)
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;
      
      // 5. 지갑에서 트랜잭션 서명
      const signedTransaction = await wallet.signTransaction(transaction);
      
      // 6. 트랜잭션 전송 및 확인
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      await connection.confirmTransaction(signature, "confirmed");
      
      console.log("DAO 생성 완료, 트랜잭션 ID:", signature);
      
      // 7. 백엔드에 PDA 정보 저장
      await savePdaToBackend(daoPda.toString());
      
      // 8. 백엔드에 커뮤니티 정보 저장
      await saveCommunityToBackend(daoPda.toString(), {
        admin: wallet.publicKey.toString(),
        time_limit: timeLimitSeconds,
        base_fee: baseFeePercentage,
        ai_moderation: false,
        deposit_share: 0,
        last_activity_timestamp: Math.floor(Date.now() / 1000),
        total_deposit: 0,
        active_proposal_count: 0,
        content_count: 0,
        depositor_count: 0
      });
      
      // 9. 초기 예치금 전송 (bountyAmount만큼)
      if (bountyAmount > 0) {
        await depositToNewCommunity(daoPda.toString(), depositAmount);
      }
      
      // 10. 폼 제출 완료 처리
      onSubmit({
        name: daoName,
        description,
        bountyAmount,
        timeLimit,
        baseFee,
        socialLinks: {
          github: isGithubConnected ? githubUsername : undefined,
          twitter: isTwitterConnected ? twitterUsername : undefined,
          telegram: isTelegramConnected ? telegramUsername : undefined,
        },
        profileImage,
        pda: daoPda.toString()
      });
      
      resetForm();
      onClose();
    } catch (err: any) {
      console.error("커뮤니티 생성 중 오류 발생:", err);
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white border-4 border-black max-w-3xl w-full max-h-[90vh] overflow-y-auto font-silkscreen">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6 border-b-4 border-black pb-4">
            <h2 className="text-2xl font-bold uppercase text-black">NEW COMMUNITY</h2>
            <button 
              onClick={onClose}
              className="bg-red-500 text-black border-4 border-black px-4 py-2 hover:bg-red-600 uppercase font-bold"
            >
              X
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* 기본 정보 섹션 */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block mb-2 font-bold uppercase text-black">NAME</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border-4 border-black bg-blue-100 focus:bg-blue-50 uppercase text-black"
                />
              </div>
              
              <div>
                <label className="block mb-2 font-bold uppercase text-black">DESCRIPTION</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  required
                  className="w-full px-3 py-2 border-4 border-black bg-blue-100 focus:bg-blue-50 uppercase text-black"
                />
              </div>

              <div>
                <label className="block mb-2 font-bold uppercase text-black">BOUNTY (SOL)</label>
                <div className="flex items-center gap-4 bg-blue-100 border-4 border-black p-3">
                  <input
                    type="range"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={bountyAmount}
                    onChange={(e) => setBountyAmount(parseFloat(e.target.value))}
                    className="flex-grow h-4 accent-blue-500"
                  />
                  <span className="w-20 text-right bg-yellow-300 border-4 border-black p-1 text-black">{bountyAmount} SOL</span>
                </div>
              </div>

              <div>
                <label className="block mb-2 font-bold uppercase text-black">TIME LIMIT (MIN)</label>
                <div className="flex items-center gap-4 bg-blue-100 border-4 border-black p-3">
                  <input
                    type="range"
                    min="1"
                    max="60"
                    step="1"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                    className="flex-grow h-4 accent-blue-500"
                  />
                  <span className="w-20 text-right bg-green-300 border-4 border-black p-1 text-black">{timeLimit} MIN</span>
                </div>
              </div>

              <div>
                <label className="block mb-2 font-bold uppercase text-black">BASE FEE (%)</label>
                <div className="flex items-center gap-4 bg-blue-100 border-4 border-black p-3">
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={baseFee * 100}
                    onChange={(e) => setBaseFee(parseInt(e.target.value) / 100)}
                    className="flex-grow h-4 accent-blue-500"
                  />
                  <span className="w-20 text-right bg-red-300 border-4 border-black p-1 text-black">{(baseFee * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>

            {/* 소셜 연결 섹션 */}
            <div className="border-t-4 border-black pt-6 mb-6">
              <h3 className="text-lg font-bold mb-4 uppercase text-black">SOCIAL CONNECT</h3>
              
              <div className="space-y-4">
                {/* GitHub */}
                <div className="flex items-center gap-4 bg-gray-100 border-4 border-black p-3">
                  <span className="uppercase text-black">GITHUB:</span>
                  {isGithubConnected ? (
                    <div className="flex-grow flex items-center gap-2">
                      <input
                        type="text"
                        value={githubUsername}
                        onChange={(e) => setGithubUsername(e.target.value)}
                        placeholder="GITHUB USERNAME"
                        className="flex-grow px-3 py-2 border-4 border-black uppercase text-black"
                      />
                      <button
                        type="button"
                        onClick={() => setIsGithubConnected(false)}
                        className="bg-red-500 text-black border-4 border-black px-4 py-2 uppercase font-bold"
                      >
                        X
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsGithubConnected(true)}
                      className="bg-green-500 text-black border-4 border-black px-4 py-2 hover:bg-green-600 uppercase font-bold"
                    >
                      CONNECT
                    </button>
                  )}
                </div>
                
                {/* Twitter */}
                <div className="flex items-center gap-4 bg-gray-100 border-4 border-black p-3">
                  <span className="uppercase text-black">TWITTER:</span>
                  {isTwitterConnected ? (
                    <div className="flex-grow flex items-center gap-2">
                      <input
                        type="text"
                        value={twitterUsername}
                        onChange={(e) => setTwitterUsername(e.target.value)}
                        placeholder="TWITTER USERNAME"
                        className="flex-grow px-3 py-2 border-4 border-black uppercase text-black"
                      />
                      <button
                        type="button"
                        onClick={() => setIsTwitterConnected(false)}
                        className="bg-red-500 text-black border-4 border-black px-4 py-2 uppercase font-bold"
                      >
                        X
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsTwitterConnected(true)}
                      className="bg-blue-500 text-black border-4 border-black px-4 py-2 hover:bg-blue-600 uppercase font-bold"
                    >
                      CONNECT
                    </button>
                  )}
                </div>
                
                {/* Telegram */}
                <div className="flex items-center gap-4 bg-gray-100 border-4 border-black p-3">
                  <span className="uppercase text-black">TELEGRAM:</span>
                  {isTelegramConnected ? (
                    <div className="flex-grow flex items-center gap-2">
                      <input
                        type="text"
                        value={telegramUsername}
                        onChange={(e) => setTelegramUsername(e.target.value)}
                        placeholder="TELEGRAM USERNAME"
                        className="flex-grow px-3 py-2 border-4 border-black uppercase text-black"
                      />
                      <button
                        type="button"
                        onClick={() => setIsTelegramConnected(false)}
                        className="bg-red-500 text-black border-4 border-black px-4 py-2 uppercase font-bold"
                      >
                        X
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsTelegramConnected(true)}
                      className="bg-cyan-500 text-black border-4 border-black px-4 py-2 hover:bg-cyan-600 uppercase font-bold"
                    >
                      CONNECT
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 프로필 이미지 섹션 */}
            <div className="border-t-4 border-black pt-6 mb-6">
              <h3 className="text-lg font-bold mb-4 uppercase text-black">PROFILE IMAGE</h3>
              
              <div className="flex items-center gap-4 bg-gray-100 border-4 border-black p-3">
                <div className="w-16 h-16 border-4 border-black overflow-hidden">
                  {profileImage ? 
                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" /> : 
                    <div className="bg-gray-300 w-full h-full flex items-center justify-center">
                      <span className="uppercase text-black">IMG</span>
                    </div>
                  }
                </div>
                
                <input
                  type="text"
                  placeholder="IMAGE URL"
                  value={profileImage}
                  onChange={(e) => setProfileImage(e.target.value)}
                  className="flex-grow px-3 py-2 border-4 border-black uppercase text-black"
                />
              </div>
            </div>

            {/* 지갑 연결 상태 */}
            <div className="border-t-4 border-black pt-6 mb-6">
              <h3 className="text-lg font-bold mb-4 uppercase text-black">WALLET STATUS</h3>
              
              <div className="flex items-center gap-4 bg-gray-100 border-4 border-black p-3">
                {wallet.connected ? (
                  <>
                    <div className="bg-green-500 h-6 w-6 border-4 border-black"></div>
                    <span className="uppercase text-black">CONNECTED: {wallet.publicKey?.toString().slice(0, 6)}...{wallet.publicKey?.toString().slice(-4)}</span>
                  </>
                ) : (
                  <>
                    <div className="bg-red-500 h-6 w-6 border-4 border-black"></div>
                    <span className="uppercase text-black">NOT CONNECTED</span>
                  </>
                )}
              </div>
            </div>

            {/* 오류 메시지 */}
            {error && (
              <div className="bg-red-300 border-4 border-black px-4 py-3 mb-6">
                <span className="uppercase font-bold text-black">{error}</span>
                </div>
            )}

            {/* 제출 버튼 */}
            <div className="flex justify-end gap-4 border-t-4 border-black pt-6">
              <button 
                type="button" 
                onClick={onClose}
                className="bg-gray-300 border-4 border-black px-6 py-3 hover:bg-gray-400 uppercase font-bold text-black"
              >
                CANCEL
              </button>
              <button 
                type="submit" 
                disabled={isLoading || !wallet.connected}
                className={`
                  border-4 border-black px-6 py-3 uppercase font-bold text-black
                  ${!wallet.connected 
                    ? 'bg-gray-300 cursor-not-allowed' 
                    : isLoading 
                      ? 'bg-yellow-300 cursor-wait'
                      : 'bg-green-500 hover:bg-green-600'}
                `}
              >
                {isLoading ? "PROCESSING..." : "CREATE COMMUNITY"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
