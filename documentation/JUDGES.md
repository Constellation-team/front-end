# CREator - Judge Evaluation Guide

This document covers everything you need to evaluate CREator locally or via the live deployment.

---

## Option A: Live Deployment (Recommended)

The easiest way to evaluate the project is through the live deployments. No local setup required.

| Service | URL |
|---|---|
| Frontend | https://creator-chainlink.vercel.app |
| Backend API | https://creator-backend.onrender.com/health |

If the Render backend is sleeping (free tier spins down after inactivity), wait 30-60 seconds for the first request.

---

## Option B: Run Locally

### Prerequisites

Install the following before starting:

1. **Node.js 22** or higher
   - Download from https://nodejs.org
   - Verify: `node --version`

2. **npm** (included with Node.js)
   - Verify: `npm --version`

3. **Git**
   - Download from https://git-scm.com
   - Verify: `git --version`

4. **A Web3 wallet** for the smart contract features
   - MetaMask: https://metamask.io (browser extension)
   - Fund it with Sepolia ETH (free from https://sepoliafaucet.com) if you want to test contract deployment

5. **A WalletConnect Project ID** (free, takes 1 minute)
   - Go to https://cloud.walletconnect.com
   - Create a project and copy the Project ID

---

### Step-by-Step Setup

#### 1. Clone the repository

```bash
git clone https://github.com/your-username/creator-chainlink.git
cd creator-chainlink
```

#### 2. Install backend dependencies

```bash
cd back-end
npm install
```

This installs:
- `express` - HTTP server
- `cors` - Cross-origin request handling
- `solc` - Solidity compiler (bundled, no external toolchain needed)
- `dotenv` - Environment variable loading
- `tsx` - TypeScript runtime (no build step required)

#### 3. Configure the backend

```bash
cp .env.example .env
```

The default `.env` values work for local development. No changes needed unless you want to test with a specific private key.

#### 4. Start the backend

```bash
npm run dev
```

The backend starts at http://localhost:3001. You should see:

```
CREator Backend running in HACKATHON mode
All file operations are ENABLED
Orchestrator path: .../cre-orchestrator
```

Leave this terminal open.

#### 5. Install frontend dependencies

Open a new terminal:

```bash
cd front-end
npm install
```

This installs all dependencies including:
- `react` 19 + `vite` 7
- `reactflow` - canvas workflow editor
- `@rainbow-me/rainbowkit` + `wagmi` + `viem` - wallet connection
- `react-icons` - UI icon library
- `ethers` - blockchain interaction
- `jszip` - client-side ZIP export
- `zustand` - state management

#### 6. Configure the frontend

```bash
cp .env.example .env
```

Edit `.env` and fill in your WalletConnect Project ID:

```env
VITE_API_URL=http://localhost:3001
VITE_WALLETCONNECT_PROJECT_ID=paste_your_project_id_here
```

The `VITE_API_URL` points to the local backend. The WalletConnect Project ID is required for the wallet connection UI.

#### 7. Start the frontend

```bash
npm run dev
```

The frontend starts at http://localhost:5173. Open it in your browser.

---

### Verifying Both Services Are Running

Open a browser and check:

- Frontend: http://localhost:5173 - should show the CREator landing page
- Backend health: http://localhost:3001/health - should return `{"status":"ok",...}`

---

## What to Evaluate

### 1. Visual Workflow Builder

1. Click **Launch Builder** on the landing page.
2. From the left panel, drag a **Cron Trigger** node onto the canvas.
3. Drag an **HTTP Request** node and connect it to the trigger by clicking and dragging from the trigger's output handle.
4. Keep adding nodes (Logic, Chainlink Services, Blockchain) and connecting them.
5. The validation panel at the bottom shows any connection rule violations in real time.

### 2. Workflow Simulation (Prove button)

1. Build any workflow on the canvas (at least a trigger connected to one other node).
2. Click the **Prove** button in the header.
3. A modal displays CRE CLI-formatted simulation output with `[SIMULATION]` and `[USER LOG]` markers.

This runs on the backend without the CRE CLI installed. The engine reads the generated `main.ts`, parses `runtime.log()` calls, and returns authentic-looking output.

### 3. Workflow Export

1. Click **Export Flow** in the header.
2. Enter a project name and description.
3. A ZIP file downloads automatically.

The ZIP contains a complete, ready-to-run CRE project: `main.ts`, `workflow.yaml`, config files, `package.json`, `.env.example`, `QUICKSTART.md`, and a contracts directory.

### 4. Smart Contract Deployment

Requires MetaMask connected to Sepolia testnet and some Sepolia ETH.

1. Drag a **Simple Storage** or **ERC20 Token** node onto the canvas.
2. Click the node to open the contract editor.
3. Edit the Solidity code if desired.
4. Click **Compile** - the backend compiles the code using solc.
5. Click **Deploy** - signs the transaction via MetaMask and deploys to Sepolia.
6. Once confirmed, the node shows the deployed contract address.
7. Click the address to open the contract details modal (ABI viewer, Etherscan link, interaction panel).

### 5. AI Assistant (ChatBot)

Requires the `DEEPSEEK_API_KEY` to be set in the Vercel deployment. On the live deployment this is already configured.

If running locally, the AI assistant will return an API error unless you add a `DEEPSEEK_API_KEY` to `front-end/.env` (the `/api/chat` endpoint is a Vercel serverless function and runs differently in local dev via Vite proxy).

1. Click the chat button in the bottom-right corner of the Flow Builder.
2. Type a description: _"Create a workflow that reads ETH/USD price and sends it cross-chain via CCIP"_
3. The AI returns a structured workflow spec and places the nodes on the canvas automatically.

### 6. Wallet Connection

1. Click **Connect Wallet** in the Flow Builder header.
2. RainbowKit shows a modal with options: MetaMask, WalletConnect, Coinbase Wallet, and others.
3. Connect your wallet. The header shows your address and the current network.
4. If not on Sepolia, the UI prompts you to switch networks.

---

## Architecture Overview

```
Vercel (frontend)
    React 19 + Vite + TypeScript
    RainbowKit + wagmi + viem  (wallet)
    ReactFlow                  (canvas)
    react-icons                (UI icons)
    JSZip                      (client-side ZIP export)
         |
         | REST API calls
         v
Render (backend, Docker)
    Node.js 22 + Express
    solc 0.8.34                (Solidity compiler)
    Custom simulation engine   (reads main.ts, no CRE CLI needed)
         |
         | reads/writes files
         v
cre-orchestrator/
    workflows/main.ts          (generated by frontend, simulated by backend)
    workflows/workflow.yaml
    workflows/config.staging.json
```

---

## Troubleshooting

**Wallet connect button does not open a modal**
Make sure `VITE_WALLETCONNECT_PROJECT_ID` is set in `front-end/.env`. An empty or invalid ID causes the modal to fail silently.

**Simulation returns an error about missing main.ts**
Build a workflow on the canvas first, which writes `main.ts` to the server via the backend. Then click Prove.

**Backend fails to start on port 3001**
Another process may be using the port. Change `PORT` in `back-end/.env` to `3002` and update `VITE_API_URL` in `front-end/.env` to match.

**Contract deployment fails**
Ensure your MetaMask wallet is on the Sepolia testnet and has Sepolia ETH. Get free Sepolia ETH from https://sepoliafaucet.com.

**npm install errors on the frontend**
Ensure Node.js 22 is installed. Some packages (vite 7, react 19) require Node.js 18 minimum; Node.js 22 is recommended.
