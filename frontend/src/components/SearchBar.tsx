"use client";

type SearchBarProps = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortOption: "recent" | "bounty" | "popularity";
  onSortChange: (option: "recent" | "bounty" | "popularity") => void;
  isPixelMode?: boolean;
};

export function SearchBar({
  searchQuery,
  onSearchChange,
  sortOption,
  onSortChange,
  isPixelMode = false
}: SearchBarProps) {
  return (
    <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full mb-6 ${isPixelMode ? 'font-silkscreen' : ''}`}>
      {/* Search Input */}
      <div className={`relative w-full md:w-auto md:flex-1 ${isPixelMode ? 'max-w-sm' : 'max-w-md'}`}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="SEARCH COMMUNITIES..."
          className={`w-full ${
            isPixelMode 
              ? 'border-2 border-black py-2 px-3 bg-white text-green-700 placeholder-green-500 font-silkscreen focus:outline-none focus:border-green-500 uppercase' 
              : 'rounded-lg border border-gray-300 dark:border-gray-600 py-2 px-3 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-600'
          }`}
        />
        <div className="absolute right-3 top-2.5">
          {searchQuery ? (
            <button 
              onClick={() => onSearchChange("")}
              className={`${isPixelMode ? 'text-green-600 hover:text-green-800' : 'text-gray-500 hover:text-gray-700'}`}
            >
              ✕
            </button>
          ) : (
            <span className={`${isPixelMode ? 'text-green-600' : 'text-gray-400'}`}>🔍</span>
          )}
        </div>
      </div>
      
      {/* Sort Options */}
      <div className={`flex ${isPixelMode ? 'space-x-0 border-2 border-black' : 'space-x-1 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600'}`}>
        <button
          onClick={() => onSortChange("recent")}
          className={`px-3 py-2 text-sm ${
            isPixelMode
              ? `border-r-2 border-black ${sortOption === "recent" ? 'bg-teal-500 text-white' : 'bg-white text-teal-800 hover:bg-teal-50'}`
              : `${sortOption === "recent" ? 'bg-teal-600 text-white' : 'bg-white dark:bg-gray-800 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/20'}`
          }`}
        >
          {isPixelMode ? 'NEWEST' : 'Recently Added'}
        </button>
        <button
          onClick={() => onSortChange("bounty")}
          className={`px-3 py-2 text-sm ${
            isPixelMode
              ? `border-r-2 border-black ${sortOption === "bounty" ? 'bg-teal-500 text-white' : 'bg-white text-teal-800 hover:bg-teal-50'}`
              : `${sortOption === "bounty" ? 'bg-teal-600 text-white' : 'bg-white dark:bg-gray-800 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/20'}`
          }`}
        >
          {isPixelMode ? 'TOP BOUNTY' : 'Highest Bounty'}
        </button>
        <button
          onClick={() => onSortChange("popularity")}
          className={`px-3 py-2 text-sm ${
            isPixelMode
              ? `${sortOption === "popularity" ? 'bg-teal-500 text-white' : 'bg-white text-teal-800 hover:bg-teal-50'}`
              : `${sortOption === "popularity" ? 'bg-teal-600 text-white' : 'bg-white dark:bg-gray-800 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/20'}`
          }`}
        >
          {isPixelMode ? 'POPULAR' : 'Most Popular'}
        </button>
      </div>
    </div>
  );
}