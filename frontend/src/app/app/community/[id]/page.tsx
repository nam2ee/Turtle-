"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/Button";
import { PostDetailModal } from "@/components/PostDetailModal";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { 
  Connection,
  PublicKey, 
  Transaction, 
  TransactionInstruction,
  SystemProgram
} from "@solana/web3.js";
import axios from "axios";

// API 기본 URL 상수 정의 - 환경에 따라 변경 가능
const API_BASE_URL = "http://localhost:8080";

function getConsistentColor(id) {
  const colors = ['blue', 'green', 'red', 'yellow', 'purple', 'pink', 'indigo', 'teal', 'orange', 'cyan'];
  // ID를 숫자로 변환하여 일관된 인덱스 생성
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const primaryIdx = hash % colors.length;
  const secondaryIdx = (hash * 13) % colors.length; // 다른 해시 알고리즘 사용
  return `bg-gradient-to-r from-${colors[primaryIdx]}-400 to-${colors[secondaryIdx]}-500`;
}

// 개별 API 호출 함수 정의 - 재사용성을 위해
const fetchCommunityDetails = async (pda) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/dao/community?pda=${pda}`);
    if (!response.ok) throw new Error('Failed to fetch community details');
    return await response.json();
  } catch (error) {
    console.error("Error fetching community details:", error);
    return {};
  }
};

const fetchCommunityData = async (pda) => {
  try {
    // 특정 커뮤니티 정보만 직접 요청
    const response = await fetch(`${API_BASE_URL}/api/dao/community?pda=${pda}`);
    if (!response.ok) throw new Error('Failed to fetch community data');
    const data = await response.json();
    return data; // 직접 API 응답을 반환
  } catch (error) {
    console.error("Error fetching community data:", error);
    return null;
  }
};


const fetchCommunityDepositors = async (pda) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/dao/depositors?pda=${pda}`);
    if (!response.ok) throw new Error('Failed to fetch depositors');
    const data = await response.json();
    return data.depositors || [];
  } catch (error) {
    console.error("Error fetching depositors:", error);
    return [];
  }
};

const fetchCommunityPosts = async (pda) => {
  try {
    // 백엔드 API는 /api/dao/contents를 사용하지만, 클라이언트에서는 posts라는 이름으로 호출
    const response = await fetch(`${API_BASE_URL}/api/dao/contents?pda=${pda}`);
    if (!response.ok) throw new Error('Failed to fetch posts');
    const data = await response.json();
    return data.contents || []; // 백엔드 응답 형식에 맞게 조정
  } catch (error) {
    console.error("Error fetching posts:", error);
    return [];
  }
};

const fetchCommunityProposals = async (pda) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/dao/proposals?pda=${pda}`);
    if (!response.ok) throw new Error('Failed to fetch proposals');
    const data = await response.json();
    return data.proposals || [];
  } catch (error) {
    console.error("Error fetching proposals:", error);
    return [];
  }
};

// 게시물 생성 함수
const createPost = async (pda, content, author) => {
  try {
    // 백엔드 Content 구조체와 일치하도록 형식 조정
    const postData = {
      author: author,                         // 작성자 공개키
      content_hash: content,                  // 간단한 해시 대용으로 내용 그대로 사용
      content_uri: "",                        // IPFS 링크가 없으므로 빈 문자열
      timestamp: Math.floor(Date.now() / 1000), // 유닉스 타임스탬프(초 단위)
      votes: 0                                // 초기 투표 수
    };
    
    console.log("전송 데이터:", postData);  // 디버그용
    
    const response = await axios.post(`${API_BASE_URL}/api/dao/content?pda=${pda}`, postData);
    return response.data;
  } catch (error) {
    console.error("Error creating post:", error);
    if (error.response) {
      // 서버 응답 상세 정보 확인
      console.error("서버 응답 상세:", error.response.data);
    }
    throw error;
  }
};


// 좋아요 업데이트 함수
const updatePostLike = async (pda, postId, walletAddress) => {
  try {
    const likeData = {
      post_id: postId,
      wallet: walletAddress
    };
    
    const response = await axios.post(`${API_BASE_URL}/api/dao/like?pda=${pda}`, likeData);
    return response.data;
  } catch (error) {
    console.error("Error updating post like:", error);
    throw error;
  }
};

const fetchCommunityAllData = async (pda) => {
  try {
    console.log(`Fetching data for PDA: ${pda}`); // 디버깅용 로그

    // 직접 특정 커뮤니티 정보만 요청
    const communityResponse = await fetch(`${API_BASE_URL}/api/dao/community?pda=${pda}`);
    
    if (!communityResponse.ok) {
      console.error(`Failed to fetch community with status: ${communityResponse.status}`);
      throw new Error(`Failed to fetch community with PDA: ${pda}`);
    }
    
    const communityData = await communityResponse.json();
    console.log("Fetched community data:", communityData); // 디버깅용 로그

    // 병렬로 나머지 필요한 데이터 요청
    const [depositorsResponse, contentsResponse, proposalsResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/api/dao/depositors?pda=${pda}`),
      fetch(`${API_BASE_URL}/api/dao/contents?pda=${pda}`),
      fetch(`${API_BASE_URL}/api/dao/proposals?pda=${pda}`)
    ]);
    
    // 응답 데이터 처리
    let depositors = [];
    if (depositorsResponse.ok) {
      const data = await depositorsResponse.json();
      depositors = data.depositors || [];
    } else {
      console.error(`Failed to fetch depositors with status: ${depositorsResponse.status}`);
    }
    
    let posts = [];
    if (contentsResponse.ok) {
      const data = await contentsResponse.json();
      // 각 포스트에 고유 ID 추가
      posts = (data.contents || []).map((post, index) => ({
        ...post,
        id: `${post.author}-${post.timestamp}-${index}`
      }));
    } else {
      console.error(`Failed to fetch contents with status: ${contentsResponse.status}`);
    }
    
    let proposals = [];
    if (proposalsResponse.ok) {
      const data = await proposalsResponse.json();
      proposals = data.proposals || [];
    } else {
      console.error(`Failed to fetch proposals with status: ${proposalsResponse.status}`);
    }
    
    // 커뮤니티 상세 정보 직접 생성 (또는 별도의 API에서 가져옴)
    const details = {
      name: communityData.name || `Community ${pda.slice(0, 6)}...`,
      description: communityData.description || "A community on the Solana blockchain"
    };
    
    return {
      details,
      communityData, // 직접 가져온 커뮤니티 데이터
      depositors,
      posts,
      proposals
    };
  } catch (error) {
    console.error("Error fetching community data:", error);
    throw error;
  }
};



// 구조체 정의 (파일 상단에 추가)
interface DepositorData {
  pubkey: string;
  amount: number;
  locked_until: number;
  voting_power: number;
}

interface VotingData {
  title: string;
  description: string;
  vote_type: number;
  options: string[];
  voting_period: number;
}

// 프로그램 ID - 실제 배포된 프로그램 ID로 교체 필요
const PROGRAM_ID = new PublicKey("G5658prSBac5RRSsy16qjvp9awxxpa7a4tsZZJrG8kjP");

// 디버그용 함수
function logBuffer(buffer: Uint8Array, name: string = "버퍼") {
  const hexString = Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join(' ');
  console.log(`${name} (${buffer.length} 바이트):`, hexString);
}

// 예치 명령어 생성 함수
function createDepositInstruction(
  walletPubkey: PublicKey, 
  daoPda: PublicKey, 
  amount: number
): TransactionInstruction {
  // 인스트럭션 데이터: [1] (명령어) + amount (u64, 리틀 엔디안)
  const instructionData = new Uint8Array(9);
  instructionData[0] = 1; // Deposit instruction
  
  // amount를 리틀 엔디안 u64로 변환
  const amountBuf = new ArrayBuffer(8);
  const amountView = new DataView(amountBuf);
  amountView.setBigUint64(0, BigInt(amount), true); // true = 리틀 엔디안
  new Uint8Array(instructionData.buffer, 1, 8).set(new Uint8Array(amountBuf));
  
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

// 콘텐츠 제출 명령어 생성 함수
function createSubmitContentInstruction(
  walletPubkey: PublicKey,
  daoPda: PublicKey,
  text: string,
  imageUri: string = ""
): TransactionInstruction {
  const textBytes = new TextEncoder().encode(text);
  const imageUriBytes = new TextEncoder().encode(imageUri);
  
  // 명령어(1바이트) + text 길이(4바이트) + text + imageUri 길이(4바이트) + imageUri
  const instructionData = new Uint8Array(9 + textBytes.length + imageUriBytes.length);
  let offset = 0;
  
  // 명령어
  instructionData[offset] = 2; // SubmitContent instruction
  offset += 1;
  
  // text 길이 + 내용
  const textLenView = new DataView(instructionData.buffer, offset, 4);
  textLenView.setUint32(0, textBytes.length, true); // true = 리틀 엔디안
  offset += 4;
  
  instructionData.set(textBytes, offset);
  offset += textBytes.length;
  
  // imageUri 길이 + 내용
  const imageUriLenView = new DataView(instructionData.buffer, offset, 4);
  imageUriLenView.setUint32(0, imageUriBytes.length, true); // true = 리틀 엔디안
  offset += 4;
  
  instructionData.set(imageUriBytes, offset);
  
  return new TransactionInstruction({
    keys: [
      { pubkey: walletPubkey, isSigner: true, isWritable: true },
      { pubkey: daoPda, isSigner: false, isWritable: true }
    ],
    programId: PROGRAM_ID,
    data: instructionData
  });
}

// 투표 생성 명령어 생성 함수
function createVoteInstruction(
  walletPubkey: PublicKey,
  daoPda: PublicKey,
  voteData: VotingData
): TransactionInstruction {
  const titleBytes = new TextEncoder().encode(voteData.title);
  const descBytes = new TextEncoder().encode(voteData.description);
  
  // 옵션 문자열의 총 바이트 계산
  let optionsTotalBytes = 4; // Vec 길이 (4바이트)
  const optionBuffers = voteData.options.map(opt => {
    const buf = new TextEncoder().encode(opt);
    optionsTotalBytes += 4 + buf.length; // 각 문자열 길이(4바이트) + 내용
    return buf;
  });
  
  // 총 인스트럭션 데이터 크기 계산
  // 1(명령어) + 4+title길이 + 4+desc길이 + 1(voteType) + optionsTotalBytes + 8(votingPeriod)
  const totalSize = 1 + 4 + titleBytes.length + 4 + descBytes.length + 1 + optionsTotalBytes + 8;
  const instructionData = new Uint8Array(totalSize);
  
  let offset = 0;
  
  // 1. 명령어 (CreateVote = 3)
  instructionData[offset] = 3;
  offset += 1;
  
  // 2. 제목 (길이 + 내용)
  const titleLenView = new DataView(instructionData.buffer, offset, 4);
  titleLenView.setUint32(0, titleBytes.length, true); // true = 리틀 엔디안
  offset += 4;
  
  instructionData.set(titleBytes, offset);
  offset += titleBytes.length;
  
  // 3. 설명 (길이 + 내용)
  const descLenView = new DataView(instructionData.buffer, offset, 4);
  descLenView.setUint32(0, descBytes.length, true); // true = 리틀 엔디안
  offset += 4;
  
  instructionData.set(descBytes, offset);
  offset += descBytes.length;
  
  // 4. 투표 유형 (VoteType enum)
  instructionData[offset] = voteData.vote_type;
  offset += 1;
  
  // 5. 옵션 배열 (Vec<String>)
  const optionsLenView = new DataView(instructionData.buffer, offset, 4);
  optionsLenView.setUint32(0, voteData.options.length, true); // true = 리틀 엔디안
  offset += 4;
  
  // 각 옵션 추가
  for (const optBuffer of optionBuffers) {
    const optLenView = new DataView(instructionData.buffer, offset, 4);
    optLenView.setUint32(0, optBuffer.length, true); // true = 리틀 엔디안
    offset += 4;
    
    instructionData.set(optBuffer, offset); // 문자열 내용
    offset += optBuffer.length;
  }
  
  // 6. 투표 기간 (u64, 리틀 엔디안)
  const votingPeriodBuf = new ArrayBuffer(8);
  const votingPeriodView = new DataView(votingPeriodBuf);
  votingPeriodView.setBigUint64(0, BigInt(voteData.voting_period), true); // true = 리틀 엔디안
  instructionData.set(new Uint8Array(votingPeriodBuf), offset);
  
  return new TransactionInstruction({
    keys: [
      { pubkey: walletPubkey, isSigner: true, isWritable: true },
      { pubkey: daoPda, isSigner: false, isWritable: true }
    ],
    programId: PROGRAM_ID,
    data: instructionData
  });
}

// 투표 참여 명령어 생성 함수
function createCastVoteInstruction(
  walletPubkey: PublicKey,
  daoPda: PublicKey,
  proposalId: number,
  optionIndex: number
): TransactionInstruction {
  // 인스트럭션 데이터: [4] (명령어) + proposalId (u64) + optionIndex (u8)
  const instructionData = new Uint8Array(10);
  instructionData[0] = 4; // CastVote instruction
  
  // proposalId를 u64로 변환
  const proposalIdBuf = new ArrayBuffer(8);
  const proposalIdView = new DataView(proposalIdBuf);
  proposalIdView.setBigUint64(0, BigInt(proposalId), true); // true = 리틀 엔디안
  instructionData.set(new Uint8Array(proposalIdBuf), 1);
  
  // optionIndex
  instructionData[9] = optionIndex;
  
  return new TransactionInstruction({
    keys: [
      { pubkey: walletPubkey, isSigner: true, isWritable: true },
      { pubkey: daoPda, isSigner: false, isWritable: true }
    ],
    programId: PROGRAM_ID,
    data: instructionData
  });
}

export default function CommunityDetailPage() {
  const params = useParams();
  const { publicKey, connected, wallet } = useWallet();
  const communityId = params.id as string;
  
  const [isPixelMode] = useState(true); // 픽셀 모드 고정
  const [newPost, setNewPost] = useState("");
  const [posts, setPosts] = useState([]);
  const [gridView, setGridView] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  
  // 커뮤니티 데이터 상태
  const [communityDetails, setCommunityDetails] = useState(null);
  const [communityData, setCommunityData] = useState(null);
  const [depositors, setDepositors] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  
  // 종료 시간 관련 상태 - 별도 계산 없이 직접 저장
  const [expirationTime, setExpirationTime] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [isExpired, setIsExpired] = useState(false);
  const [communityGradient, setCommunityGradient] = useState('');

  // Tab 관련 상태
  const [activeTab, setActiveTab] = useState('posts');
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState(0.1);
  const [isVotingModalOpen, setIsVotingModalOpen] = useState(false);
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);

  // 참조 변수로 데이터 로드 상태 추적 - 여러 번 로드 방지
  const dataLoadedRef = useRef(false);

  // 예치금 전송 함수
  const depositToNewCommunity = async (pdaString: string, amount: number) => {
    if (!publicKey) {
      throw new Error("지갑이 연결되어 있지 않습니다.");
    }

    try {
      // 1. PublicKey 객체 생성
      const daoPda = new PublicKey(pdaString);

      // 2. 솔라나 연결 설정
      const connection = new Connection("https://api.devnet.solana.com", "confirmed");

      // 3. 예치 명령어 생성
      const depositInstruction = createDepositInstruction(
        publicKey,
        daoPda,
        amount
      );

      // 디버깅용
      logBuffer(depositInstruction.data, "예치 명령 데이터");

      // 4. 트랜잭션 생성
      const transaction = new Transaction();

      // 5. 최근 블록해시 가져오기 (트랜잭션 만료시간 설정)
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

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
      const lockPeriod = communityInfo.timeLimitSeconds; // 초 단위 타임리밋

      const depositorData: DepositorData = {
        pubkey: publicKey.toString(),
        amount: amount,
        locked_until: currentTime + lockPeriod,
        voting_power: amount
      };

      await axios.post(`${API_BASE_URL}/api/dao/depositor?pda=${pdaString}`, depositorData);

      // 10. 데이터 새로고침 - 전체 데이터를 다시 로드하여 일관성 유지
      const allData = await fetchCommunityAllData(pdaString);
      setDepositors(allData.depositors);
      setCommunityData(allData.communityData);

      return signature;
    } catch (err) {
      console.error("예치금 처리 중 오류 발생:", err);
      throw new Error("예치금 처리에 실패했습니다.");
    }
  };

  // 예치 처리 핸들러
  const handleDeposit = async (amount: number) => {
    try {
      setIsSubmittingDeposit(true);
      await depositToNewCommunity(communityId, amount);
      setIsDepositModalOpen(false);
      // 화면에 성공 메시지 표시
      alert("예치금이 성공적으로 처리되었습니다!");
    } catch (error) {
      console.error("예치금 처리 오류:", error);
      alert("예치금 처리 중 오류가 발생했습니다.");
    } finally {
      setIsSubmittingDeposit(false);
    }
  };

  // 콘텐츠 제출 함수 - 기존 submitPost 함수를 대체

  const submitPost = async () => {
    if (newPost.trim().length === 0 || !publicKey || isExpired || isSubmittingPost) return;
  
    try {
      setIsSubmittingPost(true);
  
      // 1. 지갑 연결 및 기능 확인
      if (!wallet) {
        throw new Error("지갑이 연결되지 않았습니다. 먼저 지갑을 연결해주세요.");
      }
  
      if (!publicKey) {
        throw new Error("공개키를 가져올 수 없습니다. 지갑 연결을 확인해주세요.");
      }
  
      // 명시적 지갑 서명 기능 확인
      if (!wallet.adapter || typeof wallet.adapter.signTransaction !== 'function') {
        console.error("지갑 어댑터:", wallet.adapter);
        throw new Error("현재 지갑은 트랜잭션 서명 기능을 지원하지 않습니다. 다른 지갑을 사용해보세요.");
      }
  
      // 2. PublicKey 객체 생성
      const daoPda = new PublicKey(communityId);
  
      // 3. 솔라나 연결 설정
      const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
      // 4. 콘텐츠 제출 명령어 생성
      const contentInstruction = createSubmitContentInstruction(
        publicKey,
        daoPda,
        newPost
      );
  
      // 5. 트랜잭션 생성
      const transaction = new Transaction();
      
      // 6. 최근 블록해시 가져오기
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;
  
      // 7. 인스트럭션 추가
      transaction.add(contentInstruction);
  
      // 8. 지갑으로 트랜잭션 서명 시도
      console.log("트랜잭션 서명 시도 중...");
      let signedTransaction;
      
      try {
        // 어댑터를 통한 직접 서명 시도
        signedTransaction = await wallet.signTransaction(transaction);
      } catch (signError) {
        console.error("지갑 서명 중 오류:", signError);
        
        // 백업 방법: 어댑터를 통한 서명 시도
        if (wallet.adapter && typeof wallet.adapter.signTransaction === 'function') {
          try {
            signedTransaction = await wallet.adapter.signTransaction(transaction);
          } catch (adapterError) {
            console.error("어댑터 서명 중 오류:", adapterError);
            throw new Error("트랜잭션 서명에 실패했습니다. 지갑이 잠겨있거나 권한이 없습니다.");
          }
        } else {
          throw new Error("지갑 서명 기능을 사용할 수 없습니다. 지갑 재연결 후 다시 시도해주세요.");
        }
      }
  
      if (!signedTransaction) {
        throw new Error("서명된 트랜잭션을 생성하지 못했습니다.");
      }
  
      // 9. 트랜잭션 전송 및 확인
      console.log("서명된 트랜잭션 전송 중...");
      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      await connection.confirmTransaction(signature);
  
      console.log(`콘텐츠 제출 완료, 트랜잭션 ID:`, signature);
  
      // 10. 백엔드에 콘텐츠 정보 저장
      await createPost(communityId, newPost, publicKey.toString());
  
      // 11. UI 업데이트
      setNewPost("");
  
      // 12. 전체 데이터를 다시 로드하여 일관성 유지
      const allData = await fetchCommunityAllData(communityId);
      setPosts(allData.posts);
      setCommunityData(allData.communityData);
      
      alert("게시물이 성공적으로 제출되었습니다!");
      
    } catch (error) {
      console.error("콘텐츠 제출 중 오류 발생:", error);
      alert(`게시물 제출 실패: ${error.message || "알 수 없는 오류가 발생했습니다"}`);
    } finally {
      setIsSubmittingPost(false);
    }
  };

  

  // 투표 제안 생성 함수
  const createVoteProposal = async (votingData: VotingData) => {
    if (!publicKey) {
      throw new Error("지갑이 연결되어 있지 않습니다.");
    }

    try {
      // 1. PublicKey 객체 생성
      const daoPda = new PublicKey(communityId);

      // 2. 솔라나 연결 설정
      const connection = new Connection("https://api.devnet.solana.com", "confirmed");

      // 3. 투표 생성 명령어 생성
      const voteInstruction = createVoteInstruction(
        publicKey,
        daoPda,
        votingData
      );

      // 4. 트랜잭션 생성
      const transaction = new Transaction();

      // 5. 최근 블록해시 가져오기
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // 6. 인스트럭션 추가
      transaction.add(voteInstruction);

      // 7. 지갑으로 트랜잭션 서명
      if (!wallet.signTransaction) {
        throw new Error("지갑이 서명 기능을 지원하지 않습니다.");
      }

      const signedTransaction = await wallet.signTransaction(transaction);

            // 8. 트랜잭션 전송 및 확인
            const signature = await connection.sendRawTransaction(signedTransaction.serialize());
            await connection.confirmTransaction(signature);
      
            console.log(`투표 제안 생성 완료, 트랜잭션 ID:`, signature);
      
            // 9. 백엔드에 투표 제안 정보 저장
            const proposalData = {
              title: votingData.title,
              description: votingData.description,
              vote_type: votingData.vote_type,
              options: votingData.options,
              voting_period: votingData.voting_period,
              proposer: publicKey.toString(),
              start_time: Math.floor(Date.now() / 1000),
              end_time: Math.floor(Date.now() / 1000) + votingData.voting_period,
              votes: []
            };
      
            await axios.post(`${API_BASE_URL}/api/dao/proposal?pda=${communityId}`, proposalData);
      
            // 전체 데이터를 다시 로드하여 일관성 유지
            const allData = await fetchCommunityAllData(communityId);
            setProposals(allData.proposals);
      
            return signature;
          } catch (error) {
            console.error("투표 제안 생성 중 오류 발생:", error);
            throw new Error("투표 제안 생성에 실패했습니다.");
          }
        };
      
        // 투표 제안 핸들러
        const handleCreateVoteProposal = async (votingData: VotingData) => {
          try {
            setIsSubmittingVote(true);
            await createVoteProposal(votingData);
            setIsVotingModalOpen(false);
      
            // 화면에 성공 메시지 표시
            alert("투표 제안이 성공적으로 생성되었습니다!");
          } catch (error) {
            console.error("투표 제안 생성 오류:", error);
            alert("투표 제안 생성 중 오류가 발생했습니다.");
          } finally {
            setIsSubmittingVote(false);
          }
        };
      
        // 투표 참여 함수
        const castVote = async (proposalId: number, optionIndex: number) => {
          if (!publicKey) {
            throw new Error("지갑이 연결되어 있지 않습니다.");
          }
      
          try {
            // 1. PublicKey 객체 생성
            const daoPda = new PublicKey(communityId);
      
            // 2. 솔라나 연결 설정
            const connection = new Connection("https://api.devnet.solana.com", "confirmed");
      
            // 3. 투표 참여 명령어 생성
            const castVoteInstruction = createCastVoteInstruction(
              publicKey,
              daoPda,
              proposalId,
              optionIndex
            );
      
            // 4. 트랜잭션 생성
            const transaction = new Transaction();
      
            // 5. 최근 블록해시 가져오기
            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = publicKey;
      
            // 6. 인스트럭션 추가
            transaction.add(castVoteInstruction);
      
            // 7. 지갑으로 트랜잭션 서명
            if (!wallet.signTransaction) {
              throw new Error("지갑이 서명 기능을 지원하지 않습니다.");
            }
      
            const signedTransaction = await wallet.signTransaction(transaction);
      
            // 8. 트랜잭션 전송 및 확인
            const signature = await connection.sendRawTransaction(signedTransaction.serialize());
            await connection.confirmTransaction(signature);
      
            console.log(`투표 참여 완료, 트랜잭션 ID:`, signature);
      
            // 투표 정보 백엔드에 저장 (백엔드 API 구현 필요)
            const voteData = {
              proposal_id: proposalId,
              voter: publicKey.toString(),
              option_index: optionIndex,
              voting_power: 1 // 실제 투표력은 백엔드에서 계산
            };
            
            await axios.post(`${API_BASE_URL}/api/dao/vote?pda=${communityId}`, voteData);
      
            // 전체 데이터를 다시 로드하여 일관성 유지
            const allData = await fetchCommunityAllData(communityId);
            setProposals(allData.proposals);
      
            return signature;
          } catch (error) {
            console.error("투표 참여 중 오류 발생:", error);
            throw new Error("투표 참여에 실패했습니다.");
          }
        };
      
        const handleCastVote = async (proposalId: number, optionIndex: number) => {
          try {
            await castVote(proposalId, optionIndex);
            setSelectedProposal(null);
            
            // 화면에 성공 메시지 표시
            alert("투표가 성공적으로 처리되었습니다!");
          } catch (error) {
            console.error("투표 처리 오류:", error);
            alert("투표 처리 중 오류가 발생했습니다.");
          }
        };
      
        // 데이터 로딩 통합 useEffect - 중요한 개선 부분


        useEffect(() => {
          if (dataLoadedRef.current) return;
          
          const loadCommunityData = async () => {
            if (!communityId) return;
        
            try {
              setIsLoading(true);
              setError(null);
              
              console.log("Loading data for community ID:", communityId); // 디버깅용 로그 추가
              
              // 모든 데이터를 한 번에 가져오기
              const allData = await fetchCommunityAllData(communityId);
              
              // 상태 업데이트
              setCommunityDetails(allData.details);
              setCommunityData(allData.communityData);
              setDepositors(allData.depositors);
              setPosts(allData.posts);
              setProposals(allData.proposals);
              
              // 일관된 그라데이션 색상 설정 (ID 기반)
              setCommunityGradient(getConsistentColor(communityId));
              
              // 데이터 로드 완료 표시
              dataLoadedRef.current = true;
              
              // 시간 관련 데이터 계산 및 설정
              if (allData.communityData) {
                const timeLimitSeconds = allData.communityData.time_limit || 108000;
                const timestamp = Number(allData.communityData.last_activity_timestamp);
                
                console.log("타임스탬프 값:", timestamp); // 실제 타임스탬프 값 확인
                console.log("시간 제한(초):", timeLimitSeconds);
                
                if (timestamp && !isNaN(timestamp)) {
                  const expiryTime = new Date((timestamp + timeLimitSeconds) * 1000);
                  console.log("계산된 만료 시간:", expiryTime.toISOString());
                  setExpirationTime(expiryTime);
                  
                  // 만료 여부 초기 설정
                  const now = new Date();
                  setIsExpired(now > expiryTime);
                }
              }
              
              setIsLoading(false);
            } catch (err) {
              console.error("Error loading community data:", err);
              setError(err.message || "Failed to load community data");
              setIsLoading(false);
            }
          };
        
          loadCommunityData();
        }, [communityId]);

        

        
      
        // 커뮤니티 정보 가공 - useMemo로 성능 최적화
        const communityInfo = useMemo(() => {
          if (!communityData) return null;
          
          // 예치자 정보에서 직접 합산 - 더 정확한 데이터
          const totalLamportsFromDepositors = depositors.reduce((sum, depositor) => {
            return sum + (depositor.amount || 0);
          }, 0);
          
          // Lamports를 SOL로 변환
          const totalLamportsFromAPI = communityData.total_deposit || 0;
          const totalLamports = totalLamportsFromDepositors > 0 ? 
            totalLamportsFromDepositors : totalLamportsFromAPI;
          const bountyAmount = totalLamports / LAMPORTS_PER_SOL;
          
          // 시간 제한 초 단위로 저장 (원본 값)
          const timeLimitSeconds = communityData.time_limit || 108000; // 기본값 30시간(108000초)
          
          // 시간 제한을 분 단위로 변환 (초 -> 분) - 표시용
          const timeLimitMinutes = Math.round(timeLimitSeconds / 60);
          
          // 기본 수수료를 SOL로 변환
          const baseFee = (communityData.base_fee || 0) / LAMPORTS_PER_SOL;
          
          // 마지막 활동 시간 처리
          let lastActivityTime = null;
          let lastActivityTimeFormatted = "Never";
          let expirationTimeValue = expirationTime; // 외부 상태에서 가져오기
          let expirationTimeFormatted = "Unknown";
          
          if (communityData.last_activity_timestamp && !isNaN(Number(communityData.last_activity_timestamp))) {
            const timestamp = Number(communityData.last_activity_timestamp);
            lastActivityTime = new Date(timestamp * 1000); // 초 단위를 밀리초로 변환
            
            // 날짜 포맷팅 (예: "Mar 9, 2025, 4:01 PM")
            lastActivityTimeFormatted = new Intl.DateTimeFormat('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }).format(lastActivityTime);
            
            if (expirationTimeValue) {
              expirationTimeFormatted = new Intl.DateTimeFormat('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              }).format(expirationTimeValue);
            }
          }
          
          const communityName = communityDetails?.name || `Community ${communityId.slice(0, 6)}...`;
          const communityDescription = communityDetails?.description || `A community on the Solana blockchain`;
          
          return {
            name: communityName,
            description: communityDescription,
            bountyAmount,
            gradient: communityGradient, // 일관된 그라데이션 사용
            timeLimit: timeLimitMinutes,
            timeLimitSeconds,
            baseFee,
            lastActivityTime,
            lastActivityTimeFormatted,
            expirationTime: expirationTimeValue,
            expirationTimeFormatted,
            depositerCount: depositors.length, // 실제 배열 길이 사용
            challengerCount: posts.length || 0,
            admin: communityData.admin
          };
        }, [communityData, communityDetails, depositors, posts, communityId, communityGradient, expirationTime]);
      
        // 실시간 카운트다운 업데이트 - 일정 간격으로 업데이트
        useEffect(() => {
          if (!expirationTime) return;
          
          // 초기 업데이트
          const updateRemainingTime = () => {
            const now = new Date();
            const diffInSeconds = Math.floor((expirationTime - now) / 1000);
            
            if (diffInSeconds <= 0) {
              setIsExpired(true);
              setTimeRemaining("Expired");
            } else {
              setIsExpired(false);
              
              // 남은 시간 계산 (일, 시간, 분)
              const days = Math.floor(diffInSeconds / 86400);
              const hours = Math.floor((diffInSeconds % 86400) / 3600);
              const minutes = Math.floor((diffInSeconds % 3600) / 60);
              
              if (days > 0) {
                setTimeRemaining(`${days}d ${hours}h remaining`);
              } else if (hours > 0) {
                setTimeRemaining(`${hours}h ${minutes}m remaining`);
              } else {
                setTimeRemaining(`${minutes}m remaining`);
              }
            }
          };
          
          updateRemainingTime();
          
          // 60초마다 업데이트 (매초 업데이트하면 성능 저하 가능성)
          const interval = setInterval(updateRemainingTime, 60000);
          
          return () => clearInterval(interval);
        }, [expirationTime]);
      
        // 좋아요 처리 핸들러
        const handleLikePost = async (postId) => {
          if (!publicKey) return;
          
          try {
            // 즉시 UI 업데이트 (낙관적 업데이트)
            setPosts(posts.map(post => {
              if (post.id === postId) {
                // 이미 좋아요를 눌렀는지 확인
                const alreadyLiked = post.likedBy?.includes(publicKey.toString());
                
                if (alreadyLiked) {
                  // 좋아요 취소
                  return {
                    ...post,
                    likes: Math.max((post.likes || 0) - 1, 0),
                    likedBy: (post.likedBy || []).filter(addr => addr !== publicKey.toString())
                  };
                } else {
                  // 좋아요 추가
                  return {
                    ...post,
                    likes: (post.likes || 0) + 1,
                    likedBy: [...(post.likedBy || []), publicKey.toString()]
                  };
                }
              }
              return post;
            }));
            
            // 백엔드 API 호출
            await updatePostLike(communityId, postId, publicKey.toString());
          } catch (error) {
            console.error("좋아요 처리 중 오류 발생:", error);
            // 실패 시 원래 상태로 롤백 (필요한 경우)
            const allData = await fetchCommunityAllData(communityId);
            setPosts(allData.posts);
          }
        };
        

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AppHeader isPixelMode={isPixelMode} />
        <main className={`flex-grow flex items-center justify-center ${isPixelMode ? 'bg-blue-100' : 'bg-gray-50 dark:bg-gray-900'}`}>
          <div className={`p-8 ${isPixelMode ? 'border-4 border-black bg-white font-silkscreen' : 'bg-white dark:bg-gray-800 rounded-xl shadow-md'}`}>
            <p className="text-xl text-center">Loading community...</p>
            <div className="mt-4 flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  // 에러 상태 표시
  if (error || !communityInfo) {
    return (
      <div className="flex flex-col min-h-screen">
        <AppHeader isPixelMode={isPixelMode} />
        <main className={`flex-grow flex items-center justify-center ${isPixelMode ? 'bg-blue-100' : 'bg-gray-50 dark:bg-gray-900'}`}>
          <div className={`p-8 ${isPixelMode ? 'border-4 border-black bg-white font-silkscreen' : 'bg-white dark:bg-gray-800 rounded-xl shadow-md'}`}>
            <p className="text-xl text-center text-red-500">Community Not Found</p>
            <p className="mt-2 text-center">{error || "Could not load community data"}</p>
            <div className="mt-4 flex justify-center">
              <Link href="/app">
                <Button>Back to Communities</Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Wallet Not Connected</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please connect your wallet to view this community.
          </p>
          <Link href="/app">
            <Button>Back to App</Button>
          </Link>
        </div>
      </div>
    );
  }


// DepositModal 컴포넌트 - 파일 외부 또는 내부에 선언
const DepositModal = ({ isOpen, onClose, onSubmit, isPixelMode, minAmount = 0.01, maxAmount = 100 }) => {
  const [amount, setAmount] = useState<number>(0.1);

  // DepositModal 컴포넌트 (계속)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(amount * LAMPORTS_PER_SOL); // Lamports로 변환
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black opacity-50" onClick={onClose}></div>
      <div className={`
        relative z-10 w-full max-w-md p-6
        ${isPixelMode ? 'border-4 border-black bg-white' : 'bg-white dark:bg-gray-800 rounded-xl shadow-xl'}
      `}>
        <h2 className={`text-xl font-bold mb-4 ${isPixelMode ? 'uppercase font-silkscreen' : ''}`}>
          Deposit SOL
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className={`block mb-2 ${isPixelMode ? 'font-silkscreen uppercase' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
              Amount (SOL)
            </label>
            <input 
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min={minAmount}
              max={maxAmount}
              step={0.01}
              className={`
                w-full px-3 py-2
                ${isPixelMode 
                  ? 'border-2 border-black font-silkscreen' 
                  : 'border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white'}
              `}
              required
            />
          </div>
          
          <p className={`mb-4 ${isPixelMode ? 'font-silkscreen text-sm' : 'text-gray-600 dark:text-gray-400'}`}>
            Your SOL will be locked until the community expires or all bounties are claimed.
          </p>
          
          <div className="mt-6 flex justify-between">
            <button 
              type="button"
              onClick={onClose}
              className={`
                ${isPixelMode 
                  ? 'border-2 border-black bg-gray-200 hover:bg-gray-300 px-4 py-2 font-silkscreen uppercase' 
                  : 'bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-md text-gray-800'}
              `}
            >
              {isPixelMode ? 'CANCEL' : 'Cancel'}
            </button>
            
            <button 
              type="submit"
              className={`
                ${isPixelMode 
                  ? 'border-2 border-black bg-green-500 hover:bg-green-600 text-white px-4 py-2 font-silkscreen uppercase' 
                  : 'bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md'}
              `}
            >
              {isPixelMode ? 'DEPOSIT' : 'Deposit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// VotingModal 컴포넌트 추가
const VotingModal = ({ isOpen, onClose, onSubmit, isPixelMode }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [voteType, setVoteType] = useState<number>(0);
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [votingPeriod, setVotingPeriod] = useState<number>(7 * 24 * 60 * 60); // 1주일 (초)

  useEffect(() => {
    if (!isOpen) return;
    
    // 모달이 열릴 때만 초기화
    setTitle("");
    setDescription("");
    setVoteType(0);
    setOptions(["", ""]);
    setVotingPeriod(7 * 24 * 60 * 60);
  }, [isOpen]);
  
  
  const handleAddOption = () => {
    setOptions([...options, ""]);
  };
  
  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };
  
  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return; // 최소 2개 옵션 필요
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 최소 2개의 유효한 옵션 확인
    const validOptions = options.filter(opt => opt.trim() !== "");
    if (validOptions.length < 2) {
      alert("최소 2개의 유효한 옵션이 필요합니다.");
      return;
    }
    
    onSubmit({
      title,
      description,
      vote_type: voteType,
      options: validOptions,
      voting_period: votingPeriod
    });
  };
  
  // 투표 타입 옵션 목록
  const voteTypes = [
    { id: 0, name: "Change Time Limit" },
    { id: 1, name: "Change Base Fee" },
    { id: 2, name: "Change AI Moderation" },
    { id: 3, name: "Content Quality Rating" }
  ];
  
  // 투표 기간 옵션 (초 단위)
  const votingPeriodOptions = [
    { id: 7 * 24 * 60 * 60, name: "1 Week" },
    { id: 14 * 24 * 60 * 60, name: "2 Weeks" },
    { id: 30 * 24 * 60 * 60, name: "30 Days" }
  ];
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black opacity-50" onClick={onClose}></div>
      <div className={`
        relative z-10 w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto
        ${isPixelMode ? 'border-4 border-black bg-white' : 'bg-white dark:bg-gray-800 rounded-xl shadow-xl'}
      `}>
        <h2 className={`text-xl font-bold mb-4 ${isPixelMode ? 'uppercase font-silkscreen' : ''}`}>
          Create Vote Proposal
        </h2>
        
        <form onSubmit={handleSubmit}>
          {/* 제목 입력 */}
          <div className="mb-4">
            <label className={`block mb-2 ${isPixelMode ? 'font-silkscreen uppercase' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
              Title
            </label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`
                w-full px-3 py-2
                ${isPixelMode 
                  ? 'border-2 border-black font-silkscreen' 
                  : 'border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white'}
              `}
              required
            />
          </div>
          
          {/* 설명 입력 */}
          <div className="mb-4">
            <label className={`block mb-2 ${isPixelMode ? 'font-silkscreen uppercase' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
              Description
            </label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`
                w-full px-3 py-2 min-h-[100px]
                ${isPixelMode 
                  ? 'border-2 border-black font-silkscreen' 
                  : 'border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white'}
              `}
              required
            />
          </div>
          
          {/* 투표 타입 선택 */}
          <div className="mb-4">
            <label className={`block mb-2 ${isPixelMode ? 'font-silkscreen uppercase' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
              Vote Type
            </label>
            <select 
              value={voteType}
              onChange={(e) => setVoteType(Number(e.target.value))}
              className={`
                w-full px-3 py-2
                ${isPixelMode 
                  ? 'border-2 border-black font-silkscreen' 
                  : 'border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white'}
              `}
              required
            >
              {voteTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* 옵션 입력 */}
          <div className="mb-4">
            <label className={`block mb-2 ${isPixelMode ? 'font-silkscreen uppercase' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
              Options
            </label>
            
            {options.map((option, index) => (
              <div key={index} className="flex mb-2 items-center">
                <input 
                  type="text" 
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className={`
                    flex-grow px-3 py-2
                    ${isPixelMode 
                      ? 'border-2 border-black font-silkscreen' 
                      : 'border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white'}
                  `}
                  required
                />
                <button 
                  type="button"
                  onClick={() => handleRemoveOption(index)}
                  className={`
                    ml-2 p-2
                    ${isPixelMode 
                      ? 'border-2 border-black bg-red-500 text-white' 
                      : 'bg-red-500 text-white rounded-md'}
                    ${options.length <= 2 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-600'}
                  `}
                  disabled={options.length <= 2}
                >
                  ✕
                </button>
              </div>
            ))}
            
            <button 
              type="button"
              onClick={handleAddOption}
              className={`
                mt-2 px-4 py-1
                ${isPixelMode 
                  ? 'border-2 border-black bg-blue-500 hover:bg-blue-600 text-white font-silkscreen uppercase' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white rounded-md'}
              `}
            >
              {isPixelMode ? 'ADD OPTION' : 'Add Option'}
            </button>
          </div>
          
          {/* 투표 기간 선택 */}
          <div className="mb-4">
            <label className={`block mb-2 ${isPixelMode ? 'font-silkscreen uppercase' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
              Voting Period
            </label>
            <select 
              value={votingPeriod}
              onChange={(e) => setVotingPeriod(Number(e.target.value))}
              className={`
                w-full px-3 py-2
                ${isPixelMode 
                  ? 'border-2 border-black font-silkscreen' 
                  : 'border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white'}
              `}
              required
            >
              {votingPeriodOptions.map(option => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* 버튼 */}
          <div className="mt-6 flex justify-between">
            <button 
              type="button"
              onClick={onClose}
              className={`
                ${isPixelMode 
                  ? 'border-2 border-black bg-gray-200 hover:bg-gray-300 px-4 py-2 font-silkscreen uppercase' 
                  : 'bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-md text-gray-800'}
              `}
            >
              {isPixelMode ? 'CANCEL' : 'Cancel'}
            </button>
            
            <button 
              type="submit"
              className={`
                ${isPixelMode 
                  ? 'border-2 border-black bg-green-500 hover:bg-green-600 text-white px-4 py-2 font-silkscreen uppercase' 
                  : 'bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md'}
              `}
            >
              {isPixelMode ? 'CREATE VOTE' : 'Create Vote'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ProposalDetailModal 컴포넌트 추가
const ProposalDetailModal = ({ 
  proposal, 
  isOpen, 
  onClose, 
  onVote, 
  walletAddress,
  isPixelMode 
}) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  
  if (!isOpen || !proposal) return null;
  
  // 현재 시간
  const now = Date.now() / 1000;
  
  // 투표 여부 확인
  const hasVoted = proposal.votes.some(vote => vote.voter === walletAddress);
  
  // 투표 종료 여부 확인
  const isEnded = now > proposal.end_time;
  
  // 투표 집계
  const voteCounts = proposal.options.map((_, index) => {
    return proposal.votes.filter(vote => vote.option_index === index)
      .reduce((sum, vote) => sum + vote.voting_power, 0);
  });
  
  // 총 투표 수
  const totalVotes = voteCounts.reduce((sum, count) => sum + count, 0);
  
  // 결과 계산
  let winningOptionIndex = -1;
  let highestVotes = 0;
  
  voteCounts.forEach((count, index) => {
    if (count > highestVotes) {
      highestVotes = count;
      winningOptionIndex = index;
    }
  });
  
  // 남은 시간 계산
  let remainingTime = "";
  if (!isEnded) {
    const remainingSeconds = Math.max(0, proposal.end_time - now);
    const days = Math.floor(remainingSeconds / (24 * 3600));
    const hours = Math.floor((remainingSeconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    
    if (days > 0) {
      remainingTime = `${days}d ${hours}h remaining`;
    } else if (hours > 0) {
      remainingTime = `${hours}h ${minutes}m remaining`;
    } else {
      remainingTime = `${minutes}m remaining`;
    }
  }
  
  // 투표 타입 이름
  const getVoteTypeName = (type) => {
    const types = {
      0: "Change Time Limit",
      1: "Change Base Fee",
      2: "Change AI Moderation",
      3: "Content Quality Rating"
    };
    return types[type] || "Unknown";
  };
  
  const handleVote = () => {
    if (selectedOption === null) return;
    onVote(proposal.proposal_id, selectedOption);
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black opacity-50" onClick={onClose}></div>
      <div className={`
        relative z-10 w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto
        ${isPixelMode ? 'border-4 border-black bg-white' : 'bg-white dark:bg-gray-800 rounded-xl shadow-xl'}
      `}>
        <h2 className={`text-xl font-bold mb-2 ${isPixelMode ? 'uppercase font-silkscreen' : ''}`}>
          {proposal.title}
        </h2>
        
        <div className={`
          inline-block px-2 py-1 mb-4
          ${isPixelMode ? 'border-2 border-black bg-blue-100' : 'bg-blue-100 rounded-md'}
        `}>
          <span className={`${isPixelMode ? 'font-silkscreen text-sm' : 'text-sm text-blue-800'}`}>
            {getVoteTypeName(proposal.vote_type)}
          </span>
        </div>
        
        <p className={`mb-4 ${isPixelMode ? 'font-silkscreen' : 'text-gray-700 dark:text-gray-300'}`}>
          {proposal.description}
        </p>
        
        <div className={`mb-4 ${isPixelMode ? 'border-2 border-black p-3' : 'bg-gray-50 dark:bg-gray-700 p-3 rounded-md'}`}>
          <div className="flex justify-between">
            <span className={`${isPixelMode ? 'font-silkscreen' : 'text-sm text-gray-600 dark:text-gray-400'}`}>
              Proposed by: {proposal.proposer.slice(0, 4)}...{proposal.proposer.slice(-4)}
            </span>
            <span className={`${isPixelMode ? 'font-silkscreen' : 'text-sm text-gray-600 dark:text-gray-400'}`}>
              Votes: {proposal.votes.length}
            </span>
          </div>
          
          <div className={`mt-2 ${isPixelMode ? 'font-silkscreen' : ''}`}>
            {isEnded ? (
              <span className="text-red-600">Voting ended</span>
            ) : (
              <span className="text-green-600">{remainingTime}</span>
            )}
          </div>
        </div>
        
        {/* 투표 결과 또는 투표 옵션 */}
        <div className="mb-6">
          <h3 className={`font-bold mb-3 ${isPixelMode ? 'font-silkscreen uppercase' : ''}`}>
            {isEnded || hasVoted ? "Results" : "Options"}
          </h3>
          
          {proposal.options.map((option, index) => {
            const voteCount = voteCounts[index];
            const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
            const isWinningOption = isEnded && index === winningOptionIndex && totalVotes > 0;
            
            return (
              <div key={index} className="mb-3">
                <div className="flex justify-between mb-1">
                  <div className="flex items-center">
                    {!hasVoted && !isEnded && (
                      <input
                        type="radio"
                        name="voteOption"
                        checked={selectedOption === index}
                        onChange={() => setSelectedOption(index)}
                        className="mr-2"
                      />
                    )}
                    <span className={`
                      ${isPixelMode ? 'font-silkscreen' : ''}
                      ${isWinningOption ? 'font-bold text-green-600' : ''}
                    `}>
                      {option} {isWinningOption && '(Winner)'}
                    </span>
                  </div>
                  <span className={`${isPixelMode ? 'font-silkscreen' : ''}`}>
                    {percentage}% ({voteCount})
                  </span>
                </div>
                
                <div className={`w-full h-4 ${isPixelMode ? 'border-2 border-black' : 'bg-gray-200 dark:bg-gray-700 rounded-full'}`}>
                  <div 
                    className={`h-full ${isPixelMode ? 'bg-blue-500' : 'bg-blue-600 rounded-full'}`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* 버튼 */}
        <div className="flex justify-between">
          <button 
            onClick={onClose}
            className={`
              ${isPixelMode 
                ? 'border-2 border-black bg-gray-200 hover:bg-gray-300 px-4 py-2 font-silkscreen uppercase' 
                : 'bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-md text-gray-800'}
            `}
          >
            {isPixelMode ? 'CLOSE' : 'Close'}
          </button>
          
          {!hasVoted && !isEnded && (
            <button 
              onClick={handleVote}
              disabled={selectedOption === null}
              className={`
                ${isPixelMode 
                  ? 'border-2 border-black bg-green-500 hover:bg-green-600 text-white px-4 py-2 font-silkscreen uppercase' 
                  : 'bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md'}
                ${selectedOption === null ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {isPixelMode ? 'VOTE' : 'Vote'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};














  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader isPixelMode={isPixelMode} />

          {/* Deposit Modal */}
    <DepositModal 
      isOpen={isDepositModalOpen}
      onClose={() => setIsDepositModalOpen(false)}
      onSubmit={handleDeposit}
      isPixelMode={isPixelMode}
    />
    
    {/* Voting Modal */}
    <VotingModal 
      isOpen={isVotingModalOpen}
      onClose={() => setIsVotingModalOpen(false)}
      onSubmit={handleCreateVoteProposal}
      isPixelMode={isPixelMode}
    />
    
    {/* Proposal Detail Modal */}
    <ProposalDetailModal 
      proposal={selectedProposal}
      isOpen={selectedProposal !== null}
      onClose={() => setSelectedProposal(null)}
      onVote={handleCastVote}
      walletAddress={publicKey?.toString()}
      isPixelMode={isPixelMode}
    />
    



      {/* Post Detail Modal */}
      {selectedPost && (
        <PostDetailModal 
          post={selectedPost}
          isOpen={selectedPost !== null}
          onClose={() => setSelectedPost(null)}
          onLike={handleLikePost}
          walletAddress={publicKey?.toString()}
          isPixelMode={isPixelMode}
        />
      )}
      
      <div className={`w-full h-48 ${communityInfo.gradient} ${isPixelMode ? 'border-b-4 border-black' : ''} flex items-center justify-center`}>
        <div className="text-center text-white p-6">
          <h1 className={`text-3xl font-bold mb-2 ${isPixelMode ? 'font-silkscreen uppercase' : ''}`}>{communityInfo.name}</h1>
          <p className={`text-lg opacity-90 max-w-2xl ${isPixelMode ? 'font-silkscreen' : ''}`}>{communityInfo.description}</p>
        </div>
      </div>
      
      <main className={`flex-grow ${isPixelMode ? 'bg-blue-100' : 'bg-gray-50 dark:bg-gray-900'}`}>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Sidebar with community info */}
            <div className="md:col-span-1">
              <div className={`${isPixelMode ? 'border-4 border-black bg-white' : 'bg-white dark:bg-gray-800 rounded-xl shadow-md'} p-6 sticky top-4`}>
                <h2 className={`text-xl font-bold ${isPixelMode ? 'text-black uppercase font-silkscreen' : 'text-gray-900 dark:text-white'} mb-4`}>
                  Community Info
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <h3 className={`text-sm font-medium ${isPixelMode ? 'text-black font-silkscreen uppercase' : 'text-gray-500 dark:text-gray-400'}`}>
                      Total Bounty
                    </h3>
                    <p className={`text-lg font-bold ${isPixelMode ? 'text-green-600 font-silkscreen' : 'text-green-600 dark:text-green-400'}`}>
                      {communityInfo.bountyAmount.toFixed(2)} SOL
                    </p>
                  </div>
                  
                  {/* 종료 시간 표시 */}
                  <div>
                    <h3 className={`text-sm font-medium ${isPixelMode ? 'text-black font-silkscreen uppercase' : 'text-gray-500 dark:text-gray-400'}`}>
                      {isExpired ? "Status" : "Time Remaining"}
                    </h3>
                    <div className={`mt-2 ${isPixelMode ? 'font-silkscreen' : 'font-medium'}`}>
                      <div className={`
                        p-3 border-2 border-black
                        ${isExpired 
                          ? 'bg-red-100 text-red-600' 
                          : 'bg-green-100 text-green-600'
                        }
                      `}>
                        {isExpired ? (
                          <div className="flex items-center justify-between">
                            <span>EXPIRED</span>
                            <span className="text-xl">⏰</span>
                          </div>
                        ) : (
                          <div>
                            <div className="text-lg font-bold">{timeRemaining}</div>
                            <div className="text-xs mt-1">Expires: {communityInfo.expirationTimeFormatted}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className={`text-sm font-medium ${isPixelMode ? 'text-black font-silkscreen uppercase' : 'text-gray-500 dark:text-gray-400'}`}>
                      Last Activity
                    </h3>
                    <p className={`font-medium ${isPixelMode ? 'text-black font-silkscreen' : 'text-gray-800 dark:text-gray-200'}`}>
                      {communityInfo.lastActivityTimeFormatted}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className={`text-sm font-medium ${isPixelMode ? 'text-black font-silkscreen uppercase' : 'text-gray-500 dark:text-gray-400'}`}>
                      Base Fee
                    </h3>
                    <p className={`font-medium ${isPixelMode ? 'text-black font-silkscreen' : 'text-gray-800 dark:text-gray-200'}`}>
                      {communityInfo.baseFee} SOL
                    </p>
                  </div>
                  
                  <div className="flex justify-between pt-2">
                    <div>
                      <h3 className={`text-sm font-medium ${isPixelMode ? 'text-black font-silkscreen uppercase' : 'text-gray-500 dark:text-gray-400'}`}>
                        Depositors
                      </h3>
                      <p className={`font-medium ${isPixelMode ? 'text-black font-silkscreen' : 'text-gray-800 dark:text-gray-200'}`}>
                        {communityInfo.depositerCount}
                      </p>
                    </div>
                    <div>
                      <h3 className={`text-sm font-medium ${isPixelMode ? 'text-black font-silkscreen uppercase' : 'text-gray-500 dark:text-gray-400'}`}>
                        Challengers
                      </h3>
                      <p className={`font-medium ${isPixelMode ? 'text-black font-silkscreen' : 'text-gray-800 dark:text-gray-200'}`}>
                        {communityInfo.challengerCount}
                      </p>
                    </div>
                  </div>
                  
                  <div className="pt-4">
                  {isPixelMode ? (
                        <button 
                          className={`
                            w-full border-2 border-black py-2 uppercase text-sm font-bold font-silkscreen
                            ${isSubmittingDeposit
                              ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
                              : isExpired 
                                ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
                                : 'bg-green-500 hover:bg-green-600 text-white'
                            }
                          `}
                          onClick={() => setIsDepositModalOpen(true)}
                          disabled={isExpired || isSubmittingDeposit}
                        >
                          {isSubmittingDeposit 
                            ? 'PROCESSING...' 
                            : isExpired ? 'EXPIRED' : 'DEPOSIT SOL'}
                        </button>
                      ) : (
                        <Button 
                          variant="primary" 
                          className="w-full" 
                          onClick={() => setIsDepositModalOpen(true)}
                          disabled={isExpired || isSubmittingDeposit}
                        >
                          {isSubmittingDeposit 
                            ? 'Processing...' 
                            : isExpired ? 'Expired' : 'Deposit SOL'}
                        </Button>
                      )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Main content area */}    
            <div className="md:col-span-2">
             {/* 탭 인터페이스 */}
             <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
               <button
                 onClick={() => setActiveTab('posts')}
                 className={`py-2 px-4 font-medium ${
                   activeTab === 'posts'
                     ? isPixelMode 
                       ? 'border-b-2 border-green-500 text-green-600 font-silkscreen uppercase'
                       : 'border-b-2 border-teal-500 text-teal-600'
                     : isPixelMode
                       ? 'text-gray-500 hover:text-gray-700 font-silkscreen uppercase'
                       : 'text-gray-500 hover:text-gray-700'
                 }`}
               >
                 {isPixelMode ? 'POSTS' : 'Posts'}
               </button>
               <button
                 onClick={() => setActiveTab('proposals')}
                 className={`py-2 px-4 font-medium ${
                   activeTab === 'proposals'
                     ? isPixelMode 
                       ? 'border-b-2 border-green-500 text-green-600 font-silkscreen uppercase'
                       : 'border-b-2 border-teal-500 text-teal-600'
                     : isPixelMode
                       ? 'text-gray-500 hover:text-gray-700 font-silkscreen uppercase'
                       : 'text-gray-500 hover:text-gray-700'
                 }`}
               >
                 {isPixelMode ? 'GOVERNANCE' : 'Governance'}
               </button>
             </div>
               
             {/* 탭 콘텐츠 - 게시물 */}
             {activeTab === 'posts' && (
               <>
                 {/* Create post */}
                 <div className={`${isPixelMode ? 'border-4 border-black bg-white' : 'bg-white dark:bg-gray-800 rounded-xl shadow-md'} p-6 mb-6`}>
                   <h2 className={`text-xl font-bold ${isPixelMode ? 'text-black uppercase font-silkscreen' : 'text-gray-900 dark:text-white'} mb-4 flex items-center gap-2`}>
                     <span className={`w-6 h-6 ${isPixelMode ? 'bg-green-500 border-2 border-black' : 'bg-green-500 rounded-full'} flex items-center justify-center text-white`}>+</span>
                     {isPixelMode ? 'CREATE CONTENT' : 'Create Content'}
                   </h2>
                   <textarea
                     value={newPost}
                     onChange={(e) => setNewPost(e.target.value)}
                     placeholder={isPixelMode ? "SHARE YOUR CONTENT WITH THE COMMUNITY..." : "Share your content with the community..."}
                     className={`
                       w-full px-4 py-3 
                       ${isPixelMode 
                         ? 'border-2 border-black font-silkscreen focus:outline-none bg-blue-50 text-black min-h-[120px] uppercase' 
                         : 'border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent dark:bg-gray-700 dark:text-white min-h-[120px]'}
                       ${isExpired ? 'bg-gray-100 cursor-not-allowed' : ''}
                     `}
                     disabled={isExpired || isSubmittingPost}
                   />
                   <div className="flex justify-between items-center mt-4">
                     <div className="flex items-center gap-2">
                       <div className={`w-8 h-8 ${isPixelMode ? 'border-2 border-black bg-yellow-400' : 'bg-yellow-100 dark:bg-yellow-900/30 rounded-full'} flex items-center justify-center`}>
                         <span className="text-black dark:text-yellow-400">💰</span>
                       </div>
                       <p className={`text-sm ${isPixelMode ? 'text-black font-silkscreen uppercase' : 'text-gray-600 dark:text-gray-300'}`}>
                         Fee: {communityInfo.baseFee} SOL
                       </p>
                     </div>
                     <button
                       onClick={submitPost}
                       className={`
                         ${isPixelMode 
                           ? 'border-2 border-black px-6 py-2 uppercase text-sm font-bold font-silkscreen' 
                           : 'px-4 py-2 rounded-md text-sm font-medium'}
                         ${isExpired || isSubmittingPost
                           ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
                           : isPixelMode 
                             ? 'bg-green-500 hover:bg-green-600 text-white' 
                             : 'bg-teal-600 hover:bg-teal-700 text-white'}
                       `}
                       disabled={isExpired || isSubmittingPost || newPost.trim().length === 0}
                     >
                       {isSubmittingPost ? (isPixelMode ? 'POSTING...' : 'Posting...') : isExpired ? (isPixelMode ? 'EXPIRED' : 'Expired') : (isPixelMode ? 'POST' : 'Post')}
                     </button>
                   </div>

                   {isExpired && (
                     <div className={`mt-4 ${isPixelMode ? 'border-2 border-red-500 bg-red-50' : 'border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-md'} p-3`}>
                       <p className={`${isPixelMode ? 'text-red-600 font-silkscreen text-sm uppercase' : 'text-red-600 dark:text-red-400 text-sm'}`}>
                         This community has expired. No new content can be posted.
                       </p>
                     </div>
                   )}
                 </div>
                 
                 {/* View toggle */}
                 <div className="flex justify-between items-center mb-6">
                   <h2 className={`text-xl font-bold ${isPixelMode ? 'text-black uppercase font-silkscreen' : 'text-gray-900 dark:text-white'}`}>
                     {isPixelMode ? 'COMMUNITY CONTENT' : 'Community Content'}
                   </h2>
                   <div className="flex space-x-3">
                     <button 
                       onClick={() => setGridView(true)}
                       className={`p-2 
                         ${isPixelMode 
                           ? `${gridView ? 'bg-green-500 text-white' : 'bg-white text-black'} border-2 border-black font-silkscreen` 
                           : `${gridView ? 'bg-teal-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200'} rounded-md border border-gray-300 dark:border-gray-700`
                         } 
                         flex items-center gap-2 px-3`}
                     >
                       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
                         <rect x="3" y="3" width="7" height="7"></rect>
                         <rect x="14" y="3" width="7" height="7"></rect>
                         <rect x="14" y="14" width="7" height="7"></rect>
                         <rect x="3" y="14" width="7" height="7"></rect>
                       </svg>
                       <span className={`text-xs ${isPixelMode ? 'uppercase' : ''}`}>{isPixelMode ? 'GRID' : 'Grid'}</span>
                     </button>
                     <button 
                       onClick={() => setGridView(false)}
                       className={`p-2 
                         ${isPixelMode 
                           ? `${!gridView ? 'bg-green-500 text-white' : 'bg-white text-black'} border-2 border-black font-silkscreen` 
                           : `${!gridView ? 'bg-teal-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200'} rounded-md border border-gray-300 dark:border-gray-700`
                         } 
                         flex items-center gap-2 px-3`}
                     >
                       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
                         <line x1="21" y1="6" x2="3" y2="6"></line>
                         <line x1="21" y1="12" x2="3" y2="12"></line>
                         <line x1="21" y1="18" x2="3" y2="18"></line>
                       </svg>
                       <span className={`text-xs ${isPixelMode ? 'uppercase' : ''}`}>{isPixelMode ? 'LIST' : 'List'}</span>
                     </button>
                   </div>
                 </div>
                       
                 {/* Posts display */}
                 {posts.length === 0 ? (
                   <div className={`${isPixelMode ? 'border-4 border-black bg-white' : 'bg-white dark:bg-gray-800 rounded-xl shadow-md'} p-6 text-center`}>
                     <p className={`${isPixelMode ? 'font-silkscreen text-black uppercase' : 'text-gray-600 dark:text-gray-400'}`}>
                       No content has been posted in this community yet.
                     </p>
                     {!isExpired && (
                       <p className={`mt-2 ${isPixelMode ? 'font-silkscreen text-green-600 uppercase' : 'text-green-600 dark:text-green-400'}`}>
                         Be the first to post!
                       </p>
                     )}
                   </div>
                 ) : gridView ? (
                   // Grid view
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     {posts.map(post => (
                       <div 
                         key={post.id} 
                         onClick={() => setSelectedPost(post)}
                         className={`
                           cursor-pointer
                           ${isPixelMode 
                             ? 'border-4 border-black bg-white hover:bg-blue-50' 
                             : 'bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg dark:hover:bg-gray-750'
                           }
                           p-4 transition-all duration-200
                         `}
                       >
                         <div className="flex justify-between items-start mb-3">
                           <span className={`font-medium ${isPixelMode ? 'font-silkscreen text-teal-600' : 'text-teal-600 dark:text-teal-400'}`}>
                             {post.author}
                           </span>
                           <span className={`text-xs ${isPixelMode ? 'font-silkscreen text-gray-600' : 'text-gray-500 dark:text-gray-400'}`}>
                             {formatDate(post.timestamp)}
                           </span>
                         </div>
                         <p className={`${isPixelMode ? 'font-silkscreen text-sm' : ''} mb-3 line-clamp-3`}>
                           {post.content}
                         </p>
                         <div className="flex items-center justify-between">
                           <div className="flex items-center gap-1">
                             <button 
                               onClick={(e) => {
                                 e.stopPropagation();
                                 handleLikePost(post.id);
                               }}
                               className={`
                                 ${isPixelMode 
                                   ? 'border-2 border-black p-1' 
                                   : 'p-1 rounded-md'}
                                 ${post.likedBy?.includes(publicKey?.toString()) 
                                   ? isPixelMode ? 'bg-red-500 text-white' : 'text-red-500' 
                                   : isPixelMode ? 'bg-white text-black' : 'text-gray-500 dark:text-gray-400'}
                               `}
                             >
                               ❤️
                             </button>
                             <span className={`text-sm ${isPixelMode ? 'font-silkscreen' : ''}`}>
                               {post.likes || 0}
                             </span>
                           </div>
                           <button 
                             className={`text-xs ${isPixelMode ? 'font-silkscreen text-teal-600 uppercase' : 'text-teal-600 dark:text-teal-400'}`}
                           >
                             {isPixelMode ? 'VIEW DETAILS' : 'View details'}
                           </button>
                         </div>
                       </div>
                     ))}
                   </div>
                 ) : (
                   // List view
                   <div className="space-y-4">
                     {posts.map(post => (
                       <div 
                         key={post.id} 
                         onClick={() => setSelectedPost(post)}
                         className={`
                           cursor-pointer
                           ${isPixelMode 
                             ? 'border-4 border-black bg-white hover:bg-blue-50' 
                             : 'bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg dark:hover:bg-gray-750'
                           }
                           p-4 transition-all duration-200
                         `}
                       >
                         <div className="flex justify-between items-start mb-3">
                           <span className={`font-medium ${isPixelMode ? 'font-silkscreen text-teal-600' : 'text-teal-600 dark:text-teal-400'}`}>
                             {post.author}
                           </span>
                           <span className={`text-xs ${isPixelMode ? 'font-silkscreen text-gray-600' : 'text-gray-500 dark:text-gray-400'}`}>
                             {formatDate(post.timestamp)}
                           </span>
                         </div>
                         <p className={`${isPixelMode ? 'font-silkscreen text-sm' : ''} mb-3`}>
                           {post.content}
                         </p>
                         <div className="flex items-center justify-between">
                           <div className="flex items-center gap-1">
                             <button 
                               onClick={(e) => {
                                 e.stopPropagation();
                                 handleLikePost(post.id);
                               }}
                               className={`
                                 ${isPixelMode 
                                   ? 'border-2 border-black p-1' 
                                   : 'p-1 rounded-md'}
                                 ${post.likedBy?.includes(publicKey?.toString()) 
                                   ? isPixelMode ? 'bg-red-500 text-white' : 'text-red-500' 
                                   : isPixelMode ? 'bg-white text-black' : 'text-gray-500 dark:text-gray-400'}
                               `}
                             >
                               ❤️
                             </button>
                             <span className={`text-sm ${isPixelMode ? 'font-silkscreen' : ''}`}>
                               {post.likes || 0}
                             </span>
                           </div>
                           <button 
                             className={`text-xs ${isPixelMode ? 'font-silkscreen text-teal-600 uppercase' : 'text-teal-600 dark:text-teal-400'}`}
                           >
                             {isPixelMode ? 'VIEW DETAILS' : 'View details'}
                           </button>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
               </>
             )}

             {/* 탭 콘텐츠 - 거버넌스 */}
             {activeTab === 'proposals' && (
               <div className="mt-6">
                 {/* 투표 생성 버튼 */}
                 <div className={`${isPixelMode ? 'border-4 border-black bg-white' : 'bg-white dark:bg-gray-800 rounded-xl shadow-md'} p-6 mb-6`}>
                   <h2 className={`text-xl font-bold ${isPixelMode ? 'text-black uppercase font-silkscreen' : 'text-gray-900 dark:text-white'} mb-4 flex items-center gap-2`}>
                     <span className={`w-6 h-6 ${isPixelMode ? 'bg-blue-500 border-2 border-black' : 'bg-blue-500 rounded-full'} flex items-center justify-center text-white`}>+</span>
                     {isPixelMode ? 'CREATE PROPOSAL' : 'Create Proposal'}
                   </h2>

                   <p className={`mb-4 ${isPixelMode ? 'font-silkscreen text-sm text-black' : 'text-gray-600 dark:text-gray-400'}`}>
                     Create a governance proposal to vote on important community decisions.
                   </p>

                   <button
                     onClick={() => setIsVotingModalOpen(true)}
                     disabled={isExpired || isSubmittingVote || !connected}
                     className={`
                       ${isPixelMode 
                         ? 'border-2 border-black px-6 py-2 uppercase text-sm font-bold font-silkscreen' 
                         : 'px-4 py-2 rounded-md text-sm font-medium'}
                       ${isExpired || isSubmittingVote || !connected
                         ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
                         : isPixelMode 
                           ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                           : 'bg-blue-600 hover:bg-blue-700 text-white'}
                     `}
                   >
                     {isSubmittingVote 
                       ? (isPixelMode ? 'CREATING...' : 'Creating...') 
                       : isExpired 
                         ? (isPixelMode ? 'EXPIRED' : 'Expired')
                         : (isPixelMode ? 'CREATE PROPOSAL' : 'Create Proposal')
                     }
                   </button>
                   
                   {!connected && (
                     <p className={`mt-2 text-sm text-red-500 ${isPixelMode ? 'font-silkscreen' : ''}`}>
                       {isPixelMode ? 'CONNECT WALLET TO CREATE PROPOSALS' : 'Connect your wallet to create proposals'}
                     </p>
                   )}

                   {isExpired && (
                     <p className={`mt-2 text-sm text-red-500 ${isPixelMode ? 'font-silkscreen' : ''}`}>
                       {isPixelMode ? 'COMMUNITY HAS EXPIRED' : 'This community has expired'}
                     </p>
                   )}
                 </div>
                 
                 {/* 투표 제안 목록 */}
                 <div className="mb-6">
                   <h2 className={`text-xl font-bold mb-4 ${isPixelMode ? 'text-black uppercase font-silkscreen' : 'text-gray-900 dark:text-white'}`}>
                     {isPixelMode ? 'ACTIVE PROPOSALS' : 'Active Proposals'}
                   </h2>

                   {proposals.length === 0 ? (
                     <div className={`${isPixelMode ? 'border-4 border-black bg-white' : 'bg-white dark:bg-gray-800 rounded-xl shadow-md'} p-6 text-center`}>
                       <p className={`${isPixelMode ? 'font-silkscreen text-black uppercase' : 'text-gray-600 dark:text-gray-400'}`}>
                         No proposals have been created in this community yet.
                       </p>
                       {!isExpired && connected && (
                         <p className={`mt-2 ${isPixelMode ? 'font-silkscreen text-blue-600 uppercase' : 'text-blue-600 dark:text-blue-400'}`}>
                           Be the first to create a proposal!
                         </p>
                       )}
                     </div>
                   ) : (
                     <div className="space-y-4">
                       {proposals.map(proposal => {
                         // 현재 시간 (초 단위)
                         const now = Math.floor(Date.now() / 1000);

                         // 시작 및 종료 시간 포맷팅
                         const startDate = new Date(proposal.start_time * 1000).toLocaleDateString();
                         const endDate = new Date(proposal.end_time * 1000).toLocaleDateString();

                         // 투표 상태 계산
                         const isActive = now < proposal.end_time;

                         // 투표 타입 이름
                         const voteTypes = {
                           0: "Change Time Limit",
                           1: "Change Base Fee",
                           2: "Change AI Moderation", 
                           3: "Content Quality Rating"
                         };
                         const voteTypeName = voteTypes[proposal.vote_type] || "Unknown";

                         // 남은 시간 계산
                         let remainingTime = "";
                         if (isActive) {
                           const remainingSecs = proposal.end_time - now;
                           const days = Math.floor(remainingSecs / (24 * 3600));
                           const hours = Math.floor((remainingSecs % (24 * 3600)) / 3600);

                           if (days > 0) {
                             remainingTime = `${days}d ${hours}h remaining`;
                           } else if (hours > 0) {
                             remainingTime = `${hours}h ${remainingSecs % 3600 / 60 | 0}m remaining`;
                           } else {
                             remainingTime = `${remainingSecs % 3600 / 60 | 0}m remaining`;
                           }
                         }

                         return (
                           <div 
                             key={proposal.proposal_id}
                             onClick={() => setSelectedProposal(proposal)}
                             className={`
                               cursor-pointer
                               ${isPixelMode 
                                 ? 'border-4 border-black bg-white hover:bg-blue-50' 
                                 : 'bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg dark:hover:bg-gray-750'
                               }
                               p-4 transition-all duration-200
                             `}
                           >
                             <div className="flex justify-between items-start mb-3">
                               <div>
                                 <h3 className={`font-medium ${isPixelMode ? 'font-silkscreen text-blue-600' : 'text-blue-600 dark:text-blue-400'}`}>
                                   {proposal.title}
                                 </h3>
                                 <span className={`text-xs ${isPixelMode ? 'font-silkscreen text-gray-600' : 'text-gray-500 dark:text-gray-400'}`}>
                                   by {proposal.proposer.slice(0, 4)}...{proposal.proposer.slice(-4)}
                                 </span>
                               </div>
                               <div className={`
                                 px-2 py-1 text-xs
                                 ${isPixelMode ? 'border-2 border-black' : 'rounded-full'}
                                 ${isActive 
                                   ? isPixelMode ? 'bg-green-100 text-green-700' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                                   : isPixelMode ? 'bg-red-100 text-red-700' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                 }
                               `}>
                                 {isActive ? "Active" : "Ended"}
                               </div>
                             </div>
                               
                             <div className={`mb-3 ${isPixelMode ? 'font-silkscreen text-sm' : ''}`}>
                               <p className="line-clamp-2">
                                 {proposal.description}
                               </p>
                             </div>
                               
                             <div className={`mb-3 ${isPixelMode ? 'border-2 border-black p-2 bg-blue-50' : 'bg-blue-50 dark:bg-blue-900/20 p-2 rounded-md'}`}>
                               <span className={`text-xs ${isPixelMode ? 'font-silkscreen text-blue-700' : 'text-blue-700 dark:text-blue-300'}`}>
                                 {voteTypeName}
                               </span>
                             </div>
                               
                             <div className="flex justify-between items-center text-xs">
                               <div className={`${isPixelMode ? 'font-silkscreen' : 'text-gray-600 dark:text-gray-400'}`}>
                                 <span>{proposal.votes.length} votes</span>
                                 {" • "}
                                 <span>{startDate} - {endDate}</span>
                               </div>
                               
                               {isActive && (
                                 <span className={`${isPixelMode ? 'font-silkscreen text-green-600' : 'text-green-600 dark:text-green-400'}`}>
                                   {remainingTime}
                                 </span>
                               )}
                             </div>
                           </div>
                         );
                       })}
                     </div>
                   )}
                 </div>
               </div>
             )}
            </div>


          </div>
        </div>
      </main>
      
      <footer className={`${isPixelMode ? 'bg-white border-t-4 border-black' : 'bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <span className={`${isPixelMode ? 'text-black font-silkscreen' : 'text-gray-600 dark:text-gray-400'}`}>© 2025 Turtle</span>
            <Link 
              href="/app" 
              className={`${isPixelMode 
                ? 'text-green-600 font-silkscreen hover:underline' 
                : 'text-green-600 dark:text-green-400 hover:underline'}`}
            >
              {isPixelMode ? 'BACK TO COMMUNITIES' : 'Back to Communities'}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

