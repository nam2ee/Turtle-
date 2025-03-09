"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/Button";
import { AppHeader } from "@/components/AppHeader";
import { CommunityCard } from "@/components/CommunityCard";
import { CreateCommunityModal } from "@/components/CreateCommunityModal";
import { WalletButton } from "@/components/WalletButton";
import { SearchBar } from "@/components/SearchBar";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

// API 호출 함수들
const fetchAllPDAs = async () => {
  const response = await fetch('http://localhost:8080/api/dao/pdas');
  if (!response.ok) throw new Error('Failed to fetch PDAs');
  return response.json();
};

const fetchAllCommunities = async () => {
  const response = await fetch('http://localhost:8080/api/dao/communities');
  if (!response.ok) throw new Error('Failed to fetch communities');
  return response.json();
};

const fetchCommunityDepositors = async (pda) => {
  const response = await fetch(`http://localhost:8080/api/dao/depositors?pda=${pda}`);
  if (!response.ok) throw new Error(`Failed to fetch depositors for PDA: ${pda}`);
  return response.json();
};

const fetchCommunityInfo = async (pda) => {
  const response = await fetch(`http://localhost:8080/api/dao/community?pda=${pda}`);
  if (!response.ok) throw new Error(`Failed to fetch community info for PDA: ${pda}`);
  return response.json();
};

export default function AppPage() {
  const { connected } = useWallet();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joinedCommunities, setJoinedCommunities] = useState([]);
  const [isPixelMode] = useState(true); // Always use pixel mode
  const [currentPage, setCurrentPage] = useState(1);
  const communitiesPerPage = 6;
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("recent");
  
  // 데이터 상태 관리
  const [pdas, setPdas] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [communityInfoMap, setCommunityInfoMap] = useState({});
  const [depositorsMap, setDepositorsMap] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 데이터 로딩
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // 1. PDA 목록 가져오기
        const pdasResponse = await fetchAllPDAs();
        console.log('PDA Response:', pdasResponse);
        
        // API 응답 구조에 맞게 처리 (pdas 배열 추출)
        const pdasArray = pdasResponse.pdas || [];
        setPdas(pdasArray);
        
        // 2. 모든 커뮤니티 정보 가져오기
        const communitiesResponse = await fetchAllCommunities();
        console.log('Communities Response:', communitiesResponse);
        
        // API 응답 구조에 맞게 처리 (communities 배열 추출)
        const communitiesArray = communitiesResponse.communities || [];
        setCommunities(communitiesArray);
        
        // 3. 각 PDA에 대한 추가 정보 가져오기
        const infoMap = {};
        const depositorsData = {};
        
        for (const pda of pdasArray) {
          try {
            // 커뮤니티 상세 정보 가져오기
            const communityInfo = await fetchCommunityInfo(pda);
            infoMap[pda] = communityInfo;
            
            // 예치자 정보 가져오기
            const depositorsResponse = await fetchCommunityDepositors(pda);
            const depositors = depositorsResponse.depositors || [];
            depositorsData[pda] = depositors;
          } catch (err) {
            console.error(`Error fetching data for PDA ${pda}:`, err);
          }
        }
        
        setCommunityInfoMap(infoMap);
        setDepositorsMap(depositorsData);
        setIsLoading(false);
      } catch (err) {
        console.error("Error loading data:", err);
        setError(err.message);
        setIsLoading(false);
      }
    };
    
    if (connected) {
      loadData();
    }
  }, [connected]);

  const communitiesWithDetails = useMemo(() => {
    return pdas.map((pda, index) => {
      const community = communities[index] || {};
      const communityInfo = communityInfoMap[pda] || {};
      const depositors = depositorsMap[pda] || [];
      
      // Lamports를 SOL로 변환
      const totalLamportsFromAPI = community.total_deposit || 0;
      
      // 예치자 정보에서 직접 합산
      const totalLamportsFromDepositors = depositors.reduce((sum, depositor) => {
        return sum + (depositor.amount || 0);
      }, 0);
  
      const totalLamports = totalLamportsFromDepositors > 0 ? 
        totalLamportsFromDepositors : totalLamportsFromAPI;
      const bountyAmount = totalLamports / LAMPORTS_PER_SOL;
      
      // 시간 제한 초 단위로 저장 (원본 값)
      const timeLimitSeconds = community.time_limit || 108000; // 기본값 30시간(108000초)
      
      // 시간 제한을 분 단위로 변환 (초 -> 분) - 표시용
      const timeLimitMinutes = Math.round(timeLimitSeconds / 60);
      
      // 기본 수수료를 SOL로 변환
      const baseFee = (community.base_fee || 0) / LAMPORTS_PER_SOL;
  
      let lastActivityTime = null;
      let lastActivityTimeFormatted = "Never";
      let expirationTime = null;
      let expirationTimeFormatted = "Unknown";
      let timeRemaining = "";
      let isExpired = false;
      
      if (community.last_activity_timestamp && !isNaN(Number(community.last_activity_timestamp))) {
        const timestamp = Number(community.last_activity_timestamp);
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
        
        // 종료 시간 계산 (마지막 활동 시간 + time_limit)
        expirationTime = new Date((timestamp + timeLimitSeconds) * 1000);
        
        expirationTimeFormatted = new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }).format(expirationTime);
        
        // 현재 시간과 종료 시간 비교하여 남은 시간 계산
        const now = new Date();
        const diffInSeconds = Math.floor((expirationTime - now) / 1000);
        
        if (diffInSeconds <= 0) {
          isExpired = true;
          timeRemaining = "Expired";
        } else {
          // 남은 시간 계산 (일, 시간, 분)
          const days = Math.floor(diffInSeconds / 86400);
          const hours = Math.floor((diffInSeconds % 86400) / 3600);
          const minutes = Math.floor((diffInSeconds % 3600) / 60);
          
          if (days > 0) {
            timeRemaining = `${days}d ${hours}h remaining`;
          } else if (hours > 0) {
            timeRemaining = `${hours}h ${minutes}m remaining`;
          } else {
            timeRemaining = `${minutes}m remaining`;
          }
        }
      }
      
      // 타임스탬프 안전하게 처리
      let createdAt;
      try {
        // 타임스탬프가 존재하고 유효한 숫자인지 확인
        const timestamp = community.last_activity_timestamp;
        if (timestamp && !isNaN(Number(timestamp))) {
          // 솔라나 타임스탬프는 초 단위이므로 밀리초로 변환
          const date = new Date(Number(timestamp) * 1000);
          
          // 유효한 날짜인지 확인 (Invalid Date 체크)
          if (!isNaN(date.getTime())) {
            createdAt = date.toISOString();
          } else {
            // 유효하지 않은 날짜면 현재 시간 사용
            createdAt = new Date().toISOString();
          }
        } else {
          // 타임스탬프가 없으면 현재 시간 사용
          createdAt = new Date().toISOString();
        }
      } catch (err) {
        console.error('Invalid timestamp:', community.last_activity_timestamp, err);
        createdAt = new Date().toISOString();
      }
  
      return {
        id: pda,
        pda: pda,
        name: communityInfo.name || `Community ${pda}`,
        description: communityInfo.description || `A community on the Solana blockchain`,
        bountyAmount,
        gradient: `bg-gradient-to-r from-${getRandomColor()}-400 to-${getRandomColor()}-500`,
        timeLimit: `${timeLimitMinutes} minutes`,
        baseFee,
        createdAt,
        lastActivityTime,
        lastActivityTimeFormatted,
        expirationTime,
        expirationTimeFormatted,
        timeRemaining,
        isExpired,
        popularity: community.depositor_count || 0,
        admin: community.admin
      };
    });
  }, [pdas, communities, communityInfoMap, depositorsMap]);
  

  // 랜덤 색상 생성 함수
  function getRandomColor() {
    const colors = ['blue', 'green', 'red', 'yellow', 'purple', 'pink', 'indigo', 'teal', 'orange', 'cyan'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // 필터링 및 정렬
  const filteredAndSortedCommunities = useMemo(() => {
    let result = communitiesWithDetails.filter(community => 
      community.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      community.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    switch(sortOption) {
      case "recent":
        result = [...result].sort((a, b) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        break;
      case "bounty":
        result = [...result].sort((a, b) => (b.bountyAmount || 0) - (a.bountyAmount || 0));
        break;
      case "popularity":
        result = [...result].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
        break;
    }
    
    return result;
  }, [communitiesWithDetails, searchQuery, sortOption]);

  // 나머지 코드는 이전과 동일...
  
  // 여기서부터는 이전 코드와 동일하게 유지
  const handleCreateCommunity = () => {
    setShowCreateModal(true);
  };
  
  const handleCloseModal = () => {
    setShowCreateModal(false);
  };

  const handleCreateCommunitySubmit = async (communityData) => {
    // 실제 구현에서는 API를 호출하여 커뮤니티 생성
    console.log("Creating community:", communityData);
    
    // 커뮤니티 생성 후 데이터 다시 로드
    try {
      const pdasResponse = await fetchAllPDAs();
      // 여기를 수정: 객체에서 pdas 배열을 추출
      setPdas(pdasResponse.pdas || []);
      
      const communitiesResponse = await fetchAllCommunities();
      // 여기도 수정: 객체에서 communities 배열을 추출
      setCommunities(communitiesResponse.communities || []);
      
      setShowCreateModal(false);
    } catch (err) {
      console.error("Error creating community:", err);
      // 에러 처리 로직 추가
    }
  };

  
  

  const handleDepositToCommunity = (e, communityId) => {
    e.stopPropagation();
    e.preventDefault();
    
    // 실제 구현에서는 예치 모달 또는 트랜잭션 처리
    console.log(`Depositing to community: ${communityId}`);
    
    if (!joinedCommunities.includes(communityId)) {
      setJoinedCommunities([...joinedCommunities, communityId]);
    }
  };
  
  const handleSearchChange = (query) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };
  
  const handleSortChange = (option) => {
    setSortOption(option);
    setCurrentPage(1);
  };
  


  // 지갑 연결 안 된 경우
  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className={`w-full max-w-md ${isPixelMode ? 'border-4 border-black' : ''} ${isPixelMode ? 'font-silkscreen' : ''} bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8`}>
          <div className="text-center mb-8">
            <div className={`w-24 h-24 ${isPixelMode ? 'border-4 border-black' : 'rounded-full'} bg-green-600 flex items-center justify-center mx-auto mb-4`}>
              <span className="text-white text-4xl">🐢</span>
            </div>
            <h1 className={`text-2xl font-bold text-green-800 dark:text-green-300 ${isPixelMode ? 'pixel-text' : ''}`}>
              Connect Your Wallet
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              To use Turtle, you need to connect your Solana wallet
            </p>
          </div>
          
          <div className="flex justify-center mb-4">
            <div className={`${isPixelMode ? 'border-4 border-black bg-yellow-400 hover:bg-yellow-500' : ''} overflow-hidden rounded-lg`}>
              <WalletButton className={`${isPixelMode ? '!bg-yellow-400 hover:!bg-yellow-500 !border-0 !text-black !h-auto !w-full !py-3 !px-6 font-silkscreen !rounded-none' : ''}`} />
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <Link href="/" className="text-teal-600 dark:text-teal-400 hover:underline">
              Back to Home
            </Link>
          </div>
        </div>
        
        <div className="mt-8 max-w-md text-center text-gray-600 dark:text-gray-400">
          <p>Supported wallets: Phantom, Solflare</p>
        </div>
      </div>
    );
  }

  // 로딩 상태 표시
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AppHeader 
          onCreateCommunity={handleCreateCommunity}
          isPixelMode={isPixelMode}
        />
        <main className={`flex-grow flex items-center justify-center ${isPixelMode ? 'bg-blue-100' : 'bg-gray-50 dark:bg-gray-900'}`}>
          <div className={`p-8 ${isPixelMode ? 'border-4 border-black bg-white font-silkscreen' : 'bg-white dark:bg-gray-800 rounded-xl shadow-md'}`}>
            <p className="text-xl text-center">Loading communities...</p>
            <div className="mt-4 flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 에러 상태 표시
  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <AppHeader 
          onCreateCommunity={handleCreateCommunity}
          isPixelMode={isPixelMode}
        />
        <main className={`flex-grow flex items-center justify-center ${isPixelMode ? 'bg-blue-100' : 'bg-gray-50 dark:bg-gray-900'}`}>
          <div className={`p-8 ${isPixelMode ? 'border-4 border-black bg-white font-silkscreen' : 'bg-white dark:bg-gray-800 rounded-xl shadow-md'}`}>
            <p className="text-xl text-center text-red-500">Error loading communities</p>
            <p className="mt-2 text-center">{error}</p>
            <div className="mt-4 flex justify-center">
              <button 
                onClick={() => window.location.reload()}
                className={`${isPixelMode ? 'border-4 border-black bg-teal-500 hover:bg-teal-600 text-white px-6 py-2' : 'bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700'}`}
              >
                Try Again
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader 
        onCreateCommunity={handleCreateCommunity}
        isPixelMode={isPixelMode}
      />
      
      <main className={`flex-grow ${isPixelMode ? 'bg-blue-100' : 'bg-gray-50 dark:bg-gray-900'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className={`text-2xl font-bold ${isPixelMode ? 'text-teal-800 font-silkscreen uppercase' : 'text-teal-900 dark:text-teal-200'}`}>
              Communities
            </h1>
            <p className={`${isPixelMode ? 'text-teal-700 font-silkscreen' : 'text-teal-700 dark:text-teal-400'}`}>
              Join existing communities or create your own
            </p>
          </div>
          
          {/* Search and Sort Bar */}
          <SearchBar 
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            sortOption={sortOption}
            onSortChange={handleSortChange}
            isPixelMode={isPixelMode}
          />
          
          {/* No Results Message */}
          {filteredAndSortedCommunities.length === 0 && (
            <div className={`p-8 text-center ${isPixelMode ? 'border-4 border-black bg-white font-silkscreen' : 'bg-white dark:bg-gray-800 rounded-xl shadow-md'}`}>
              <p className={`${isPixelMode ? 'text-teal-700 uppercase' : 'text-teal-600 dark:text-teal-400'}`}>
                No communities found matching your search.
              </p>
              <button 
                onClick={() => setSearchQuery("")}
                className={`mt-4 ${
                  isPixelMode 
                    ? 'border-2 border-black bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 uppercase text-sm font-bold' 
                    : 'text-teal-600 dark:text-teal-400 hover:underline'
                }`}
              >
                {isPixelMode ? 'CLEAR SEARCH' : 'Clear search'}
              </button>
            </div>
          )}
          
          {/* Communities Grid */}
          {filteredAndSortedCommunities.length > 0 && (
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${isPixelMode ? 'gap-y-8' : ''}`}>
                {filteredAndSortedCommunities
                .slice((currentPage - 1) * communitiesPerPage, currentPage * communitiesPerPage)
                .map((community) => (
                <Link href={`/app/community/${community.id}`} key={community.id}>
                  <div className="cursor-pointer h-full">
                    <CommunityCard
                      name={community.name}
                      description={community.description}
                      bountyAmount={community.bountyAmount}
                      gradient={community.gradient}
                      isPixelMode={isPixelMode}
                      lastActivityTimeFormatted={community.lastActivityTimeFormatted}
                      timeRemaining={community.timeRemaining}
                      isExpired={community.isExpired}
                      expirationTime={community.expirationTime} // 이 줄 추가
                      onDeposit={(e) => handleDepositToCommunity(e, community.id)}
                    />
                  </div>
                </Link>
              ))}
              

            </div>
          )}
          
          {/* Pagination */}
          {filteredAndSortedCommunities.length > communitiesPerPage && (
            <div className="mt-8 flex justify-center">
              <div className="flex space-x-2">
                {[...Array(Math.ceil(filteredAndSortedCommunities.length / communitiesPerPage))].map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPage(index + 1)}
                    className={`
                      w-10 h-10 flex items-center justify-center
                      ${isPixelMode ? 'border-2 border-black font-silkscreen' : 'rounded-md'}
                      ${currentPage === index + 1 
                        ? (isPixelMode 
                          ? 'bg-teal-500 text-white' 
                          : 'bg-teal-600 text-white')
                        : (isPixelMode 
                          ? 'bg-white text-teal-800 hover:bg-teal-50' 
                          : 'bg-white dark:bg-gray-800 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/20')
                      }
                    `}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Joined Communities */}
          <div className="mt-12">
            <h2 className={`text-xl font-bold ${isPixelMode ? 'text-teal-800 font-silkscreen uppercase' : 'text-teal-900 dark:text-teal-200'} mb-4`}>Your DAO List</h2>
            {joinedCommunities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                  {filteredAndSortedCommunities
                    .slice((currentPage - 1) * communitiesPerPage, currentPage * communitiesPerPage)
                    .map((community) => (
                    <Link href={`/app/community/${community.id}`} key={community.id}>
                      <div className="cursor-pointer h-full">
                        <CommunityCard
                          name={community.name}
                          description={community.description}
                          bountyAmount={community.bountyAmount}
                          gradient={community.gradient}
                          isPixelMode={isPixelMode}
                          lastActivityTimeFormatted={community.lastActivityTimeFormatted}
                          timeRemaining={community.timeRemaining}
                          isExpired={community.isExpired}
                          expirationTime={community.expirationTime} // 이 줄 추가
                          onDeposit={(e) => handleDepositToCommunity(e, community.id)}
                        />
                      </div>
                    </Link>
                  ))}




              </div>
            ) : (
              <div className={`${isPixelMode ? 'border-4 border-black' : ''} bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 text-center`}>
                <p className="text-gray-600 dark:text-gray-400">
                  You haven&apos;t joined any communities yet. Join existing ones or create your own!
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <span className="text-gray-600 dark:text-gray-400">© 2025 Turtle</span>
            </div>
            <div className="flex space-x-6">
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">Terms</a>
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">Privacy</a>
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">Help</a>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Create Community Modal */}
      <CreateCommunityModal 
        isOpen={showCreateModal}
        onClose={handleCloseModal}
        onSubmit={handleCreateCommunitySubmit}
      />
    </div>
  );
}
