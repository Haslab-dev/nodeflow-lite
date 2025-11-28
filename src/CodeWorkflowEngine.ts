import { EventEmitter } from "events";
import type { Step, CodeWorkflow, Ctx } from "./types/index.ts";

export class CodeWorkflowEngine extends EventEmitter {
  private activeWorkflows: Map<string, CodeWorkflow> = new Map();
  private runningWorkflows: Map<string, boolean> = new Map();

  // Register a code workflow
  registerWorkflow(workflow: CodeWorkflow) {
    this.activeWorkflows.set(workflow.id, workflow);
    this.log(`Registered code workflow: ${workflow.name}`);
    
    // Auto-start if workflow has triggers and autoStart is enabled
    if (workflow.autoStart !== false && workflow.triggers.length > 0) {
      this.setupTriggers(workflow);
    }
  }

  // Execute a code workflow
  async executeWorkflow(workflowId: string, initial: Ctx = {}): Promise<Ctx> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Code workflow not found: ${workflowId}`);
    }

    if (this.runningWorkflows.get(workflowId)) {
      throw new Error(`Workflow ${workflowId} is already running`);
    }

    this.runningWorkflows.set(workflowId, true);

    try {
      this.log(`\n=== Running Code Workflow: ${workflow.name} ===`);
      let ctx = { ...initial };

      for (const step of workflow.steps) {
        try {
          ctx = await this.runStep(step, ctx);
        } catch (err) {
          this.error(`❌ Error in step ${step.id}:`, err as Error);
          ctx.error = err;
          break;
        }
      }

      this.log(`=== Completed Code Workflow: ${workflow.name} ===\n`);
      this.emit('workflowCompleted', workflowId, ctx);
      return ctx;
    } finally {
      this.runningWorkflows.set(workflowId, false);
    }
  }

  // Execute a single step
  private async runStep(step: Step, ctx: Ctx): Promise<Ctx> {
    this.log(`   → Step: ${step.id} (${step.type})`);

    switch (step.type) {
      case "task": {
        const result = (await step.run(ctx)) || ctx;
        // Log any new keys added to context
        const newKeys = Object.keys(result).filter(k => !(k in ctx) || result[k] !== ctx[k]);
        if (newKeys.length > 0) {
          const changes: Record<string, any> = {};
          newKeys.forEach(k => {
            const val = result[k];
            // Format values for display without double-stringifying
            if (typeof val === 'object' && val !== null) {
              const str = JSON.stringify(val);
              changes[k] = str.length > 80 ? str.substring(0, 80) + '...' : val;
            } else {
              changes[k] = val;
            }
          });
          // Pretty print the output
          const outputStr = Object.entries(changes)
            .map(([key, val]) => `${key}: ${typeof val === 'object' ? JSON.stringify(val) : val}`)
            .join(', ');
          this.log(`      📋 ${outputStr}`);
        }
        return result;
      }

      case "parallel": {
        this.log(`      ⚡ Running ${step.steps.length} steps in parallel`);
        const results = await Promise.all(step.steps.map(s => this.runStep(s, ctx)));
        // merge contexts
        return Object.assign(ctx, ...results);
      }

      case "condition": {
        const conditionResult = step.when(ctx);
        this.log(`      🔀 Condition: ${conditionResult ? 'TRUE → then branch' : 'FALSE → else branch'}`);
        const branch = conditionResult ? step.then : step.else ?? [];
        for (const s of branch) ctx = await this.runStep(s, ctx);
        return ctx;
      }

      default:
        return ctx;
    }
  }

  // Setup triggers for auto-start workflows
  private setupTriggers(workflow: CodeWorkflow) {
    for (const trigger of workflow.triggers) {
      switch (trigger) {
        case 'http-in':
          this.setupHttpTrigger(workflow);
          break;
        case 'webhook':
          this.setupWebhookTrigger(workflow);
          break;
        case 'mqtt':
          this.setupMqttTrigger(workflow);
          break;
      }
    }
  }

  // Setup HTTP trigger
  private setupHttpTrigger(workflow: CodeWorkflow) {
    // This will be handled by the server when it registers the workflow
    this.emit('httpTrigger', workflow);
  }

  // Setup webhook trigger
  private setupWebhookTrigger(workflow: CodeWorkflow) {
    // This will be handled by the server when it registers the workflow
    this.emit('webhookTrigger', workflow);
  }

  // Setup MQTT trigger
  private setupMqttTrigger(workflow: CodeWorkflow) {
    // This will be handled by the server when it registers the workflow
    this.emit('mqttTrigger', workflow);
  }

  // Get all registered workflows
  getWorkflows(): CodeWorkflow[] {
    return Array.from(this.activeWorkflows.values());
  }

  // Get workflow by ID
  getWorkflow(id: string): CodeWorkflow | undefined {
    return this.activeWorkflows.get(id);
  }

  // Remove workflow
  removeWorkflow(id: string) {
    this.activeWorkflows.delete(id);
    this.runningWorkflows.delete(id);
    this.log(`Removed code workflow: ${id}`);
  }

  // Check if workflow is running
  isRunning(id: string): boolean {
    return this.runningWorkflows.get(id) || false;
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

// Helper to convert steps object to array
export function stepsToArray(steps: Record<string, Step>): Step[] {
  return Object.values(steps);
}

// Built-in step functions for common operations
export const StepFunctions = {
  // HTTP request step
  httpRequest: (url: string, options: RequestInit = {}) => 
    async (ctx: Ctx): Promise<Ctx> => {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      const data = await response.json();
      return { ...ctx, httpResponse: { status: response.status, data } };
    },

  // MQTT publish step
  mqttPublish: (topic: string, payload: any, mqttService: any) =>
    async (ctx: Ctx): Promise<Ctx> => {
      if (mqttService && mqttService.publish) {
        mqttService.publish(topic, payload);
      }
      return { ...ctx, mqttPublished: { topic, payload } };
    },

  // Database query step
  dbQuery: (query: string, params: any[] = [], db: any) =>
    async (ctx: Ctx): Promise<Ctx> => {
      if (db && db.query) {
        const result = db.query(query).all(...params);
        return { ...ctx, dbResult: result };
      }
      return ctx;
    },

  // Transform data step
  transform: (transformFn: (data: any) => any) =>
    async (ctx: Ctx): Promise<Ctx> => {
      return { ...ctx, transformed: transformFn(ctx) };
    },

  // Log step
  log: (message: string) =>
    async (ctx: Ctx): Promise<Ctx> => {
      console.log(`[Workflow] ${message}`, ctx);
      return ctx;
    },

  // Delay step
  delay: (ms: number) =>
    async (ctx: Ctx): Promise<Ctx> => {
      await new Promise(resolve => setTimeout(resolve, ms));
      return ctx;
    },

  // Condition step helper
  condition: (when: (ctx: Ctx) => boolean, then: Step[], elseSteps?: Step[]): Step => ({
    id: `condition_${Date.now()}`,
    type: "condition",
    when,
    then,
    else: elseSteps
  }),

  // Parallel step helper
  parallel: (steps: Step[]): Step => ({
    id: `parallel_${Date.now()}`,
    type: "parallel",
    steps
  }),

  // Task step helper
  task: (id: string, run: (ctx: Ctx) => Promise<Ctx> | Ctx): Step => ({
    id,
    type: "task",
    run
  })
};