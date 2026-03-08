import JSZip from 'jszip';
import type { Node, Edge } from 'reactflow';
import { generateCRECode } from './codeGenerator';
import type { DeployedContract } from '../lib/blockchain/contractStorage';

interface ProjectMetadata {
    projectName: string;
    description: string;
    author?: string;
}

/**
 * Generates a complete CRE project ZIP file ready for development
 * Similar to Spring Initializr but for Chainlink CRE
 */
export async function generateProjectZip(
    nodes: Node[],
    edges: Edge[],
    metadata: ProjectMetadata,
    deployedContracts: DeployedContract[] = []
): Promise<Blob> {
    const zip = new JSZip();

    // Generate workflow code from visual flow
    const generatedFiles = generateCRECode({ nodes, edges });

    // =========================================================================
    // ROOT FILES
    // =========================================================================

    // .gitignore
    zip.file('.gitignore', generateGitignore());

    // .env.example
    zip.file('.env.example', generateEnvExample());

    // project.yaml
    zip.file('project.yaml', generateProjectYaml());

    // secrets.yaml
    zip.file('secrets.yaml', generateSecretsYaml());

    // README.md
    zip.file('README.md', generateREADME(metadata));

    // QUICKSTART.md
    zip.file('QUICKSTART.md', generateQuickstart(metadata));

    // LICENSE
    zip.file('LICENSE', generateLicense());

    // =========================================================================
    // WORKFLOWS FOLDER
    // =========================================================================

    const workflows = zip.folder('workflows');
    if (!workflows) throw new Error('Failed to create workflows folder');

    // Generated workflow files
    workflows.file('main.ts', generatedFiles['main.ts']);
    workflows.file('workflow.yaml', generatedFiles['workflow.yaml']);
    workflows.file('config.staging.json', generatedFiles['config.staging.json']);
    workflows.file('config.production.json', generatedFiles['config.production.json']);

    // package.json for workflow
    workflows.file('package.json', generateWorkflowPackageJson(metadata.projectName));

    // tsconfig.json for workflow
    workflows.file('tsconfig.json', generateTsConfig());

    // README.md for workflow folder
    workflows.file('README.md', generateWorkflowREADME());

    // =========================================================================
    // CONTRACTS FOLDER (optional, for user to add contracts)
    // =========================================================================

    const contracts = zip.folder('contracts');
    if (!contracts) throw new Error('Failed to create contracts folder');
    
    contracts.file('.gitkeep', '# Add your smart contracts here\n');
    contracts.file('README.md', generateContractsREADME());

    // =========================================================================
    // DEPLOYED CONTRACTS FOLDER
    // =========================================================================

    if (deployedContracts.length > 0) {
        const deployedFolder = zip.folder('deployed-contracts');
        if (!deployedFolder) throw new Error('Failed to create deployed-contracts folder');
        
        // Create a summary file
        deployedFolder.file('DEPLOYED_CONTRACTS.md', generateDeployedContractsSummary(deployedContracts));
        
        // Create individual contract files
        deployedContracts.forEach(contract => {
            const contractFolder = deployedFolder.folder(contract.name.toLowerCase().replace(/\s+/g, '-'));
            if (!contractFolder) return;
            
            // Contract info
            contractFolder.file('contract-info.json', JSON.stringify({
                name: contract.name,
                type: contract.type,
                address: contract.address,
                network: contract.network,
                txHash: contract.txHash,
                deployedAt: new Date(contract.deployedAt).toISOString(),
                etherscanUrl: `https://sepolia.etherscan.io/address/${contract.address}`,
                txUrl: `https://sepolia.etherscan.io/tx/${contract.txHash}`
            }, null, 2));
            
            // ABI
            contractFolder.file('abi.json', JSON.stringify(contract.abi, null, 2));
            
            // Source code
            contractFolder.file('contract.sol', contract.sourceCode);
            
            // Interaction example
            contractFolder.file('interact.ts', generateContractInteractionExample(contract));
        });
    }

    // Generate ZIP blob
    return await zip.generateAsync({ type: 'blob' });
}

/**
 * Downloads the generated ZIP file
 */
export function downloadZip(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ============================================================================
// TEMPLATE GENERATORS
// ============================================================================

function generateGitignore(): string {
    return `# Environment variables - NEVER upload this file
.env
*.env

# Node modules
node_modules/
workflows/node_modules/

# Build outputs
dist/
build/
*.wasm
*.js.map

# Temporary files
tmp.js
tmp.wasm
.workflow-temp-*

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
yarn-debug.log*

# Cache
.cache/
bun.lockb

# Private keys and secrets
*.pem
*.key
secrets/
private/
`;
}

function generateEnvExample(): string {
    return `###############################################################################
### REQUIRED ENVIRONMENT VARIABLES - SENSITIVE INFORMATION                  ###
### DO NOT STORE RAW SECRETS HERE IN PLAINTEXT IF AVOIDABLE                 ###
### DO NOT UPLOAD OR SHARE THIS FILE UNDER ANY CIRCUMSTANCES                ###
###############################################################################

# ============================================================================
# ETHEREUM PRIVATE KEY
# ============================================================================
# Your MetaMask private key (64 hexadecimal characters)
# ⚠️  IMPORTANT: Get your private key from MetaMask:
#    1. Open MetaMask
#    2. Click the 3 dots → "Account Details"
#    3. Click "Export Private Key"
#    4. Enter your password
#    5. Copy the private key (64 characters, with or without 0x prefix)
# 
# ⚠️  NEVER share this key with anyone
# ⚠️  Make sure you have funds on Sepolia testnet to pay gas fees
CRE_ETH_PRIVATE_KEY=your_64_character_private_key_here

# ============================================================================
# CRE TARGET CONFIGURATION
# ============================================================================
# Default configuration when you don't specify --target
# Available options: staging-settings, production-settings
CRE_TARGET=staging-settings
`;
}

function generateProjectYaml(): string {
    return `# ==========================================================================
# CRE PROJECT SETTINGS FILE
# ==========================================================================
# Project-specific settings for CRE CLI targets.
# Each target defines cre-cli, account, and rpcs groups.

# ==========================================================================
staging-settings:
  rpcs:
    - chain-name: ethereum-testnet-sepolia
      url: https://sepolia.infura.io/v3/987a86dd926d4434bb6397457235d27e

# ==========================================================================
production-settings:
  rpcs:
    - chain-name: ethereum-testnet-sepolia
      url: https://sepolia.infura.io/v3/987a86dd926d4434bb6397457235d27e
`;
}

function generateSecretsYaml(): string {
    return `# ==========================================================================
# CRE SECRETS CONFIGURATION
# ==========================================================================
# Define secret names that can be referenced in workflows.
# Actual values should be in the .env file
#
# Usage example in workflow:
#   - Reference: runtime.secrets.WALLET_ADDRESS
#   - Actual value: defined in .env as CRE_ETH_PRIVATE_KEY

secretsNames:
    # Wallet address for transactions
    WALLET_ADDRESS:
        - WALLET_ADDRESS_ALL
    
    # Contract address (if needed as a secret)
    CONTRACT_ADDRESS:
        - CONTRACT_ADDRESS_ALL
`;
}

function generateREADME(metadata: ProjectMetadata): string {
    return `# ${metadata.projectName}

${metadata.description}

**Generated with CREator** - Visual Workflow Builder for Chainlink Runtime Environment

${metadata.author ? `**Author**: ${metadata.author}\n` : ''}
## 📋 Overview

This project contains a Chainlink CRE workflow that was visually designed using CREator and is ready to be customized and deployed.

## 🏗️ Project Structure

\`\`\`
${metadata.projectName}/
├── workflows/                    # Chainlink CRE Workflow
│   ├── main.ts                  # Main workflow logic
│   ├── config.staging.json      # Staging configuration
│   ├── config.production.json   # Production configuration
│   ├── workflow.yaml            # Workflow settings
│   ├── package.json             # Workflow dependencies
│   └── README.md                # Workflow documentation
├── contracts/                    # Smart contracts (Solidity)
│   └── README.md                # Contract documentation
├── project.yaml                  # CRE project configuration
├── secrets.yaml                  # Secrets configuration
├── .env                         # Environment variables (DO NOT COMMIT)
├── .env.example                 # Example environment variables
├── QUICKSTART.md                # Quick setup guide
└── README.md                    # This file
\`\`\`

## 🚀 Quick Start

### Prerequisites

1. **[Bun Runtime](https://bun.sh/)** - TypeScript runtime
   \`\`\`bash
   # Windows (PowerShell)
   powershell -c "irm bun.sh/install.ps1|iex"
   
   # macOS/Linux
   curl -fsSL https://bun.sh/install | bash
   \`\`\`

2. **[CRE CLI](https://docs.chain.link/cre/getting-started/cli-installation)** - Chainlink Runtime Environment CLI
   \`\`\`bash
   # Verify installation
   cre --version
   \`\`\`

3. **MetaMask** with Sepolia ETH
   - Install MetaMask browser extension
   - Get test ETH from [Sepolia Faucet](https://sepoliafaucet.com/)

### Setup

1. **Configure environment variables**
   \`\`\`bash
   cp .env.example .env
   \`\`\`
   
   Edit \`.env\` and add your MetaMask private key:
   \`\`\`env
   CRE_ETH_PRIVATE_KEY=your_64_character_private_key_here
   \`\`\`

2. **Install workflow dependencies**
   \`\`\`bash
   cd workflows
   bun install
   \`\`\`

3. **Run simulation**
   \`\`\`bash
   # From project root
   cre workflow simulate workflows --target=staging-settings
   \`\`\`

## 🧪 Development

### Test Your Workflow

Run in simulation mode (no gas fees):
\`\`\`bash
cre workflow simulate workflows --target=staging-settings
\`\`\`

### Build Your Workflow

Compile to WASM:
\`\`\`bash
cre workflow build workflows --target=staging-settings
\`\`\`

### Deploy Smart Contracts

1. Open [Remix IDE](https://remix.ethereum.org/)
2. Add your contracts from the \`contracts/\` folder
3. Compile with appropriate Solidity version
4. Deploy to Sepolia testnet using MetaMask
5. Update contract addresses in \`workflows/config.staging.json\`

## 📚 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Detailed setup guide
- **[workflows/README.md](workflows/README.md)** - Workflow documentation
- **[CRE Documentation](https://docs.chain.link/cre)** - Official CRE docs
- **[CREator](https://your-app-url.com)** - Visual workflow builder

## ⚙️ Configuration

### Workflow Settings

Edit \`workflows/config.staging.json\` or \`workflows/config.production.json\`:
- Cron schedules
- Contract addresses
- Chain selectors
- Custom parameters

### RPC Endpoints

Edit \`project.yaml\` to add/modify RPC endpoints for different chains.

## 🔒 Security

⚠️ **NEVER commit your \`.env\` file!**

- Keep your private keys secure
- Use separate wallets for testing and production
- Review all generated code before deployment
- Audit smart contracts before mainnet deployment

## 📝 License

${generateLicense()}

## 🤝 Support

- CRE Documentation: https://docs.chain.link/cre
- Chainlink Discord: https://discord.gg/chainlink
- GitHub Issues: Create an issue in this repository

---

**Built with [CREator](https://your-app-url.com)** - The visual workflow builder for Chainlink Runtime Environment 🔗
`;
}

function generateQuickstart(metadata: ProjectMetadata): string {
    return `# 🚀 Quick Start Guide - ${metadata.projectName}

This guide will help you get your Chainlink CRE workflow up and running in minutes!

## Step 1: Install Prerequisites

### Install Bun Runtime

**Windows (PowerShell as Administrator):**
\`\`\`powershell
powershell -c "irm bun.sh/install.ps1|iex"
\`\`\`

**macOS/Linux:**
\`\`\`bash
curl -fsSL https://bun.sh/install | bash
\`\`\`

Verify installation:
\`\`\`bash
bun --version
\`\`\`

### Install CRE CLI

Follow the official guide: https://docs.chain.link/cre/getting-started/cli-installation

Verify installation:
\`\`\`bash
cre --version
\`\`\`

## Step 2: Configure Your Wallet

### Get Your MetaMask Private Key

1. Open MetaMask browser extension
2. Click the **3 dots** (⋮) in the top right
3. Select **"Account Details"**
4. Click **"Export Private Key"**
5. Enter your MetaMask password
6. Copy the private key (64 hexadecimal characters)

⚠️ **Security Warning**: Never share this key with anyone!

### Create Environment File

1. Copy the example file:
   \`\`\`bash
   cp .env.example .env
   \`\`\`

2. Open \`.env\` and paste your private key:
   \`\`\`env
   CRE_ETH_PRIVATE_KEY=your_64_character_private_key_here
   CRE_TARGET=staging-settings
   \`\`\`

3. Save the file

## Step 3: Get Test ETH

You need Sepolia testnet ETH to pay for gas fees:

1. Go to [Sepolia Faucet](https://sepoliafaucet.com/)
2. Enter your wallet address
3. Complete captcha and request ETH
4. Wait for confirmation (usually 1-2 minutes)

Alternative faucets:
- https://www.alchemy.com/faucets/ethereum-sepolia
- https://sepolia-faucet.pk910.de/

## Step 4: Install Dependencies

Navigate to the workflows folder and install packages:

\`\`\`bash
cd workflows
bun install
\`\`\`

This will install:
- @chainlink/cre-sdk
- viem (Ethereum library)
- TypeScript types

## Step 5: Test Your Workflow

Run the workflow in simulation mode (from project root):

\`\`\`bash
cre workflow simulate workflows --target=staging-settings
\`\`\`

You should see output similar to:
\`\`\`
✓ Workflow compiled successfully
✓ Running simulation...
[USER LOG] Workflow triggered.
[USER LOG] Processing workflow...
✓ Workflow completed successfully!
\`\`\`

## Step 6: Customize Your Workflow

### Option A: Edit Code Directly

Open \`workflows/main.ts\` and modify the logic:

\`\`\`typescript
const onCronTrigger = async (runtime: Runtime<Config>): Promise<string> => {
  runtime.log("Workflow triggered.");
  
  // Add your custom logic here
  
  return "Workflow completed!";
};
\`\`\`

### Option B: Use CREator Visual Editor

1. Go to [CREator](https://your-app-url.com)
2. Import your workflow
3. Modify nodes visually
4. Export and replace files

## Step 7: Add Smart Contracts (Optional)

If your workflow interacts with smart contracts:

1. Create your contract in \`contracts/\` folder
2. Open [Remix IDE](https://remix.ethereum.org/)
3. Compile your contract
4. Deploy to Sepolia testnet
5. Copy the deployed contract address
6. Update \`workflows/config.staging.json\`:
   \`\`\`json
   {
     "schedule": "*/30 * * * * *",
     "contractAddress": "0xYourContractAddress",
     "chainSelector": "16015286601757825753"
   }
   \`\`\`

## Step 8: Build for Production

Once you're ready to deploy:

1. Update \`workflows/config.production.json\` with production settings
2. Build the workflow:
   \`\`\`bash
   cre workflow build workflows --target=production-settings
   \`\`\`

3. Follow deployment instructions in the CRE documentation

## 🎉 You're Ready!

Your Chainlink CRE workflow is now set up and ready for development!

## Next Steps

- 📖 Read the [README.md](README.md) for detailed documentation
- 🔧 Customize workflow logic in \`workflows/main.ts\`
- 📝 Add smart contracts to \`contracts/\` folder
- 🧪 Test thoroughly in simulation mode
- 🚀 Deploy to production when ready

## Need Help?

- 📚 [CRE Documentation](https://docs.chain.link/cre)
- 💬 [Chainlink Discord](https://discord.gg/chainlink)
- 🐛 Create an issue in this repository

---

**Happy Building! 🔗**
`;
}

function generateLicense(): string {
    return `MIT License

Copyright (c) ${new Date().getFullYear()}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
}

function generateWorkflowPackageJson(projectName: string): string {
    return JSON.stringify(
        {
            name: projectName.toLowerCase().replace(/\s+/g, '-'),
            version: '1.0.0',
            main: 'dist/main.js',
            private: true,
            scripts: {
                postinstall: 'bun x cre-setup',
            },
            license: 'MIT',
            dependencies: {
                '@chainlink/cre-sdk': '^1.0.9',
                viem: '^2.0.0',
            },
            devDependencies: {
                '@types/bun': '1.2.21',
            },
        },
        null,
        2
    );
}

function generateTsConfig(): string {
    return JSON.stringify(
        {
            compilerOptions: {
                target: 'ES2020',
                module: 'ESNext',
                moduleResolution: 'bundler',
                lib: ['ES2020'],
                strict: true,
                esModuleInterop: true,
                skipLibCheck: true,
                forceConsistentCasingInFileNames: true,
                resolveJsonModule: true,
                allowSyntheticDefaultImports: true,
                outDir: './dist',
                rootDir: './',
            },
            include: ['**/*.ts'],
            exclude: ['node_modules', 'dist'],
        },
        null,
        2
    );
}

function generateWorkflowREADME(): string {
    return `# Workflow Documentation

This folder contains the Chainlink CRE workflow generated by CREator.

## Files

- \`main.ts\` - Main workflow logic with trigger handlers
- \`workflow.yaml\` - Workflow configuration and settings
- \`config.staging.json\` - Staging environment configuration
- \`config.production.json\` - Production environment configuration
- \`package.json\` - Dependencies and scripts
- \`tsconfig.json\` - TypeScript configuration

## Running the Workflow

### Simulation Mode (Testing)

From the project root:

\`\`\`bash
cre workflow simulate workflows --target=staging-settings
\`\`\`

This runs your workflow locally without deploying or spending gas.

### Build for Deployment

\`\`\`bash
cre workflow build workflows --target=staging-settings
\`\`\`

This compiles your workflow to WASM for deployment.

## Customizing Configuration

### Staging Config (\`config.staging.json\`)

Used for testing and development. Edit to change:
- Cron schedule (how often the workflow runs)
- Contract addresses
- Chain selectors
- Any custom parameters

### Production Config (\`config.production.json\`)

Used for production deployment. Should have more conservative settings:
- Less frequent cron schedules
- Production contract addresses
- Mainnet chain selectors

## Modifying Workflow Logic

Edit \`main.ts\` to customize your workflow behavior:

1. **Add data sources** - Fetch data from APIs, contracts, oracles
2. **Add logic** - Process data, make decisions, transform values
3. **Add actions** - Call contracts, send transactions, emit events

Refer to the [CRE SDK documentation](https://docs.chain.link/cre) for available capabilities.

## Debugging

Use \`runtime.log()\` to output debug information:

\`\`\`typescript
runtime.log("Debug info: " + JSON.stringify(data));
\`\`\`

Logs appear in the simulation output with \`[USER LOG]\` prefix.

## Next Steps

1. Test your workflow in simulation mode
2. Customize the logic in \`main.ts\`
3. Update configurations as needed
4. Build and deploy when ready

**Need help?** Check the [CRE Documentation](https://docs.chain.link/cre)
`;
}

function generateContractsREADME(): string {
    return `# Smart Contracts

Add your Solidity smart contracts to this folder.

## Deploying Contracts

### Using Remix IDE (Recommended for Quick Testing)

1. Go to [Remix IDE](https://remix.ethereum.org/)
2. Create a new file and paste your contract code
3. Select appropriate Solidity compiler version
4. Click "Compile"
5. Go to "Deploy & Run Transactions"
6. Select "Injected Provider - MetaMask"
7. Choose "Sepolia" network in MetaMask
8. Deploy your contract
9. Copy the deployed contract address

### Using Hardhat (Recommended for Production)

1. Install Hardhat:
   \`\`\`bash
   npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
   \`\`\`

2. Initialize Hardhat:
   \`\`\`bash
   npx hardhat init
   \`\`\`

3. Add your contracts to \`contracts/\`

4. Create deployment scripts in \`scripts/\`

5. Deploy:
   \`\`\`bash
   npx hardhat run scripts/deploy.ts --network sepolia
   \`\`\`

## Updating Workflow Configuration

After deploying your contract:

1. Copy the deployed contract address
2. Open \`../workflows/config.staging.json\`
3. Add or update the contract address:
   \`\`\`json
   {
     "contractAddress": "0xYourContractAddress",
     "chainSelector": "16015286601757825753"
   }
   \`\`\`

## Verifying Contracts

Verify your contract on Etherscan for transparency:

\`\`\`bash
npx hardhat verify --network sepolia YOUR_CONTRACT_ADDRESS
\`\`\`

## Resources

- [Solidity Documentation](https://docs.soliditylang.org/)
- [Remix IDE](https://remix.ethereum.org/)
- [Hardhat Documentation](https://hardhat.org/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Etherscan Sepolia](https://sepolia.etherscan.io/)
`;
}

function generateDeployedContractsSummary(contracts: DeployedContract[]): string {
    const contractsList = contracts.map((c, i) => {
        const deployedDate = new Date(c.deployedAt).toLocaleString();
        return `## ${i + 1}. ${c.name}

**Type:** ${c.type}  
**Network:** ${c.network} (Sepolia Testnet)  
**Address:** \`${c.address}\`  
**Deployed:** ${deployedDate}  
**Transaction:** \`${c.txHash}\`

**View on Etherscan:**
- [Contract](https://sepolia.etherscan.io/address/${c.address})
- [Transaction](https://sepolia.etherscan.io/tx/${c.txHash})

**Files:**
- \`${c.name.toLowerCase().replace(/\s+/g, '-')}/contract-info.json\` - Deployment details
- \`${c.name.toLowerCase().replace(/\s+/g, '-')}/abi.json\` - Contract ABI
- \`${c.name.toLowerCase().replace(/\s+/g, '-')}/contract.sol\` - Source code
- \`${c.name.toLowerCase().replace(/\s+/g, '-')}/interact.ts\` - Interaction example

---
`;
    }).join('\n');

    return `# Deployed Contracts

This folder contains information about smart contracts that were deployed using the CREator visual builder.

**Total Deployed Contracts:** ${contracts.length}

---

${contractsList}

## Using These Contracts in Your Workflow

All deployed contracts are already referenced in the generated workflow code (\`workflows/main.ts\`). The contract addresses and ABIs are included as comments.

### Quick Integration

1. Each contract folder contains an \`interact.ts\` file with example code
2. The ABIs are in \`abi.json\` for easy import
3. Contract addresses are in \`contract-info.json\`

### Example: Importing a Contract

\`\`\`typescript
import { createPublicClient, createWalletClient, http, privateKeyToAccount } from 'viem';
import { sepolia } from 'viem/chains';
import contractInfo from './deployed-contracts/my-contract/contract-info.json';
import abi from './deployed-contracts/my-contract/abi.json';

const account = privateKeyToAccount(process.env.CRE_ETH_PRIVATE_KEY as \`0x\${string}\`);
const walletClient = createWalletClient({ account, chain: sepolia, transport: http() });
const publicClient = createPublicClient({ chain: sepolia, transport: http() });

// Read from contract
const result = await publicClient.readContract({ address: contractInfo.address, abi, functionName: 'someMethod' });

// Write to contract
const hash = await walletClient.writeContract({ address: contractInfo.address, abi, functionName: 'someMethod', args: [] });
\`\`\`

## Security Note

🔒 **Important:** These contracts are deployed on Sepolia testnet. Do not send real ETH or interact with mainnet using these addresses.

For mainnet deployment:
1. Thoroughly test on testnet
2. Get security audit
3. Deploy to mainnet using proper tooling
4. Verify contracts on Etherscan

## Need Help?

- [CREator Documentation](https://github.com/Constellation-team)
- [viem Documentation](https://viem.sh/)
- [Chainlink CRE Documentation](https://docs.chain.link/cre)
`;
}

function generateContractInteractionExample(contract: DeployedContract): string {
    return `import { createPublicClient, createWalletClient, http, privateKeyToAccount, parseEther, formatEther } from 'viem';
import { sepolia } from 'viem/chains';

/**
 * Example interaction with ${contract.name}
 * 
 * Contract Address: ${contract.address}
 * Network: ${contract.network} (Sepolia Testnet)
 * Deployed: ${new Date(contract.deployedAt).toLocaleString()}
 * 
 * View on Etherscan: https://sepolia.etherscan.io/address/${contract.address}
 * 
 * Run with: bun interact.ts
 */

// Contract ABI (imported from abi.json or defined inline)
const ABI = ${JSON.stringify(contract.abi, null, 2)};

// Contract address
const CONTRACT_ADDRESS = '${contract.address}' as const;

// Setup viem clients (CRE_ETH_PRIVATE_KEY is set via .env)
const account = privateKeyToAccount(process.env.CRE_ETH_PRIVATE_KEY as \`0x\${string}\`);
const walletClient = createWalletClient({ account, chain: sepolia, transport: http() });
const publicClient = createPublicClient({ chain: sepolia, transport: http() });

async function interact() {
    try {
        // Example interactions (uncomment and modify as needed)
        
        ${generateContractSpecificExamples(contract.type)}
        
    } catch (error) {
        console.error('Error interacting with contract:', error);
    }
}

// Run the interaction
interact().catch(console.error);

export { ABI, CONTRACT_ADDRESS };
`;
}

function generateContractSpecificExamples(contractType: string): string {
    switch (contractType) {
        case 'simple-storage':
            return `        // Read the stored value
        // const value = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'get' });
        // console.log('Current value:', value);
        
        // Set a new value
        // const hash = await walletClient.writeContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'set', args: [42n] });
        // console.log('Value set, tx:', hash);`;
        
        case 'erc20-token':
            return `        // Get token info
        // const name = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'name' });
        // const symbol = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'symbol' });
        // console.log(\`Token: \${name} (\${symbol})\`);
        
        // Check balance
        // const balance = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'balanceOf', args: [account.address] });
        // console.log('Your balance:', formatEther(balance as bigint));
        
        // Transfer tokens
        // const hash = await walletClient.writeContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'transfer', args: ['0xRECIPIENT' as \`0x\${string}\`, parseEther('10')] });
        // console.log('Tokens transferred, tx:', hash);`;
        
        case 'erc721-nft':
            return `        // Mint an NFT
        // const hash = await walletClient.writeContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'mint', args: [account.address] });
        // console.log('NFT minted, tx:', hash);
        
        // Check NFT balance
        // const balance = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'balanceOf', args: [account.address] });
        // console.log('Your NFTs:', balance);
        
        // Transfer NFT
        // const hash2 = await walletClient.writeContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'transferFrom', args: [account.address, '0xRECIPIENT' as \`0x\${string}\`, 1n] });
        // console.log('NFT transferred, tx:', hash2);`;
        
        case 'crowdfunding':
            return `        // Contribute to campaign
        // const hash = await walletClient.writeContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'contribute', value: parseEther('0.1') });
        // console.log('Contribution sent, tx:', hash);
        
        // Check campaign status
        // const totalContributed = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'totalContributed' });
        // const goal = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'goal' });
        // console.log(\`Progress: \${formatEther(totalContributed as bigint)} / \${formatEther(goal as bigint)} ETH\`);
        
        // Claim funds (owner only, after deadline and goal reached)
        // const hash2 = await walletClient.writeContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'claimFunds' });
        // console.log('Funds claimed, tx:', hash2);`;
        
        case 'voting':
            return `        // Add a proposal (chairperson only)
        // const hash = await walletClient.writeContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'addProposal', args: ['Proposal: Increase budget by 10%'] });
        // console.log('Proposal added, tx:', hash);
        
        // Vote on a proposal
        // const hash2 = await walletClient.writeContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'vote', args: [0n] });
        // console.log('Vote cast, tx:', hash2);
        
        // Get winner
        // const winner = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'getWinner' });
        // console.log('Winner:', winner);`;
        
        case 'multisig-wallet':
            return `        // Submit a transaction
        // const hash = await walletClient.writeContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'submit', args: ['0xRECIPIENT' as \`0x\${string}\`, parseEther('1.0')] });
        // console.log('Transaction submitted, tx:', hash);
        
        // Confirm a transaction
        // const txId = 0n;
        // const hash2 = await walletClient.writeContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'confirm', args: [txId] });
        // console.log('Transaction confirmed, tx:', hash2);
        
        // Execute a transaction (after enough confirmations)
        // const hash3 = await walletClient.writeContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'execute', args: [txId] });
        // console.log('Transaction executed, tx:', hash3);`;
        
        default:
            return `        // Add your contract interaction code here
        // const result = await publicClient.readContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'someMethod' });
        // console.log('Result:', result);`;
    }
}
