# Bounty Market (Turtle)

Incentive-driven community platform on the Solana blockchain.

## About

Turtle is a platform that rewards content creators and community builders with incentives that last, just like the turtle's long life span. It implements a time-based bounty system where depositors fund bounties with SOL and challengers compete to win rewards.

## Features

- User authentication via Solana wallets
- Community creation with customizable parameters
- Time-based bounty system for sustainable content creation
- Pixel art UI mode for retro visual style

## Technology Stack

- Next.js 15.2.0
- React 19.0.0
- TypeScript
- Tailwind CSS 4.0
- Solana Blockchain Integration

## Getting Started

### Prerequisites

- Node.js and npm installed
- A Solana wallet extension (Phantom, Solflare, or Backpack) installed in your browser

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) with your browser

## Wallet Connection

This application uses Solana wallet adapters for authentication. To use the app:

1. Install a compatible wallet extension (Phantom, Solflare, or Backpack)
2. Configure your wallet for Devnet (for development)
3. Click the "Connect Wallet" button in the application
4. Select your wallet from the popup modal
5. Approve the connection request in your wallet extension

## Project Structure

- `/src/app`: Main application pages and routing
- `/src/components`: Reusable UI components
- `/src/app/app`: Main application interface (post-authentication)
- `/src/app/app/community/[id]`: Community detail pages




# Project Concept

WHat is the Turtle?

-> we means the Turtle for the animal which lives so long.

so, we build the `community chain`, Turtle.

Our strong feature is building `Blockchain as a incentive-driven community - which is don't stop like blockchain`.

  

The meme-coin factory like pump-fun is so short term, so this community is not so long-term effctive for solana blockchain ecosystem.

  

But, turtle, is long-term community oriented platform.

  

How we can implement?

the core logic of incentive mechanism is so fun.

  

In summary, there is two role(but it can be duplicated!)

One is depositers.

The other one is challenger.

For example, depositers would deposit as bounty their `$SOL` for making community and taking fee.

and, Challengers produce content for the community

  

Then, the challenger who produced the contents lastly when the time limit ended takes almost percentage the bounty price.

The time limit is like, For example, 30minutes , then the there are not any contents in 30 minutes, the last content producer takes all bounty.

  

But, for blocking bots, depositers can set the base fee for register their contents. (For example, 0.05SOL)

And, depositer as a DAO can change the base fee, time limit for internal governance election.

Additonally, depositers can reject uneffortable contents also for internal governance election or can using auto-checker with content-checking AI agent.

  

And, also, periodically, the depositers can give the incentives most-powerful-contributors using their propotional bounty price - airdrop as a service.

  
  
  
  

we will work with frontend first.

# Development Architecture - Frontend

  

Frontend:

#DESIGN must be meme-ful like - refer to pump fun or IQ 6900.

First, We must build entry-site(main page) and add 'Launch-App'

When we click Launch-App, user must connect the wallet (Using Backpack, - sonic chain)

Then user can fetch their social media like github, X, Telegram with Authorization.

  
  

And, user can enter the community. Like the form of exhibition like instgram user feed - Then, Challengers can post their contents Also, Depositers can deposit and At the Head of Feed, shows the bounty price and How much price that depositer gave to the incentives most-powerful-contributors.

And also show the time limits and base fee.

Also display what is the community about. using components like coin-address , Twitter official accounts, Telegram.... Also resgister Profile picture of the community

  

Also, user can create the community. User also create meme-coin like pump fun or NFT and auto create communtiy also.

  

THen, user can see the DAO governence which the user is belong to.