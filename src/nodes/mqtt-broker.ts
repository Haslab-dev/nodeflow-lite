import { createServer } from 'node:net';
import Aedes from 'aedes';
import type { RuntimeService, WorkflowMessage } from "../types/index.ts";

type MessageHandler = (msg: WorkflowMessage) => void;

// MQTT Broker using Aedes
export class MqttBroker implements RuntimeService {
  private aedes: any = null;
  private server: any = null;
  private subscriptions: Map<string, Set<MessageHandler>> = new Map();
  private port: number;

  constructor(port: number = 1883) {
    this.port = port;
  }

  async start(): Promise<void> {
    if (this.server) return;

    try {
      // Create Aedes broker
      this.aedes = new Aedes();

      // Listen for published messages
      this.aedes.on('publish', (packet: any, client: any) => {
        // Skip system topics
        if (packet.topic.startsWith('$SYS/')) return;
        
        const topic = packet.topic;
        const payload = packet.payload?.toString() || '';
        
        // Try to parse JSON payload
        let parsedPayload: any;
        try {
          parsedPayload = JSON.parse(payload);
        } catch {
          parsedPayload = payload;
        }

        // Notify internal handlers
        const msg: WorkflowMessage = { 
          payload: parsedPayload, 
          metadata: { topic, timestamp: Date.now() } 
        };

        for (const [pattern, handlers] of this.subscriptions) {
          if (this.topicMatches(pattern, topic)) {
            handlers.forEach(h => h(msg));
          }
        }

        console.log(`📤 MQTT Published [${topic}]:`, typeof parsedPayload === 'object' ? JSON.stringify(parsedPayload).slice(0, 100) : parsedPayload);
      });

      this.aedes.on('client', (client: any) => {
        console.log(`📡 MQTT Client connected: ${client.id}`);
      });

      this.aedes.on('clientDisconnect', (client: any) => {
        console.log(`📡 MQTT Client disconnected: ${client.id}`);
      });

      // Create TCP server
      this.server = createServer(this.aedes.handle);
      
      await new Promise<void>((resolve, reject) => {
        this.server.listen(this.port, () => {
          console.log(`📡 MQTT Broker (Aedes) running on mqtt://localhost:${this.port}`);
          resolve();
        });
        this.server.on('error', reject);
      });
    } catch (error) {
      console.error('Failed to start MQTT broker:', error);
      throw error;
    }
  }

  // Publish message to broker
  publish(topic: string, payload: any) {
    if (!this.aedes) {
      console.warn('MQTT Broker not running');
      return;
    }

    // Convert payload to string/buffer
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const payloadBuffer = Buffer.from(payloadStr);

    // Publish to all connected clients via broker
    this.aedes.publish({
      topic,
      payload: payloadBuffer,
      qos: 0,
      retain: false
    }, (err: any) => {
      if (err) {
        console.error('MQTT publish error:', err);
      }
    });

    console.log(`📤 MQTT Published [${topic}]:`, typeof payload === 'object' ? JSON.stringify(payload).slice(0, 100) : payload);
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

  // Simple topic matching with wildcards (MQTT standard)
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
      await new Promise<void>((resolve) => {
        this.server.close(() => {
          console.log('📡 MQTT Broker stopped');
          resolve();
        });
      });
      
      if (this.aedes) {
        await this.aedes.close();
        this.aedes = null;
      }
      
      this.server = null;
      this.subscriptions.clear();
    }
  }

  isRunning(): boolean {
    return this.server !== null && this.aedes !== null;
  }

  getClientCount(): number {
    return this.aedes?.connectedClients || 0;
  }
}
