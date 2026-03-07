# CREator — Workflow Testing Guide

> For hackathon judges, evaluators, and AI reviewers. This guide covers every testable feature end-to-end using only a browser. No local setup is required.

**Live application:** https://creator-chainlink.vercel.app  
**Backend health:** https://creator-backend.onrender.com/health  
**Organization:** https://github.com/Constellation-team

---

## Prerequisites

- A modern browser (Chrome, Firefox, Edge)
- MetaMask or any EVM-compatible wallet extension (only required for the contract deployment feature)
- Sepolia testnet ETH (only required for contract deployment — faucet: https://faucets.chain.link)

Everything else runs without a wallet.

---

## 1. AI-Assisted Workflow Generation

**What this tests:** Natural language → canvas construction via DeepSeek LLM → code generation pipeline.

1. Open https://creator-chainlink.vercel.app
2. Click **Launch Builder** or **Open FlowBuilder**
3. In the right panel, click the chat icon to open the AI assistant
4. Type a workflow description in plain English, for example:

   ```
   Monitor ETH/USD price every hour using a Cron trigger and a Data Streams node.
   If the price drops below 2000, send a CCIP cross-chain message.
   ```

5. Press Enter or click Send
6. Watch the canvas — nodes should appear one by one with a short animation, with edges connecting them automatically
7. The result is a fully built canvas identical to what a user would build by hand

**Expected result:** At minimum 3 nodes placed on the canvas (Cron Trigger, Data Streams, CCIP), connected in sequence, with no errors in the bottom status bar.

**Relevant code:** `front-end/src/components/ChatBot.tsx` → `parseWorkflowJSON()` → `buildWorkflowOnCanvas()`  
**AI endpoint:** `front-end/api/chat.ts` (Vercel serverless function calling DeepSeek)

---

## 2. Manual Drag-and-Drop Workflow Builder

**What this tests:** The visual node editor, connection validation, and node configuration.

1. In FlowBuilder, find the **Node Library** panel on the left sidebar
2. Drag a **Cron Trigger** node onto the canvas
3. Drag an **HTTP Request** node onto the canvas
4. Drag an **If/Else** node onto the canvas
5. Hover over the right edge handle of the Cron Trigger — a connection point appears
6. Click and drag from that handle to the left edge of the HTTP Request node to connect them
7. Connect HTTP Request to If/Else the same way
8. Click any node to open its configuration panel on the right sidebar
9. Try connecting a node to an invalid target (e.g., two triggers in sequence) — the connection should be rejected with a validation message

**Available node categories:**

| Category | Nodes |
|---|---|
| Triggers | Cron Trigger, Webhook, Manual |
| Data Sources | HTTP Request, Data Streams |
| Logic | If/Else, Transform, Merge |
| Chainlink | Oracle, CCIP, Functions |
| Blockchain | Contract Call, Event Listener, Simple Storage, ERC20, ERC721, Crowdfunding, Voting, MultiSig |
| AI | LLM |

**Relevant code:** `front-end/src/utils/flowValidation.ts` (connection rules), `front-end/src/store/flowStore.ts` (canvas state)

---

## 3. CRE Simulation (Prove)

**What this tests:** The code generation pipeline and the custom CRE simulation engine.

1. Build a workflow on the canvas (or use the AI assistant from step 1)
2. Click the **Prove** button in the top toolbar
3. A modal opens showing CRE CLI-formatted simulation output

**Expected output format:**

```
[2026-03-07T12:00:00.000Z] [SIMULATION] Simulator Initialized
[2026-03-07T12:00:00.001Z] [SIMULATION] Workflow: CREator Generated Workflow
[2026-03-07T12:00:00.002Z] [SIMULATION] Trigger: CronCapability (schedule: 0 * * * *)
[2026-03-07T12:00:00.003Z] [USER LOG] Workflow triggered.
[2026-03-07T12:00:00.004Z] [USER LOG] HTTP Data Source (simulated): {"status":200,"data":"..."}
[2026-03-07T12:00:00.005Z] [USER LOG] Condition met, proceeding...
[2026-03-07T12:00:00.006Z] [SIMULATION] Execution finished. Return value: "Workflow completed successfully!"
[2026-03-07T12:00:00.007Z] [SIMULATION] Total execution time: 4ms
```

The `[SIMULATION]` and `[USER LOG]` markers match the authentic CRE CLI output format exactly.

**How it works internally:**
- `codeGenerator.ts` converts the canvas state to `main.ts` TypeScript using `@chainlink/cre-sdk` imports
- The backend `POST /api/write-file` writes the generated `main.ts` to `cre-orchestrator/workflows/`
- The backend `POST /api/simulate` reads `main.ts`, extracts `runtime.log()` calls, evaluates conditional branches, and returns formatted output — no CRE CLI installation or OAuth required

**Relevant code:** `back-end/server.production.ts` → `buildSimulationOutput()`, `extractWorkflowLogs()`, `evaluateLogExpression()`

---

## 4. Project ZIP Export

**What this tests:** The client-side project template generator that produces a complete `@chainlink/cre-sdk` project.

1. Build any workflow on the canvas
2. Click the **Export** button (or download icon) in the toolbar
3. A ZIP file downloads immediately — no server round-trip

**ZIP contents:**

```
creator-workflow/
├── workflows/
│   ├── main.ts          (generated TypeScript using @chainlink/cre-sdk)
│   ├── workflow.yaml    (CRE target definitions: staging-settings)
│   ├── config.staging.json
│   └── package.json     (declares @chainlink/cre-sdk dependency)
└── README.md
```

**To deploy the exported project:**

```bash
cd creator-workflow/workflows
npm install
cre workflow simulate   # requires CRE CLI with staging credentials
```

**Relevant code:** `front-end/src/utils/projectTemplateGenerator.ts`, `front-end/src/utils/codeGenerator.ts`

---

## 5. Solidity Contract Editor

**What this tests:** The built-in Solidity editor, the `solc 0.8.34` compile API, and the wagmi/viem deployment to Sepolia.

> Requires a wallet connected to Sepolia testnet with test ETH.

1. In FlowBuilder, drag any **Blockchain** category node onto the canvas (e.g., ERC20 Token)
2. Click the node to select it
3. Click **Edit Contract** in the right panel — the Solidity editor modal opens
4. The editor is pre-populated with the contract template for that node type
5. Click **Compile** — the backend calls `solc 0.8.34` and returns ABI + bytecode
6. Connect MetaMask to Sepolia
7. Click **Deploy** — wagmi/viem sends the deployment transaction
8. After confirmation, click **View Contract** to see ABI, deployed address, and Etherscan link

**Available templates:**

| Node | Contract | Description |
|---|---|---|
| Simple Storage | SimpleStorage.sol | Basic get/set storage |
| ERC20 Token | MyToken.sol | Standard fungible token with mint |
| ERC721 NFT | MyNFT.sol | NFT collection with mint |
| Crowdfunding | Crowdfunding.sol | Goal-based fundraising with withdraw |
| Voting | Voting.sol | Proposal-based voting system |
| MultiSig Wallet | MultiSigWallet.sol | N-of-M multi-owner transaction approval |

**Relevant code:** `back-end/server.production.ts` → `POST /api/compile`, `front-end/src/lib/blockchain/`

---

## 6. Backend Health Check

Verify the backend is running and reachable:

```
GET https://creator-backend.onrender.com/health
```

Expected response:
```json
{ "status": "ok", "timestamp": "2026-03-07T12:00:00.000Z" }
```

Note: Render's free tier spins down after inactivity. The first request may take 30–60 seconds to cold-start. Subsequent requests are fast.

---

## 7. Generated CRE Code — Manual Inspection

The actual `main.ts` currently in the CRE orchestrator workspace:

**File:** https://github.com/Constellation-team/cre-orchestrator/blob/main/workflows/main.ts

It uses:
- `CronCapability` from `@chainlink/cre-sdk` — the trigger
- `Runtime` — for `runtime.log()` output
- `handler` — the workflow entry function
- `Runner` — to register and execute the workflow

This is the same structure that `codeGenerator.ts` produces for every workflow built through the UI.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Canvas is empty after AI generation | DeepSeek API rate limit or timeout | Wait 10 seconds and retry the prompt |
| Proof/simulation modal shows no output | Backend cold-start on Render | Wait 30–60 seconds and click Prove again |
| Export downloads a file named `creator-workflow.zip` with empty workflows/ | No nodes on canvas | Add at least one trigger node before exporting |
| Compile returns "solc error" | Syntax error in manually edited Solidity | Revert to the template default or fix the syntax error |
| Deploy button disabled | Wallet not connected or wrong network | Connect MetaMask and switch to Sepolia (Chain ID 11155111) |

---

## Team

| Name | GitHub |
|---|---|
| Franci-343 | https://github.com/Franci-343 |
| JHAMILCALI | https://github.com/JHAMILCALI |

**Organization:** https://github.com/Constellation-team  
**Hackathon track:** Track 2 — CRE & AI (Chainlink Hackathon 2026)
