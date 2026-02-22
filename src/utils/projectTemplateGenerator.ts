import JSZip from 'jszip';
import type { Node, Edge } from 'reactflow';
import { generateCRECode } from './codeGenerator';

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
    metadata: ProjectMetadata
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
