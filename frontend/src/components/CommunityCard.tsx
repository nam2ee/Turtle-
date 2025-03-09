import React, { useState, useEffect } from 'react';


export function CommunityCard({
  name,
  description,
  bountyAmount,
  gradient,
  isPixelMode,
  onDeposit,
  lastActivityTimeFormatted,
  expirationTime,
  timeRemaining: initialTimeRemaining, // 이름 변경
  isExpired: initialIsExpired
}) {
  const [timeRemaining, setTimeRemaining] = useState(initialTimeRemaining || "Unknown");
  const [isExpired, setIsExpired] = useState(initialIsExpired);
  
  // 디버깅 로그 추가
  useEffect(() => {
    console.log('CommunityCard props:', {
      name,
      lastActivityTimeFormatted,
      expirationTime,
      initialTimeRemaining,
      initialIsExpired
    });
  }, [name, lastActivityTimeFormatted, expirationTime, initialTimeRemaining, initialIsExpired]);
  
  // 실시간 카운트다운 업데이트
  useEffect(() => {
    // 초기값이 있으면 사용
    if (initialTimeRemaining && initialTimeRemaining !== "Unknown") {
      setTimeRemaining(initialTimeRemaining);
    }
    
    // expirationTime이 없거나 이미 만료된 경우 업데이트하지 않음
    if (!expirationTime || initialIsExpired) {
      return;
    }
    
    const updateRemainingTime = () => {
      const now = new Date();
      const expTime = new Date(expirationTime);
      const diffInSeconds = Math.floor((expTime - now) / 1000);
      
      if (diffInSeconds <= 0) {
        setIsExpired(true);
        setTimeRemaining("Expired");
        clearInterval(interval);
      } else {
        const days = Math.floor(diffInSeconds / 86400);
        const hours = Math.floor((diffInSeconds % 86400) / 3600);
        const minutes = Math.floor((diffInSeconds % 3600) / 60);
        const seconds = diffInSeconds % 60;
        
        if (days > 0) {
          setTimeRemaining(`${days}d ${hours}h remaining`);
        } else if (hours > 0) {
          setTimeRemaining(`${hours}h ${minutes}m remaining`);
        } else if (minutes > 0) {
          setTimeRemaining(`${minutes}m ${seconds}s remaining`);
        } else {
          setTimeRemaining(`${seconds}s remaining`);
        }
      }
    };
    
    // 초기 업데이트
    updateRemainingTime();
    
    // 1초마다 업데이트
    const interval = setInterval(updateRemainingTime, 1000);
    
    // 컴포넌트 언마운트 시 인터벌 정리
    return () => clearInterval(interval);
  }, [expirationTime, initialIsExpired, initialTimeRemaining]);

  return (
    <div className={`
      h-full relative
      ${isPixelMode 
        ? 'border-4 border-black' 
        : 'rounded-xl shadow-md'
      }
      ${gradient} overflow-hidden
      ${isExpired ? 'opacity-75' : ''}
    `}>
      <div className={`
        p-6 h-full flex flex-col
        ${isPixelMode ? 'bg-white border-b-4 border-black' : 'bg-white/90 dark:bg-gray-800/90'}
        ${isExpired ? 'bg-gray-100 dark:bg-gray-900/90' : ''}
      `}>
        {isExpired && (
          <div className="absolute top-0 right-0 m-2">
            <span className={`
              px-2 py-1 text-xs font-bold text-white
              ${isPixelMode ? 'font-silkscreen border-2 border-black bg-red-500' : 'bg-red-500 rounded-md'}
            `}>
              EXPIRED
            </span>
          </div>
        )}
        
        <h3 className={`
          text-xl font-bold mb-2
          ${isPixelMode ? 'font-silkscreen text-teal-800' : 'text-teal-900 dark:text-teal-200'}
        `}>
          {name}
        </h3>
        
        <p className={`
          mb-4 flex-grow
          ${isPixelMode ? 'font-silkscreen text-sm text-teal-700' : 'text-teal-700 dark:text-teal-400'}
        `}>
          {description}
        </p>
        
        <div className="mt-auto">
          {/* 마지막 활동 시간 표시 */}
          <div className="mb-2">
            <span className={`
              text-xs
              ${isPixelMode ? 'font-silkscreen text-teal-600' : 'text-teal-600 dark:text-teal-500'}
            `}>
              Last Activity:
            </span>
            <p className={`
              text-sm font-medium
              ${isPixelMode ? 'font-silkscreen text-teal-800' : 'text-teal-800 dark:text-teal-300'}
            `}>
              {lastActivityTimeFormatted}
            </p>
          </div>
          
          {/* 남은 시간 표시 */}
          <div className="mb-3">
            <span className={`
              text-xs
              ${isPixelMode ? 'font-silkscreen text-teal-600' : 'text-teal-600 dark:text-teal-500'}
            `}>
              Status:
            </span>
            <p className={`
              text-sm font-medium
              ${isPixelMode ? 'font-silkscreen' : ''}
              ${isExpired 
                ? 'text-red-600 dark:text-red-400' 
                : 'text-green-600 dark:text-green-400'}
            `}>
              {timeRemaining}
            </p>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <span className={`
                text-xs
                ${isPixelMode ? 'font-silkscreen text-teal-600' : 'text-teal-600 dark:text-teal-500'}
              `}>
                Total Bounty
              </span>
              <p className={`
                text-lg font-bold
                ${isPixelMode ? 'font-silkscreen text-teal-800' : 'text-teal-800 dark:text-teal-300'}
              `}>
                {bountyAmount.toFixed(2)} SOL
              </p>
            </div>
            
            <button
              onClick={isExpired ? undefined : onDeposit}
              className={`
                ${isPixelMode 
                  ? 'border-2 border-black bg-teal-500 hover:bg-teal-600 text-white px-4 py-1 text-sm font-silkscreen' 
                  : 'bg-teal-600 hover:bg-teal-700 text-white px-3 py-1 rounded-md text-sm'}
                ${isExpired ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              disabled={isExpired}
            >
              {isExpired ? 'Expired' : 'Deposit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
