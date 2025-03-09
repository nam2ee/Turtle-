export function CommunityCard({
  name,
  description,
  bountyAmount,
  gradient,
  isPixelMode,
  onDeposit,
  lastActivityTimeFormatted // 새로운 prop 추가
}) {
  return (
    <div className={`
      h-full
      ${isPixelMode 
        ? 'border-4 border-black' 
        : 'rounded-xl shadow-md'
      }
      ${gradient} overflow-hidden
    `}>
      <div className={`
        p-6 h-full flex flex-col
        ${isPixelMode ? 'bg-white border-b-4 border-black' : 'bg-white/90 dark:bg-gray-800/90'}
      `}>
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
          <div className="mb-3">
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
              onClick={onDeposit}
              className={`
                ${isPixelMode 
                  ? 'border-2 border-black bg-teal-500 hover:bg-teal-600 text-white px-4 py-1 text-sm font-silkscreen' 
                  : 'bg-teal-600 hover:bg-teal-700 text-white px-3 py-1 rounded-md text-sm'}
              `}
            >
              Deposit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
