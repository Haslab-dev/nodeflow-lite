// =========================
// Hyperflow Nodes - DAG-based workflow execution
// Based on Hyperflow v3 reference
// =========================

import type { WorkflowMessage, NodeExecutionContext, NodeExecutor } from "../types/index.ts";

// --- Reactive signal holder ---
class Signal<T = any> {
  private _value: T;
  
  constructor(value: T) {
    this._value = value;
  }
  
  get value(): T {
    return this._value;
  }
  
  set value(v: T) {
    this._value = v;
  }
}

// --- DAG Node definition ---
interface DagNode {
  id: string;
  deps: string[];
  run: (ctx: HyperflowContext, helpers: HyperflowHelpers) => Promise<void>;
}

// --- Hyperflow context and helpers ---
interface HyperflowContext {
  [key: string]: Signal;
}

interface HyperflowHelpers {
  callTool: (name: string, input: any) => Promise<any>;
  aiChat: (prompt: string) => Promise<string>;
}

// --- DAG executor (parallel with deps) ---
async function runDag(nodes: DagNode[], ctx: HyperflowContext, helpers: HyperflowHelpers): Promise<void> {
  const byId = new Map<string, DagNode>();
  const indegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const n of nodes) {
    byId.set(n.id, n);
    indegree.set(n.id, n.deps.length);
    for (const d of n.deps) {
      if (!adj.has(d)) adj.set(d, []);
      adj.get(d)!.push(n.id);
    }
  }

  let ready = nodes.filter(n => n.deps.length === 0).map(n => n.id);
  const visited = new Set<string>();

  while (ready.length > 0) {
    const batch = ready;
    ready = [];

    await Promise.all(
      batch.map(async id => {
        const node = byId.get(id)!;
        visited.add(id);

        await node.run(ctx, helpers);

        const neighbors = adj.get(id) || [];
        for (const nb of neighbors) {
          const prev = indegree.get(nb)!;
          const next = prev - 1;
          indegree.set(nb, next);
          if (next === 0) ready.push(nb);
        }
      })
    );
  }

  if (visited.size !== nodes.length) {
    throw new Error("DAG cycle or unresolved dependency");
  }
}

// --- Step definition ---
interface HyperflowStep {
  name: string;
  fn: (ctx: HyperflowContext, helpers: HyperflowHelpers) => Promise<void>;
}

// --- Hyperflow builder ---
export interface HyperflowBuilder {
  state(key: string, value: any): HyperflowBuilder;
  tool(name: string, fn: (input: any, ctx: HyperflowContext) => any): HyperflowBuilder;
  useAI(client: { chat: (prompt: string) => Promise<string> }): HyperflowBuilder;
  step(name: string, fn: (ctx: HyperflowContext, helpers: HyperflowHelpers) => Promise<void>): HyperflowBuilder;
  ai(name: string, promptFn: (ctx: HyperflowContext) => string): HyperflowBuilder;
  dag(name: string, build: (builder: DagBuilder) => void): HyperflowBuilder;
  run(): Promise<Record<string, any>>;
}

interface DagBuilder {
  node(id: string, fn: (ctx: HyperflowContext, helpers: HyperflowHelpers) => Promise<void>): void;
  node(id: string, deps: string[], fn: (ctx: HyperflowContext, helpers: HyperflowHelpers) => Promise<void>): void;
}

// =========================
// Hyperflow Core Factory
// =========================
export function createHyperflow(initialAI?: { chat: (prompt: string) => Promise<string> }): HyperflowBuilder {
  const steps: HyperflowStep[] = [];
  const ctx: HyperflowContext = {};
  const tools: Record<string, (input: any, ctx: HyperflowContext) => any> = {};
  let ai = initialAI;

  const helpers: HyperflowHelpers = {
    async callTool(name: string, input: any) {
      const t = tools[name];
      if (!t) throw new Error(`Tool "${name}" not registered`);
      return await Promise.resolve(t(input, ctx));
    },
    async aiChat(prompt: string) {
      if (!ai) throw new Error("AI not configured");
      return ai.chat(prompt);
    }
  };

  const flow: HyperflowBuilder = {
    // state signals
    state(key: string, value: any) {
      ctx[key] = new Signal(value);
      return flow;
    },

    // register tools
    tool(name: string, fn: (input: any, ctx: HyperflowContext) => any) {
      tools[name] = fn;
      return flow;
    },

    // configure AI
    useAI(client: { chat: (prompt: string) => Promise<string> }) {
      ai = client;
      return flow;
    },

    // linear step
    step(name: string, fn: (ctx: HyperflowContext, helpers: HyperflowHelpers) => Promise<void>) {
      steps.push({ name, fn });
      return flow;
    },

    // AI step
    ai(name: string, promptFn: (ctx: HyperflowContext) => string) {
      steps.push({
        name,
        async fn(ctx: HyperflowContext, helpers: HyperflowHelpers) {
          const prompt = promptFn(ctx);
          const result = await helpers.aiChat(prompt);
          ctx[name] = new Signal(result);
        }
      });
      return flow;
    },

    // DAG step
    dag(name: string, build: (builder: DagBuilder) => void) {
      const nodes: DagNode[] = [];
      const builder: DagBuilder = {
        node(id: string, depsOrFn: string[] | ((ctx: HyperflowContext, helpers: HyperflowHelpers) => Promise<void>), maybeFn?: (ctx: HyperflowContext, helpers: HyperflowHelpers) => Promise<void>) {
          let deps: string[] = [];
          let fn: (ctx: HyperflowContext, helpers: HyperflowHelpers) => Promise<void>;

          if (Array.isArray(depsOrFn)) {
            deps = depsOrFn;
            fn = maybeFn!;
          } else {
            fn = depsOrFn;
          }

          nodes.push({ id, deps, run: fn });
        }
      };

      build(builder);

      steps.push({
        name,
        async fn(ctx: HyperflowContext, helpers: HyperflowHelpers) {
          await runDag(nodes, ctx, helpers);
        }
      });

      return flow;
    },

    // run the workflow
    async run() {
      for (const s of steps) {
        await s.fn(ctx, helpers);
      }

      // unwrap signals
      return Object.fromEntries(
        Object.entries(ctx).map(([k, v]) => [k, v.value])
      );
    }
  };

  return flow;
}

// =========================
// Node Executor Registration
// =========================
export function registerHyperflowNodes(engine: { 
  registerNodeType: (type: string, executor: NodeExecutor) => void;
  emit: (event: string, ...args: any[]) => boolean;
}) {
  
  // HYPERFLOW NODE - Execute a Hyperflow pipeline
  engine.registerNodeType('hyperflow', async (msg: WorkflowMessage, ctx: NodeExecutionContext) => {
    const { 
      code = '',
      aiConfig = null
    } = ctx.node.config;

    ctx.log(`🔄 Hyperflow: Starting pipeline execution`);

    try {
      // Create AI client if configured
      let aiClient: { chat: (prompt: string) => Promise<string> } | undefined;
      
      if (aiConfig?.apiKey) {
        const { createOpenAICompatible } = await import('@ai-sdk/openai-compatible');
        const { generateText } = await import('ai');
        
        const provider = createOpenAICompatible({
          name: aiConfig.name || 'hyperflow-ai',
          apiKey: aiConfig.apiKey,
          baseURL: aiConfig.baseUrl,
        });
        
        aiClient = {
          async chat(prompt: string) {
            const result = await generateText({
              model: provider(aiConfig.model || 'gpt-3.5-turbo'),
              prompt,
            });
            return result.text;
          }
        };
      }

      // Create hyperflow instance with input payload
      const hyper = createHyperflow(aiClient);
      
      // Set initial state from input message
      hyper.state('input', msg.payload);
      hyper.state('metadata', msg.metadata || {});

      // Execute user-defined pipeline code
      const pipelineFunc = new Function(
        'hyper', 
        'Signal', 
        'input',
        `
        ${code}
        return hyper;
        `
      );
      
      const configuredHyper = pipelineFunc(hyper, Signal, msg.payload);
      
      // Run the pipeline
      const result = await configuredHyper.run();
      
      ctx.log(`✓ Hyperflow: Pipeline completed`);
      ctx.log(`   Output keys: ${Object.keys(result).join(', ')}`);
      
      ctx.send({
        payload: result,
        metadata: { ...msg.metadata, hyperflow: true }
      });
      
    } catch (error) {
      ctx.error('Hyperflow execution failed', error as Error);
      ctx.send({ ...msg, error: (error as Error).message });
    }
  });

  // HYPERFLOW-STEP NODE - Single step in a Hyperflow pipeline
  engine.registerNodeType('hyperflow-step', async (msg: WorkflowMessage, ctx: NodeExecutionContext) => {
    const { 
      stepName = 'step',
      code = 'return msg;'
    } = ctx.node.config;

    ctx.log(`🔹 Hyperflow Step: ${stepName}`);

    try {
      const func = new Function('msg', 'Signal', code);
      const result = await func(msg, Signal);
      
      ctx.log(`   ✓ Step completed`);
      ctx.send(result || msg);
      
    } catch (error) {
      ctx.error(`Step "${stepName}" failed`, error as Error);
      ctx.send({ ...msg, error: (error as Error).message });
    }
  });

  // HYPERFLOW-DAG NODE - Execute parallel DAG nodes
  engine.registerNodeType('hyperflow-dag', async (msg: WorkflowMessage, ctx: NodeExecutionContext) => {
    const { 
      dagName = 'dag',
      nodes = '[]' // JSON array of { id, deps, code }
    } = ctx.node.config;

    ctx.log(`🔀 Hyperflow DAG: ${dagName}`);

    try {
      // Parse node definitions
      let nodeConfigs: Array<{ id: string; deps: string[]; code: string }>;
      try {
        nodeConfigs = JSON.parse(nodes);
      } catch {
        ctx.error('Invalid DAG nodes JSON');
        return;
      }

      // Build context from input
      const hyperCtx: HyperflowContext = {
        input: new Signal(msg.payload),
        metadata: new Signal(msg.metadata || {})
      };

      const helpers: HyperflowHelpers = {
        async callTool() { throw new Error('Tools not available in DAG node'); },
        async aiChat() { throw new Error('AI not available in DAG node'); }
      };

      // Convert to DAG nodes
      const dagNodes: DagNode[] = nodeConfigs.map(nc => ({
        id: nc.id,
        deps: nc.deps || [],
        run: async (ctx: HyperflowContext) => {
          const func = new Function('ctx', 'Signal', nc.code);
          await func(ctx, Signal);
        }
      }));

      ctx.log(`   Executing ${dagNodes.length} nodes in parallel where possible`);
      
      await runDag(dagNodes, hyperCtx, helpers);

      // Unwrap signals for output
      const result = Object.fromEntries(
        Object.entries(hyperCtx).map(([k, v]) => [k, v.value])
      );

      ctx.log(`   ✓ DAG completed`);
      ctx.send({
        payload: result,
        metadata: { ...msg.metadata, dag: dagName }
      });

    } catch (error) {
      ctx.error(`DAG "${dagName}" failed`, error as Error);
      ctx.send({ ...msg, error: (error as Error).message });
    }
  });

  // HYPERFLOW-TOOL NODE - Register and call tools
  engine.registerNodeType('hyperflow-tool', async (msg: WorkflowMessage, ctx: NodeExecutionContext) => {
    const { 
      toolName = 'tool',
      toolCode = 'return input;',
      inputPath = 'payload'
    } = ctx.node.config;

    ctx.log(`🔧 Hyperflow Tool: ${toolName}`);

    try {
      // Get input from message path
      const keys = inputPath.split('.');
      let input: any = msg;
      for (const key of keys) {
        input = input?.[key];
      }

      // Execute tool
      const func = new Function('input', 'msg', toolCode);
      const result = await Promise.resolve(func(input, msg));

      ctx.log(`   ✓ Tool executed`);
      ctx.send({
        payload: { ...msg.payload, [toolName]: result },
        metadata: msg.metadata
      });

    } catch (error) {
      ctx.error(`Tool "${toolName}" failed`, error as Error);
      ctx.send({ ...msg, error: (error as Error).message });
    }
  });
}

// Export Signal class for external use
export { Signal };
