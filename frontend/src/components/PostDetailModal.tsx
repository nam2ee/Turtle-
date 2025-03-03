"use client";

import { FC } from "react";

type PostDetailModalProps = {
  post: {
    id: string;
    author: string;
    content: string;
    timestamp: string;
    likes: number;
    likedBy: string[];
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onLike: (postId: string) => void;
  walletAddress?: string;
  isPixelMode?: boolean;
};

export const PostDetailModal: FC<PostDetailModalProps> = ({
  post,
  isOpen,
  onClose,
  onLike,
  walletAddress,
  isPixelMode = false,
}) => {
  if (!isOpen || !post) return null;
  
  const isLiked = walletAddress ? post.likedBy.includes(walletAddress) : false;
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    });
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className={`
        w-full max-w-2xl bg-white dark:bg-gray-800 max-h-[90vh] overflow-y-auto
        ${isPixelMode ? 'border-4 border-black font-silkscreen' : 'rounded-xl shadow-xl'}
      `}>
        {/* Header with close button */}
        <div className={`flex justify-between items-center p-4 ${isPixelMode ? 'border-b-4 border-black bg-gradient-to-r from-teal-400 to-teal-500' : 'border-b border-teal-200 dark:border-teal-700 bg-teal-50 dark:bg-teal-900'}`}>
          <h2 className={`font-bold ${isPixelMode ? 'text-white uppercase text-lg' : 'text-teal-600 dark:text-teal-300 text-xl'}`}>
            Post Details
          </h2>
          <button 
            onClick={onClose}
            className={`${isPixelMode ? 'text-white hover:text-teal-100 text-2xl' : 'text-teal-500 hover:text-teal-700 dark:text-teal-300 dark:hover:text-teal-100'}`}
          >
            ✕
          </button>
        </div>
        
        {/* Post content */}
        <div className="p-6">
          {/* Author info */}
          <div className="flex items-center mb-6">
            <div className={`w-14 h-14 flex items-center justify-center mr-4 ${
              isPixelMode 
                ? 'border-3 border-black bg-gradient-to-br from-teal-400 to-teal-600' 
                : 'rounded-full bg-gradient-to-br from-teal-400 to-teal-600 shadow-md'
            }`}>
              <span className="text-white text-xl">👤</span>
            </div>
            <div>
              <h3 className={`font-medium ${
                isPixelMode 
                  ? 'text-teal-800 uppercase text-lg' 
                  : 'text-teal-700 dark:text-teal-300 text-lg'
              }`}>
                {post.author}
              </h3>
              <div className={`flex items-center ${
                isPixelMode 
                  ? 'text-teal-600 bg-teal-50 border border-teal-200 px-2 py-1 text-xs inline-block mt-1' 
                  : 'text-teal-500 dark:text-teal-400 text-xs mt-1'
              }`}>
                <span className="mr-1">🕒</span>
                {formatDate(post.timestamp)}
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className={`
            mt-4 p-5
            ${isPixelMode 
              ? 'border-2 border-black bg-gradient-to-br from-teal-50 to-teal-100 whitespace-pre-wrap shadow-inner' 
              : 'bg-gradient-to-br from-teal-50 to-white dark:from-teal-900/30 dark:to-gray-800 rounded-lg whitespace-pre-wrap shadow-inner'}
          `}>
            <p className={`${isPixelMode 
              ? 'text-teal-800 uppercase tracking-wider text-lg leading-relaxed' 
              : 'text-teal-700 dark:text-teal-300 leading-relaxed'}`}
            >
              {post.content}
            </p>
          </div>
          
          {/* Likes */}
          <div className="mt-8 flex justify-between items-center">
            <button 
              onClick={() => onLike(post.id)}
              className={`
                flex items-center gap-3 px-6 py-3 transition-all transform hover:scale-105
                ${isPixelMode 
                  ? `border-2 border-black ${isLiked 
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md' 
                        : 'bg-white text-teal-800 hover:bg-teal-50'}`
                  : `rounded-lg ${isLiked 
                        ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md' 
                        : 'bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300'} 
                      hover:shadow-md dark:hover:bg-teal-900/30`}
              `}
            >
              <span className="text-xl">{isLiked ? '❤️' : '🤍'}</span>
              <div className="flex flex-col items-center">
                <span className={`font-bold ${isPixelMode ? 'text-lg' : ''}`}>{post.likes}</span>
                <span className={`${isPixelMode ? 'uppercase text-xs' : 'text-xs'}`}>
                  {post.likes === 1 ? 'Like' : 'Likes'}
                </span>
              </div>
            </button>
            
            {post.id === "p1" && (
              <div className={`
                px-5 py-3 flex items-center gap-2
                ${isPixelMode 
                  ? 'border-2 border-black bg-gradient-to-r from-amber-400 to-yellow-500 text-black uppercase font-silkscreen shadow-md' 
                  : 'rounded-lg bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-medium shadow-md'}
              `}>
                <span className="text-lg">🏆</span>
                <span>Winner</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};