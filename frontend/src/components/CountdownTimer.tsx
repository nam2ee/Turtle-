"use client";

import { useState, useEffect } from "react";

type CountdownTimerProps = {
  initialMinutes: number;
  lastUpdateTime: string; // ISO date string
  isPixelMode?: boolean;
  onTimeExpired?: () => void;
};

export function CountdownTimer({ 
  initialMinutes, 
  lastUpdateTime, 
  isPixelMode = false,
  onTimeExpired
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
  }>({ hours: 0, minutes: 0, seconds: 0 });
  
  const [isExpired, setIsExpired] = useState(false);
  
  useEffect(() => {
    // Calculate time passed since last update
    const lastUpdate = new Date(lastUpdateTime).getTime();
    const totalMilliseconds = initialMinutes * 60 * 1000;
    
    // Update countdown
    const updateTimer = () => {
      const now = new Date().getTime();
      const elapsedMilliseconds = now - lastUpdate;
      const remainingMilliseconds = totalMilliseconds - elapsedMilliseconds;
      
      if (remainingMilliseconds <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        setIsExpired(true);
        if (onTimeExpired) onTimeExpired();
        return;
      }
      
      // Convert remaining time to hours, minutes, seconds
      const hours = Math.floor(remainingMilliseconds / (1000 * 60 * 60));
      const minutes = Math.floor((remainingMilliseconds % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remainingMilliseconds % (1000 * 60)) / 1000);
      
      setTimeLeft({ hours, minutes, seconds });
    };
    
    // Initial update
    updateTimer();
    
    // Set interval to update timer every second
    const intervalId = setInterval(updateTimer, 1000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [initialMinutes, lastUpdateTime, onTimeExpired]);
  
  // Format time digits to always show 2 digits (e.g., 01, 02, etc.)
  const formatTimeDigit = (digit: number) => digit.toString().padStart(2, '0');
  
  return (
    <div className={`flex flex-col ${isPixelMode ? 'font-silkscreen' : ''}`}>
      <div className={`text-sm ${isPixelMode ? 'uppercase text-green-700' : 'text-gray-500 dark:text-gray-400'}`}>
        Time Remaining:
      </div>
      
      <div className={`flex items-center mt-1 ${isExpired ? 'text-red-600' : ''}`}>
        {isExpired ? (
          <span className={`font-bold ${isPixelMode ? 'uppercase' : ''}`}>
            Expired
          </span>
        ) : (
          <>
            <div className={`flex flex-col items-center ${isPixelMode ? 'border-2 border-black bg-green-100 px-2 py-1' : 'bg-gray-100 dark:bg-gray-800 rounded-md px-2 py-1'}`}>
              <span className={`text-xl font-bold ${isPixelMode ? 'text-green-800' : 'text-gray-800 dark:text-gray-200'}`}>
                {formatTimeDigit(timeLeft.hours)}
              </span>
              <span className={`text-xs ${isPixelMode ? 'text-green-600' : 'text-gray-500 dark:text-gray-400'}`}>HR</span>
            </div>
            
            <span className="mx-1 text-lg">:</span>
            
            <div className={`flex flex-col items-center ${isPixelMode ? 'border-2 border-black bg-green-100 px-2 py-1' : 'bg-gray-100 dark:bg-gray-800 rounded-md px-2 py-1'}`}>
              <span className={`text-xl font-bold ${isPixelMode ? 'text-green-800' : 'text-gray-800 dark:text-gray-200'}`}>
                {formatTimeDigit(timeLeft.minutes)}
              </span>
              <span className={`text-xs ${isPixelMode ? 'text-green-600' : 'text-gray-500 dark:text-gray-400'}`}>MIN</span>
            </div>
            
            <span className="mx-1 text-lg">:</span>
            
            <div className={`flex flex-col items-center ${isPixelMode ? 'border-2 border-black bg-green-100 px-2 py-1' : 'bg-gray-100 dark:bg-gray-800 rounded-md px-2 py-1'}`}>
              <span className={`text-xl font-bold ${isPixelMode ? 'text-green-800' : 'text-gray-800 dark:text-gray-200'}`}>
                {formatTimeDigit(timeLeft.seconds)}
              </span>
              <span className={`text-xs ${isPixelMode ? 'text-green-600' : 'text-gray-500 dark:text-gray-400'}`}>SEC</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}