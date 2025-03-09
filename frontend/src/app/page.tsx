"use client";

// import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Animation effects when page loads
  useEffect(() => {
    setIsLoaded(true);
    
    // Create an interval for the feature carousel
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % 3);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Feature highlights for carousel
  const features = [
    {
      title: "Time-Based Bounties",
      description: "Deposits fund bounties that reward the last challenger before time expires.",
      icon: "⏱️",
      color: "bg-yellow-400"
    },
    {
      title: "Community Building",
      description: "Create sustainable communities with aligned incentives.",
      icon: "🏛️",
      color: "bg-purple-600"
    },
    {
      title: "Content Rewards",
      description: "Get rewarded for creating valuable content that engages the community.",
      icon: "💰",
      color: "bg-teal-500"
    }
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-0 overflow-hidden font-silkscreen text-black bg-teal-900">
      {/* Pixelated Background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-teal-900"></div>
        <div className="absolute top-0 left-0 right-0 h-96 bg-teal-800"></div>
        <div className={`absolute top-[10%] left-[10%] w-[20%] h-[20%] bg-teal-800 transition-all duration-1000 ease-in-out ${isLoaded ? 'opacity-70' : 'opacity-0'}`}></div>
        <div className={`absolute bottom-[20%] right-[15%] w-[25%] h-[25%] bg-teal-800 transition-all duration-1000 ease-in-out ${isLoaded ? 'opacity-70' : 'opacity-0'}`}></div>
        
        {/* Pixelated grid pattern */}
        <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDIwIEwgMjAgMjAiIHN0cm9rZT0iIzMzZiIgLz48cGF0aCBkPSJNIDIwIDAgTCAyMCAyMCIgc3Ryb2tlPSIjMzNmIiAvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIgLz48L3N2Zz4=')]"></div>
      </div>

      {/* Header with Animated Entrance */}
      <header className={`w-full max-w-7xl flex justify-between items-center p-6 transition-all duration-1000 ease-out ${isLoaded ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'}`}>
        <div className="flex items-center space-x-3">
          <div className="w-14 h-14 bg-teal-400 border-4 border-black flex items-center justify-center group transition-transform duration-300 hover:scale-110">
            <span className="text-black text-2xl group-hover:animate-bounce">🐢</span>
          </div>
          <h1 className="text-3xl font-bold text-white">
            <span className="text-teal-300">Turtle</span>
          </h1>
        </div>
        <nav className="hidden md:flex space-x-8">
          <a href="#about" className="text-teal-100 hover:text-white transition-colors border-b-4 border-transparent hover:border-teal-400 pb-1">Docs</a>
          <a href="#features" className="text-teal-100 hover:text-white transition-colors border-b-4 border-transparent hover:border-teal-400 pb-1">Features</a>
        </nav>
      </header>

      <main className="flex flex-col items-center text-center w-full z-10">
        {/* Hero Section with Animation */}
        <div className={`w-full max-w-6xl px-4 py-16 md:py-24 transition-all duration-1000 ease-out ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <h2 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight uppercase">
            Building <span className="text-yellow-300">Chain Communities</span> on Solana
          </h2>
          <p className="text-xl md:text-2xl text-teal-100 mb-12 max-w-3xl mx-auto">
            Incentive-driven community platform that rewards content creators and community builders
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-6 mb-16">
            <Link 
              href="/app"
              className="px-8 py-4 bg-teal-500 text-black border-4 border-black text-xl font-semibold transition-all transform hover:scale-105 group flex items-center justify-center gap-3"
            >
              <span>Launch App</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
            <a 
              href="#learn-more" 
              className="px-8 py-4 bg-teal-900 text-white border-4 border-black text-xl font-semibold transition-all"
            >
              Learn More
            </a>
          </div>

          {/* Interactive Feature Carousel */}
          <div className="relative w-full max-w-5xl mx-auto h-[450px] overflow-hidden border-4 border-black bg-black">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full max-w-4xl px-8 py-12">
                {features.map((feature, index) => (
                  <div 
                    key={index} 
                    className={`absolute inset-0 flex flex-col items-center justify-center p-8 transition-all duration-700 ${
                      currentIndex === index 
                        ? 'opacity-100 translate-x-0' 
                        : currentIndex > index || (currentIndex === 0 && index === features.length - 1)
                          ? 'opacity-0 -translate-x-full'
                          : 'opacity-0 translate-x-full'
                    }`}
                  >
                    <div className={`w-24 h-24 mb-6 border-4 border-black flex items-center justify-center text-4xl ${feature.color}`}>
                      {feature.icon}
                    </div>
                    <h3 className="text-4xl font-bold mb-4 text-white uppercase">{feature.title}</h3>
                    <p className="text-xl text-teal-100 max-w-2xl">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Carousel Navigation Dots */}
            <div className="absolute bottom-6 left-0 right-0 flex justify-center space-x-3">
              {features.map((_, index) => (
                <button 
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-3 h-3 border border-black transition-all ${
                    currentIndex === index ? 'bg-teal-400 w-8' : 'bg-white hover:bg-teal-200'
                  }`}
                  aria-label={`View feature ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <section id="about" className="w-full py-24 bg-teal-800 border-y-4 border-black">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">
                <span className="text-teal-300">How It Works</span>
              </h2>
              <p className="text-xl text-teal-100 max-w-3xl mx-auto">
                Turtle connects depositors and challengers to create sustainable communities
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-10 px-4">
              <div className="bg-black border-4 border-black p-8 transform transition-all hover:translate-y-[-10px]">
                <div className="w-16 h-16 bg-yellow-400 border-4 border-black flex items-center justify-center mb-6">
                  <span className="text-2xl">💰</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4 uppercase">Depositors</h3>
                <p className="text-teal-100 leading-relaxed">
                  Deposit SOL as bounties for community building and content creation. Set time limits and base fees to ensure quality contributions.
                </p>
              </div>
              
              <div className="bg-black border-4 border-black p-8 transform transition-all hover:translate-y-[-10px]">
                <div className="w-16 h-16 bg-teal-500 border-4 border-black flex items-center justify-center mb-6">
                  <span className="text-2xl">🏆</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4 uppercase">Challengers</h3>
                <p className="text-teal-100 leading-relaxed">
                  Create valuable content for communities. The last challenger to post before the time limit gets the bounty prize.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-black border-t-4 border-black py-10 mt-auto">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-3 mb-6 md:mb-0">
            <div className="w-10 h-10 bg-teal-400 border-2 border-black flex items-center justify-center">
              <span className="text-black text-sm">🐢</span>
            </div>
            <span className="text-teal-100">© 2025 Turtle</span>
          </div>
          
          <div className="flex space-x-8">
            <a href="#" className="text-teal-100 hover:text-white transition-colors flex items-center gap-2 border-b-2 border-transparent hover:border-teal-400">
              <span className="text-lg">𝕏</span> Twitter
            </a>
            <a href="#" className="text-teal-100 hover:text-white transition-colors flex items-center gap-2 border-b-2 border-transparent hover:border-teal-400">
              <span className="text-lg">📱</span> Telegram
            </a>
            <a href="#" className="text-teal-100 hover:text-white transition-colors flex items-center gap-2 border-b-2 border-transparent hover:border-teal-400">
              <span className="text-lg">🐙</span> GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
