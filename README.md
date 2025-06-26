# Ballon d'Or Ethereum Voting System

A decentralized voting system for the Ballon d'Or award built on Ethereum blockchain technology. This system allows for transparent, secure, and verifiable voting for football's most prestigious individual award.

## Overview

The Ballon d'Or Ethereum Voting System is a blockchain-based application that enables secure and transparent voting for the Ballon d'Or award. It utilizes smart contracts on the Ethereum network to ensure vote integrity and provides a modern web interface for voters and administrators.

## Smart Contract

The system is built around the `GoldenBallVoting` smart contract which provides:
- Secure vote recording on the Ethereum blockchain
- Vote verification mechanisms
- Administrator controls for managing the voting process
- Transparent vote counting and result tabulation
- Protection against double voting

## Technologies Used

### Blockchain Development
- **Hardhat**: Ethereum development environment for professionals
  - Local blockchain deployment
  - Smart contract testing and deployment
  - Network management

### Backend
- **Node.js**: JavaScript runtime for the backend services
- **Smart Contracts**: Written in Solidity

### Frontend
- **Next.js**: React framework for production-grade web applications
  - Server-side rendering
  - API routes
  - Modern UI components
- **Web3.js**: Ethereum JavaScript API for blockchain interaction

## Installation & Setup

### Prerequisites
- Node.js (v16.0 or higher)
- npm (Node Package Manager)
- MetaMask wallet extension

### Installation Steps

1. Clone the repository:
```bash
git clone [repository-url]
cd ballon_dor
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with your configuration:
```bash
NEXT_PUBLIC_RPC_URL=your_rpc_url
PRIVATE_KEY=your_private_key
```

### Smart Contract Deployment

1. Compile the smart contracts:
```bash
npx hardhat compile
```

2. Deploy to local network:
```bash
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost
```

### Running the Application

1. Start the development server:
```bash
npm run dev
```

2. Access the application at `http://localhost:3000`

## Usage

1. Connect your MetaMask wallet to the application
2. Administrators can:
   - Start/Stop voting periods
   - Add eligible voters
   - Monitor voting progress

3. Voters can:
   - View candidate profiles
   - Cast their votes during active voting periods
   - View voting results (when enabled)

## Building for Production

To create a production build:

```bash
npm run build
npm start
```

The application will be available at `http://localhost:3000`
