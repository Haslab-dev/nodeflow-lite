import type { NodeTypeDefinition } from "../types/index.ts";

export const nodeDefinitions: NodeTypeDefinition[] = [
  // Input nodes
  {
    type: 'inject',
    label: 'Inject',
    category: 'input',
    color: '#22c55e',
    inputs: 0,
    outputs: 1,
    icon: '💉',
    description: 'Manually trigger a flow',
    configFields: [
      { name: 'payload', label: 'Payload', type: 'code', language: 'json', default: '{}' }
    ]
  },
  {
    type: 'trigger',
    label: 'Trigger',
    category: 'input',
    color: '#22c55e',
    inputs: 0,
    outputs: 1,
    icon: '⚡',
    description: 'Start workflow execution'
  },
  {
    type: 'http-in',
    label: 'HTTP In',
    category: 'input',
    color: '#22c55e',
    inputs: 0,
    outputs: 1,
    icon: '🌐',
    description: 'Create REST endpoints',
    configFields: [
      { name: 'method', label: 'Method', type: 'select', options: ['GET', 'POST', 'PUT', 'DELETE'], default: 'POST' },
      { name: 'path', label: 'Path', type: 'string', default: '/webhook' }
    ]
  },
  {
    type: 'mqtt-in',
    label: 'MQTT In',
    category: 'input',
    color: '#22c55e',
    inputs: 0,
    outputs: 1,
    icon: '📶',
    description: 'Subscribe to MQTT topics',
    configFields: [
      { name: 'mqttConfig', label: 'MQTT Broker', type: 'mqtt-config' },
      { name: 'topic', label: 'Topic', type: 'string', default: 'test/#' }
    ]
  },
  {
    type: 'websocket-in',
    label: 'WebSocket In',
    category: 'input',
    color: '#22c55e',
    inputs: 0,
    outputs: 1,
    icon: '🔌',
    description: 'Subscribe to WebSocket topics',
    configFields: [
      { name: 'topic', label: 'Topic', type: 'string', default: 'test/#' }
    ]
  },

  // Output nodes
  {
    type: 'debug',
    label: 'Debug',
    category: 'output',
    color: '#f97316',
    inputs: 1,
    outputs: 0,
    icon: '🔍',
    description: 'Log messages for debugging',
    configFields: [
      { name: 'output', label: 'Output', type: 'select', options: ['payload', 'full', 'custom'], default: 'payload' },
      { name: 'customPath', label: 'Custom Path (e.g. payload.data.items)', type: 'string', default: 'payload.result', showWhen: { field: 'output', value: 'custom' } }
    ]
  },
  {
    type: 'http-response',
    label: 'HTTP Response',
    category: 'output',
    color: '#f97316',
    inputs: 1,
    outputs: 0,
    icon: '📤',
    description: 'Send HTTP response',
    configFields: [
      { name: 'statusCode', label: 'Status Code', type: 'number', default: 200 }
    ]
  },
  {
    type: 'mqtt-out',
    label: 'MQTT Out',
    category: 'output',
    color: '#f97316',
    inputs: 1,
    outputs: 0,
    icon: '📢',
    description: 'Publish to MQTT topic',
    configFields: [
      { name: 'mqttConfig', label: 'MQTT Broker', type: 'mqtt-config' },
      { name: 'topic', label: 'Topic', type: 'string', default: 'output' }
    ]
  },
  {
    type: 'websocket-out',
    label: 'WebSocket Out',
    category: 'output',
    color: '#f97316',
    inputs: 1,
    outputs: 0,
    icon: '🔌',
    description: 'Publish to WebSocket topic',
    configFields: [
      { name: 'topic', label: 'Topic', type: 'string', default: 'output' }
    ]
  },

  // Logic nodes
  {
    type: 'function',
    label: 'Function',
    category: 'logic',
    color: '#3b82f6',
    inputs: 1,
    outputs: 1,
    icon: '⚙️',
    description: 'Run custom JavaScript code',
    configFields: [
      { name: 'code', label: 'Code', type: 'code', language: 'javascript', default: 'return msg;' }
    ]
  },
  {
    type: 'filter',
    label: 'Filter',
    category: 'logic',
    color: '#3b82f6',
    inputs: 1,
    outputs: 2,
    icon: '🔀',
    description: 'Route messages by condition',
    configFields: [
      { name: 'condition', label: 'Condition', type: 'string', default: 'msg.payload.value > 0' }
    ]
  },
  {
    type: 'transform',
    label: 'Transform',
    category: 'logic',
    color: '#3b82f6',
    inputs: 1,
    outputs: 1,
    icon: '🔄',
    description: 'Modify message properties',
    configFields: [
      { name: 'operation', label: 'Operation', type: 'select', options: ['set', 'delete', 'rename'], default: 'set' },
      { name: 'field', label: 'Field', type: 'string', default: 'value' },
      { name: 'value', label: 'Value', type: 'string', default: '' }
    ]
  },
  {
    type: 'template',
    label: 'Template',
    category: 'logic',
    color: '#3b82f6',
    inputs: 1,
    outputs: 1,
    icon: '📝',
    description: 'Generate text from template',
    configFields: [
      { name: 'template', label: 'Template', type: 'code', language: 'text', default: 'Hello {{payload.name}}!' }
    ]
  },

  // Data nodes
  {
    type: 'http-request',
    label: 'HTTP Request',
    category: 'data',
    color: '#8b5cf6',
    inputs: 1,
    outputs: 1,
    icon: '🔗',
    description: 'Make API calls (most used)',
    configFields: [
      { name: 'method', label: 'Method', type: 'select', options: ['GET', 'POST', 'PUT', 'DELETE'], default: 'GET' },
      { name: 'url', label: 'URL', type: 'string', default: 'https://api.example.com' }
    ]
  },
  {
    type: 'delay',
    label: 'Delay',
    category: 'data',
    color: '#8b5cf6',
    inputs: 1,
    outputs: 1,
    icon: '⏱️',
    description: 'Pause flow execution',
    configFields: [
      { name: 'delay', label: 'Delay (ms)', type: 'number', default: 1000 }
    ]
  },
  {
    type: 'split',
    label: 'Split',
    category: 'data',
    color: '#8b5cf6',
    inputs: 1,
    outputs: 1,
    icon: '✂️',
    description: 'Split array into messages'
  },
  {
    type: 'join',
    label: 'Join',
    category: 'data',
    color: '#8b5cf6',
    inputs: 1,
    outputs: 1,
    icon: '🔗',
    description: 'Combine messages into array'
  },
  {
    type: 'loop',
    label: 'Loop',
    category: 'logic',
    color: '#3b82f6',
    inputs: 1,
    outputs: 1,
    icon: '🔁',
    description: 'Loop N times or foreach array items',
    configFields: [
      { name: 'mode', label: 'Mode', type: 'select', options: ['count', 'foreach'], default: 'count' },
      { name: 'count', label: 'Loop Count', type: 'number', default: 3 },
      { name: 'arrayPath', label: 'Array Path (foreach)', type: 'string', default: 'payload.items' },
      { name: 'delay', label: 'Delay Between Iterations (ms)', type: 'number', default: 0 }
    ]
  },
  {
    type: 'data-table',
    label: 'Data Table',
    category: 'data',
    color: '#8b5cf6',
    inputs: 1,
    outputs: 1,
    icon: '📊',
    description: 'Create or manipulate data tables',
    configFields: [
      { name: 'data', label: 'Table Data (JSON)', type: 'code', language: 'json', default: '[\n  {"name": "Item 1", "value": 100},\n  {"name": "Item 2", "value": 200}\n]' }
    ]
  },

  // AI node (using Vercel AI SDK)
  {
    type: 'ai-generate',
    label: 'AI Generate',
    category: 'logic',
    color: '#10b981',
    inputs: 1,
    outputs: 1,
    icon: '🤖',
    description: 'Generate text with AI (OpenAI compatible)',
    configFields: [
      { name: 'aiConfig', label: 'AI Configuration', type: 'ai-config', default: '' },
      { name: 'prompt', label: 'Prompt', type: 'code', language: 'text', default: '{{payload.prompt}}' },
      { name: 'systemPrompt', label: 'System Prompt', type: 'code', language: 'text', default: '' },
      { name: 'temperature', label: 'Temperature', type: 'number', default: 0.7 },
      { name: 'maxTokens', label: 'Max Tokens', type: 'number', default: 1000 },
      { name: 'memory', label: 'Memory (JSON)', type: 'code', language: 'json', default: '[]' },
      { name: 'tools', label: 'Tools (JSON)', type: 'code', language: 'json', default: '[]' },
      { name: 'outputParser', label: 'Output Parser', type: 'select', options: ['none', 'json', 'markdown'], default: 'none' }
    ]
  },

  // UI Dashboard Nodes
  {
    type: 'ui-text',
    label: 'UI Text',
    category: 'output',
    color: '#06b6d4',
    inputs: 1,
    outputs: 0,
    icon: '📝',
    description: 'Display text value in dashboard',
    configFields: [
      { name: 'label', label: 'Label', type: 'string', default: 'Text' },
      { name: 'format', label: 'Format', type: 'string', default: '{{payload}}' }
    ]
  },
  {
    type: 'ui-number',
    label: 'UI Number',
    category: 'output',
    color: '#06b6d4',
    inputs: 1,
    outputs: 0,
    icon: '🔢',
    description: 'Display number value in dashboard',
    configFields: [
      { name: 'label', label: 'Label', type: 'string', default: 'Number' },
      { name: 'unit', label: 'Unit', type: 'string', default: '' },
      { name: 'decimals', label: 'Decimals', type: 'number', default: 2 }
    ]
  },
  {
    type: 'ui-gauge',
    label: 'UI Gauge',
    category: 'output',
    color: '#06b6d4',
    inputs: 1,
    outputs: 0,
    icon: '📊',
    description: 'Display gauge in dashboard',
    configFields: [
      { name: 'label', label: 'Label', type: 'string', default: 'Gauge' },
      { name: 'min', label: 'Min', type: 'number', default: 0 },
      { name: 'max', label: 'Max', type: 'number', default: 100 },
      { name: 'unit', label: 'Unit', type: 'string', default: '%' }
    ]
  },
  {
    type: 'ui-switch',
    label: 'UI Switch',
    category: 'output',
    color: '#06b6d4',
    inputs: 1,
    outputs: 0,
    icon: '🔘',
    description: 'Display switch/boolean in dashboard',
    configFields: [
      { name: 'label', label: 'Label', type: 'string', default: 'Switch' }
    ]
  },

  // Hyperflow nodes - DAG-based workflow execution
  {
    type: 'hyperflow',
    label: 'Hyperflow',
    category: 'logic',
    color: '#ec4899',
    inputs: 1,
    outputs: 1,
    icon: '🌊',
    description: 'Execute a Hyperflow pipeline with DAG support',
    configFields: [
      { name: 'code', label: 'Pipeline Code', type: 'code', language: 'javascript', default: `// Define your Hyperflow pipeline
// Available: hyper.state(), hyper.step(), hyper.dag(), hyper.tool(), hyper.ai()

hyper
  .state('result', null)
  .step('process', async (ctx, helpers) => {
    ctx.result = new Signal({
      processed: true,
      data: ctx.input.value,
      timestamp: Date.now()
    });
  });` },
      { name: 'aiConfig', label: 'AI Configuration (optional)', type: 'ai-config', default: '' }
    ]
  },
  {
    type: 'hyperflow-step',
    label: 'Hyperflow Step',
    category: 'logic',
    color: '#ec4899',
    inputs: 1,
    outputs: 1,
    icon: '🔹',
    description: 'Single step in a Hyperflow pipeline',
    configFields: [
      { name: 'stepName', label: 'Step Name', type: 'string', default: 'process' },
      { name: 'code', label: 'Step Code', type: 'code', language: 'javascript', default: `// Transform the message
msg.payload.processed = true;
msg.payload.timestamp = Date.now();
return msg;` }
    ]
  },
  {
    type: 'hyperflow-dag',
    label: 'Hyperflow DAG',
    category: 'logic',
    color: '#ec4899',
    inputs: 1,
    outputs: 1,
    icon: '🔀',
    description: 'Execute parallel DAG nodes with dependencies',
    configFields: [
      { name: 'dagName', label: 'DAG Name', type: 'string', default: 'parallel-tasks' },
      { name: 'nodes', label: 'DAG Nodes (JSON)', type: 'code', language: 'json', default: `[
  {
    "id": "task1",
    "deps": [],
    "code": "ctx.task1 = new Signal({ result: 'Task 1 done' });"
  },
  {
    "id": "task2", 
    "deps": [],
    "code": "ctx.task2 = new Signal({ result: 'Task 2 done' });"
  },
  {
    "id": "combine",
    "deps": ["task1", "task2"],
    "code": "ctx.combined = new Signal({ task1: ctx.task1.value, task2: ctx.task2.value });"
  }
]` }
    ]
  },
  {
    type: 'hyperflow-tool',
    label: 'Hyperflow Tool',
    category: 'logic',
    color: '#ec4899',
    inputs: 1,
    outputs: 1,
    icon: '🔧',
    description: 'Execute a tool function on input data',
    configFields: [
      { name: 'toolName', label: 'Tool Name', type: 'string', default: 'transform' },
      { name: 'inputPath', label: 'Input Path', type: 'string', default: 'payload' },
      { name: 'toolCode', label: 'Tool Code', type: 'code', language: 'javascript', default: `// Transform input data
return {
  ...input,
  transformed: true,
  timestamp: Date.now()
};` }
    ]
  }
];

export const nodeDefinitionMap = new Map(nodeDefinitions.map(n => [n.type, n]));
