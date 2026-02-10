# Monomons 🎮

A blockchain-based Pokemon-style gaming platform built on Monad Testnet, featuring an infinite procedurally-generated open world with AI-powered Pokemon battles and real-time betting mechanics.

## 🌟 Overview

Monomons combines the nostalgia of Pokemon with modern blockchain technology and AI. Players explore an infinite, procedurally-generated island world, discover interactive dojos, and place bets on AI-controlled Pokemon battles using cryptocurrency.

### Key Features

- **🗺️ Infinite Open World**: Procedurally-generated terrain with diverse biomes (grass, sand, mountains, snow, oceans)
- **🏛️ Interactive Dojos**: Rare structures scattered across the world where battles take place
- **🤖 AI-Powered Battles**: Automated Pokemon battles using Google's Gemini AI for strategic move selection
- **💰 Real-Time Betting**: Place bets on battle outcomes using Monad testnet tokens
- **🔐 Wallet Authentication**: Secure wallet-based authentication with signature verification
- **⚡ Real-Time Updates**: WebSocket-based live battle updates and player interactions
- **🎨 Modern UI**: Beautiful, responsive interface with animations and glassmorphism effects

## 🏗️ Architecture

### Tech Stack

#### Frontend
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: TailwindCSS 4 with custom animations
- **Blockchain**: 
  - Wagmi v3 for Ethereum interactions
  - Reown AppKit for wallet connections
  - Viem for contract interactions
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router v7
- **Animations**: Motion (Framer Motion)
- **Game Engine**: Custom Canvas-based 2D engine with procedural generation

#### Backend
- **Runtime**: Bun
- **Framework**: ElysiaJS (high-performance TypeScript web framework)
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: Google Gemini API for battle AI
- **Authentication**: JWT with wallet signature verification
- **Real-Time**: WebSocket for game state synchronization
- **API Documentation**: OpenAPI/Swagger integration

#### Smart Contracts
- **Language**: Solidity ^0.8.0
- **Network**: Monad Testnet (Chain ID: 10143)
- **Contract**: GameVault for managing deposits and payouts

### Project Structure

```
monomons/
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Route pages
│   │   │   ├── pokemon/  # Game engine modules
│   │   │   │   ├── engine/    # Core game engine
│   │   │   │   ├── entities/  # Player, NPCs
│   │   │   │   ├── input/     # Input handling
│   │   │   │   ├── renderer/  # Canvas rendering
│   │   │   │   └── world/     # Terrain generation
│   │   │   ├── LandingPage.tsx
│   │   │   ├── PokemonWorld.tsx
│   │   │   └── DojoPage.tsx
│   │   ├── contexts/     # React contexts (Auth, etc.)
│   │   ├── config/       # Wagmi/wallet configuration
│   │   ├── services/     # API services
│   │   └── utils/        # Helper functions
│   └── package.json
│
├── backend/              # Bun + ElysiaJS backend
│   ├── src/
│   │   ├── routes/       # API route handlers
│   │   │   ├── auth.routes.ts    # Authentication
│   │   │   ├── game.routes.ts    # WebSocket game logic
│   │   │   └── bet.routes.ts     # Betting endpoints
│   │   ├── services/     # Business logic
│   │   │   ├── auth.service.ts   # JWT & signature verification
│   │   │   ├── battle.service.ts # AI battle engine
│   │   │   ├── betting.service.ts # Bet management
│   │   │   ├── player.service.ts  # Player state
│   │   │   └── ai.service.ts      # Gemini AI integration
│   │   ├── db/           # Database layer
│   │   │   ├── schema.ts         # Drizzle schema
│   │   │   └── index.ts          # DB connection
│   │   └── index.ts      # Server entry point
│   ├── drizzle/          # Database migrations
│   └── package.json
│
└── contract/             # Smart contracts
    └── Vault.sol         # GameVault contract
```

## 🎮 Game Mechanics

### World Exploration
- Players spawn in an infinite, procedurally-generated world
- Movement using WASD or arrow keys
- Camera follows the player with smooth transitions
- Terrain includes grass, sand, mountains, snow, oceans, trees, rocks, and flowers

### Dojos & Battles
- Dojos are rare structures randomly placed in the world
- Each dojo has a unique name and room ID
- When near a dojo, players receive a prompt to enter
- Inside dojos, automated Pokemon battles occur between two AI agents

### Battle System
- **Agent Composition**: Each agent has 3 randomly-generated Pokemon
- **AI Strategy**: Google Gemini AI selects moves based on battle state
- **Turn-Based Combat**: Speed stats and move priority determine turn order
- **Type Effectiveness**: Full Pokemon type chart implementation
- **Abilities**: Unique abilities like Blaze, Torrent, Sniper, etc.
- **Move Cooldowns**: Powerful moves have cooldown periods
- **Critical Hits**: Random critical hit mechanics with ability modifiers
- **STAB Bonus**: Same Type Attack Bonus (1.5x damage)

### Betting System
- Players can bet on either "Agent Red" (Player A) or "Agent Blue" (Player B)
- Bets are placed via smart contract transactions
- Winnings are automatically distributed after battle completion
- All bets are tracked in the database with transaction hashes


### Installation & Setup

#### 1. Clone the repository
```bash
git clone <repository-url>
cd monomons
```

#### 2. Backend Setup
```bash
cd backend

# Install dependencies
bun install

# Setup database
bun run db:push

# Start development server
bun run dev
```

The backend will run on `http://localhost:8080`

#### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
bun install

# Start development server
bun run dev
```

The frontend will run on `http://localhost:5173`

#### 4. Smart Contract Deployment
```bash
# Deploy GameVault.sol to Monad Testnet
# Update VAULT_CONTRACT_ADDRESS in backend .env
```

### Database Commands
```bash
# Generate migrations
bun run db:generate

# Apply migrations
bun run db:migrate

# Push schema changes
bun run db:push

# Open Drizzle Studio
bun run db:studio
```

## 🎯 Usage Flow

1. **Connect Wallet**: Click "Connect Wallet" and connect your Monad Testnet wallet
2. **Sign Message**: Sign the authentication message to verify wallet ownership
3. **Enter World**: Click "Play Now" on the Pokemon Open World card
4. **Explore**: Use WASD or arrow keys to move around the infinite world
5. **Find Dojo**: Explore until you encounter a dojo structure
6. **Enter Dojo**: Accept the prompt to enter the dojo and view the battle
7. **Place Bet**: Choose a side (Agent Red or Agent Blue) and place your bet
8. **Watch Battle**: Observe the AI-powered battle in real-time
9. **Collect Winnings**: If your chosen side wins, winnings are automatically distributed


## 🧪 Battle AI System

The battle system uses Google's Gemini AI to make strategic decisions:

### AI Decision Making
- Analyzes current battle state (HP, types, stats, available moves)
- Considers type effectiveness and move power
- Evaluates cooldowns and strategic timing
- Fallback to random selection if AI fails

### Pokemon Library
10 unique Pokemon species with authentic stats:
- Charizard, Blastoise, Venusaur (Starters)
- Pikachu, Gengar, Dragonite
- Snorlax, Lucario, Tyranitar, Gardevoir

### Move Library
28+ authentic Pokemon moves with:
- Power ratings (40-120)
- Accuracy values (75%-100%)
- Type associations
- Physical/Special categories
- Priority levels
- Cooldown mechanics

### Abilities
12 unique abilities affecting battle:
- Blaze, Torrent, Overgrow (type boosts at low HP)
- Swift (speed boost)
- Tanky (HP boost)
- Thick Skin (damage reduction)
- Sniper (critical hit boost)
- And more...


## 🔐 Security Features

- **Wallet Signature Authentication**: Cryptographic proof of wallet ownership
- **JWT Tokens**: Secure session management
- **Nonce System**: Prevents replay attacks
- **Protected Routes**: Authorization middleware on sensitive endpoints
- **Transaction Verification**: All bets verified on-chain
- **Admin-Only Withdrawals**: Smart contract admin controls for payouts


## 📊 Performance Optimizations

- **Procedural Generation**: Efficient chunk-based terrain generation
- **WebSocket Pooling**: Optimized real-time connections
- **Database Indexing**: Indexed queries for fast lookups
- **Parallel AI Calls**: Simultaneous move selection for both sides
- **Battle State Caching**: In-memory battle instances per room
- **Log Trimming**: Automatic battle log cleanup (max 50 entries)

## 🛠️ Development

### Building for Production

#### Frontend
```bash
cd frontend
bun run build
bun run preview
```

#### Backend
```bash
cd backend
bun run build
# Outputs compiled binary: ./server
```

### Linting
```bash
# Frontend
cd frontend
bun run lint
```

## 🚧 Roadmap

- [ ] Additional game modes (PvP battles, trading)
- [ ] NFT integration for Pokemon ownership
- [ ] Leaderboards and achievements
- [ ] Mobile app version
- [ ] More Pokemon species and moves
- [ ] Tournament system
- [ ] Mainnet deployment
