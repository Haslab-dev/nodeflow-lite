import index from "./ui/index.html";
import { WorkflowEngine } from "./WorkflowEngine.ts";
import { HttpInService, registerRuntimeNodes, clearRuntimeSubscriptions } from "./nodes/runtime-nodes.ts";
import { MqttBroker } from "./nodes/mqtt-broker.ts";
import { WebSocketBroker } from "./nodes/websocket-broker.ts";
import { authService } from "./auth/index.ts";
import type { WorkflowDefinition, NodeConfig } from "./types/index.ts";

// Protected ports that should never be killed (our own UI server)
const PROTECTED_PORTS = [3000];

// Get current process ID to avoid killing ourselves
const CURRENT_PID = process.pid;

// Utility to kill process on a specific port (NEVER kills our own process)
async function killProcessOnPort(port: number): Promise<boolean> {
  // Never kill protected ports
  if (PROTECTED_PORTS.includes(port)) {
    console.warn(`⚠️ Port ${port} is protected, skipping kill`);
    return false;
  }
  
  try {
    // Find PID using lsof (macOS/Linux)
    const findProc = Bun.spawn(['lsof', '-ti', `:${port}`], {
      stdout: 'pipe',
      stderr: 'pipe'
    });
    const output = await new Response(findProc.stdout).text();
    const pids = output.trim().split('\n').filter(p => p && p.trim());
    
    if (pids.length === 0) {
      console.log(`ℹ️ No process found on port ${port}`);
      return false;
    }
    
    // ALWAYS filter out our own process - never kill ourselves!
    const externalPids = [...new Set(pids)].filter(pid => {
      const pidNum = parseInt(pid, 10);
      if (isNaN(pidNum)) return false;
      if (pidNum === CURRENT_PID) {
        console.log(`ℹ️ Skipping our own process (PID ${pidNum}) on port ${port}`);
        return false;
      }
      return true;
    });
    
    if (externalPids.length === 0) {
      // Port is held by our own process - this means a previous service instance
      // is still bound. We can't kill it, so we'll just wait and hope it releases.
      console.log(`ℹ️ Port ${port} is held by our own process - waiting for release...`);
      await new Promise(r => setTimeout(r, 500));
      return false; // Return false - no external process was killed
    }
    
    // Kill each external PID
    for (const pid of externalPids) {
      console.log(`⚠️ Killing external process ${pid} on port ${port}`);
      Bun.spawn(['kill', '-9', pid]);
    }
    
    // Wait for port to be released
    await new Promise(r => setTimeout(r, 1000));
    return true;
  } catch (err) {
    console.error(`Failed to kill process on port ${port}:`, err);
    return false;
  }
}

// Start service with port conflict handling
async function startServiceWithRetry<T extends { start(): Promise<void>; isRunning(): boolean }>(
  service: T,
  port: number,
  serviceName: string,
  maxRetries: number = 3
): Promise<boolean> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await service.start();
      return true;
    } catch (err: any) {
      const isPortInUse = err?.code === 'EADDRINUSE' || 
                          err?.message?.includes('EADDRINUSE') ||
                          err?.message?.includes('address already in use');
      
      if (isPortInUse && attempt < maxRetries) {
        console.warn(`⚠️ ${serviceName} port ${port} in use (attempt ${attempt + 1}/${maxRetries + 1})`);
        
        // Try to kill external processes on this port
        const killed = await killProcessOnPort(port);
        
        if (!killed) {
          // No external process found - port might be in TIME_WAIT or held by zombie
          console.log(`ℹ️ No external process to kill, waiting for port to be released...`);
        }
        
        // Wait before retry (longer each time)
        const waitTime = 1000 * (attempt + 1);
        console.log(`⏳ Waiting ${waitTime}ms before retry...`);
        await new Promise(r => setTimeout(r, waitTime));
        continue;
      }
      
      console.error(`❌ Failed to start ${serviceName} on port ${port} after ${attempt + 1} attempts:`, err.message || err);
      return false;
    }
  }
  return false;
}

const httpInService = new HttpInService(3001);
const mqttBroker = new MqttBroker(1883);
const wsBroker = new WebSocketBroker(1884);
const engine = new WorkflowEngine();

const mqttServiceAdapter = {
  subscribe: (topic: string, handler: any) => mqttBroker.subscribe(topic, handler),
  unsubscribe: (topic: string, handler: any) => mqttBroker.unsubscribe(topic, handler),
  publish: (topic: string, payload: any) => mqttBroker.publish(topic, payload),
  start: () => mqttBroker.start(),
  stop: () => mqttBroker.stop(),
  isRunning: () => mqttBroker.isRunning()
};

const wsServiceAdapter = {
  subscribe: (topic: string, handler: any) => wsBroker.subscribe(topic, handler),
  unsubscribe: (topic: string, handler: any) => wsBroker.unsubscribe(topic, handler),
  publish: (topic: string, payload: any) => wsBroker.publish(topic, payload),
  start: () => wsBroker.start(),
  stop: () => wsBroker.stop(),
  isRunning: () => wsBroker.isRunning()
};

registerRuntimeNodes(engine, httpInService, mqttServiceAdapter as any, wsServiceAdapter as any);

// Initialize authentication and default admin user
await authService.initializeDefaultAdmin();

interface LogEntry {
  timestamp: string;
  message: string;
}

const infoLogs: LogEntry[] = [];    // Execution info logs
const debugLogs: LogEntry[] = [];   // Debug node output only
let pendingExecution: { nodeName: string; timestamp: string } | null = null;

// UI Dashboard data
const uiWidgets: Map<string, any> = new Map();

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

// Listen for UI updates from UI nodes
engine.on('ui-update', (data: any) => {
  uiWidgets.set(data.nodeId, data);
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

  // Test a single node with input data
  async testNode(workflow: WorkflowDefinition, nodeId: string, input: any) {
    try {
      // Clear logs before test to capture only this execution
      const startInfoLength = infoLogs.length;
      const startDebugLength = debugLogs.length;
      
      engine.loadWorkflow(workflow);
      
      // Extract payload from input if it exists, otherwise use input as payload
      const payload = input.payload !== undefined ? input.payload : input;
      
      // Execute the node with the provided input
      await engine.executeNodeById(workflow.id, nodeId, payload);
      
      // Wait a bit for execution to complete (longer for AI nodes)
      await new Promise(r => setTimeout(r, 500));
      
      // Collect all logs generated during this test
      const newInfoLogs = infoLogs.slice(startInfoLength);
      const newDebugLogs = debugLogs.slice(startDebugLength);
      
      // Combine all logs into output
      const output = {
        execution: newInfoLogs.map(l => l.message).join('\n'),
        debug: newDebugLogs.map(l => l.message).join('\n'),
        logs: [...newInfoLogs, ...newDebugLogs]
      };
      
      return { 
        success: true, 
        output
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
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
      ws: wsBroker.isRunning(),
      mqttClients: mqttBroker.getClientCount(),
      wsClients: wsBroker.getClientCount(),
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
    
    // Workflow routes
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

    "/api/workflow/test-node": {
      POST: async (req: any) => {
        const authResult = await checkAuth(req);
        if (authResult.response) return authResult.response;

        const { workflow, nodeId, input } = await req.json() as { workflow: WorkflowDefinition; nodeId: string; input: any };
        const result = await apiHandlers.testNode(workflow, nodeId, input);
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
    },
    
    "/api/ui-data": {
      GET: async () => {
        // Return UI dashboard data
        const widgets: Record<string, any> = {};
        uiWidgets.forEach((value, key) => {
          widgets[key] = value;
        });
        return Response.json({ widgets });
      },
      
      DELETE: async (req: any) => {
        const authResult = await checkAuth(req);
        if (authResult.response) return authResult.response;
        
        uiWidgets.clear();
        return Response.json({ success: true });
      }
    },

    "/api/conversations": {
      GET: async () => {
        // Get all conversations
        const { AIMemoryManager } = await import('./nodes/ai-memory.ts');
        const ids = AIMemoryManager.getAllConversationIds();
        const conversations = ids.map(id => ({
          id,
          ...AIMemoryManager.getConversationInfo(id)
        }));
        return Response.json({ conversations });
      }
    },

    "/api/conversations/:id": {
      GET: async (req: any, params: any) => {
        // Get conversation history
        const { AIMemoryManager } = await import('./nodes/ai-memory.ts');
        const history = AIMemoryManager.getHistory(params.id);
        return Response.json({ history });
      },
      
      DELETE: async (req: any, params: any) => {
        // Clear conversation
        const { AIMemoryManager } = await import('./nodes/ai-memory.ts');
        AIMemoryManager.clearConversation(params.id);
        return Response.json({ success: true });
      }
    },

    "/api/memory/stats": {
      GET: async () => {
        // Get memory statistics
        const { AIMemoryManager } = await import('./nodes/ai-memory.ts');
        const stats = AIMemoryManager.getStats();
        return Response.json(stats);
      }
    }
  },
  
  development: { hmr: true, console: true }
});

console.log("🚀 NodeFlow server running at http://localhost:3000");

// Auto-start services with port conflict handling
(async () => {
  const results = await Promise.all([
    startServiceWithRetry(httpInService, 3001, 'HTTP Input'),
    startServiceWithRetry(mqttBroker, 1883, 'MQTT Broker'),
    startServiceWithRetry(wsBroker, 1884, 'WebSocket Broker')
  ]);
  
  const allStarted = results.every(r => r);
  if (allStarted) {
    console.log("✅ All services started successfully");
  } else {
    console.warn("⚠️ Some services failed to start");
  }
})();

// Health check - poll every 30 seconds to ensure services are running
setInterval(async () => {
  try {
    if (!httpInService.isRunning()) {
      console.warn("⚠️ HTTP service stopped, restarting...");
      await startServiceWithRetry(httpInService, 3001, 'HTTP Input');
    }
    if (!mqttBroker.isRunning()) {
      console.warn("⚠️ MQTT broker stopped, restarting...");
      await startServiceWithRetry(mqttBroker, 1883, 'MQTT Broker');
    }
    if (!wsBroker.isRunning()) {
      console.warn("⚠️ WebSocket broker stopped, restarting...");
      await startServiceWithRetry(wsBroker, 1884, 'WebSocket Broker');
    }
  } catch (err) {
    console.error("❌ Health check failed:", err);
  }
}, 30000); // 30 seconds
