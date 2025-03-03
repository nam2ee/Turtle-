"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { ProfileSetupModal, ProfileData } from "./ProfileSetupModal";

type ProfileButtonProps = {
  className?: string;
  isPixelMode?: boolean;
};

export function ProfileButton({ className, isPixelMode = false }: ProfileButtonProps) {
  const { publicKey, connected } = useWallet();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  
  if (!connected || !publicKey) return null;
  
  const handleSaveProfile = (profileData: ProfileData) => {
    // In a real app, this would be saved to a database or local storage
    console.log("Saving profile data:", profileData);
    setProfile(profileData);
  };
  
  // Use custom display name if set, otherwise don't show address (already visible in wallet button)
  const displayName = profile?.displayName || "My Profile";
  
  return (
    <>
      <button
        onClick={() => setShowProfileModal(true)}
        className={`flex items-center gap-2 px-3 py-2 ${
          isPixelMode 
            ? "border-2 border-black bg-purple-500 hover:bg-purple-600 text-white" 
            : "bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
        } ${className || ""}`}
      >
        <div className={`w-6 h-6 ${isPixelMode ? 'border-2 border-white' : 'rounded-full'} bg-purple-300 flex items-center justify-center`}>
          <span className="text-xs">👤</span>
        </div>
        <span className={isPixelMode ? "font-silkscreen uppercase text-sm" : "font-medium text-sm"}>
          {displayName}
        </span>
      </button>
      
      <ProfileSetupModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onSave={handleSaveProfile}
      />
    </>
  );
}