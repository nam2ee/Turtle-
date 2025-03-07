"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { ProfileSetupModal, ProfileData } from "./ProfileSetupModal";
import { getProfileByWalletAddress } from "../services/api";

type ProfileButtonProps = {
  className?: string;
  isPixelMode?: boolean;
};

// Helper to convert backend profile to frontend format
const convertBackendProfile = (backendProfile: any): ProfileData => {
  console.log('Converting backend profile to frontend format:', backendProfile);
  
  return {
    displayName: backendProfile.user_name || '',
    bio: backendProfile.user_bio || '',
    socialLinks: {
      github: backendProfile.github_account || undefined,
      twitter: backendProfile.x_account || undefined,
      telegram: backendProfile.tg_account || undefined,
    },
    // Check if user_avatar is present, and if it's a string (base64) or a Uint8Array (direct binary)
    avatarUrl: backendProfile.user_avatar ? 
      (typeof backendProfile.user_avatar === 'string' 
        ? `data:${backendProfile.avatar_content_type || 'image/jpeg'};base64,${backendProfile.user_avatar}` 
        : `data:${backendProfile.avatar_content_type || 'image/jpeg'};base64,${Buffer.from(backendProfile.user_avatar).toString('base64')}`) 
      : undefined
  };
};

export function ProfileButton({ className, isPixelMode = false }: ProfileButtonProps) {
  const { publicKey, connected } = useWallet();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Only run client-side code after mount to prevent hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Remove this function as it won't work without CORS headers on the backend

  // Load profile from backend when wallet connects - only on client side
  useEffect(() => {
    // Skip this effect during SSR
    if (!mounted) return;
    
    let isMounted = true;
    
    const loadProfile = async () => {
      if (!connected || !publicKey) return;
      
      try {
        setIsLoading(true);
        const walletAddress = publicKey.toString();
        console.log('Fetching profile for wallet address:', walletAddress);
        
        // Add a small delay to ensure backend has time to process any previous saves
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Try to get the profile using fetch
        console.log('Fetching profile data...');
        let backendProfile;
        
        try {
          backendProfile = await getProfileByWalletAddress(walletAddress);
        } catch (fetchError) {
          console.error('Profile fetch failed:', fetchError);
          console.log('Backend error - likely CORS issue. Fix by adding CORS headers to backend.');
          backendProfile = null;
        }
        
        // Only update state if component is still mounted
        if (!isMounted) return;
        
        console.log('Backend profile received:', backendProfile);
        
        if (backendProfile) {
          // Convert backend profile format to frontend format
          const frontendProfile = convertBackendProfile(backendProfile);
          console.log('Frontend profile created:', frontendProfile);
          setProfile(frontendProfile);
        } else {
          console.log('No profile found for this wallet address');
          // Reset profile to null if no profile is found
          setProfile(null);
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        // Silently fail - will just show default profile
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadProfile();
    
    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, [connected, publicKey, mounted]);
  
  // If not mounted, return a placeholder button
  if (!mounted) {
    return (
      <button
        className={`flex items-center gap-2 px-3 py-2 ${
          isPixelMode 
            ? "border-2 border-black bg-purple-500 text-white" 
            : "bg-purple-600 text-white rounded-lg"
        } ${className || ""}`}
        disabled
      >
        <div className={`w-6 h-6 ${isPixelMode ? 'border-2 border-white' : 'rounded-full'} bg-purple-300 flex items-center justify-center`}>
          <span className="text-xs">👤</span>
        </div>
        <span className={isPixelMode ? "font-silkscreen uppercase text-sm" : "font-medium text-sm"}>
          Profile
        </span>
      </button>
    );
  }

  if (!connected || !publicKey) return null;
  
  const handleSaveProfile = (profileData: ProfileData) => {
    // We've already saved to backend in the modal, just update local state
    console.log("Setting profile data in component state:", profileData);
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
        disabled={isLoading}
      >
        <div className={`w-6 h-6 ${isPixelMode ? 'border-2 border-white' : 'rounded-full'} bg-purple-300 flex items-center justify-center`}>
          <span className="text-xs">{isLoading ? '⏳' : '👤'}</span>
        </div>
        <span className={isPixelMode ? "font-silkscreen uppercase text-sm" : "font-medium text-sm"}>
          {isLoading ? "Loading..." : displayName}
        </span>
      </button>
      
      <ProfileSetupModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onSave={handleSaveProfile}
        initialProfile={profile}
      />
    </>
  );
}