"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/Button";
import { CountdownTimer } from "@/components/CountdownTimer";
import { PostDetailModal } from "@/components/PostDetailModal";

// Mock community data - in a real app would be fetched based on id
const MOCK_COMMUNITIES = [
  {
    id: "1",
    name: "Solana Developers",
    description: "A community for Solana developers to share knowledge and resources.",
    bountyAmount: 2.5,
    gradient: "bg-gradient-to-r from-blue-400 to-purple-500",
    timeLimit: 30, // Minutes
    baseFee: 0.05,
    depositers: 8,
    challengers: 24,
    lastActivityTime: "2025-03-03T10:30:00Z", // Last time a challenger posted
  },
  {
    id: "2",
    name: "NFT Artists",
    description: "Share your NFT artwork and get feedback from other artists.",
    bountyAmount: 1.8,
    gradient: "bg-gradient-to-r from-yellow-400 to-orange-500",
    timeLimit: 45, // Minutes
    baseFee: 0.02,
    depositers: 5,
    challengers: 17,
    lastActivityTime: "2025-03-03T09:15:00Z", // Last time a challenger posted
  },
  {
    id: "3",
    name: "DeFi Enthusiasts",
    description: "Discuss DeFi projects, strategies, and news on Solana.",
    bountyAmount: 3.2,
    gradient: "bg-gradient-to-r from-green-400 to-teal-500",
    timeLimit: 60, // Minutes
    baseFee: 0.1,
    depositers: 12,
    challengers: 31,
    lastActivityTime: "2025-03-03T08:45:00Z", // Last time a challenger posted
  },
];

// Mock posts
const MOCK_POSTS = [
  {
    id: "p1",
    communityId: "1",
    author: "0x1a2b3c...4d5e",
    content: "Just released a new Solana NFT marketplace toolkit. Check it out at github.com/username/repo",
    timestamp: "2025-03-02T15:30:00Z",
    likes: 12,
    likedBy: ["GHji4fPL3JqzxG9k6DgpeJHvQrYYq5AZZpn6UvsfVzak"],
  },
  {
    id: "p2",
    communityId: "1",
    author: "0xabcd...1234",
    content: "Has anyone integrated Backpack wallet with a Next.js app? Looking for examples.",
    timestamp: "2025-03-02T14:45:00Z",
    likes: 5,
    likedBy: [],
  },
  {
    id: "p3",
    communityId: "1",
    author: "0x9876...fedc",
    content: "Working on a new DeFi protocol that leverages Solana's speed. Anyone interested in beta testing?",
    timestamp: "2025-03-02T13:20:00Z",
    likes: 18,
    likedBy: [],
  },
];
//////////

export default function CommunityDetailPage() {
  // const router = useRouter();
  const params = useParams();
  const { publicKey, connected } = useWallet();
  const communityId = params.id as string;
  
  const [isPixelMode] = useState(true); // Always use pixel mode
  const [newPost, setNewPost] = useState("");
  const [posts, setPosts] = useState(MOCK_POSTS.filter(post => post.communityId === communityId));
  const [gridView, setGridView] = useState(true);
  const [selectedPost, setSelectedPost] = useState<{
    id: string;
    communityId: string;
    author: string;
    content: string;
    timestamp: string;
    likes: number;
    likedBy: string[];
  } | null>(null);
  
  // Find community data based on ID
  const community = MOCK_COMMUNITIES.find(c => c.id === communityId);
  
  if (!community) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Community Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The community you are looking for does not exist.
          </p>
          <Link href="/app">
            <Button>Back to Communities</Button>
          </Link>
        </div>
      </div>
    );
  }
  
  const submitPost = () => {
    if (newPost.trim().length === 0 || !publicKey) return;
    
    const newPostObj = {
      id: `p${Date.now()}`,
      communityId,
      author: publicKey.toString().slice(0, 8) + "..." + publicKey.toString().slice(-4),
      content: newPost,
      timestamp: new Date().toISOString(),
      likes: 0,
      likedBy: [],
    };
    
    setPosts([newPostObj, ...posts]);
    setNewPost("");
    
    // In a real app, we would update the lastActivityTime on the server
    // For this mock implementation, we won't modify the MOCK_COMMUNITIES data
  };
  
  const handleLikePost = (postId: string) => {
    if (!publicKey) return;
    
    setPosts(posts.map(post => {
      if (post.id === postId) {
        // Check if the user has already liked the post
        const alreadyLiked = post.likedBy.includes(publicKey.toString());
        
        if (alreadyLiked) {
          // Unlike the post
          return {
            ...post,
            likes: post.likes - 1,
            likedBy: post.likedBy.filter(addr => addr !== publicKey.toString())
          };
        } else {
          // Like the post
          return {
            ...post,
            likes: post.likes + 1,
            likedBy: [...post.likedBy, publicKey.toString()]
          };
        }
      }
      return post;
    }));
  };
  
  const handleTimeExpired = () => {
    console.log("Time expired! Bounty should be awarded to the latest participant.");
    // In a real app, this would trigger a smart contract interaction to award the bounty
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    });
  };
  
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

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader 
        isPixelMode={isPixelMode}
      />
      
      {/* Post Detail Modal */}
      <PostDetailModal 
        post={selectedPost}
        isOpen={selectedPost !== null}
        onClose={() => setSelectedPost(null)}
        onLike={handleLikePost}
        walletAddress={publicKey?.toString()}
        isPixelMode={isPixelMode}
      />
      
      <div className={`w-full h-48 ${community.gradient} ${isPixelMode ? 'border-b-4 border-black' : ''} flex items-center justify-center`}>
        <div className="text-center text-white p-6">
          <h1 className={`text-3xl font-bold mb-2 ${isPixelMode ? 'font-silkscreen uppercase' : ''}`}>{community.name}</h1>
          <p className={`text-lg opacity-90 max-w-2xl ${isPixelMode ? 'font-silkscreen' : ''}`}>{community.description}</p>
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
                      {community.bountyAmount} SOL
                    </p>
                  </div>
                  
                  <div>
                    <h3 className={`text-sm font-medium ${isPixelMode ? 'text-black font-silkscreen uppercase' : 'text-gray-500 dark:text-gray-400'}`}>
                      Bounty Timer
                    </h3>
                    <div className="mt-2">
                      <CountdownTimer
                        initialMinutes={community.timeLimit}
                        lastUpdateTime={community.lastActivityTime}
                        isPixelMode={isPixelMode}
                        onTimeExpired={handleTimeExpired}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <h3 className={`text-sm font-medium ${isPixelMode ? 'text-black font-silkscreen uppercase' : 'text-gray-500 dark:text-gray-400'}`}>
                      Base Fee
                    </h3>
                    <p className={`font-medium ${isPixelMode ? 'text-black font-silkscreen' : 'text-gray-800 dark:text-gray-200'}`}>
                      {community.baseFee} SOL
                    </p>
                  </div>
                  
                  <div className="flex justify-between pt-2">
                    <div>
                      <h3 className={`text-sm font-medium ${isPixelMode ? 'text-black font-silkscreen uppercase' : 'text-gray-500 dark:text-gray-400'}`}>
                        Depositors
                      </h3>
                      <p className={`font-medium ${isPixelMode ? 'text-black font-silkscreen' : 'text-gray-800 dark:text-gray-200'}`}>
                        {community.depositers}
                      </p>
                    </div>
                    <div>
                      <h3 className={`text-sm font-medium ${isPixelMode ? 'text-black font-silkscreen uppercase' : 'text-gray-500 dark:text-gray-400'}`}>
                        Challengers
                      </h3>
                      <p className={`font-medium ${isPixelMode ? 'text-black font-silkscreen' : 'text-gray-800 dark:text-gray-200'}`}>
                        {community.challengers}
                      </p>
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    {isPixelMode ? (
                      <button 
                        className="w-full border-2 border-black bg-green-500 hover:bg-green-600 text-white py-2 uppercase text-sm font-bold font-silkscreen"
                      >
                        Deposit SOL
                      </button>
                    ) : (
                      <Button variant="primary" className="w-full">
                        Deposit SOL
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Main content - posts feed */}
            <div className="md:col-span-2">
              {/* Create post */}
              <div className="border-4 border-black bg-white p-6 mb-6 pixel-shadow">
                <h2 className="text-xl font-bold text-black uppercase font-silkscreen mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-green-500 border-2 border-black flex items-center justify-center text-white">+</span>
                  Create Content
                </h2>
                <textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="SHARE YOUR CONTENT WITH THE COMMUNITY..."
                  className="w-full px-4 py-3 border-2 border-black font-silkscreen focus:outline-none bg-blue-50 text-black min-h-[120px] uppercase"
                />
                <div className="flex justify-between items-center mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 border-2 border-black flex items-center justify-center bg-yellow-400">
                      <span className="text-black">💰</span>
                    </div>
                    <p className="text-sm text-black font-silkscreen uppercase">
                      Fee: {community.baseFee} SOL
                    </p>
                  </div>
                  <button
                    onClick={submitPost}
                    className="border-2 border-black bg-green-500 hover:bg-green-600 text-white px-6 py-2 uppercase text-sm font-bold font-silkscreen pixel-shadow"
                  >
                    Post
                  </button>
                </div>
              </div>
              
              {/* View toggle */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-black uppercase font-silkscreen">
                  Community Content
                </h2>
                <div className="flex space-x-3">
                  <button 
                    onClick={() => setGridView(true)}
                    className={`p-2 ${gridView ? 'bg-green-500 text-white' : 'bg-white text-black'} border-2 border-black font-silkscreen flex items-center gap-2 px-3`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
                      <rect x="3" y="3" width="7" height="7"></rect>
                      <rect x="14" y="3" width="7" height="7"></rect>
                      <rect x="14" y="14" width="7" height="7"></rect>
                      <rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                    <span className="text-xs uppercase">Grid</span>
                  </button>
                  <button 
                    onClick={() => setGridView(false)}
                    className={`p-2 ${!gridView ? 'bg-green-500 text-white' : 'bg-white text-black'} border-2 border-black font-silkscreen flex items-center gap-2 px-3`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
                      <line x1="21" y1="6" x2="3" y2="6"></line>
                      <line x1="21" y1="12" x2="3" y2="12"></line>
                      <line x1="21" y1="18" x2="3" y2="18"></line>
                    </svg>
                    <span className="text-xs uppercase">List</span>
                  </button>
                </div>
              </div>
              
              {/* Posts - Grid View */}
              {gridView ? (
                <div className="grid grid-cols-3 gap-4">
                  {posts.length > 0 ? (
                    posts.map((post) => (
                      <div 
                        key={post.id} 
                        className="border-4 border-black aspect-square relative overflow-hidden cursor-pointer group pixel-shadow"
                        onClick={() => setSelectedPost(post)}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center p-4">
                          <p className="text-white text-sm line-clamp-4 text-center font-silkscreen uppercase tracking-wider">
                            {post.content}
                          </p>
                        </div>
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="text-white text-center font-silkscreen">
                            <p className="flex items-center justify-center gap-2">
                              <span>{post.likedBy.includes(publicKey?.toString() || '') ? '❤️' : '🤍'}</span>
                              <span className="text-lg">{post.likes}</span>
                            </p>
                            {post.id === posts[0].id && (
                              <span className="bg-gradient-to-r from-amber-400 to-yellow-500 border-2 border-black text-black text-xs px-3 py-1 mt-3 inline-block uppercase flex items-center gap-1">
                                <span>🏆</span> WINNER
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-3 border-4 border-black bg-white p-6 text-center pixel-shadow">
                      <p className="text-black font-silkscreen uppercase">
                        No posts yet. Be the first to create content!
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                // List View
                <div className="space-y-6">
                  {posts.length > 0 ? (
                    posts.map((post) => (
                      <div 
                        key={post.id} 
                        className="border-4 border-black bg-white p-4 pixel-shadow cursor-pointer"
                        onClick={() => setSelectedPost(post)}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center">
                            <div className="w-12 h-12 border-2 border-black bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center mr-3 shadow-md">
                              👤
                            </div>
                            <div>
                              <h3 className="font-medium text-teal-800 font-silkscreen uppercase">
                                {post.author}
                              </h3>
                              <p className="text-xs text-teal-600 font-silkscreen bg-teal-50 px-2 py-0.5 inline-block mt-1 border border-teal-100">
                                🕒 {formatDate(post.timestamp)}
                              </p>
                            </div>
                          </div>
                          {post.id === posts[0].id && (
                            <div className="bg-gradient-to-r from-amber-400 to-yellow-500 text-black border-2 border-black font-silkscreen text-xs px-3 py-1 uppercase flex items-center gap-1 shadow-md">
                              <span>🏆</span> WINNER
                            </div>
                          )}
                        </div>
                        
                        <p className="text-teal-800 font-silkscreen mt-3 whitespace-pre-wrap uppercase tracking-wider border-2 border-black p-4 bg-gradient-to-br from-teal-50 to-teal-100 shadow-inner">
                          {post.content}
                        </p>
                        
                        <div className="mt-4 flex justify-between items-center">
                          <button 
                            className={`flex items-center gap-2 font-silkscreen border-2 border-black px-4 py-2 ${
                              post.likedBy.includes(publicKey?.toString() || '') 
                                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md'
                                : 'bg-white text-teal-700 hover:bg-teal-50'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLikePost(post.id);
                            }}
                          >
                            <span className="text-lg">{post.likedBy.includes(publicKey?.toString() || '') ? '❤️' : '🤍'}</span>
                            <span className="font-bold">{post.likes}</span>
                          </button>
                          
                          {post.id === posts[0].id && (
                            <div className="text-sm text-black font-bold font-silkscreen border-2 border-amber-400 bg-gradient-to-r from-amber-100 to-amber-200 px-4 py-2 shadow flex items-center gap-2">
                              <span className="text-lg">💰</span> REWARD: {community.bountyAmount} SOL
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="border-4 border-black bg-white p-6 text-center pixel-shadow">
                      <p className="text-black font-silkscreen uppercase">
                        No posts yet. Be the first to create content!
                      </p>
                    </div>
                  )}
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
              {isPixelMode ? 'BACK' : 'Back to Communities'}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
