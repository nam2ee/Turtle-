"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/Button";
import { AppHeader } from "@/components/AppHeader";
import { CommunityCard } from "@/components/CommunityCard";
import { CreateCommunityModal } from "@/components/CreateCommunityModal";
import { WalletButton } from "@/components/WalletButton";
import { SearchBar } from "@/components/SearchBar";

// Mock data for communities
// Adding createdAt and popularity fields for sorting
const MOCK_COMMUNITIES = [
  {
    id: "1",
    name: "Solana Developers",
    description: "A community for Solana developers to share knowledge and resources.",
    bountyAmount: 2.5,
    gradient: "bg-gradient-to-r from-blue-400 to-purple-500",
    timeLimit: "30 minutes",
    baseFee: 0.05,
    createdAt: "2025-03-01T10:00:00Z",
    popularity: 87,
  },
  {
    id: "2",
    name: "NFT Artists",
    description: "Share your NFT artwork and get feedback from other artists.",
    bountyAmount: 1.8,
    gradient: "bg-gradient-to-r from-yellow-400 to-orange-500",
    timeLimit: "45 minutes",
    baseFee: 0.02,
    createdAt: "2025-03-02T15:30:00Z",
    popularity: 62,
  },
  {
    id: "3",
    name: "DeFi Enthusiasts",
    description: "Discuss DeFi projects, strategies, and news on Solana.",
    bountyAmount: 3.2,
    gradient: "bg-gradient-to-r from-green-400 to-teal-500",
    timeLimit: "60 minutes",
    baseFee: 0.1,
    createdAt: "2025-02-28T19:45:00Z",
    popularity: 91,
  },
  {
    id: "4",
    name: "Blockchain Gamers",
    description: "Connect with other gamers building and playing on Solana's blockchain.",
    bountyAmount: 2.7,
    gradient: "bg-gradient-to-r from-red-400 to-pink-500",
    timeLimit: "50 minutes",
    baseFee: 0.07,
    createdAt: "2025-03-01T22:15:00Z",
    popularity: 74,
  },
  {
    id: "5",
    name: "Meme Coin Traders",
    description: "Share insights and strategies for trading meme coins on Solana.",
    bountyAmount: 4.2,
    gradient: "bg-gradient-to-r from-indigo-400 to-blue-500",
    timeLimit: "25 minutes",
    baseFee: 0.15,
    createdAt: "2025-03-03T08:20:00Z",
    popularity: 95,
  },
  {
    id: "6",
    name: "SOL Developers Hub",
    description: "Advanced development topics and best practices for Solana.",
    bountyAmount: 5.0,
    gradient: "bg-gradient-to-r from-purple-400 to-indigo-500",
    timeLimit: "40 minutes",
    baseFee: 0.2,
    createdAt: "2025-02-27T14:30:00Z",
    popularity: 83,
  },
  {
    id: "7",
    name: "Web3 UX/UI Designers",
    description: "Community focused on creating better user experiences for Web3 applications.",
    bountyAmount: 2.3,
    gradient: "bg-gradient-to-r from-green-400 to-emerald-500",
    timeLimit: "35 minutes",
    baseFee: 0.04,
    createdAt: "2025-02-25T09:15:00Z",
    popularity: 68,
  },
  {
    id: "8",
    name: "Solana Hackathon Teams",
    description: "Find teammates and collaborators for upcoming Solana hackathons.",
    bountyAmount: 3.5,
    gradient: "bg-gradient-to-r from-cyan-400 to-blue-500",
    timeLimit: "55 minutes",
    baseFee: 0.08,
    createdAt: "2025-03-02T16:45:00Z",
    popularity: 79,
  },
  {
    id: "9",
    name: "NFT Collectors Club",
    description: "Discuss rare and valuable NFT collections in the Solana ecosystem.",
    bountyAmount: 6.2,
    gradient: "bg-gradient-to-r from-orange-400 to-red-500",
    timeLimit: "65 minutes",
    baseFee: 0.25,
    createdAt: "2025-03-01T11:10:00Z",
    popularity: 88,
  },
  {
    id: "10",
    name: "Solana Security Experts",
    description: "Share knowledge on smart contract security and best practices.",
    bountyAmount: 4.7,
    gradient: "bg-gradient-to-r from-gray-600 to-gray-800",
    timeLimit: "70 minutes",
    baseFee: 0.3,
    createdAt: "2025-02-28T13:25:00Z",
    popularity: 76,
  },
];

export default function AppPage() {
  const { connected } = useWallet();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joinedCommunities, setJoinedCommunities] = useState<string[]>([]);
  const [isPixelMode] = useState(true); // Always use pixel mode
  const [currentPage, setCurrentPage] = useState(1);
  const communitiesPerPage = 6;
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<"recent" | "bounty" | "popularity">("recent");

  const handleCreateCommunity = () => {
    setShowCreateModal(true);
  };
  
  const handleCloseModal = () => {
    setShowCreateModal(false);
  };
  
  const handleCreateCommunitySubmit = (communityData: {
    name: string;
    description: string;
    bountyAmount: number;
    timeLimit: number;
    baseFee: number;
    socialLinks?: {
      github?: string;
      twitter?: string;
      telegram?: string;
    };
    profileImage?: string;
  }) => {
    // In a real implementation, we would call an API to create the community
    console.log("Creating community with social profiles:", communityData);
    
    // Mock implementation - create a new community and add it to the list
    const newCommunity = {
      id: `${MOCK_COMMUNITIES.length + 1}`,
      name: communityData.name,
      description: communityData.description,
      bountyAmount: communityData.bountyAmount,
      gradient: "bg-gradient-to-r from-teal-400 to-blue-500", // Default gradient
      timeLimit: `${communityData.timeLimit} minutes`,
      baseFee: communityData.baseFee,
      // Social links would be stored in the real implementation
      socialLinks: communityData.socialLinks,
      profileImage: communityData.profileImage || null
    };
    
    // In a real implementation, we would update the state with the new community
    // For now, just close the modal
    setShowCreateModal(false);
    
    // For demo purposes, add to joined communities automatically
    setJoinedCommunities([...joinedCommunities, newCommunity.id]);
  };

  const handleDepositToCommunity = (e: React.MouseEvent, communityId: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    // In a real app, this would open a deposit modal or wallet transaction
    console.log(`Depositing to community: ${communityId}`);
    
    // For demo purposes, also join the community
    if (!joinedCommunities.includes(communityId)) {
      setJoinedCommunities([...joinedCommunities, communityId]);
    }
  };
  
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page on new search
  };
  
  const handleSortChange = (option: "recent" | "bounty" | "popularity") => {
    setSortOption(option);
    setCurrentPage(1); // Reset to first page on new sort
  };
  
  // Filter and sort communities
  const filteredAndSortedCommunities = useMemo(() => {
    // First filter by search query
    let result = MOCK_COMMUNITIES.filter(community => 
      community.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      community.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    // Then sort according to the selected option
    switch(sortOption) {
      case "recent":
        result = [...result].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case "bounty":
        result = [...result].sort((a, b) => b.bountyAmount - a.bountyAmount);
        break;
      case "popularity":
        result = [...result].sort((a, b) => b.popularity - a.popularity);
        break;
    }
    
    return result;
  }, [searchQuery, sortOption]);

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
          
          {/* Pixel mode toggle removed since we're always using pixel mode */}
          
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
                      onDeposit={(e) => handleDepositToCommunity(e, community.id)}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
          
          {/* Pagination */}
          {filteredAndSortedCommunities.length > 0 && (
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
          
          <div className="mt-12">
            <h2 className={`text-xl font-bold ${isPixelMode ? 'text-teal-800 font-silkscreen uppercase' : 'text-teal-900 dark:text-teal-200'} mb-4`}>Your DAO List</h2>
            {joinedCommunities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {MOCK_COMMUNITIES
                  .filter(community => joinedCommunities.includes(community.id))
                  .map(community => (
                    <div 
                      key={community.id}
                      className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6"
                    >
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{community.name}</h3>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Time Limit:</span>
                          <p className="font-medium text-gray-800 dark:text-gray-200">{community.timeLimit}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Base Fee:</span>
                          <p className="font-medium text-gray-800 dark:text-gray-200">{community.baseFee} SOL</p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-500 dark:text-gray-400">Total Bounty:</span>
                          <p className="font-medium text-green-600 dark:text-green-400">{community.bountyAmount} SOL</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <Link href={`/app/community/${community.id}`}>
                          <Button variant="primary" size="sm" className="w-full">
                            View Community
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))
                }
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 text-center">
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