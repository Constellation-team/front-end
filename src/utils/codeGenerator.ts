import type { Node, Edge } from 'reactflow';

interface FlowData {
    nodes: Node[];
    edges: Edge[];
}

interface GeneratedFiles {
    'main.ts': string;
    'workflow.yaml': string;
    'config.staging.json': string;
    'config.production.json': string;
}

/**
 * Generates CRE workflow code from visual flow nodes and edges
 */
export function generateCRECode(flowData: FlowData): GeneratedFiles {
    const { nodes, edges } = flowData;

    // Find trigger node (should be category 'trigger')
    const triggerNode = nodes.find(n => n.data.category === 'trigger');
    
    // Generate main.ts content
    const mainTs = generateMainTs(nodes, edges, triggerNode);
    
    // Generate workflow.yaml
    const workflowYaml = generateWorkflowYaml();
    
    // Generate config files
    const configStaging = generateConfig('staging');
    const configProduction = generateConfig('production');

    return {
        'main.ts': mainTs,
        'workflow.yaml': workflowYaml,
        'config.staging.json': configStaging,
        'config.production.json': configProduction,
    };
}

function generateMainTs(nodes: Node[], edges: Edge[], triggerNode?: Node): string {
    // Get trigger type
    const triggerType = triggerNode?.data.label || 'Cron Trigger';
    const isCronTrigger = triggerType.toLowerCase().includes('cron');
    const isWebhook = triggerType.toLowerCase().includes('webhook');

    // Build handler logic based on connected nodes
    const handlerCode = generateHandlerLogic(nodes, edges, triggerNode);

    if (isCronTrigger) {
        return `import { CronCapability, handler, Runner, type Runtime } from "@chainlink/cre-sdk";

/**
 * CREator Generated Workflow
 * Generated from visual flow with ${nodes.length} nodes and ${edges.length} connections
 */

type Config = {
  schedule: string;
};

const onCronTrigger = async (runtime: Runtime<Config>): Promise<string> => {
  runtime.log("Workflow triggered.");
  
${handlerCode}
  
  return "Workflow completed successfully!";
};

const initWorkflow = (config: Config) => {
  const cron = new CronCapability();

  return [
    handler(
      cron.trigger({ schedule: config.schedule }), 
      onCronTrigger
    ),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
`;
    }

    if (isWebhook) {
        // Note: HttpCapability is not available in current CRE SDK version
        // Falling back to CronCapability for now
        return `import { CronCapability, handler, Runner, type Runtime } from "@chainlink/cre-sdk";

/**
 * CREator Generated Workflow
 * Generated from visual flow with ${nodes.length} nodes and ${edges.length} connections
 * 
 * NOTE: Webhook trigger (HttpCapability) is not yet available in CRE SDK.
 * This workflow uses CronCapability instead. You can adjust the schedule in config files.
 */

type Config = {
  schedule: string;
};

const onCronTrigger = async (runtime: Runtime<Config>): Promise<string> => {
  runtime.log("Workflow triggered (Webhook requested but using Cron for now).");
  
${handlerCode}
  
  return "Workflow completed successfully!";
};

const initWorkflow = (config: Config) => {
  const cron = new CronCapability();

  return [
    handler(
      cron.trigger({ schedule: config.schedule }), 
      onCronTrigger
    ),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
`;
    }

    // Default to cron if no trigger specified
    return `import { CronCapability, handler, Runner, type Runtime } from "@chainlink/cre-sdk";

/**
 * CREator Generated Workflow
 * Generated from visual flow with ${nodes.length} nodes and ${edges.length} connections
 */

type Config = {
  schedule: string;
};

const onCronTrigger = async (runtime: Runtime<Config>): Promise<string> => {
  runtime.log("Workflow triggered.");
  
${handlerCode}
  
  return "Workflow completed!";
};

const initWorkflow = (config: Config) => {
  const cron = new CronCapability();

  return [
    handler(
      cron.trigger({ schedule: config.schedule }), 
      onCronTrigger
    ),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
`;
}

function generateHandlerLogic(nodes: Node[], edges: Edge[], triggerNode?: Node): string {
    let code = '';
    
    // If no trigger, process all nodes
    const processNodes = triggerNode 
        ? getConnectedNodesInOrder(triggerNode.id, edges, nodes)
        : nodes.filter(n => n.data.category !== 'trigger');

    processNodes.forEach((node, index) => {
        const nodeCode = generateNodeCode(node, index);
        if (nodeCode) {
            code += nodeCode + '\n';
        }
    });

    // If no nodes to process, add placeholder
    if (code.trim() === '') {
        code = '  // Add your workflow logic here\n  runtime.log("Processing workflow...");';
    }

    return code;
}

function getConnectedNodesInOrder(startNodeId: string, edges: Edge[], nodes: Node[]): Node[] {
    const visited = new Set<string>();
    const result: Node[] = [];
    
    function traverse(nodeId: string) {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);
        
        const outgoingEdges = edges.filter(e => e.source === nodeId);
        outgoingEdges.forEach(edge => {
            const targetNode = nodes.find(n => n.id === edge.target);
            if (targetNode && targetNode.data.category !== 'trigger') {
                result.push(targetNode);
                traverse(edge.target);
            }
        });
    }
    
    traverse(startNodeId);
    return result;
}

function generateNodeCode(node: Node, index: number): string {
    const category = node.data.category;
    const label = node.data.label;
    const stepNum = index + 1;

    switch (category) {
        case 'datasource':
            if (label.toLowerCase().includes('http')) {
                return `  // Step ${stepNum}: HTTP Data Source
  // Note: CRE doesn't support fetch() directly. Use Chainlink Functions for HTTP requests.
  // Example with Chainlink Functions:
  // const response${stepNum} = await runtime.runFunction({
  //   source: "const response = await Functions.makeHttpRequest({ url: 'https://api.example.com/data' }); return response.data;",
  //   args: []
  // });
  
  // Simulated data for testing:
  const data${stepNum} = { example: "simulated data", timestamp: Date.now() };
  runtime.log("HTTP Data Source (simulated): " + JSON.stringify(data${stepNum}));`;
            }
            if (label.toLowerCase().includes('database')) {
                return `  // Step ${stepNum}: Database Query
  // const dbData${stepNum} = await queryDatabase("SELECT * FROM table");
  runtime.log("Database query executed");`;
            }
            return `  // Step ${stepNum}: Data Source - ${label}
  runtime.log("Fetching data from ${label}...");`;

        case 'chainlink':
            if (label.toLowerCase().includes('oracle')) {
                return `  // Step ${stepNum}: Chainlink Data Feed
  // Example: ETH/USD price feed
  // const price${stepNum} = await getChainlinkPrice("ETH/USD");
  runtime.log("Chainlink Oracle data retrieved");`;
            }
            if (label.toLowerCase().includes('ccip')) {
                return `  // Step ${stepNum}: CCIP Cross-Chain Message
  // const ccipMessage${stepNum} = await sendCCIPMessage({
  //   destinationChain: "avalanche",
  //   message: "Hello from Ethereum!"
  // });
  runtime.log("CCIP message prepared");`;
            }
            if (label.toLowerCase().includes('function')) {
                return `  // Step ${stepNum}: Chainlink Functions
  // const functionsResult${stepNum} = await executeChainlinkFunction({
  //   source: "return 'Hello from Chainlink Functions!'",
  //   args: []
  // });
  runtime.log("Chainlink Functions executed");`;
            }
            if (label.toLowerCase().includes('stream')) {
                return `  // Step ${stepNum}: Chainlink Data Streams
  // const streamData${stepNum} = await getDataStream("ETH/USD");
  runtime.log("Data Streams data retrieved");`;
            }
            return `  // Step ${stepNum}: Chainlink ${label}
  runtime.log("Chainlink operation: ${label}");`;

        case 'blockchain':
            if (label.toLowerCase().includes('call')) {
                return `  // Step ${stepNum}: Contract Call
  // const contractResult${stepNum} = await contract.method();
  runtime.log("Smart contract called");`;
            }
            if (label.toLowerCase().includes('event')) {
                return `  // Step ${stepNum}: Event Listener
  // Listen for blockchain events
  runtime.log("Monitoring blockchain events...");`;
            }
            return `  // Step ${stepNum}: Blockchain ${label}
  runtime.log("Blockchain interaction: ${label}");`;

        case 'logic':
            if (label.toLowerCase().includes('if')) {
                return `  // Step ${stepNum}: Conditional Logic
  if (true /* Add your condition here */) {
    runtime.log("Condition met, proceeding...");
  } else {
    runtime.log("Condition not met");
  }`;
            }
            if (label.toLowerCase().includes('transform')) {
                return `  // Step ${stepNum}: Data Transform
  // const transformed${stepNum} = data.map(item => ({ ...item, processed: true }));
  runtime.log("Data transformed");`;
            }
            if (label.toLowerCase().includes('merge')) {
                return `  // Step ${stepNum}: Merge Data
  // const merged${stepNum} = { ...data1, ...data2 };
  runtime.log("Data merged");`;
            }
            return `  // Step ${stepNum}: Logic ${label}
  runtime.log("Processing logic: ${label}");`;

        case 'ai':
            if (label.toLowerCase().includes('llm')) {
                return `  // Step ${stepNum}: LLM Processing
  // const llmResponse${stepNum} = await callLLM("Analyze this data: " + JSON.stringify(data));
  runtime.log("LLM processing completed");`;
            }
            return `  // Step ${stepNum}: AI ${label}
  runtime.log("AI processing: ${label}");`;

        default:
            return `  // Step ${stepNum}: ${label}
  runtime.log("Executing ${label}...");`;
    }
}

function generateWorkflowYaml(): string {
    return `# CRE Workflow Settings File
# Generated by CREator

staging-settings:
  user-workflow:
    workflow-name: "creator-workflow-staging"
  workflow-artifacts:
    workflow-path: "./main.ts"
    config-path: "./config.staging.json"
    secrets-path: ""

production-settings:
  user-workflow:
    workflow-name: "creator-workflow-production"
  workflow-artifacts:
    workflow-path: "./main.ts"
    config-path: "./config.production.json"
    secrets-path: ""
`;
}

function generateConfig(environment: 'staging' | 'production'): string {
    const schedule = environment === 'staging' ? '*/30 * * * * *' : '*/5 * * * *';
    return JSON.stringify({
        schedule: schedule
    }, null, 2);
}

/**
 * Writes generated files to the cre-orchestrator directory
 */
export async function writeFilesToCREOrchestrator(files: GeneratedFiles): Promise<void> {
    // This will be called from the backend API or handled by the component
    // For now, we'll prepare the files and the component will handle writing
    console.log('Files ready to write:', Object.keys(files));
}
