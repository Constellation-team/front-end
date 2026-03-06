# CREator - Visual Workflow Builder for Chainlink CRE

A modern, visual workflow builder for Chainlink Runtime Environment (CRE) - like Node-RED or n8n, but specifically designed for Chainlink workflows.

## ✨ Features

### Wallet Integration (NEW!)
- **RainbowKit Integration**: Beautiful wallet connection UI
- **Multi-Wallet Support**: MetaMask, WalletConnect, Coinbase, Rainbow, and more
- **Persistent Connection**: Wallet stays connected across sessions
- **Auto Network Switching**: Automatic Sepolia testnet detection and switching
- **Chain Status UI**: Visual network indicator in header

### Smart Contract Deployment (NEW!)
- **6 Contract Templates**: SimpleStorage, ERC20, ERC721, Crowdfunding, Voting, MultiSig
- **In-Node Editor**: Edit, compile, and deploy contracts directly from nodes
- **Constructor Arguments**: Dynamic forms for contracts requiring initialization
- **Contract Details Modal**: View ABI, address, Etherscan links
- **Deployment Tracking**: Deployed contracts saved and exported with workflows

### Visual Flow Builder
- **Drag & Drop Interface**: 16 pre-built node types across 6 categories
- **Real-time Validation**: Connection rules prevent invalid workflows
- **Node Categories**:
  - 🎯 Triggers (Cron, Webhook)
  - 📊 Data Sources (HTTP, Database, File)
  - 🔗 Chainlink Services (Data Feeds, CCIP, Functions, Streams)
  - ⛓️ Blockchain (Contract Calls, Events, Deploy - with smart contract nodes!)
  - 🧮 Logic (If/Else, Transform, Merge)
  - 🤖 AI (LLM Integration)

### Code Generation
- **TypeScript Generation**: Converts visual workflows to CRE-compatible TypeScript
- **Automatic Configuration**: Generates main.ts, workflow.yaml, and config files
- **CRE SDK Integration**: Uses official @chainlink/cre-sdk v1.0.9

### Testing & Simulation
- **Real CRE Testing**: "Probar" button runs actual CRE CLI simulation
- **Live Output**: See compilation, execution, and logs in real-time
- **No Gas Fees**: Test workflows without deploying

### Project Export (NEW!)
- **Complete ZIP Export**: One-click project generation
- **Spring Boot Style**: Get a ready-to-run project structure
- **Includes**:
  - Generated workflow files (main.ts, configs, workflow.yaml)
  - Project configuration (project.yaml, secrets.yaml)
  - Documentation (README.md, QUICKSTART.md)
  - Setup files (.env.example, .gitignore, LICENSE)
  - Contracts folder structure
  - Package management (package.json, tsconfig.json)

### Configuration Management
- **Settings Modal**: Configure MetaMask private key
- **Environment Variables**: Saves to .env file securely
- **Multi-Environment**: Staging and production configurations

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or Bun
- CRE CLI installed globally
- Web3 wallet (MetaMask, Rainbow, Coinbase Wallet, etc.)
- Sepolia ETH for contract deployments

### Installation

1. **Clone and install dependencies**:
   ```bash
   cd front-end
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env and add your WalletConnect Project ID
   # Get it from https://cloud.walletconnect.com
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Open in browser**: http://localhost:5173

### Backend Setup

The frontend requires a backend API for file operations:

```bash
cd ../back-end
npm install
npm start
```

Backend runs on http://localhost:3001

## 📖 Usage Guide

### Creating a Workflow

1. **Navigate** to the Flow Builder from the landing page
2. **Add Trigger**: Drag a Cron or Webhook trigger to the canvas
3. **Add Nodes**: Drag additional nodes (data sources, logic, Chainlink services)
4. **Connect Nodes**: Click and drag from one node to another
5. **Validate**: Check the error panel for any validation issues

### Exporting Your Project

1. **Click "Export Flow"** button in the top right
2. **Enter Project Name**: e.g., "my-chainlink-workflow"
3. **Enter Description**: Brief description of your workflow
4. **Download**: ZIP file downloads automatically

### What's in the ZIP?

```
my-chainlink-workflow.zip
├── workflows/                    # Your generated workflow
│   ├── main.ts                  # Main workflow logic
│   ├── workflow.yaml            # Workflow configuration
│   ├── config.staging.json      # Staging config
│   ├── config.production.json   # Production config
│   ├── package.json             # Dependencies
│   ├── tsconfig.json            # TypeScript config
│   └── README.md                # Workflow docs
├── contracts/                    # For smart contracts
│   └── README.md                # Contract deployment guide
├── project.yaml                  # CRE project settings
├── secrets.yaml                  # Secrets configuration
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore rules
├── README.md                    # Project documentation
├── QUICKSTART.md                # Setup guide
└── LICENSE                      # MIT License
```

### Using the Exported Project

1. **Extract the ZIP**:
   ```bash
   unzip my-chainlink-workflow.zip
   cd my-chainlink-workflow
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env and add your private key
   ```

3. **Install dependencies**:
   ```bash
   cd workflows
   bun install
   ```

4. **Test the workflow**:
   ```bash
   # From project root
   cre workflow simulate workflows --target=staging-settings
   ```

5. **Customize**: Edit `workflows/main.ts` to add your logic

### Testing Workflows

1. **Configure Settings**: Click ⚙️ Settings button
2. **Add Private Key**: Enter your MetaMask private key
3. **Click "Probar"**: Runs CRE CLI simulation
4. **View Output**: See logs, errors, and results

## 🚀 Deployment Guide

This app is designed to be split into two services for production:

### 1. Frontend (Vercel)
The React/Vite web application can be deployed instantly to Vercel:
1. Connect this `front-end` repo to Vercel
2. Framework Preset: `Vite`
3. Environment variables: `VITE_API_URL=https://your-backend-url.onrender.com` (pointing to your future Render app)

### 2. Backend + Orchestrator (Render)
The Express backend needs to run on a VPS or service like Render because it requires physical file system access to write the `.yaml` and `.ts` simulator files, and needs the `@chainlink/cre-cli` installed.

Since the Backend and the CLI workspace (`cre-orchestrator`) live in separate repositories, you'll need to deploy the `back-end` repository to Render and configure it to download or clone the `cre-orchestrator` repository during the build process.

1. Connect the `back-end` repo to Render as a Web Service.
2. Build Command: `npm install && git clone https://github.com/your-username/cre-orchestrator.git ../cre-orchestrator`
3. Start Command: `npm start`
4. Environment variables: 
   - `FRONTEND_URL=https://your-vercel-app.vercel.app` (pointing to your Vercel deployment for CORS config)
   - `ORCHESTRATOR_PATH=../cre-orchestrator`

## 🏗️ Project Structure

```
front-end/
├── src/
│   ├── pages/
│   │   ├── LandingPage.tsx      # Home page with animations
│   │   └── FlowBuilder.tsx      # Main workflow editor
│   ├── components/
│   │   ├── NodeLibrary.tsx      # Draggable node templates
│   │   ├── SimulationModal.tsx  # Test output display
│   │   ├── SettingsModal.tsx    # Private key configuration
│   │   └── nodes/
│   │       └── CustomNode.tsx   # Custom node renderer
│   ├── utils/
│   │   ├── codeGenerator.ts            # Visual → TypeScript
│   │   ├── flowValidation.ts           # Connection rules
│   │   └── projectTemplateGenerator.ts # ZIP generation
│   ├── store/
│   │   └── flowStore.ts         # Zustand state management
│   └── App.tsx                  # Router configuration
└── package.json
```

## 🛠️ Tech Stack

- **Frontend**: React 19 + Vite 7.3.1 + TypeScript
- **Flow Editor**: React Flow 11.11.4
- **State**: Zustand 5.0.11
- **Wallet**: RainbowKit 2.x + wagmi 2.x + viem 2.x
- **Blockchain**: ethers.js 6.16.0
- **Smart Contracts**: Solidity 0.8.20 (compiled via backend API)
- **ZIP**: JSZip 3.10.1
- **Routing**: React Router 7.13.0
- **Backend**: Node.js + Express + solc 0.8.34
- **CRE**: @chainlink/cre-sdk 1.0.9

## 📚 Documentation

- **[RainbowKit Integration Guide](./documentation/RAINBOWKIT.md)** - Complete wallet setup
- **[ChatBot Documentation](./documentation/CHATBOT.md)** - AI assistant features

## 🔒 Security

- **Private Keys**: Stored locally in .env files (never sent to external servers)
- **Wallet Connection**: Secure connection via RainbowKit (supports hardware wallets)
- **Contract Compilation**: Handled by backend API (secure Solidity compilation)
- **Validation**: All connections validated before workflow generation
- **Local Processing**: Code generation happens client-side
- **Git Safety**: .env files automatically ignored

## 📝 Known Limitations

- **HttpCapability**: Not available in CRE SDK v1.0.9 (falls back to Cron)
- **fetch()**: Not available in CRE/QuickJS runtime (use simulated data)
- **Node Parameters**: Not yet editable in UI (edit generated code)
- **Templates**: No workflow templates yet (coming soon)

## 🎯 Roadmap

- [ ] Node parameter editing in UI
- [ ] Workflow templates/presets
- [ ] Direct CRE deployment
- [ ] Multi-chain support
- [ ] Node marketplace
- [ ] Collaborative editing

## 🤝 Contributing

This is a hackathon project! Contributions welcome:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📚 Resources

- [CRE Documentation](https://docs.chain.link/cre)
- [React Flow Docs](https://reactflow.dev/)

## 🙏 Acknowledgments

- Built for Chainlink Hackathon 2026
- Inspired by Node-RED and n8n
- Powered by Chainlink Runtime Environment

---

