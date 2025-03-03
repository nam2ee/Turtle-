"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

type ProfileSetupModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profileData: ProfileData) => void;
};

export type ProfileData = {
  displayName: string;
  bio: string;
  socialLinks: {
    github?: string;
    twitter?: string;
    telegram?: string;
  };
  avatarUrl?: string;
};

export function ProfileSetupModal({ isOpen, onClose, onSave }: ProfileSetupModalProps) {
  const { publicKey } = useWallet();
  
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  
  // SNS Integration
  const [githubUsername, setGithubUsername] = useState("");
  const [twitterUsername, setTwitterUsername] = useState("");
  const [telegramUsername, setTelegramUsername] = useState("");
  
  // Auth status
  const [isGithubConnected, setIsGithubConnected] = useState(false);
  const [isTwitterConnected, setIsTwitterConnected] = useState(false);
  const [isTelegramConnected, setIsTelegramConnected] = useState(false);
  
  // Initialize with wallet address as display name
  useEffect(() => {
    if (publicKey && !displayName) {
      const address = publicKey.toString();
      setDisplayName(`${address.slice(0, 4)}...${address.slice(-4)}`);
    }
  }, [publicKey, displayName]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const profileData: ProfileData = {
      displayName,
      bio,
      socialLinks: {
        github: isGithubConnected ? githubUsername : undefined,
        twitter: isTwitterConnected ? twitterUsername : undefined,
        telegram: isTelegramConnected ? telegramUsername : undefined,
      },
      avatarUrl
    };
    
    onSave(profileData);
    onClose();
  };
  
  const connectGithub = async () => {
    // In a real app, this would open OAuth flow
    // For demo, we simulate a successful connection
    setIsGithubConnected(true);
    if (!githubUsername) setGithubUsername("github-user");
  };
  
  const connectTwitter = async () => {
    // In a real app, this would open OAuth flow
    setIsTwitterConnected(true);
    if (!twitterUsername) setTwitterUsername("twitter-user");
  };
  
  const connectTelegram = async () => {
    // In a real app, this would open OAuth flow
    setIsTelegramConnected(true);
    if (!telegramUsername) setTelegramUsername("telegram-user");
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white border-4 border-black max-w-lg w-full p-6 font-silkscreen overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-black uppercase">Setup Your Profile</h2>
          <button 
            onClick={onClose}
            className="text-black hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-5">
            {/* Profile Avatar */}
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 border-2 border-black bg-gray-200 flex items-center justify-center">
                {avatarUrl ? (
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center">
                    <span className="text-2xl text-white">🐢</span>
                  </div>
                ) : (
                  <span className="text-2xl">👤</span>
                )}
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-black uppercase mb-1">
                  Profile Image
                </label>
                <button
                  type="button"
                  onClick={() => setAvatarUrl("dummy-avatar-url")}
                  className="border-2 border-black bg-yellow-400 hover:bg-yellow-500 text-black px-3 py-1 text-sm uppercase"
                >
                  Upload Avatar
                </button>
              </div>
            </div>
            
            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-black uppercase mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 border-2 border-black focus:outline-none bg-white text-black font-silkscreen"
                placeholder="Enter your display name"
                required
              />
            </div>
            
            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-black uppercase mb-1">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border-2 border-black focus:outline-none bg-white text-black font-silkscreen"
                placeholder="Tell us about yourself"
              />
            </div>
            
            {/* Wallet Address (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-black uppercase mb-1">
                Wallet Address
              </label>
              <input
                type="text"
                value={publicKey ? publicKey.toString() : "Not connected"}
                className="w-full px-3 py-2 border-2 border-black focus:outline-none bg-gray-100 text-gray-700 font-silkscreen"
                readOnly
              />
            </div>
            
            {/* Social Connections */}
            <div className="border-2 border-black p-4 bg-blue-100">
              <h3 className="text-lg font-bold text-black uppercase mb-3">Connect Social Accounts</h3>
              
              {/* GitHub */}
              <div className="flex items-center justify-between border-2 border-black p-2 bg-white mb-3">
                <div className="flex items-center">
                  <span className="text-xl mr-2">🐙</span>
                  <span className="text-sm">GitHub</span>
                </div>
                {isGithubConnected ? (
                  <div className="flex items-center">
                    <span className="text-xs mr-2 text-green-600">@{githubUsername}</span>
                    <button 
                      type="button"
                      onClick={() => setIsGithubConnected(false)}
                      className="text-red-500 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={connectGithub}
                    className="border-2 border-black bg-gray-200 hover:bg-gray-300 text-black px-2 py-1 text-xs uppercase"
                  >
                    Connect
                  </button>
                )}
              </div>
              
              {/* Twitter */}
              <div className="flex items-center justify-between border-2 border-black p-2 bg-white mb-3">
                <div className="flex items-center">
                  <span className="text-xl mr-2">🐦</span>
                  <span className="text-sm">Twitter/X</span>
                </div>
                {isTwitterConnected ? (
                  <div className="flex items-center">
                    <span className="text-xs mr-2 text-green-600">@{twitterUsername}</span>
                    <button 
                      type="button"
                      onClick={() => setIsTwitterConnected(false)}
                      className="text-red-500 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={connectTwitter}
                    className="border-2 border-black bg-gray-200 hover:bg-gray-300 text-black px-2 py-1 text-xs uppercase"
                  >
                    Connect
                  </button>
                )}
              </div>
              
              {/* Telegram */}
              <div className="flex items-center justify-between border-2 border-black p-2 bg-white">
                <div className="flex items-center">
                  <span className="text-xl mr-2">📱</span>
                  <span className="text-sm">Telegram</span>
                </div>
                {isTelegramConnected ? (
                  <div className="flex items-center">
                    <span className="text-xs mr-2 text-green-600">@{telegramUsername}</span>
                    <button 
                      type="button"
                      onClick={() => setIsTelegramConnected(false)}
                      className="text-red-500 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={connectTelegram}
                    className="border-2 border-black bg-gray-200 hover:bg-gray-300 text-black px-2 py-1 text-xs uppercase"
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex space-x-3">
            <button 
              type="submit" 
              className="flex-1 border-2 border-black bg-green-500 hover:bg-green-600 text-white py-2 uppercase font-bold"
            >
              Save Profile
            </button>
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 border-2 border-black bg-gray-200 hover:bg-gray-300 text-black py-2 uppercase font-bold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}