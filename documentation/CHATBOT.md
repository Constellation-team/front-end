# ChatBot Component

## Overview

ChatBot.tsx is an AI-powered assistant embedded in CREator. Users describe Chainlink CRE workflows in natural language and the component automatically places the corresponding nodes and edges on the canvas.

The underlying model is **DeepSeek** (deepseek-chat), accessed via a Vercel serverless function at /api/chat.

---

## Features

| Feature | Description |
|---|---|
| Natural language workflow design | Users describe what they want; the AI returns a structured workflow spec. |
| One-click canvas builder | A "Build on Canvas" button parses the AI response and places nodes/edges automatically. |
| Markdown rendering | Assistant messages support headings, bold, italic, inline code, lists, and fenced code blocks. |
| Full conversation history | Sends the complete message history on each request (no streaming). |
| Animated node placement | Nodes are added one by one with a 400 ms delay for a visual build effect. |
| Suggestions | Three pre-written prompts help users get started quickly. |
| Error handling and retry | Displays API errors and offers a one-click retry for the last user message. |
| Open/close animation | The chat window slides in and out with CSS transitions. |

---

## Architecture

```
ChatBot
├── State
│   ├── isOpen / isClosing      - visibility of the chat window
│   ├── messages[]              - full conversation history (user + assistant)
│   ├── input                   - current textarea value
│   ├── isLoading               - waiting for API response
│   ├── isBuilding              - animating node placement
│   └── error                   - last API error string
│
├── Refs
│   ├── messagesEndRef          - auto-scroll anchor
│   └── inputRef                - focus management
│
├── Store (Zustand - flowStore)
│   ├── addNode()               - adds a single node to the canvas
│   └── getState() / setState() - direct canvas manipulation
│
├── Core Callbacks
│   ├── sendMessage()           - POSTs to /api/chat and appends response
│   ├── parseWorkflowJSON()     - extracts json-workflow block from AI reply
│   ├── buildWorkflowOnCanvas() - places nodes + edges with animation
│   ├── stripWorkflowJSON()     - removes the hidden JSON block from rendered text
│   └── renderContent()        - custom Markdown to JSX renderer
│
└── UI
    ├── Floating toggle button  (#chatbot-toggle-btn)
    └── Chat window             (#chatbot-window)
        ├── Header (avatar, status dot, close button)
        ├── Messages area
        │   ├── Welcome screen with suggestion buttons
        │   ├── Message bubbles (user / assistant)
        │   ├── "Build on Canvas" button (appears only on messages with a valid spec)
        │   ├── Typing indicator (three animated dots)
        │   └── Error banner with retry button
        └── Input area (auto-resize textarea + send button)
```

---

## Node Catalog

The component maintains a static NODE_CATALOG mapping every supported node 	ype to its display metadata:

| Type | Label | Category |
|---|---|---|
| cron-trigger | Cron Trigger | trigger |
| webhook-trigger | Webhook | trigger |
| manual-trigger | Manual | trigger |
| http-request | HTTP Request | datasource |
| data-streams | Data Streams | datasource |
| if-else | If/Else | logic |
| 	ransform | Transform | logic |
| merge | Merge | logic |
| oracle | Oracle | chainlink |
| ccip | CCIP | chainlink |
| unctions | Functions | chainlink |
| contract-call | Contract Call | blockchain |
| event-listener | Event Listener | blockchain |
| simple-storage | Simple Storage | blockchain |
| erc20-token | ERC20 Token | blockchain |
| erc721-nft | ERC721 NFT | blockchain |
| crowdfunding | Crowdfunding | blockchain |
| oting | Voting | blockchain |
| multisig-wallet | MultiSig Wallet | blockchain |
| llm | LLM | ai |

---

## AI Integration

### System Prompt

The SYSTEM_PROMPT constant instructs the model to:

1. Only use node types from the NODE_CATALOG.
2. Respect the following connection rules:

   ```
   Trigger     -> DataSource, Logic, Chainlink, Blockchain, AI
   DataSource  -> Logic, Chainlink, Blockchain, AI
   Chainlink   -> Logic, Blockchain, AI
   Logic       -> Logic, Chainlink, Blockchain, AI, DataSource
   Blockchain  -> Logic, AI
   AI          -> Logic, Blockchain
   ```

3. Always include exactly one Trigger node per workflow.
4. End every workflow-related reply with a json-workflow fenced block.

### Workflow JSON Schema

The AI embeds a hidden block that this component parses:

```
`json-workflow
{
  "nodes": [
    { "type": "cron-trigger", "label": "Cron Trigger" },
    { "type": "http-request", "label": "HTTP Request" }
  ],
  "edges": [
    { "from": 0, "to": 1 }
  ]
}
`
```

- 
odes - ordered array; indices correspond to edges.from/to.
- edges - directed connections between node indices (0-based).

### API Request Shape

```json
POST /api/chat
Content-Type: application/json

{
  "messages": [
    { "role": "system",    "content": "<SYSTEM_PROMPT>" },
    { "role": "user",      "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "model": "deepseek-chat",
  "stream": false,
  "temperature": 0.7,
  "max_tokens": 2048
}
```

Expected response (OpenAI-compatible):

```json
{
  "choices": [
    { "message": { "content": "..." } }
  ]
}
```

---

## Canvas Builder (uildWorkflowOnCanvas)

1. Checks for existing nodes on the canvas.
2. Prompts the user with a confirm() dialog if the canvas is not empty.
3. Clears the canvas (
odes: [], edges: [], selectedNode: null).
4. Loops through spec.nodes, calculates a cascade-diagonal position, and calls ddNode() with a 400 ms delay between each node.
5. Adds edges after all nodes are placed, using the 
odeIds array to map spec indices to React Flow node IDs.
6. Closes the chat window when done.

Node layout formula:

```
col = i % 3
row = Math.floor(i / 3)
x   = 250 + col * 300
y   = 80  + row * 150 + col * 40   // slight diagonal per column
```

---

## Markdown Renderer (enderContent)

A hand-rolled renderer that converts assistant messages to JSX without any third-party library:

| Syntax | Output |
|---|---|
| # Heading | <h3> |
| ## Heading | <h4> |
| ### Heading | <h5> |
| **bold** | <strong> |
| *italic* | <em> |
| ` code ` | <code class="md-inline-code"> |
|  `lang ... `  | <div class="md-code-block"> |
| - item / * item | <ul><li> |
| 1. item | <ol><li> |
| plain text | <p class="md-paragraph"> |
| json-workflow blocks | hidden (stripped before rendering) |

---

## CSS Classes

| Selector | Purpose |
|---|---|
| .chatbot-toggle | Floating action button (bottom-right) |
| .chatbot-window | Main chat panel |
| .chatbot-window.closing | Slide-out animation class |
| .chatbot-header | Top bar with avatar and close button |
| .chatbot-messages | Scrollable message list |
| .chat-welcome | Empty-state welcome screen |
| .suggestion-btn | Pre-written prompt chips |
| .chat-message.user | User message bubble |
| .chat-message.assistant | Assistant message bubble |
| .build-workflow-btn | "Build on Canvas" call-to-action button |
| .build-spinner | Loading spinner inside the build button |
| .typing-indicator | Three-dot typing animation |
| .chat-error | Error banner |
| .chatbot-input-area | Bottom input form |
| .chatbot-input | Auto-resize textarea |
| .chatbot-send | Submit button |

---

## Props

This component accepts no props. All state is internal or pulled from the global Zustand store (useFlowStore).

---

## Dependencies

| Package | Usage |
|---|---|
| eact | useState, useRef, useEffect, useCallback |
| eact-icons | UI icons (FaRobot, FaUser, FaTimes, FaPaperPlane, etc.) |
| ../store/flowStore | useFlowStore - read/write canvas nodes and edges |
| ./ChatBot.css | Component styles |

---

## Limitations

- The confirm() dialog for canvas clearing is a native browser dialog; it blocks the main thread and cannot be styled.
- Message history is not persisted across page reloads (state is in-memory only).
- The Markdown renderer does not support nested lists, tables, or blockquotes.
- The /api/chat endpoint is a Vercel serverless function and is only available when deployed to Vercel or when proxied via Vite's dev server.
