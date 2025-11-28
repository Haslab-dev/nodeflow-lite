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
      { name: 'payload', label: 'Payload', type: 'code', default: '{}' }
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
  {
    type: 'cron',
    label: 'Cron',
    category: 'input',
    color: '#22c55e',
    inputs: 0,
    outputs: 1,
    icon: '🕐',
    description: 'Schedule recurring tasks',
    configFields: [
      { name: 'cron', label: 'Cron Expression', type: 'string', default: '0 * * * *' }
    ]
  },
  {
    type: 'webhook',
    label: 'Webhook',
    category: 'input',
    color: '#22c55e',
    inputs: 0,
    outputs: 1,
    icon: '🪝',
    description: 'Receive external webhooks',
    configFields: [
      { name: 'path', label: 'Path', type: 'string', default: '/hook' },
      { name: 'secret', label: 'Secret', type: 'string', default: '' }
    ]
  },
  {
    type: 'file-watch',
    label: 'File Watch',
    category: 'input',
    color: '#22c55e',
    inputs: 0,
    outputs: 1,
    icon: '👁️',
    description: 'Watch for file changes',
    configFields: [
      { name: 'path', label: 'File Path', type: 'string', default: './data' }
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
  {
    type: 'email',
    label: 'Email',
    category: 'output',
    color: '#f97316',
    inputs: 1,
    outputs: 0,
    icon: '✉️',
    description: 'Send email notifications',
    configFields: [
      { name: 'to', label: 'To', type: 'string', default: '' },
      { name: 'subject', label: 'Subject', type: 'string', default: 'Notification' }
    ]
  },
  {
    type: 'slack',
    label: 'Slack',
    category: 'output',
    color: '#f97316',
    inputs: 1,
    outputs: 0,
    icon: '💬',
    description: 'Send Slack messages',
    configFields: [
      { name: 'channel', label: 'Channel', type: 'string', default: '#general' },
      { name: 'webhook', label: 'Webhook URL', type: 'string', default: '' }
    ]
  },
  {
    type: 'file-write',
    label: 'File Write',
    category: 'output',
    color: '#f97316',
    inputs: 1,
    outputs: 0,
    icon: '💾',
    description: 'Write data to file',
    configFields: [
      { name: 'path', label: 'File Path', type: 'string', default: './output.json' },
      { name: 'mode', label: 'Mode', type: 'select', options: ['overwrite', 'append'], default: 'overwrite' }
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
      { name: 'code', label: 'Code', type: 'code', default: 'return msg;' }
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
    type: 'switch',
    label: 'Switch',
    category: 'logic',
    color: '#3b82f6',
    inputs: 1,
    outputs: 3,
    icon: '🔃',
    description: 'Route to multiple outputs',
    configFields: [
      { name: 'property', label: 'Property', type: 'string', default: 'msg.payload.type' },
      { name: 'rules', label: 'Rules', type: 'code', default: '["a", "b", "default"]' }
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
      { name: 'template', label: 'Template', type: 'code', default: 'Hello {{payload.name}}!' }
    ]
  },
  {
    type: 'loop',
    label: 'Loop',
    category: 'logic',
    color: '#3b82f6',
    inputs: 1,
    outputs: 2,
    icon: '🔁',
    description: 'Iterate over array items',
    configFields: [
      { name: 'property', label: 'Array Property', type: 'string', default: 'payload.items' }
    ]
  },
  {
    type: 'try-catch',
    label: 'Try/Catch',
    category: 'logic',
    color: '#3b82f6',
    inputs: 1,
    outputs: 2,
    icon: '🛡️',
    description: 'Handle errors gracefully',
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
    type: 'db-insert',
    label: 'DB Insert',
    category: 'data',
    color: '#8b5cf6',
    inputs: 1,
    outputs: 1,
    icon: '📥',
    description: 'Insert a row into user datatable (user-data.sqlite)',
    configFields: [
      { name: 'table', label: 'Table', type: 'string', default: 'records' },
      { name: 'columns', label: 'Columns', type: 'code', default: '["id", "name", "value"]' }
    ]
  },
  {
    type: 'db-query',
    label: 'DB Query',
    category: 'data',
    color: '#8b5cf6',
    inputs: 1,
    outputs: 1,
    icon: '📊',
    description: 'Query rows from user datatable and pass to downstream',
    configFields: [
      { name: 'query', label: 'SQL Query', type: 'code', default: 'SELECT * FROM records WHERE id = ?' },
      { name: 'params', label: 'Parameters', type: 'code', default: '[msg.payload.id]' }
    ]
  },
  {
    type: 'db-update',
    label: 'DB Update',
    category: 'data',
    color: '#8b5cf6',
    inputs: 1,
    outputs: 1,
    icon: '📝',
    description: 'Update rows in datatable',
    configFields: [
      { name: 'table', label: 'Table', type: 'string', default: 'records' },
      { name: 'where', label: 'Where', type: 'string', default: 'id = ?' }
    ]
  },
  {
    type: 'db-delete',
    label: 'DB Delete',
    category: 'data',
    color: '#8b5cf6',
    inputs: 1,
    outputs: 1,
    icon: '🗑️',
    description: 'Delete rows from datatable',
    configFields: [
      { name: 'table', label: 'Table', type: 'string', default: 'records' },
      { name: 'where', label: 'Where', type: 'string', default: 'id = ?' }
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
    type: 'aggregate',
    label: 'Aggregate',
    category: 'data',
    color: '#8b5cf6',
    inputs: 1,
    outputs: 1,
    icon: '📈',
    description: 'Calculate sum, avg, count, etc.',
    configFields: [
      { name: 'operation', label: 'Operation', type: 'select', options: ['sum', 'avg', 'count', 'min', 'max'], default: 'sum' },
      { name: 'field', label: 'Field', type: 'string', default: 'value' }
    ]
  },
  {
    type: 'cache',
    label: 'Cache',
    category: 'data',
    color: '#8b5cf6',
    inputs: 1,
    outputs: 1,
    icon: '💾',
    description: 'Store and retrieve cached data',
    configFields: [
      { name: 'operation', label: 'Operation', type: 'select', options: ['get', 'set', 'delete'], default: 'get' },
      { name: 'key', label: 'Key', type: 'string', default: 'myKey' },
      { name: 'ttl', label: 'TTL (seconds)', type: 'number', default: 3600 }
    ]
  },
  {
    type: 'json-parse',
    label: 'JSON Parse',
    category: 'data',
    color: '#8b5cf6',
    inputs: 1,
    outputs: 1,
    icon: '{ }',
    description: 'Parse JSON string to object'
  },
  {
    type: 'json-stringify',
    label: 'JSON Stringify',
    category: 'data',
    color: '#8b5cf6',
    inputs: 1,
    outputs: 1,
    icon: '"{ }"',
    description: 'Convert object to JSON string'
  }
];

export const nodeDefinitionMap = new Map(nodeDefinitions.map(n => [n.type, n]));
