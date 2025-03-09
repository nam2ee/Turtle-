"use client";

import { useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Button } from "@/components/Button";
import { generateContentHash } from "@/utils/turtle-program";
import { LAMPORTS_PER_SOL } from "@/utils/constants";

export function ContentSubmitComponent({ communityId, daoState, onSubmitSuccess, isPixelMode }) {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [remainingChars, setRemainingChars] = useState(280);
  const [baseFee, setBaseFee] = useState(0.05); // SOL

  // 기본 수수료 설정
  useEffect(() => {
    if (daoState && daoState.base_fee) {
      setBaseFee(daoState.base_fee / LAMPORTS_PER_SOL);
    }
  }, [daoState]);

  // 남은 글자 수 계산
  useEffect(() => {
    setRemainingChars(280 - content.length);
  }, [content]);

  // 콘텐츠 해시 생성 함수
  const createContentHash = async (text) => {
    try {
      return await generateContentHash(text);
    } catch (error) {
      console.error("Error generating content hash:", error);
      // 오류 시 임시 해시 반환
      return `temp-${Date.now().toString(16)}`;
    }
  };

  // 콘텐츠 제출 처리
  const handleSubmitContent = async () => {
    if (!connected || !publicKey) {
      alert("지갑을 연결해주세요.");
      return;
    }
    
    if (!content.trim()) {
      setError("내용을 입력해주세요.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // 콘텐츠 해시 생성
      const contentHash = await createContentHash(content);
      console.log("Generated content hash:", contentHash);
      
      // 실제 블록체인 트랜잭션 구현 필요
      console.log("Submitting content:", {
        communityId,
        content,
        contentHash,
        baseFee
      });
      
      // 성공 시 폼 초기화
      setContent("");
      
      if (onSubmitSuccess) {
        onSubmitSuccess({
          id: contentHash,
          communityId,
          author: publicKey,
          authorDisplay: publicKey.toString().slice(0, 8) + "..." + publicKey.toString().slice(-4),
          content,
          contentHash,
          contentUri: "",
          timestamp: Date.now(),
          likes: 0,
          likedBy: [],
        });
      }
      
      // 성공 메시지
      alert("콘텐츠가 성공적으로 제출되었습니다!");
    } catch (error) {
      console.error("Error submitting content:", error);
      setError("콘텐츠 제출 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`${isPixelMode ? 'border-4 border-black bg-white' : 'bg-white dark:bg-gray-800 rounded-xl shadow-md'} p-6`}>
      <h2 className={`text-xl font-bold mb-4 ${isPixelMode ? 'text-black uppercase font-silkscreen' : 'text-gray-900 dark:text-white'}`}>
        새 콘텐츠 작성
      </h2>
      
      {error && (
        <div className={`${isPixelMode 
          ? 'border-2 border-black bg-red-500 text-white p-3 mb-4 font-silkscreen' 
          : 'bg-red-100 text-red-800 p-3 rounded-md mb-4'}`}>
          {error}
        </div>
      )}
      
      <div className="mb-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={isPixelMode ? "커뮤니티에 공유할 내용을 입력하세요..." : "커뮤니티에 공유할 내용을 입력하세요..."}
          maxLength={280}
          className={`w-full px-4 py-3 ${isPixelMode 
            ? 'border-2 border-black font-silkscreen focus:outline-none bg-blue-50 text-black min-h-[120px]' 
            : 'border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[120px]'}`}
        />
        
        <div className="flex justify-between mt-2">
          <span className={`text-sm ${remainingChars < 0 
            ? (isPixelMode ? 'text-red-600 font-silkscreen' : 'text-red-600') 
            : (isPixelMode ? 'text-gray-600 font-silkscreen' : 'text-gray-600 dark:text-gray-400')}`}>
            {remainingChars} 글자 남음
          </span>
          
          <span className={`text-sm ${isPixelMode ? 'text-gray-600 font-silkscreen' : 'text-gray-600 dark:text-gray-400'}`}>
            최대 280자
          </span>
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className={`${isPixelMode 
            ? 'w-8 h-8 border-2 border-black flex items-center justify-center bg-yellow-400' 
            : 'w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center'}`}>
            <span className="text-yellow-800">💰</span>
          </div>
          <p className={`text-sm ${isPixelMode ? 'text-black font-silkscreen uppercase' : 'text-gray-700 dark:text-gray-300'}`}>
            수수료: {baseFee.toFixed(4)} SOL
          </p>
        </div>
        
        <button
          onClick={handleSubmitContent}
          disabled={isLoading || !content.trim() || remainingChars < 0}
          className={`${isPixelMode 
            ? 'border-2 border-black bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-2 uppercase text-sm font-bold font-silkscreen' 
            : 'bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-md text-sm font-medium'}`}
        >
          {isLoading ? "처리 중..." : "게시하기"}
        </button>
      </div>
    </div>
  );
}
