# CREator - Visual Workflow Builder for Chainlink CRE

A modern, visual workflow builder for Chainlink Runtime Environment (CRE) - like Node-RED or n8n, but specifically designed for Chainlink workflows.

## ✨ Features

### Visual Flow Builder
- **Drag & Drop Interface**: 16 pre-built node types across 6 categories
- **Real-time Validation**: Connection rules prevent invalid workflows
- **Node Categories**:
  - 🎯 Triggers (Cron, Webhook)
  - 📊 Data Sources (HTTP, Database, File)
  - 🔗 Chainlink Services (Data Feeds, CCIP, Functions, Streams)
  - ⛓️ Blockchain (Contract Calls, Events, Deploy)
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
- MetaMask wallet with Sepolia ETH

### Installation

1. **Clone and install dependencies**:
   ```bash
   cd front-end
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Open in browser**: http://localhost:5173

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
- **ZIP**: JSZip 3.10.1
- **Routing**: React Router 7.13.0
- **Backend**: Node.js + Express
- **CRE**: @chainlink/cre-sdk 1.0.9

## 🔒 Security

- **Private Keys**: Stored locally in .env files (never sent to external servers)
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

