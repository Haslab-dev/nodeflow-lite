import index from "./ui/index.html";
import { WorkflowEngine } from "./WorkflowEngine.ts";
import { CodeWorkflowEngine } from "./CodeWorkflowEngine.ts";
import { HttpInService, registerRuntimeNodes, clearRuntimeSubscriptions } from "./nodes/runtime-nodes.ts";
import { MqttBroker } from "./nodes/mqtt-broker.ts";
import { authService } from "./auth/index.ts";
import { db } from "./database/index.ts";
import { programmaticWorkflowExamples } from "./workflows/programmatic-examples.ts";
import type { WorkflowDefinition, NodeConfig, ProgrammaticWorkflow } from "./types/index.ts";

const httpInService = new HttpInService(3001);
const mqttBroker = new MqttBroker(1883);
const engine = new WorkflowEngine();
const codeEngine = new CodeWorkflowEngine();

const mqttServiceAdapter = {
  subscribe: (topic: string, handler: any) => mqttBroker.subscribe(topic, handler),
  unsubscribe: (topic: string, handler: any) => mqttBroker.unsubscribe(topic, handler),
  publish: (topic: string, payload: any) => mqttBroker.publish(topic, payload),
  start: () => mqttBroker.start(),
  stop: () => mqttBroker.stop(),
  isRunning: () => mqttBroker.isRunning()
};

registerRuntimeNodes(engine, httpInService, mqttServiceAdapter as any);

// Initialize authentication and default admin user
await authService.initializeDefaultAdmin();

// Load all programmatic workflows from database
const programmaticWorkflows = await db.getAllWorkflows();
for (const workflow of programmaticWorkflows) {
  codeEngine.registerWorkflow(workflow.codeWorkflow);
}

// Register example code workflows (these have actual function implementations)
for (const example of programmaticWorkflowExamples) {
  codeEngine.registerWorkflow(example);
}
console.log(`✅ Registered ${programmaticWorkflowExamples.length} example code workflows`);

// Setup code workflow triggers
codeEngine.on('httpTrigger', (workflow) => {
  // Register HTTP endpoint for workflow
  httpInService.registerRoute(`/webhook/${workflow.id}`, 'POST', async (msg) => {
    const ctx = {
      httpRequest: {
        method: msg.metadata?.method,
        url: msg.metadata?.path,
        headers: msg.metadata?.headers,
        body: msg.payload
      }
    };
    await codeEngine.executeWorkflow(workflow.id, ctx);
  });
});

codeEngine.on('webhookTrigger', (workflow) => {
  // Register webhook endpoint for workflow
  httpInService.registerRoute(`/webhook/${workflow.id}`, 'POST', async (msg) => {
    const ctx = {
      webhook: {
        event: msg.metadata?.path?.split('/').pop(),
        data: msg.payload
      }
    };
    await codeEngine.executeWorkflow(workflow.id, ctx);
  });
});

codeEngine.on('mqttTrigger', (workflow) => {
  // Register MQTT subscription for workflow
  mqttBroker.subscribe(`workflow/${workflow.id}/#`, async (msg) => {
    const ctx = {
      mqtt: {
        topic: msg.metadata?.topic,
        payload: msg.payload
      }
    };
    await codeEngine.executeWorkflow(workflow.id, ctx);
  });
});

interface LogEntry {
  timestamp: string;
  message: string;
}

const infoLogs: LogEntry[] = [];    // Execution info logs
const debugLogs: LogEntry[] = [];   // Debug node output only
let pendingExecution: { nodeName: string; timestamp: string } | null = null;

const addInfoLog = (message: string) => {
  infoLogs.push({
    timestamp: new Date().toLocaleTimeString(),
    message
  });
};

// Track node execution with minimum display time
let nodeExecutionStartTime: number = 0;
const MIN_INDICATOR_DISPLAY_MS = 800; // Minimum time to show indicator (800ms)

// Track node execution start - set the executing node ID
engine.on('nodeStart', (nodeId: string, nodeName: string, nodeType: string) => {
  currentExecutingNodeId = nodeId;
  nodeExecutionStartTime = Date.now();
});

// Track node execution complete - clear the executing node ID with minimum display time
engine.on('nodeComplete', (nodeId: string, nodeName: string, nodeType: string) => {
  // Only clear if this is the currently executing node
  if (currentExecutingNodeId === nodeId) {
    const elapsed = Date.now() - nodeExecutionStartTime;
    const remainingTime = Math.max(0, MIN_INDICATOR_DISPLAY_MS - elapsed);
    
    // If node completed too fast, keep indicator visible for minimum time
    if (remainingTime > 0) {
      setTimeout(() => {
        if (currentExecutingNodeId === nodeId) {
          currentExecutingNodeId = null;
        }
      }, remainingTime);
    } else {
      currentExecutingNodeId = null;
    }
  }
});

engine.on('log', (msg: string) => {
  // Check if this is an execution start message
  const execMatch = msg.match(/^▶️\s+Executing:\s+(.+?)\s+\[(.+?)\]$/);
  if (execMatch && execMatch[1] && execMatch[2]) {
    const nodeName = execMatch[1];
    const nodeType = execMatch[2];
    
    // Only track debug nodes for combining output
    if (nodeType === 'debug') {
      pendingExecution = { nodeName, timestamp: new Date().toLocaleTimeString() };
      return; // Don't log this, wait for the output
    }
    // All other execution messages go to info
    addInfoLog(msg);
    return;
  }
  
  // Check if this is output from a debug node (starts with 📋)
  if (msg.trim().startsWith('📋') && pendingExecution) {
    const data = msg.replace(/^\s*📋\s*/, '').trim();
    const combined = `[${pendingExecution.nodeName}] ${data}`;
    debugLogs.push({
      timestamp: pendingExecution.timestamp,
      message: combined
    });
    pendingExecution = null;
    return;
  }
  
  // All other messages go to info logs
  addInfoLog(msg);
  pendingExecution = null; // Clear pending if we get something else
});

engine.on('error', (msg: string) => {
  addInfoLog(`❌ ${msg}`);
  pendingExecution = null;
});

// Code workflow logging
codeEngine.on('log', (msg: string) => {
  debugLogs.push({
    timestamp: new Date().toLocaleTimeString(),
    message: `[Code] ${msg}`
  });
});

codeEngine.on('error', (msg: string) => {
  debugLogs.push({
    timestamp: new Date().toLocaleTimeString(),
    message: `[Code] ❌ ${msg}`
  });
});

codeEngine.on('workflowCompleted', (workflowId: string, ctx: any) => {
  debugLogs.push({
    timestamp: new Date().toLocaleTimeString(),
    message: `[Code] ✅ Workflow completed: ${workflowId}`
  });
});

let deployedWorkflow: WorkflowDefinition | null = null;
let currentExecutingNodeId: string | null = null;

const apiHandlers = {
  // Authentication endpoints
  async login(username: string, password: string) {
    const result = await authService.login(username, password);
    if (!result) {
      return { success: false, error: 'Invalid credentials' };
    }
    return {
      success: true,
      user: { id: result.user.id, username: result.user.username, role: result.user.role },
      token: result.session.token
    };
  },

  async logout(token: string) {
    const success = await authService.logout(token);
    return { success };
  },

  async validateToken(token: string) {
    const user = await authService.validateToken(token);
    if (!user) {
      return { success: false, error: 'Invalid token' };
    }
    return {
      success: true,
      user: { id: user.id, username: user.username, role: user.role }
    };
  },

  // Programmatic workflow endpoints
  async createProgrammaticWorkflow(workflow: Omit<ProgrammaticWorkflow, 'id' | 'createdAt' | 'updatedAt'>) {
    const created = await db.createWorkflow(workflow);
    codeEngine.registerWorkflow(created.codeWorkflow);
    return { success: true, workflow: created };
  },

  async updateProgrammaticWorkflow(id: string, workflow: Partial<Omit<ProgrammaticWorkflow, 'id' | 'createdAt' | 'updatedAt'>>) {
    const updated = await db.updateWorkflow(id, workflow);
    if (!updated) {
      return { success: false, error: 'Workflow not found' };
    }
    // Re-register workflow with updated steps
    codeEngine.removeWorkflow(id);
    codeEngine.registerWorkflow(updated.codeWorkflow);
    return { success: true, workflow: updated };
  },

  async deleteProgrammaticWorkflow(id: string) {
    const success = await db.deleteWorkflow(id);
    if (success) {
      codeEngine.removeWorkflow(id);
    }
    return { success };
  },

  async getProgrammaticWorkflow(id: string) {
    const workflow = await db.getWorkflowById(id);
    if (!workflow) {
      return { success: false, error: 'Workflow not found' };
    }
    return { success: true, workflow };
  },

  async getAllProgrammaticWorkflows() {
    const workflows = await db.getAllWorkflows();
    return { success: true, workflows };
  },

  async executeProgrammaticWorkflow(id: string, initial: any = {}) {
    try {
      const result = await codeEngine.executeWorkflow(id, initial);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },

  // Deploy workflow - registers all listeners (http-in, mqtt-in)
  async deployWorkflow(workflow: WorkflowDefinition) {
    // Clear previous subscriptions
    clearRuntimeSubscriptions();
    
    // Load and register listeners
    engine.loadWorkflow(workflow);
    
    // Find and execute listener nodes only (http-in, mqtt-in)
    const listenerTypes = ['http-in', 'mqtt-in'];
    const listenerNodes = workflow.nodes.filter(n => listenerTypes.includes(n.type));
    
    // Auto-start services if needed
    const hasHttpNodes = workflow.nodes.some(n => n.type === 'http-in');
    const hasMqttNodes = workflow.nodes.some(n => ['mqtt-in', 'mqtt-out'].includes(n.type));
    
    if (hasHttpNodes && !httpInService.isRunning()) {
      await httpInService.start();
    }
    if (hasMqttNodes && !mqttBroker.isRunning()) {
      await mqttBroker.start();
    }
    
    const nodeMap = new Map<string, NodeConfig>();
    workflow.nodes.forEach(n => nodeMap.set(n.id, n));
    
    for (const node of listenerNodes) {
      await engine.executeNodeById(workflow.id, node.id);
    }
    
    deployedWorkflow = workflow;
    await new Promise(r => setTimeout(r, 50));
    return { success: true };
  },

  // Undeploy - clear all listeners
  async undeployWorkflow() {
    clearRuntimeSubscriptions();
    deployedWorkflow = null;
    return { success: true };
  },

  // Trigger a specific inject node
  async triggerInject(workflow: WorkflowDefinition, nodeId: string) {
    engine.loadWorkflow(workflow);
    await engine.executeNodeById(workflow.id, nodeId);
    await new Promise(r => setTimeout(r, 100));
    return { success: true };
  },

  // Legacy run - executes entire workflow
  async runWorkflow(workflow: WorkflowDefinition) {
    engine.loadWorkflow(workflow);
    await engine.executeWorkflow(workflow.id);
    await new Promise(r => setTimeout(r, 50));
    return { success: true };
  },

  getLogs() { return { infoLogs: [...infoLogs], debugLogs: [...debugLogs] }; },
  clearInfoLogs() { infoLogs.splice(0, infoLogs.length); return { success: true }; },
  clearDebugLogs() { debugLogs.splice(0, debugLogs.length); return { success: true }; },

  getStatus() {
    return {
      http: httpInService.isRunning(),
      mqtt: mqttBroker.isRunning(),
      mqttClients: mqttBroker.getClientCount(),
      deployed: deployedWorkflow !== null,
      executingNodeId: currentExecutingNodeId
    };
  },

  publishMqtt(topic: string, payload: any) {
    if (!mqttBroker.isRunning()) return { success: false, error: 'MQTT broker not running' };
    mqttBroker.publish(topic, payload);
    return { success: true };
  }
};

// Helper function to check authentication
async function checkAuth(req: Request): Promise<{ user?: any; response?: Response }> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { response: Response.json({ error: 'Authorization header required' }, { status: 401 }) };
  }

  const token = authHeader.substring(7);
  const user = await authService.validateToken(token);
  if (!user) {
    return { response: Response.json({ error: 'Invalid or expired token' }, { status: 401 }) };
  }

  return { user };
}

Bun.serve({
  port: 3000,
  routes: {
    "/": index,
    
    // Authentication routes
    "/api/auth/login": {
      POST: async (req: any) => {
        const { username, password } = await req.json();
        const result = await apiHandlers.login(username, password);
        return Response.json(result);
      }
    },
    
    "/api/auth/logout": {
      POST: async (req: any) => {
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return Response.json({ error: 'Authorization header required' }, { status: 401 });
        }
        const token = authHeader.substring(7);
        const result = await apiHandlers.logout(token);
        return Response.json(result);
      }
    },
    
    "/api/auth/validate": {
      GET: async (req: any) => {
        const authResult = await checkAuth(req);
        if (authResult.response) return authResult.response;
        
        const token = req.headers.get('authorization')?.substring(7);
        if (!token) return Response.json({ error: 'No token' }, { status: 401 });
        const result = await apiHandlers.validateToken(token);
        return Response.json(result);
      }
    },
    
    // Programmatic workflow routes
    "/api/workflows/code": {
      GET: async (req: any) => {
        const authResult = await checkAuth(req);
        if (authResult.response) return authResult.response;
        
        const result = await apiHandlers.getAllProgrammaticWorkflows();
        return Response.json(result);
      },
      
      POST: async (req: any) => {
        const authResult = await checkAuth(req);
        if (authResult.response) return authResult.response;
        
        const workflow = await req.json();
        const result = await apiHandlers.createProgrammaticWorkflow(workflow);
        return Response.json(result);
      }
    },
    
    "/api/workflows/code/:id": {
      GET: async (req: any) => {
        const authResult = await checkAuth(req);
        if (authResult.response) return authResult.response;

        const url = new URL(req.url);
        const id = url.pathname.split('/').pop();
        if (!id) return Response.json({ error: 'ID required' }, { status: 400 });
        const result = await apiHandlers.getProgrammaticWorkflow(id);
        return Response.json(result);
      },
      
      PUT: async (req: any) => {
        const authResult = await checkAuth(req);
        if (authResult.response) return authResult.response;

        const url = new URL(req.url);
        const id = url.pathname.split('/').pop();
        if (!id) return Response.json({ error: 'ID required' }, { status: 400 });
        const workflow = await req.json();
        const result = await apiHandlers.updateProgrammaticWorkflow(id, workflow);
        return Response.json(result);
      },
      
      DELETE: async (req: any) => {
        const authResult = await checkAuth(req);
        if (authResult.response) return authResult.response;

        const url = new URL(req.url);
        const id = url.pathname.split('/').pop();
        if (!id) return Response.json({ error: 'ID required' }, { status: 400 });
        const result = await apiHandlers.deleteProgrammaticWorkflow(id);
        return Response.json(result);
      }
    },
    
    "/api/workflows/code/:id/execute": {
      POST: async (req: any) => {
        const authResult = await checkAuth(req);
        if (authResult.response) return authResult.response;

        const url = new URL(req.url);
        const id = url.pathname.split('/').slice(-2, -1)[0];
        if (!id) return Response.json({ error: 'ID required' }, { status: 400 });
        const { initial } = await req.json();
        const result = await apiHandlers.executeProgrammaticWorkflow(id, initial);
        return Response.json(result);
      }
    },
    
    // Execute code workflow by ID (uses pre-registered workflows with actual functions)
    "/api/workflows/code/execute": {
      POST: async (req: any) => {
        const authResult = await checkAuth(req);
        if (authResult.response) return authResult.response;

        try {
          const { workflow, initial = {} } = await req.json();
          if (!workflow || !workflow.id) {
            return Response.json({ error: 'Invalid workflow - ID required' }, { status: 400 });
          }
          
          // Execute the pre-registered workflow by ID
          const registeredWorkflow = codeEngine.getWorkflow(workflow.id);
          if (!registeredWorkflow) {
            return Response.json({ error: `Workflow not found: ${workflow.id}` }, { status: 404 });
          }
          
          const result = await codeEngine.executeWorkflow(workflow.id, initial);
          return Response.json({ success: true, result });
        } catch (error) {
          return Response.json({ success: false, error: (error as Error).message }, { status: 500 });
        }
      }
    },
    
    // Existing workflow routes
    "/api/workflow/deploy": {
      POST: async (req: any) => {
        const authResult = await checkAuth(req);
        if (authResult.response) return authResult.response;

        const workflow = await req.json() as WorkflowDefinition;
        const result = await apiHandlers.deployWorkflow(workflow);
        return Response.json(result);
      }
    },
    
    "/api/workflow/undeploy": {
      POST: async (req: any) => {
        const authResult = await checkAuth(req);
        if (authResult.response) return authResult.response;

        const result = await apiHandlers.undeployWorkflow();
        return Response.json(result);
      }
    },
    
    "/api/workflow/inject": {
      POST: async (req: any) => {
        const authResult = await checkAuth(req);
        if (authResult.response) return authResult.response;

        const { workflow, nodeId } = await req.json() as { workflow: WorkflowDefinition; nodeId: string };
        const result = await apiHandlers.triggerInject(workflow, nodeId);
        return Response.json(result);
      }
    },
    
    "/api/workflow/run": {
      POST: async (req: any) => {
        const authResult = await checkAuth(req);
        if (authResult.response) return authResult.response;

        const workflow = await req.json() as WorkflowDefinition;
        const result = await apiHandlers.runWorkflow(workflow);
        return Response.json(result);
      }
    },
    
    "/api/logs": {
      GET: async (req: any) => {
        const authResult = await checkAuth(req);
        if (authResult.response) return authResult.response;

        const result = apiHandlers.getLogs();
        return Response.json(result);
      }
    },
    
    "/api/logs/info": {
      DELETE: async (req: any) => {
        const authResult = await checkAuth(req);
        if (authResult.response) return authResult.response;

        const result = apiHandlers.clearInfoLogs();
        return Response.json(result);
      }
    },
    
    "/api/logs/debug": {
      DELETE: async (req: any) => {
        const authResult = await checkAuth(req);
        if (authResult.response) return authResult.response;

        const result = apiHandlers.clearDebugLogs();
        return Response.json(result);
      }
    },
    
    "/api/mqtt/publish": {
      POST: async (req: any) => {
        const authResult = await checkAuth(req);
        if (authResult.response) return authResult.response;

        const { topic, payload } = await req.json() as { topic: string; payload: any };
        const result = apiHandlers.publishMqtt(topic, payload);
        return Response.json(result);
      }
    },
    
    "/api/status": { 
      GET: async () => {
        // Status endpoint doesn't require auth - it's public info
        const result = apiHandlers.getStatus();
        return Response.json(result);
      }
    }
  },
  
  development: { hmr: true, console: true }
});

console.log("🚀 NodeFlow server running at http://localhost:3000");

// Auto-start services
(async () => {
  try {
    await httpInService.start();
    await mqttBroker.start();
    console.log("✅ HTTP and MQTT services started automatically");
  } catch (err) {
    console.error("❌ Failed to start services:", err);
  }
})();

// Health check - poll every 30 seconds to ensure services are running
setInterval(async () => {
  try {
    if (!httpInService.isRunning()) {
      console.warn("⚠️ HTTP service stopped, restarting...");
      await httpInService.start();
    }
    if (!mqttBroker.isRunning()) {
      console.warn("⚠️ MQTT broker stopped, restarting...");
      await mqttBroker.start();
    }
  } catch (err) {
    console.error("❌ Health check failed:", err);
  }
}, 30000); // 30 seconds
