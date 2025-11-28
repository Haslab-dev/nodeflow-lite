import type { WorkflowDefinition } from "../types/index.ts";

// Example 1: Simple HTTP to Debug
export const simpleWorkflow: WorkflowDefinition = {
  id: 'simple-http',
  name: 'Simple HTTP Request',
  nodes: [
    {
      id: '1',
      type: 'trigger',
      name: 'Start',
      config: {},
      wires: [['2']]
    },
    {
      id: '2',
      type: 'http-request',
      name: 'Fetch Data',
      config: {
        method: 'GET',
        url: 'https://jsonplaceholder.typicode.com/posts/1'
      },
      wires: [['3']]
    },
    {
      id: '3',
      type: 'debug',
      name: 'Log Result',
      config: { output: 'payload' },
      wires: [[]]
    }
  ]
};

// Example 2: Filter and Transform
export const filterWorkflow: WorkflowDefinition = {
  id: 'filter-transform',
  name: 'Filter and Transform',
  nodes: [
    {
      id: '1',
      type: 'inject',
      name: 'Inject Data',
      config: {
        payload: { value: 42, name: 'test' }
      },
      wires: [['2']]
    },
    {
      id: '2',
      type: 'filter',
      name: 'Check Value',
      config: {
        condition: 'msg.payload.value > 10'
      },
      wires: [['3'], ['4']]
    },
    {
      id: '3',
      type: 'debug',
      name: 'Value > 10',
      config: {},
      wires: [[]]
    },
    {
      id: '4',
      type: 'debug',
      name: 'Value <= 10',
      config: {},
      wires: [[]]
    }
  ]
};

// Example 3: Function Processing
export const functionWorkflow: WorkflowDefinition = {
  id: 'function-workflow',
  name: 'Function Processing',
  nodes: [
    {
      id: '1',
      type: 'inject',
      name: 'Start',
      config: {
        payload: { numbers: [1, 2, 3, 4, 5] }
      },
      wires: [['2']]
    },
    {
      id: '2',
      type: 'function',
      name: 'Process Numbers',
      config: {
        code: `
          const numbers = msg.payload.numbers;
          const doubled = numbers.map(n => n * 2);
          const sum = doubled.reduce((a, b) => a + b, 0);
          log('Doubled: ' + doubled.join(', '));
          return { payload: { doubled, sum } };
        `
      },
      wires: [['3']]
    },
    {
      id: '3',
      type: 'debug',
      name: 'Show Result',
      config: {},
      wires: [[]]
    }
  ]
};

// Example 4: Complex Pipeline
export const complexWorkflow: WorkflowDefinition = {
  id: 'complex-pipeline',
  name: 'Complex Data Pipeline',
  nodes: [
    {
      id: '1',
      type: 'trigger',
      name: 'Start Pipeline',
      config: {},
      wires: [['2']]
    },
    {
      id: '2',
      type: 'http-request',
      name: 'Fetch Users',
      config: {
        method: 'GET',
        url: 'https://jsonplaceholder.typicode.com/users'
      },
      wires: [['3']]
    },
    {
      id: '3',
      type: 'function',
      name: 'Extract Emails',
      config: {
        code: `
          const users = msg.payload;
          const emails = users.map(u => u.email);
          log('Extracted ' + emails.length + ' emails');
          return { payload: emails };
        `
      },
      wires: [['4']]
    },
    {
      id: '4',
      type: 'split',
      name: 'Split Emails',
      config: {},
      wires: [['5']]
    },
    {
      id: '5',
      type: 'function',
      name: 'Format Email',
      config: {
        code: `
          return { 
            payload: { 
              email: msg.payload, 
              domain: msg.payload.split('@')[1] 
            } 
          };
        `
      },
      wires: [['6']]
    },
    {
      id: '6',
      type: 'debug',
      name: 'Log Email',
      config: {},
      wires: [[]]
    }
  ]
};