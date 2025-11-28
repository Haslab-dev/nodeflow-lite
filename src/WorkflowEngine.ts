import { EventEmitter } from "events";
import type {
  WorkflowMessage,
  NodeConfig,
  WorkflowDefinition,
  NodeExecutionContext,
  NodeExecutor
} from "./types/index.ts";
import { registerBuiltInNodes } from "./nodes/built-in-nodes.ts";

export class WorkflowEngine extends EventEmitter {
  private nodeTypes: Map<string, NodeExecutor> = new Map();
  private workflows: Map<string, WorkflowDefinition> = new Map();

  constructor() {
    super();
    this.registerBuiltInNodes();
  }

  // Register a custom node type
  registerNodeType(type: string, executor: NodeExecutor) {
    this.nodeTypes.set(type, executor);
    this.log(`Registered node type: ${type}`);
  }

  // Load workflow definition
  loadWorkflow(workflow: WorkflowDefinition) {
    this.workflows.set(workflow.id, workflow);
    this.log(`Loaded workflow: ${workflow.name} (${workflow.nodes.length} nodes)`);
  }

  // Execute a workflow
  async executeWorkflow(workflowId: string, initialData?: any) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    this.log(`\n========================================`);
    this.log(`Executing workflow: ${workflow.name}`);
    this.log(`========================================\n`);

    // Build node map for this workflow
    const nodeMap = new Map<string, NodeConfig>();
    workflow.nodes.forEach(node => nodeMap.set(node.id, node));

    // Find trigger/input nodes (nodes that start workflows)
    const inputNodeTypes = ['trigger', 'inject', 'http-in', 'mqtt-in'];
    const triggerNodes = workflow.nodes.filter(
      node => inputNodeTypes.includes(node.type)
    );

    if (triggerNodes.length === 0) {
      // If no explicit triggers, find nodes with no incoming connections
      const targetIds = new Set(workflow.nodes.flatMap(n => n.wires.flat()));
      const rootNodes = workflow.nodes.filter(n => !targetIds.has(n.id));
      if (rootNodes.length > 0) {
        triggerNodes.push(...rootNodes);
      } else {
        throw new Error('No trigger nodes found in workflow');
      }
    }

    // Execute each trigger and wait for completion
    for (const trigger of triggerNodes) {
      const msg: WorkflowMessage = {
        payload: initialData || { timestamp: Date.now() },
        metadata: { workflowId, triggerId: trigger.id }
      };
      
      await this.executeNode(trigger, msg, nodeMap);
    }

    this.log(`\n✅ Workflow execution completed\n`);
  }

  // Execute a specific node by ID (for inject triggers)
  async executeNodeById(workflowId: string, nodeId: string, initialData?: any) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const nodeMap = new Map<string, NodeConfig>();
    workflow.nodes.forEach(node => nodeMap.set(node.id, node));

    const node = nodeMap.get(nodeId);
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    const msg: WorkflowMessage = {
      payload: initialData || node.config.payload || { timestamp: Date.now() },
      metadata: { workflowId, nodeId }
    };

    await this.executeNode(node, msg, nodeMap);
  }

  // Execute a single node
  private async executeNode(node: NodeConfig, msg: WorkflowMessage, nodeMap: Map<string, NodeConfig>) {
    const executor = this.nodeTypes.get(node.type);
    if (!executor) {
      this.error(`Unknown node type: ${node.type}`);
      return;
    }

    this.log(`▶️  Executing: ${node.name} [${node.type}]`);

    // Collect all send promises to await them
    const sendPromises: Promise<void>[] = [];

    const context: NodeExecutionContext = {
      node,
      send: (outMsg, output = 0) => {
        const promise = this.sendMessage(node, outMsg, output, nodeMap);
        sendPromises.push(promise);
      },
      log: (logMsg) => this.log(`   ${logMsg}`),
      error: (errMsg, err) => this.error(`   ❌ ${errMsg}`, err)
    };

    try {
      await executor(msg, context);
      // Wait for all downstream nodes to complete
      await Promise.all(sendPromises);
    } catch (error) {
      context.error('Node execution failed', error as Error);
    }
  }

  // Send message to connected nodes
  private async sendMessage(
    fromNode: NodeConfig,
    msg: WorkflowMessage,
    outputIndex: number = 0,
    nodeMap: Map<string, NodeConfig>
  ) {
    const wires = fromNode.wires[outputIndex] || [];
    
    const promises: Promise<void>[] = [];
    
    for (const targetNodeId of wires) {
      const targetNode = nodeMap.get(targetNodeId);
      if (targetNode) {
        promises.push(this.executeNode(targetNode, { ...msg }, nodeMap));
      }
    }
    
    await Promise.all(promises);
  }

  // Register built-in node types
  private registerBuiltInNodes() {
    registerBuiltInNodes(this);
  }

  // Logging
  private log(message: string) {
    console.log(message);
    this.emit('log', message);
  }

  private error(message: string, error?: Error) {
    console.error(message, error);
    this.emit('error', message, error);
  }
}