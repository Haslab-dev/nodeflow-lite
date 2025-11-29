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
      { name: 'output', label: 'Output', type: 'select', options: ['payload', 'full'], default: 'payload' }
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
      { name: 'temperature', label: 'Temperature', type: 'number', default: 0.7 }
    ]
  }
];

export const nodeDefinitionMap = new Map(nodeDefinitions.map(n => [n.type, n]));
