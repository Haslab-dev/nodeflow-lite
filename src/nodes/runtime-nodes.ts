import type { WorkflowMessage, NodeExecutionContext, NodeExecutor, RuntimeService } from "../types/index.ts";

type MessageHandler = (msg: WorkflowMessage) => void;

// HTTP Input Server - always-on runtime service
export class HttpInService implements RuntimeService {
  private server: any = null;
  private routes: Map<string, MessageHandler> = new Map();
  private port: number;

  constructor(port: number = 3001) {
    this.port = port;
  }

  registerRoute(path: string, method: string, handler: MessageHandler) {
    const key = `${method.toUpperCase()}:${path}`;
    this.routes.set(key, handler);
  }

  unregisterRoute(path: string, method: string) {
    const key = `${method.toUpperCase()}:${path}`;
    this.routes.delete(key);
  }

  async start(): Promise<void> {
    if (this.server) return;

    this.server = Bun.serve({
      port: this.port,
      fetch: async (req) => {
        const url = new URL(req.url);
        const key = `${req.method}:${url.pathname}`;
        const handler = this.routes.get(key);

        if (handler) {
          let body = {};
          if (req.method !== 'GET') {
            try {
              body = await req.json() as Record<string, unknown>;
            } catch { body = {}; }
          }

          const msg: WorkflowMessage = {
            payload: body,
            metadata: {
              method: req.method,
              path: url.pathname,
              query: Object.fromEntries(url.searchParams),
              headers: Object.fromEntries(req.headers)
            }
          };

          handler(msg);
          return new Response(JSON.stringify({ status: 'ok' }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return new Response('Not Found', { status: 404 });
      }
    });

    console.log(`🌐 HTTP Input server running on port ${this.port}`);
  }

  async stop(): Promise<void> {
    if (this.server) {
      this.server.stop();
      this.server = null;
      console.log('🌐 HTTP Input server stopped');
    }
  }

  isRunning(): boolean {
    return this.server !== null;
  }
}

// MQTT Service - simulated for demo (real impl would use mqtt.js)
export class MqttService implements RuntimeService {
  private connected = false;
  private subscriptions: Map<string, MessageHandler[]> = new Map();
  private broker: string;

  constructor(broker: string = 'mqtt://localhost:1883') {
    this.broker = broker;
  }

  subscribe(topic: string, handler: MessageHandler) {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, []);
    }
    this.subscriptions.get(topic)!.push(handler);
  }

  unsubscribe(topic: string, handler: MessageHandler) {
    const handlers = this.subscriptions.get(topic);
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx >= 0) handlers.splice(idx, 1);
    }
  }

  publish(topic: string, payload: any) {
    console.log(`📤 MQTT Publish [${topic}]:`, payload);
    // In real impl, would publish to broker
    // For demo, trigger local subscribers
    const handlers = this.subscriptions.get(topic) || [];
    handlers.forEach(h => h({ payload, metadata: { topic } }));
  }

  async start(): Promise<void> {
    if (this.connected) return;
    // Simulated connection
    console.log(`📡 MQTT connecting to ${this.broker}...`);
    await new Promise(r => setTimeout(r, 100));
    this.connected = true;
    console.log('📡 MQTT connected');
  }

  async stop(): Promise<void> {
    if (!this.connected) return;
    this.connected = false;
    this.subscriptions.clear();
    console.log('📡 MQTT disconnected');
  }

  isRunning(): boolean {
    return this.connected;
  }
}

// Track active subscriptions to prevent duplicates
const activeHttpRoutes = new Set<string>();
const activeMqttSubs = new Set<string>();

// Register runtime nodes
export function registerRuntimeNodes(
  engine: { registerNodeType: (type: string, executor: NodeExecutor) => void },
  httpService: HttpInService,
  mqttService: MqttService
) {
  // HTTP IN - receives HTTP requests (listener node - registers handler only)
  engine.registerNodeType('http-in', async (_msg: WorkflowMessage, ctx: NodeExecutionContext) => {
    const { path = '/webhook', method = 'POST' } = ctx.node.config;
    const routeKey = `${method}:${path}`;
    
    // Prevent duplicate registrations
    if (activeHttpRoutes.has(routeKey)) {
      ctx.log(`Already listening on ${method} ${path}`);
      return;
    }
    
    activeHttpRoutes.add(routeKey);
    httpService.registerRoute(path, method, (incomingMsg) => {
      ctx.log(`📥 HTTP ${method} ${path}: ${JSON.stringify(incomingMsg.payload)}`);
      ctx.send(incomingMsg);
    });
    
    ctx.log(`✓ Registered listener: ${method} ${path}`);
    // Don't send downstream - this is a listener setup only
  });

  // HTTP RESPONSE - sends HTTP response
  engine.registerNodeType('http-response', async (_msg: WorkflowMessage, ctx: NodeExecutionContext) => {
    const { statusCode = 200 } = ctx.node.config;
    ctx.log(`📤 HTTP Response: ${statusCode}`);
  });

  // MQTT IN - subscribes to MQTT topic (listener node - registers handler only)
  engine.registerNodeType('mqtt-in', async (_msg: WorkflowMessage, ctx: NodeExecutionContext) => {
    const { topic = 'test/#' } = ctx.node.config;
    
    // Prevent duplicate subscriptions
    if (activeMqttSubs.has(topic)) {
      ctx.log(`Already subscribed to ${topic}`);
      return;
    }
    
    activeMqttSubs.add(topic);
    mqttService.subscribe(topic, (incomingMsg) => {
      ctx.log(`📥 MQTT [${topic}]: ${JSON.stringify(incomingMsg.payload)}`);
      ctx.send(incomingMsg);
    });
    
    ctx.log(`✓ Subscribed to ${topic}`);
    // Don't send downstream - this is a listener setup only
  });

  // MQTT OUT - publishes to MQTT topic
  engine.registerNodeType('mqtt-out', async (msg: WorkflowMessage, ctx: NodeExecutionContext) => {
    const { topic = 'output' } = ctx.node.config;
    ctx.log(`📤 Publishing to ${topic}: ${JSON.stringify(msg.payload)}`);
    mqttService.publish(topic, msg.payload);
  });
}

// Clear subscriptions (call when stopping services)
export function clearRuntimeSubscriptions() {
  activeHttpRoutes.clear();
  activeMqttSubs.clear();
}
