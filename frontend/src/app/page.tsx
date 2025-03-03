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
      color: "from-amber-400 to-yellow-500"
    },
    {
      title: "Community Building",
      description: "Create sustainable communities with aligned incentives.",
      icon: "🏛️",
      color: "from-violet-500 to-purple-600"
    },
    {
      title: "Content Rewards",
      description: "Get rewarded for creating valuable content that engages the community.",
      icon: "💰",
      color: "from-emerald-400 to-teal-600"
    }
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-0 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-900/50 to-emerald-900/50"></div>
        <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-teal-500/10 to-transparent"></div>
        <div className={`absolute -top-[30%] -left-[20%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-teal-400/20 to-emerald-500/20 blur-3xl transition-all duration-1000 ease-in-out ${isLoaded ? 'opacity-70' : 'opacity-0'}`}></div>
        <div className={`absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-teal-400/20 to-emerald-500/20 blur-3xl transition-all duration-1000 ease-in-out ${isLoaded ? 'opacity-70' : 'opacity-0'}`}></div>
      </div>

      {/* Header with Animated Entrance */}
      <header className={`w-full max-w-7xl flex justify-between items-center p-6 transition-all duration-1000 ease-out ${isLoaded ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'}`}>
        <div className="flex items-center space-x-3">
          <div className="w-14 h-14 bg-gradient-to-br from-teal-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-teal-500/20 group transition-transform duration-300 hover:scale-110">
            <span className="text-white text-2xl group-hover:animate-bounce">🐢</span>
          </div>
          <h1 className="text-3xl font-bold text-white">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-300 to-emerald-300">Turtle</span>
          </h1>
        </div>
        <nav className="hidden md:flex space-x-8">
          <a href="#about" className="text-teal-100 hover:text-white transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 hover:after:w-full after:bg-teal-400 after:transition-all">Docs</a>
          <a href="#features" className="text-teal-100 hover:text-white transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-0 hover:after:w-full after:bg-teal-400 after:transition-all">Features</a>
        </nav>
      </header>

      <main className="flex flex-col items-center text-center w-full z-10">
        {/* Hero Section with Animation */}
        <div className={`w-full max-w-6xl px-4 py-16 md:py-24 transition-all duration-1000 ease-out ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <h2 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Building <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-300 to-yellow-200">Chain Communities </span> on Solana
          </h2>
          <p className="text-xl md:text-2xl text-teal-100 mb-12 max-w-3xl mx-auto">
            Incentive-driven community platform that rewards content creators and community builders
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-6 mb-16">
            <Link 
              href="/app"
              className="px-8 py-4 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-full text-xl font-semibold transition-all transform hover:scale-105 hover:shadow-lg hover:shadow-teal-500/30 group flex items-center justify-center gap-3"
            >
              <span>Launch App</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
            <a 
              href="#learn-more" 
              className="px-8 py-4 bg-black/20 backdrop-blur-lg hover:bg-black/30 text-white rounded-full text-xl font-semibold transition-all border border-teal-500/50 hover:border-teal-400"
            >
              Learn More
            </a>
          </div>

          {/* Interactive Feature Carousel */}
          <div className="relative w-full max-w-5xl mx-auto h-[450px] rounded-2xl overflow-hidden shadow-2xl bg-black/30 backdrop-blur-sm border border-white/10">
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
                    <div className={`w-24 h-24 mb-6 rounded-full flex items-center justify-center text-4xl bg-gradient-to-br ${feature.color}`}>
                      {feature.icon}
                    </div>
                    <h3 className="text-4xl font-bold mb-4 text-white">{feature.title}</h3>
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
                  className={`w-3 h-3 rounded-full transition-all ${
                    currentIndex === index ? 'bg-teal-400 w-8' : 'bg-white/50 hover:bg-white/80'
                  }`}
                  aria-label={`View feature ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <section id="about" className="w-full py-24 bg-black/20 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-4">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-300 to-emerald-300">How It Works</span>
              </h2>
              <p className="text-xl text-teal-100 max-w-3xl mx-auto">
                Turtle connects depositors and challengers to create sustainable communities
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-10 px-4">
              <div className="bg-black/30 backdrop-blur-sm rounded-xl p-8 border border-white/10 shadow-xl transform transition-all hover:translate-y-[-10px] hover:shadow-teal-500/20">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-amber-500/20">
                  <span className="text-2xl">💰</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Depositors</h3>
                <p className="text-teal-100 leading-relaxed">
                  Deposit SOL as bounties for community building and content creation. Set time limits and base fees to ensure quality contributions.
                </p>
              </div>
              
              <div className="bg-black/30 backdrop-blur-sm rounded-xl p-8 border border-white/10 shadow-xl transform transition-all hover:translate-y-[-10px] hover:shadow-teal-500/20">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-teal-500/20">
                  <span className="text-2xl">🏆</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Challengers</h3>
                <p className="text-teal-100 leading-relaxed">
                  Create valuable content for communities. The last challenger to post before the time limit gets the bounty prize.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-black/40 backdrop-blur-sm border-t border-white/10 py-10 mt-auto">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-3 mb-6 md:mb-0">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm">🐢</span>
            </div>
            <span className="text-teal-100">© 2025 Turtle</span>
          </div>
          
          <div className="flex space-x-8">
            <a href="#" className="text-teal-100 hover:text-white transition-colors flex items-center gap-2">
              <span className="text-lg">𝕏</span> Twitter
            </a>
            <a href="#" className="text-teal-100 hover:text-white transition-colors flex items-center gap-2">
              <span className="text-lg">📱</span> Telegram
            </a>
            <a href="#" className="text-teal-100 hover:text-white transition-colors flex items-center gap-2">
              <span className="text-lg">🐙</span> GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
