# CREator - Visual Workflow Builder for Chainlink CRE

> **Hackathon judges:** See [JUDGES.md](documentation/JUDGES.md) for a step-by-step evaluation guide covering live deployment links, local setup, and a walkthrough of every feature.

A browser-based visual editor for Chainlink Runtime Environment (CRE) workflows. Design, validate, simulate, and export CRE workflows without writing code. Inspired by Node-RED and n8n.

## Features

### Wallet Integration

- RainbowKit 2.x connection UI (MetaMask, WalletConnect, Coinbase Wallet, Rainbow, and others)
- Persistent wallet connection across sessions
- Automatic Sepolia testnet detection and switching
- Network status indicator in the header

### Smart Contract Deployment

- Six built-in contract templates: SimpleStorage, ERC20, ERC721, Crowdfunding, Voting, MultiSig
- Edit, compile, and deploy contracts directly from canvas nodes
- Dynamic constructor argument forms
- Contract details modal with ABI viewer, address, and Etherscan link
- Deployed contracts are saved and included in workflow exports

### Visual Flow Builder

- Drag-and-drop interface with 16 pre-built node types across six categories
- Real-time connection validation with error panel
- Node categories:
  - Triggers: Cron, Webhook
  - Data Sources: HTTP, Database, File
  - Chainlink Services: Data Feeds, CCIP, Functions, Streams
  - Blockchain: Contract Call, Event Listener, Smart Contract (deploy)
  - Logic: If/Else, Transform, Merge
  - AI: LLM Integration

### Code Generation

- Converts visual workflows to CRE-compatible TypeScript
- Generates main.ts, workflow.yaml, config.staging.json, and config.production.json
- Uses @chainlink/cre-sdk 1.0.9

### Workflow Simulation

- Runs a custom simulation engine on the backend that reads main.ts and parses runtime.log() calls
- Returns output formatted identically to the real CRE CLI ([SIMULATION] and [USER LOG] markers)
- Works in production on Render without the CRE CLI installed and without authentication

### Project Export

- One-click ZIP download of a complete, ready-to-run CRE project
- Includes: generated workflow files, project configuration, .env.example, QUICKSTART.md, README.md, contract directory, and package files

### AI Assistant (ChatBot)

- Natural language workflow design: describe what you want, the AI returns a structured spec
- One-click "Build on Canvas" places nodes and edges automatically
- Powered by DeepSeek via a Vercel serverless function proxy at /api/chat

## Quick Start

### Prerequisites

- Node.js 18+ or Bun
- Web3 wallet (MetaMask or similar) for contract deployment features
- A WalletConnect Project ID from [cloud.walletconnect.com](https://cloud.walletconnect.com)

### Installation

```bash
cd front-end
npm install
```

### Configuration

```bash
cp .env.example .env
```

Edit .env:

```env
VITE_WALLET_CONNECT_PROJECT_ID=your_walletconnect_project_id
VITE_API_URL=http://localhost:3001
```

### Development Server

```bash
npm run dev
```

Opens at http://localhost:5173.

### Backend Setup

The frontend requires the backend for Solidity compilation, file writes, and workflow simulation:

```bash
cd ../back-end
npm install
npm run dev
```

Backend runs at http://localhost:3001.

## Usage

### Building a Workflow

1. Open the Flow Builder from the landing page.
2. Drag a trigger node (Cron or Webhook) onto the canvas.
3. Drag and connect additional nodes (data sources, logic, Chainlink services).
4. Check the validation panel for any connection errors.

### Simulating

1. Build a workflow on the canvas.
2. Click the **Prove** button in the header.
3. The backend reads the generated main.ts and returns a CRE simulation output in the modal.

### Deploying a Contract

1. Add a node of type **Simple Storage**, **ERC20 Token**, or any other contract node.
2. Click the node to open the contract editor.
3. Edit the Solidity code, click **Compile**, then **Deploy**.
4. The node displays the deployed address once confirmed.

### Exporting

1. Click **Export Flow** in the header.
2. Enter a project name and description.
3. A ZIP file is downloaded containing the complete CRE project structure.

### Running the Exported Project Locally

```bash
unzip my-workflow.zip
cd my-workflow
cp .env.example .env
# Edit .env and add your private key
cd workflows
bun install
cd ..
cre workflow simulate workflows --target=staging-settings
```

## Project Structure

```
front-end/
├── api/
│   └── chat.ts                  # Vercel serverless function (DeepSeek proxy)
├── src/
│   ├── pages/
│   │   ├── LandingPage.tsx
│   │   └── FlowBuilder.tsx      # Main canvas editor
│   ├── components/
│   │   ├── IconMapper.tsx        # Central react-icons mapping component
│   │   ├── NodeLibrary.tsx       # Draggable node templates panel
│   │   ├── ChatBot.tsx           # AI assistant
│   │   ├── SimulationModal.tsx   # Simulation output display
│   │   ├── SettingsModal.tsx     # Private key configuration
│   │   ├── ContractEditorModal.tsx
│   │   ├── ContractDetailsModal.tsx
│   │   └── nodes/
│   │       └── CustomNode.tsx    # Canvas node renderer
│   ├── lib/
│   │   └── blockchain/
│   │       ├── compile.ts        # Solidity compilation via backend
│   │       ├── deploy.ts         # Contract deployment via wagmi/viem
│   │       ├── contractStorage.ts
│   │       └── solidityTemplates.ts
│   ├── utils/
│   │   ├── codeGenerator.ts            # Visual flow -> TypeScript
│   │   ├── flowValidation.ts           # Connection rule enforcement
│   │   └── projectTemplateGenerator.ts # ZIP export
│   ├── store/
│   │   └── flowStore.ts          # Zustand global state
│   └── wagmi.ts                  # RainbowKit / wagmi configuration
└── package.json
```

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19.2.0 + Vite 7.3.1 + TypeScript 5.9 |
| Flow editor | React Flow 11.11.4 |
| State management | Zustand 5.0.11 |
| Wallet | RainbowKit 2.2.10 + wagmi 2.19.5 + viem 2.47.0 |
| Blockchain | ethers.js 6.16.0 |
| Icons | react-icons 5.6.0 |
| ZIP export | JSZip 3.10.1 |
| Routing | React Router 7.13.0 |
| AI proxy | Vercel serverless function + DeepSeek API |
| Deployment | Vercel |

## Deployment

### Frontend (Vercel)

1. Connect the front-end directory to Vercel.
2. Framework preset: **Vite**.
3. Set environment variables:
   - VITE_WALLET_CONNECT_PROJECT_ID - your WalletConnect project ID
   - VITE_API_URL - URL of your Render backend
   - DEEPSEEK_API_KEY - DeepSeek API key for the chat serverless function

### Backend (Render)

See back-end/DEPLOYMENT.md for the full guide.

## Known Limitations

- HttpCapability is not available in @chainlink/cre-sdk 1.0.9; generated workflows use simulated HTTP data.
- fetch() is not available in the CRE/QuickJS runtime; use Chainlink Functions for real HTTP requests.
- Node parameters (schedule, URL, etc.) cannot be edited in the UI; edit the generated main.ts after export.
- Simulation runs against the last-saved main.ts on the server; you must click **Export to Server** before simulating.
- Message history is not persisted across page reloads in the AI assistant.

## Resources

- [Chainlink CRE Documentation](https://docs.chain.link/cre)
- [React Flow Documentation](https://reactflow.dev)
- [RainbowKit Documentation](https://www.rainbowkit.com/docs)
- [WalletConnect Cloud](https://cloud.walletconnect.com)
