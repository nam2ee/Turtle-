"use client";

import { useState } from "react";

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
  }) => void;
};

export function CreateCommunityModal({ isOpen, onClose, onSubmit }: CreateCommunityModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bountyAmount, setBountyAmount] = useState(1);
  const [timeLimit, setTimeLimit] = useState(30);
  const [baseFee, setBaseFee] = useState(0.05);
  
  // SNS Integration
  const [githubUsername, setGithubUsername] = useState("");
  const [twitterUsername, setTwitterUsername] = useState("");
  const [telegramUsername, setTelegramUsername] = useState("");
  const [profileImage, setProfileImage] = useState("");
  
  // For demo purposes only - in real app would be replaced with actual authentication
  const [isGithubConnected, setIsGithubConnected] = useState(false);
  const [isTwitterConnected, setIsTwitterConnected] = useState(false);
  const [isTelegramConnected, setIsTelegramConnected] = useState(false);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      description,
      bountyAmount,
      timeLimit,
      baseFee,
      socialLinks: {
        github: isGithubConnected ? githubUsername : undefined,
        twitter: isTwitterConnected ? twitterUsername : undefined,
        telegram: isTelegramConnected ? telegramUsername : undefined,
      },
      profileImage
    });
    resetForm();
  };

  const connectGithub = () => {
    // In real app, this would authenticate with GitHub
    setIsGithubConnected(true);
    if (!githubUsername) setGithubUsername("github-user");
  };
  
  const connectTwitter = () => {
    // In real app, this would authenticate with Twitter
    setIsTwitterConnected(true);
    if (!twitterUsername) setTwitterUsername("twitter-user");
  };
  
  const connectTelegram = () => {
    // In real app, this would authenticate with Telegram
    setIsTelegramConnected(true);
    if (!telegramUsername) setTelegramUsername("telegram-user");
  };

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
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white border-4 border-black max-w-2xl w-full p-6 font-silkscreen overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-black uppercase">Create New Community</h2>
          <button 
            onClick={onClose}
            className="text-black hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4 md:col-span-1">
              <div>
                <label className="block text-sm font-medium text-black uppercase mb-1">
                  Community Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border-2 border-black focus:outline-none bg-white text-black font-silkscreen"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black uppercase mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border-2 border-black focus:outline-none bg-white text-black font-silkscreen"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black uppercase mb-1">
                  Bounty Amount (SOL)
                </label>
                <input
                  type="number"
                  value={bountyAmount}
                  onChange={(e) => setBountyAmount(Number(e.target.value))}
                  min={0.1}
                  step={0.1}
                  required
                  className="w-full px-3 py-2 border-2 border-black focus:outline-none bg-white text-black font-silkscreen"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black uppercase mb-1">
                    Time Limit (min)
                  </label>
                  <input
                    type="number"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(Number(e.target.value))}
                    min={1}
                    required
                    className="w-full px-3 py-2 border-2 border-black focus:outline-none bg-white text-black font-silkscreen"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black uppercase mb-1">
                    Base Fee (SOL)
                  </label>
                  <input
                    type="number"
                    value={baseFee}
                    onChange={(e) => setBaseFee(Number(e.target.value))}
                    min={0.01}
                    step={0.01}
                    required
                    className="w-full px-3 py-2 border-2 border-black focus:outline-none bg-white text-black font-silkscreen"
                  />
                </div>
              </div>
            </div>

            {/* Social Profile Section */}
            <div className="md:col-span-1 space-y-4">
              <div className="border-2 border-black p-4 bg-blue-100">
                <h3 className="text-lg font-bold text-black uppercase mb-3">Community Profile</h3>
                
                {/* Profile Image Upload */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-black uppercase mb-1">
                    Profile Image
                  </label>
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 border-2 border-black bg-gray-200 relative overflow-hidden">
                      {profileImage ? (
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center">
                          <span className="text-xl text-white">🐢</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <span>?</span>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setProfileImage("dummy-profile-url")}
                      className="border-2 border-black bg-yellow-400 hover:bg-yellow-500 text-black px-3 py-1 text-sm uppercase"
                    >
                      Upload
                    </button>
                  </div>
                </div>
                
                {/* Social Links */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-black uppercase mb-1">
                    Connect Socials
                  </label>
                  
                  {/* GitHub */}
                  <div className="flex items-center justify-between border-2 border-black p-2 bg-white">
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
                  
                  {/* Twitter/X */}
                  <div className="flex items-center justify-between border-2 border-black p-2 bg-white">
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
            </div>
          </div>

          <div className="mt-6 flex space-x-3">
            <button 
              type="submit" 
              className="flex-1 border-2 border-black bg-green-500 hover:bg-green-600 text-white py-2 uppercase font-bold"
            >
              Create Community
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