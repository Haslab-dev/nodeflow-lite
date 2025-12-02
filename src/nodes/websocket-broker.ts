import type { RuntimeService, WorkflowMessage } from "../types/index.ts";

type MessageHandler = (msg: WorkflowMessage) => void;

interface WsClient {
  id: string;
  ws: any;
  subscriptions: Set<string>;
}

// Simple WebSocket broker for internal messaging
export class WebSocketBroker implements RuntimeService {
  private server: any = null;
  private clients: Map<string, WsClient> = new Map();
  private subscriptions: Map<string, Set<MessageHandler>> = new Map();
  private port: number;

  constructor(port: number = 1884) {
    this.port = port;
  }

  async start(): Promise<void> {
    if (this.server) return;

    try {
      this.server = Bun.serve({
        port: this.port,
        fetch(req, server) {
          if (server.upgrade(req)) return;
          return new Response("WebSocket Broker - WebSocket only", { status: 400 });
        },
        websocket: {
          open: (ws) => {
            const clientId = crypto.randomUUID();
            (ws as any).clientId = clientId;
            this.clients.set(clientId, { id: clientId, ws, subscriptions: new Set() });
            console.log(`🔌 WebSocket Client connected: ${clientId}`);
          },
          message: (ws, message) => {
            try {
              const data = JSON.parse(message.toString());
              this.handleMessage((ws as any).clientId, data);
            } catch (e) {
              console.error('Invalid WebSocket message:', e);
            }
          },
          close: (ws) => {
            const clientId = (ws as any).clientId;
            this.clients.delete(clientId);
            console.log(`🔌 WebSocket Client disconnected: ${clientId}`);
          }
        }
      });

      console.log(`🔌 WebSocket Broker running on ws://localhost:${this.port}`);
    } catch (err: any) {
      this.server = null;
      if (err?.message?.includes('EADDRINUSE') || err?.code === 'EADDRINUSE') {
        throw new Error(`EADDRINUSE: Port ${this.port} is already in use`);
      }
      throw err;
    }
  }

  private handleMessage(clientId: string, data: { type: string; topic?: string; payload?: any }) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (data.type) {
      case 'subscribe':
        if (data.topic) {
          client.subscriptions.add(data.topic);
          console.log(`🔌 Client ${clientId} subscribed to: ${data.topic}`);
        }
        break;

      case 'unsubscribe':
        if (data.topic) {
          client.subscriptions.delete(data.topic);
        }
        break;

      case 'publish':
        if (data.topic) {
          this.publish(data.topic, data.payload);
        }
        break;
    }
  }

  // Publish message to all matching subscribers
  publish(topic: string, payload: any) {
    const msg: WorkflowMessage = { payload, metadata: { topic, timestamp: Date.now() } };

    // Notify WebSocket clients
    for (const client of this.clients.values()) {
      for (const sub of client.subscriptions) {
        if (this.topicMatches(sub, topic)) {
          client.ws.send(JSON.stringify({ type: 'message', topic, payload }));
          break;
        }
      }
    }

    // Notify internal handlers
    for (const [pattern, handlers] of this.subscriptions) {
      if (this.topicMatches(pattern, topic)) {
        handlers.forEach(h => h(msg));
      }
    }

    console.log(`📤 WebSocket Published [${topic}]:`, typeof payload === 'object' ? JSON.stringify(payload).slice(0, 100) : payload);
  }

  // Subscribe internal handler
  subscribe(topic: string, handler: MessageHandler) {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }
    this.subscriptions.get(topic)!.add(handler);
  }

  unsubscribe(topic: string, handler: MessageHandler) {
    this.subscriptions.get(topic)?.delete(handler);
  }

  // Simple topic matching with wildcards
  private topicMatches(pattern: string, topic: string): boolean {
    if (pattern === topic) return true;
    if (pattern === '#') return true;
    
    const patternParts = pattern.split('/');
    const topicParts = topic.split('/');

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === '#') return true;
      if (patternParts[i] === '+') continue;
      if (patternParts[i] !== topicParts[i]) return false;
    }

    return patternParts.length === topicParts.length;
  }

  async stop(): Promise<void> {
    if (this.server) {
      this.server.stop();
      this.server = null;
      this.clients.clear();
      this.subscriptions.clear();
      console.log('🔌 WebSocket Broker stopped');
    }
  }

  isRunning(): boolean {
    return this.server !== null;
  }

  getClientCount(): number {
    return this.clients.size;
  }
}
