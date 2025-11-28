import type { WorkflowDefinition } from "../types/index.ts";

export interface Project {
  id: string;
  name: string;
  workflows: WorkflowDefinition[];
  createdAt: number;
  updatedAt: number;
}

// Pre-built template workflows - vertical layout
export const templateWorkflows: WorkflowDefinition[] = [
  {
    id: 'template-http-full',
    name: 'HTTP Webhook (Full)',
    type: 'flow',
    nodes: [
      // Sender flow (left column)
      { id: '1', type: 'inject', name: 'Send Request', config: { payload: { message: 'Hello from inject!' } }, wires: [['2']], position: { x: 100, y: 50 } },
      { id: '2', type: 'http-request', name: 'POST Webhook', config: { method: 'POST', url: 'http://localhost:3001/webhook' }, wires: [['3']], position: { x: 100, y: 150 } },
      { id: '3', type: 'debug', name: 'Response', config: {}, wires: [[]], position: { x: 100, y: 250 } },
      // Listener flow (right column)
      { id: '4', type: 'http-in', name: 'Webhook Listener', config: { method: 'POST', path: '/webhook' }, wires: [['5']], position: { x: 350, y: 50 } },
      { id: '5', type: 'function', name: 'Process', config: { code: 'log("Webhook received: " + JSON.stringify(msg.payload));\nreturn msg;' }, wires: [['6']], position: { x: 350, y: 150 } },
      { id: '6', type: 'debug', name: 'Log Received', config: {}, wires: [[]], position: { x: 350, y: 250 } }
    ]
  },
  {
    id: 'template-mqtt-full',
    name: 'MQTT Pub/Sub (Full)',
    type: 'flow',
    nodes: [
      // Publisher flow (left column)
      { id: '1', type: 'inject', name: 'Publish Message', config: { payload: { sensor: 'temp', value: 25.5 } }, wires: [['2']], position: { x: 100, y: 50 } },
      { id: '2', type: 'mqtt-out', name: 'Publish', config: { topic: 'sensors/temp' }, wires: [['3']], position: { x: 100, y: 150 } },
      { id: '3', type: 'debug', name: 'Sent', config: {}, wires: [[]], position: { x: 100, y: 250 } },
      // Subscriber flow (right column)
      { id: '4', type: 'mqtt-in', name: 'Subscribe', config: { topic: 'sensors/#' }, wires: [['5']], position: { x: 350, y: 50 } },
      { id: '5', type: 'function', name: 'Process', config: { code: 'log("MQTT received: " + JSON.stringify(msg.payload));\nreturn msg;' }, wires: [['6']], position: { x: 350, y: 150 } },
      { id: '6', type: 'debug', name: 'Log Received', config: {}, wires: [[]], position: { x: 350, y: 250 } }
    ]
  },
  {
    id: 'template-api-fetch',
    name: 'API Data Fetcher',
    type: 'flow',
    nodes: [
      { id: '1', type: 'inject', name: 'Trigger', config: { payload: {} }, wires: [['2']], position: { x: 200, y: 50 } },
      { id: '2', type: 'http-request', name: 'Fetch API', config: { method: 'GET', url: 'https://jsonplaceholder.typicode.com/posts/1' }, wires: [['3']], position: { x: 200, y: 150 } },
      { id: '3', type: 'debug', name: 'Result', config: {}, wires: [[]], position: { x: 200, y: 250 } }
    ]
  },
  {
    id: 'template-data-pipeline',
    name: 'Data Processing Pipeline',
    type: 'flow',
    nodes: [
      { id: '1', type: 'inject', name: 'Input', config: { payload: { items: [1, 2, 3, 4, 5] } }, wires: [['2']], position: { x: 200, y: 50 } },
      { id: '2', type: 'split', name: 'Split', config: {}, wires: [['3']], position: { x: 200, y: 150 } },
      { id: '3', type: 'function', name: 'Double', config: { code: 'return { payload: msg.payload * 2 };' }, wires: [['4']], position: { x: 200, y: 250 } },
      { id: '4', type: 'debug', name: 'Output', config: {}, wires: [[]], position: { x: 200, y: 350 } }
    ]
  },
  {
    id: 'template-conditional',
    name: 'Conditional Flow',
    type: 'flow',
    nodes: [
      { id: '1', type: 'inject', name: 'Input', config: { payload: { value: 75 } }, wires: [['2']], position: { x: 200, y: 50 } },
      { id: '2', type: 'filter', name: 'Check > 50', config: { condition: 'msg.payload.value > 50' }, wires: [['3'], ['4']], position: { x: 200, y: 150 } },
      { id: '3', type: 'debug', name: 'High', config: {}, wires: [[]], position: { x: 100, y: 280 } },
      { id: '4', type: 'debug', name: 'Low', config: {}, wires: [[]], position: { x: 300, y: 280 } }
    ]
  },
  {
    id: 'template-delay-sequence',
    name: 'Timed Sequence',
    type: 'flow',
    nodes: [
      { id: '1', type: 'inject', name: 'Start', config: { payload: { step: 1 } }, wires: [['2']], position: { x: 200, y: 50 } },
      { id: '2', type: 'debug', name: 'Step 1', config: {}, wires: [['3']], position: { x: 200, y: 150 } },
      { id: '3', type: 'delay', name: 'Wait 1s', config: { delay: 1000 }, wires: [['4']], position: { x: 200, y: 250 } },
      { id: '4', type: 'function', name: 'Step 2', config: { code: 'msg.payload.step = 2;\nlog("Step 2");\nreturn msg;' }, wires: [['5']], position: { x: 200, y: 350 } },
      { id: '5', type: 'debug', name: 'Done', config: {}, wires: [[]], position: { x: 200, y: 450 } }
    ]
  },
  // Step Workflows - Sequential execution without wires (vertical layout)
  {
    id: 'template-step-api',
    name: 'API Fetch (Step)',
    type: 'step',
    nodes: [
      { id: '1', type: 'inject', name: 'Start', config: { payload: {} }, wires: [[]], position: { x: 200, y: 50 } },
      { id: '2', type: 'http-request', name: 'Fetch Data', config: { method: 'GET', url: 'https://jsonplaceholder.typicode.com/posts/1' }, wires: [[]], position: { x: 200, y: 150 } },
      { id: '3', type: 'debug', name: 'Show Result', config: {}, wires: [[]], position: { x: 200, y: 250 } }
    ]
  },
  {
    id: 'template-step-process',
    name: 'Data Processing (Step)',
    type: 'step',
    nodes: [
      { id: '1', type: 'inject', name: 'Input Data', config: { payload: { value: 10 } }, wires: [[]], position: { x: 200, y: 50 } },
      { id: '2', type: 'function', name: 'Double Value', config: { code: 'msg.payload.value = msg.payload.value * 2;\nlog("Doubled to: " + msg.payload.value);\nreturn msg;' }, wires: [[]], position: { x: 200, y: 150 } },
      { id: '3', type: 'function', name: 'Add 5', config: { code: 'msg.payload.value = msg.payload.value + 5;\nlog("Added 5, now: " + msg.payload.value);\nreturn msg;' }, wires: [[]], position: { x: 200, y: 250 } },
      { id: '4', type: 'debug', name: 'Final Result', config: {}, wires: [[]], position: { x: 200, y: 350 } }
    ]
  },
  {
    id: 'template-step-mqtt',
    name: 'MQTT Publisher (Step)',
    type: 'step',
    nodes: [
      { id: '1', type: 'inject', name: 'Create Message', config: { payload: { sensor: 'temperature', value: 22.5, unit: 'C' } }, wires: [[]], position: { x: 200, y: 50 } },
      { id: '2', type: 'function', name: 'Add Timestamp', config: { code: 'msg.payload.timestamp = Date.now();\nreturn msg;' }, wires: [[]], position: { x: 200, y: 150 } },
      { id: '3', type: 'mqtt-out', name: 'Publish to MQTT', config: { topic: 'sensors/temperature' }, wires: [[]], position: { x: 200, y: 250 } },
      { id: '4', type: 'debug', name: 'Confirm Sent', config: {}, wires: [[]], position: { x: 200, y: 350 } }
    ]
  }
];

export const defaultProject: Project = {
  id: 'default',
  name: 'My Project',
  workflows: [
    // Flow workflow example - vertical layout
    {
      id: 'demo-flow-1',
      name: 'Demo: API Fetch',
      type: 'flow',
      nodes: [
        { id: '1', type: 'inject', name: 'Trigger', config: { payload: {} }, wires: [['2']], position: { x: 200, y: 50 } },
        { id: '2', type: 'http-request', name: 'Fetch API', config: { method: 'GET', url: 'https://jsonplaceholder.typicode.com/posts/1' }, wires: [['3']], position: { x: 200, y: 150 } },
        { id: '3', type: 'debug', name: 'Result', config: {}, wires: [[]], position: { x: 200, y: 250 } }
      ]
    },
    // Data processing workflow - vertical layout with wires
    {
      id: 'demo-data-processing',
      name: 'Demo: Data Processing',
      type: 'flow',
      nodes: [
        { id: '1', type: 'inject', name: 'Input Data', config: { payload: { items: [1, 2, 3, 4, 5], multiplier: 2 } }, wires: [['2']], position: { x: 200, y: 50 } },
        { id: '2', type: 'function', name: 'Process Items', config: { code: 'const items = msg.payload.items;\nconst mult = msg.payload.multiplier;\nmsg.payload.processed = items.map(x => x * mult);\nmsg.payload.sum = msg.payload.processed.reduce((a,b) => a+b, 0);\nlog("Processed: " + msg.payload.processed.join(", "));\nreturn msg;' }, wires: [['3']], position: { x: 200, y: 150 } },
        { id: '3', type: 'filter', name: 'Check Sum', config: { condition: 'msg.payload.sum > 20' }, wires: [['4'], ['5']], position: { x: 200, y: 250 } },
        { id: '4', type: 'debug', name: 'Sum > 20', config: {}, wires: [[]], position: { x: 100, y: 350 } },
        { id: '5', type: 'debug', name: 'Sum <= 20', config: {}, wires: [[]], position: { x: 300, y: 350 } }
      ]
    },
    // MQTT workflow - vertical layout
    {
      id: 'demo-mqtt',
      name: 'Demo: MQTT Pub/Sub',
      type: 'flow',
      nodes: [
        { id: '1', type: 'inject', name: 'Publish', config: { payload: { sensor: 'temp', value: 25.5 } }, wires: [['2']], position: { x: 100, y: 50 } },
        { id: '2', type: 'mqtt-out', name: 'Send to MQTT', config: { topic: 'sensors/temp' }, wires: [['3']], position: { x: 100, y: 150 } },
        { id: '3', type: 'debug', name: 'Sent', config: {}, wires: [[]], position: { x: 100, y: 250 } },
        { id: '4', type: 'mqtt-in', name: 'Subscribe', config: { topic: 'sensors/#' }, wires: [['5']], position: { x: 300, y: 50 } },
        { id: '5', type: 'function', name: 'Process', config: { code: 'log("Received: " + JSON.stringify(msg.payload));\nreturn msg;' }, wires: [['6']], position: { x: 300, y: 150 } },
        { id: '6', type: 'debug', name: 'Received', config: {}, wires: [[]], position: { x: 300, y: 250 } }
      ]
    }
  ],
  createdAt: Date.now(),
  updatedAt: Date.now()
};
