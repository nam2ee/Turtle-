"use client";

import { useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { ProposalType } from "@/utils/turtle-program";
import { Button } from "@/components/Button";
import { LAMPORTS_PER_SOL } from "@/utils/constants";

export function VotingProposalComponent({ communityId, daoState, onVoteSuccess, isPixelMode }) {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [proposals, setProposals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProposal, setNewProposal] = useState({
    type: ProposalType.TimeLimit,
    newValue: 0,
    votingPeriod: 86400, // 24 hours in seconds
  });

  // 제안 타입에 따른 레이블 매핑
  const proposalTypeLabels = {
    [ProposalType.TimeLimit]: "시간 제한 변경",
    [ProposalType.BaseFee]: "기본 수수료 변경",
    [ProposalType.AiModeration]: "AI 중재 설정 변경",
  };

  // 제안 타입에 따른 단위 매핑
  const proposalTypeUnits = {
    [ProposalType.TimeLimit]: "초",
    [ProposalType.BaseFee]: "SOL",
    [ProposalType.AiModeration]: "",
  };

  // 제안 타입에 따른 값 포맷팅 함수
  const formatProposalValue = (type, value) => {
    switch (type) {
      case ProposalType.TimeLimit:
        return `${value}초`;
      case ProposalType.BaseFee:
        return `${(value / LAMPORTS_PER_SOL).toFixed(4)} SOL`;
      case ProposalType.AiModeration:
        return value ? "활성화" : "비활성화";
      default:
        return value.toString();
    }
  };

  // 제안 상태에 따른 레이블
  const getProposalStatusLabel = (proposal) => {
    const now = Math.floor(Date.now() / 1000);
    
    if (now < proposal.end_time) {
      return "진행 중";
    } else if (proposal.approved) {
      return "승인됨";
    } else {
      return "거부됨";
    }
  };

  // 제안 상태에 따른 색상 클래스
  const getProposalStatusClass = (proposal) => {
    const now = Math.floor(Date.now() / 1000);
    
    if (now < proposal.end_time) {
      return isPixelMode 
        ? "bg-yellow-400 border-2 border-black text-black" 
        : "bg-yellow-100 text-yellow-800";
    } else if (proposal.approved) {
      return isPixelMode 
        ? "bg-green-500 border-2 border-black text-white" 
        : "bg-green-100 text-green-800";
    } else {
      return isPixelMode 
        ? "bg-red-500 border-2 border-black text-white" 
        : "bg-red-100 text-red-800";
    }
  };

  // 제안 목록 가져오기
  useEffect(() => {
    async function fetchProposals() {
      if (!daoState || !communityId || !connection) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // 실제로는 daoState에서 제안 목록을 가져오거나 별도 API 호출 필요
        // 여기서는 예시 데이터 사용
        const mockProposals = daoState.vote_proposals || [];
        
        // 실제 데이터가 없는 경우 예시 데이터 사용
        if (mockProposals.length === 0) {
          const now = Math.floor(Date.now() / 1000);
          setProposals([
            {
              id: 1,
              proposal_type: ProposalType.TimeLimit,
              current_value: daoState.time_limit || 1800,
              new_value: 3600,
              proposer: daoState.initializer || "",
              start_time: now - 86400,
              end_time: now + 86400,
              yes_votes: 3,
              no_votes: 1,
              approved: false,
              executed: false,
              voters: []
            },
            {
              id: 2,
              proposal_type: ProposalType.BaseFee,
              current_value: daoState.base_fee || 50000000,
              new_value: 100000000,
              proposer: daoState.initializer || "",
              start_time: now - 172800,
              end_time: now - 86400,
              yes_votes: 5,
              no_votes: 2,
              approved: true,
              executed: true,
              voters: []
            }
          ]);
        } else {
          setProposals(mockProposals);
        }
      } catch (error) {
        console.error("Error fetching proposals:", error);
        setError("제안 목록을 가져오는 중 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchProposals();
  }, [daoState, communityId, connection]);

  // 새 제안 생성
  const handleCreateProposal = async () => {
    if (!connected || !publicKey || !communityId) {
      alert("지갑을 연결해주세요.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // 제안 타입에 따른 값 변환
      let valueToSubmit = newProposal.newValue;
      
      if (newProposal.type === ProposalType.BaseFee) {
        // SOL을 lamports로 변환
        valueToSubmit = Math.floor(newProposal.newValue * LAMPORTS_PER_SOL);
      } else if (newProposal.type === ProposalType.AiModeration) {
        // Boolean 값으로 변환
        valueToSubmit = newProposal.newValue === 1;
      }
      
      // 실제 블록체인 트랜잭션 구현 필요
      console.log("Creating proposal:", {
        type: newProposal.type,
        newValue: valueToSubmit,
        votingPeriod: newProposal.votingPeriod
      });
      
      // 성공 시 모달 닫기 및 목록 갱신
      setShowCreateModal(false);
      
      // 새 제안 목록에 추가 (실제로는 블록체인에서 다시 가져와야 함)
      const now = Math.floor(Date.now() / 1000);
      const newProposalObj = {
        id: proposals.length + 1,
        proposal_type: newProposal.type,
        current_value: 
          newProposal.type === ProposalType.TimeLimit ? daoState.time_limit :
          newProposal.type === ProposalType.BaseFee ? daoState.base_fee :
          daoState.ai_moderation,
        new_value: valueToSubmit,
        proposer: publicKey.toString(),
        start_time: now,
        end_time: now + newProposal.votingPeriod,
        yes_votes: 0,
        no_votes: 0,
        approved: false,
        executed: false,
        voters: []
      };
      
      setProposals([...proposals, newProposalObj]);
      
      if (onVoteSuccess) {
        onVoteSuccess();
      }
    } catch (error) {
      console.error("Error creating proposal:", error);
      setError("제안 생성 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 투표 처리
  const handleVote = async (proposalId, approve) => {
    if (!connected || !publicKey) {
      alert("지갑을 연결해주세요.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // 실제 블록체인 트랜잭션 구현 필요
      console.log("Voting on proposal:", { proposalId, approve });
      
      // 투표 결과 반영 (실제로는 블록체인에서 다시 가져와야 함)
      setProposals(proposals.map(p => {
        if (p.id === proposalId) {
          const updatedProposal = { ...p };
          
          // 이미 투표한 경우 처리 (실제로는 블록체인에서 확인)
          const alreadyVoted = p.voters.includes(publicKey.toString());
          
          if (!alreadyVoted) {
            if (approve) {
              updatedProposal.yes_votes += 1;
            } else {
              updatedProposal.no_votes += 1;
            }
            updatedProposal.voters = [...p.voters, publicKey.toString()];
          }
          
          return updatedProposal;
        }
        return p;
      }));
      
      if (onVoteSuccess) {
        onVoteSuccess();
      }
    } catch (error) {
      console.error("Error voting on proposal:", error);
      setError("투표 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 남은 시간 계산
  const getRemainingTime = (endTime) => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = endTime - now;
    
    if (remaining <= 0) return "종료됨";
    
    const days = Math.floor(remaining / 86400);
    const hours = Math.floor((remaining % 86400) / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    
    if (days > 0) {
      return `${days}일 ${hours}시간`;
    } else if (hours > 0) {
      return `${hours}시간 ${minutes}분`;
    } else {
      return `${minutes}분`;
    }
  };

  // 사용자가 이미 투표했는지 확인
  const hasUserVoted = (proposal) => {
    return proposal.voters.includes(publicKey?.toString() || "");
  };

  return (
    <div className={`${isPixelMode ? 'border-4 border-black bg-white' : 'bg-white dark:bg-gray-800 rounded-xl shadow-md'} p-6`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-xl font-bold ${isPixelMode ? 'text-black uppercase font-silkscreen' : 'text-gray-900 dark:text-white'}`}>
          거버넌스 제안
        </h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className={`${isPixelMode 
            ? 'border-2 border-black bg-green-500 hover:bg-green-600 text-white px-4 py-2 uppercase text-sm font-bold font-silkscreen' 
            : 'bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium'}`}
        >
          새 제안
        </button>
      </div>

      {error && (
        <div className={`${isPixelMode 
          ? 'border-2 border-black bg-red-500 text-white p-3 mb-4 font-silkscreen' 
          : 'bg-red-100 text-red-800 p-3 rounded-md mb-4'}`}>
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className={`${isPixelMode 
            ? 'w-8 h-8 border-4 border-t-green-500 border-r-green-500 border-b-transparent border-l-transparent animate-spin' 
            : 'w-8 h-8 border-4 border-t-green-500 border-r-green-500 border-b-transparent border-l-transparent rounded-full animate-spin'}`}>
          </div>
        </div>
      ) : proposals.length > 0 ? (
        <div className="space-y-4">
          {proposals.map((proposal) => (
            <div 
              key={proposal.id} 
              className={`${isPixelMode 
                ? 'border-2 border-black bg-gray-50 p-4' 
                : 'border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-lg p-4'}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className={`font-medium ${isPixelMode ? 'text-black font-silkscreen uppercase' : 'text-gray-900 dark:text-white'}`}>
                    {proposalTypeLabels[proposal.proposal_type] || "기타 제안"}
                  </h3>
                  <p className={`text-sm ${isPixelMode ? 'text-gray-700 font-silkscreen' : 'text-gray-600 dark:text-gray-400'}`}>
                    제안자: {proposal.proposer.slice(0, 4)}...{proposal.proposer.slice(-4)}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 ${getProposalStatusClass(proposal)}`}>
                  {getProposalStatusLabel(proposal)}
                </span>
              </div>
              
              <div className={`grid grid-cols-2 gap-2 mb-3 ${isPixelMode ? 'font-silkscreen' : ''}`}>
                <div className={`p-2 ${isPixelMode ? 'border border-black bg-blue-50' : 'bg-blue-50 dark:bg-blue-900/30 rounded'}`}>
                  <p className="text-xs text-gray-500 dark:text-gray-400">현재 값</p>
                  <p className={`font-medium ${isPixelMode ? 'text-blue-600' : 'text-blue-600 dark:text-blue-400'}`}>
                    {formatProposalValue(proposal.proposal_type, proposal.current_value)}
                  </p>
                </div>
                <div className={`p-2 ${isPixelMode ? 'border border-black bg-green-50' : 'bg-green-50 dark:bg-green-900/30 rounded'}`}>
                  <p className="text-xs text-gray-500 dark:text-gray-400">제안 값</p>
                  <p className={`font-medium ${isPixelMode ? 'text-green-600' : 'text-green-600 dark:text-green-400'}`}>
                    {formatProposalValue(proposal.proposal_type, proposal.new_value)}
                  </p>
                </div>
              </div>
              
              <div className="mb-4">
                <p className={`text-xs ${isPixelMode ? 'text-gray-700 font-silkscreen' : 'text-gray-600 dark:text-gray-400'}`}>
                  남은 시간: {getRemainingTime(proposal.end_time)}
                </p>
                
                <div className="mt-2 relative h-2 bg-gray-200 dark:bg-gray-700">
                  <div 
                    className="absolute top-0 left-0 h-2 bg-green-500"
                    style={{ width: `${(proposal.yes_votes / (proposal.yes_votes + proposal.no_votes || 1)) * 100}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between mt-1 text-xs text-gray-600 dark:text-gray-400">
                  <span>찬성: {proposal.yes_votes}</span>
                  <span>반대: {proposal.no_votes}</span>
                </div>
              </div>
              
              {/* 투표 버튼 - 투표 기간이 지나지 않았고, 아직 투표하지 않은 경우에만 표시 */}
              {proposal.end_time > Math.floor(Date.now() / 1000) && !hasUserVoted(proposal) && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleVote(proposal.id, true)}
                    className={`flex-1 ${isPixelMode 
                      ? 'border-2 border-black bg-green-500 hover:bg-green-600 text-white py-2 uppercase text-sm font-bold font-silkscreen' 
                      : 'bg-green-500 hover:bg-green-600 text-white py-2 rounded-md text-sm font-medium'}`}
                    disabled={isLoading}
                  >
                    찬성
                  </button>
                  <button
                    onClick={() => handleVote(proposal.id, false)}
                    className={`flex-1 ${isPixelMode 
                      ? 'border-2 border-black bg-red-500 hover:bg-red-600 text-white py-2 uppercase text-sm font-bold font-silkscreen' 
                      : 'bg-red-500 hover:bg-red-600 text-white py-2 rounded-md text-sm font-medium'}`}
                    disabled={isLoading}
                  >
                    반대
                  </button>
                </div>
              )}
              
              {/* 이미 투표한 경우 메시지 표시 */}
              {hasUserVoted(proposal) && proposal.end_time > Math.floor(Date.now() / 1000) && (
                <p className={`text-center text-sm ${isPixelMode ? 'text-gray-700 font-silkscreen' : 'text-gray-600 dark:text-gray-400'}`}>
                  이미 투표하셨습니다
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className={`text-center py-8 ${isPixelMode ? 'font-silkscreen' : ''}`}>
          <p className="text-gray-500 dark:text-gray-400">
            아직 제안이 없습니다. 새 제안을 생성해보세요!
          </p>
        </div>
      )}

      {/* 새 제안 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${isPixelMode 
            ? 'border-4 border-black bg-white w-full max-w-md' 
            : 'bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md'}`}>
            <div className={`${isPixelMode ? 'border-b-4 border-black' : 'border-b dark:border-gray-700'} p-4`}>
              <h3 className={`text-lg font-bold ${isPixelMode ? 'text-black uppercase font-silkscreen' : 'text-gray-900 dark:text-white'}`}>
                새 제안 생성
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className={`block mb-2 ${isPixelMode ? 'text-black font-silkscreen uppercase' : 'text-gray-700 dark:text-gray-300'}`}>
                  제안 유형
                </label>
                <select
                  value={newProposal.type}
                  onChange={(e) => setNewProposal({...newProposal, type: Number(e.target.value)})}
                  className={`w-full ${isPixelMode 
                    ? 'border-2 border-black p-2 font-silkscreen uppercase' 
                    : 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md p-2'}`}
                >
                  <option value={ProposalType.TimeLimit}>시간 제한 변경</option>
                  <option value={ProposalType.BaseFee}>기본 수수료 변경</option>
                  <option value={ProposalType.AiModeration}>AI 중재 설정 변경</option>
                </select>
              </div>
              
              <div>
                <label className={`block mb-2 ${isPixelMode ? 'text-black font-silkscreen uppercase' : 'text-gray-700 dark:text-gray-300'}`}>
                  새 값
                </label>
                {newProposal.type === ProposalType.AiModeration ? (
                  <select
                    value={newProposal.newValue}
                    onChange={(e) => setNewProposal({...newProposal, newValue: Number(e.target.value)})}
                    className={`w-full ${isPixelMode 
                      ? 'border-2 border-black p-2 font-silkscreen uppercase' 
                      : 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md p-2'}`}
                  >
                    <option value={0}>비활성화</option>
                    <option value={1}>활성화</option>
                  </select>
                ) : (
                  <div className="flex">
                    <input
                      type="number"
                      value={newProposal.newValue}
                      onChange={(e) => setNewProposal({...newProposal, newValue: Number(e.target.value)})}
                      min="0"
                      step={newProposal.type === ProposalType.BaseFee ? "0.001" : "1"}
                      className={`flex-grow ${isPixelMode 
                        ? 'border-2 border-black p-2 font-silkscreen' 
                        : 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-l-md p-2'}`}
                    />
                    <span className={`px-3 flex items-center ${isPixelMode 
                      ? 'border-2 border-l-0 border-black bg-gray-100 font-silkscreen' 
                      : 'border border-l-0 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 rounded-r-md'}`}>
                      {proposalTypeUnits[newProposal.type]}
                    </span>
                  </div>
                )}
              </div>
              
              <div>
                <label className={`block mb-2 ${isPixelMode ? 'text-black font-silkscreen uppercase' : 'text-gray-700 dark:text-gray-300'}`}>
                  투표 기간
                </label>
                <select
                  value={newProposal.votingPeriod}
                  onChange={(e) => setNewProposal({...newProposal, votingPeriod: Number(e.target.value)})}
                  className={`w-full ${isPixelMode 
                    ? 'border-2 border-black p-2 font-silkscreen uppercase' 
                    : 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md p-2'}`}
                >
                  <option value={3600}>1시간</option>
                  <option value={86400}>24시간</option>
                  <option value={259200}>3일</option>
                  <option value={604800}>7일</option>
                </select>
              </div>
            </div>
            
            <div className={`${isPixelMode ? 'border-t-4 border-black' : 'border-t dark:border-gray-700'} p-4 flex justify-end space-x-3`}>
              <button
                onClick={() => setShowCreateModal(false)}
                className={`${isPixelMode 
                  ? 'border-2 border-black bg-gray-200 hover:bg-gray-300 text-black px-4 py-2 uppercase text-sm font-bold font-silkscreen' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium'}`}
                disabled={isLoading}
              >
                취소
              </button>
              <button
                onClick={handleCreateProposal}
                className={`${isPixelMode 
                  ? 'border-2 border-black bg-green-500 hover:bg-green-600 text-white px-4 py-2 uppercase text-sm font-bold font-silkscreen' 
                  : 'bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium'}`}
                disabled={isLoading}
              >
                {isLoading ? "처리 중..." : "제안 생성"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
