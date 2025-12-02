import type { WorkflowDefinition } from "../types/index.ts";

// Example 1: Simple HTTP to Debug
export const simpleWorkflow: WorkflowDefinition = {
  id: 'simple-http',
  name: 'Simple HTTP Request',
  type: 'flow',
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
  type: 'flow',
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
  type: 'flow',
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
  type: 'flow',
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

// Example 5: Hyperflow Demo - Inject -> Hyperflow -> Debug
export const hyperflowDemoWorkflow: WorkflowDefinition = {
  id: 'hyperflow-demo',
  name: 'Hyperflow Demo',
  type: 'flow',
  nodes: [
    {
      id: 'inject-1',
      type: 'inject',
      name: 'Inject Payload',
      config: {
        payload: JSON.stringify({
          user: 'Kamera',
          items: ['apple', 'banana', 'cherry'],
          count: 3
        })
      },
      wires: [['hyperflow-1']],
      position: { x: 100, y: 200 }
    },
    {
      id: 'hyperflow-1',
      type: 'hyperflow',
      name: 'Hyperflow Pipeline',
      config: {
        code: `// Hyperflow DAG Pipeline Demo
hyper
  .state('user', input.user)
  .state('items', input.items)
  .state('processed', null)
  
  // Step 1: Process items
  .step('processItems', async (ctx) => {
    const items = ctx.items.value;
    ctx.processed = new Signal({
      items: items.map(i => i.toUpperCase()),
      count: items.length
    });
  })
  
  // DAG: Parallel processing
  .dag('parallelTasks', (g) => {
    // Task A: Generate metadata (no deps)
    g.node('meta', async (ctx) => {
      ctx.meta = new Signal({
        timestamp: Date.now(),
        version: '1.0'
      });
    });
    
    // Task B: Generate stats (no deps)
    g.node('stats', async (ctx) => {
      ctx.stats = new Signal({
        itemCount: ctx.processed.value.count,
        user: ctx.user.value
      });
    });
    
    // Task C: Combine results (depends on meta + stats)
    g.node('combine', ['meta', 'stats'], async (ctx) => {
      ctx.result = new Signal({
        data: ctx.processed.value,
        meta: ctx.meta.value,
        stats: ctx.stats.value,
        status: 'completed'
      });
    });
  });`
      },
      wires: [['debug-1']],
      position: { x: 350, y: 200 }
    },
    {
      id: 'debug-1',
      type: 'debug',
      name: 'Output Debug',
      config: {
        output: 'full'
      },
      wires: [[]],
      position: { x: 600, y: 200 }
    }
  ]
};

// Example 6: Hyperflow DAG Node Demo
export const hyperflowDagWorkflow: WorkflowDefinition = {
  id: 'hyperflow-dag-demo',
  name: 'Hyperflow DAG Demo',
  type: 'flow',
  nodes: [
    {
      id: 'inject-dag',
      type: 'inject',
      name: 'Inject Data',
      config: {
        payload: JSON.stringify({
          value: 100,
          multiplier: 2
        })
      },
      wires: [['dag-1']],
      position: { x: 100, y: 200 }
    },
    {
      id: 'dag-1',
      type: 'hyperflow-dag',
      name: 'Parallel DAG',
      config: {
        dagName: 'compute-dag',
        nodes: JSON.stringify([
          {
            id: 'double',
            deps: [],
            code: `ctx.doubled = new Signal(ctx.input.value.value * 2);`
          },
          {
            id: 'square',
            deps: [],
            code: `ctx.squared = new Signal(ctx.input.value.value ** 2);`
          },
          {
            id: 'multiply',
            deps: [],
            code: `ctx.multiplied = new Signal(ctx.input.value.value * ctx.input.value.multiplier);`
          },
          {
            id: 'aggregate',
            deps: ['double', 'square', 'multiply'],
            code: `ctx.result = new Signal({
              original: ctx.input.value.value,
              doubled: ctx.doubled.value,
              squared: ctx.squared.value,
              multiplied: ctx.multiplied.value,
              sum: ctx.doubled.value + ctx.squared.value + ctx.multiplied.value
            });`
          }
        ])
      },
      wires: [['debug-dag']],
      position: { x: 350, y: 200 }
    },
    {
      id: 'debug-dag',
      type: 'debug',
      name: 'DAG Output',
      config: {
        output: 'payload'
      },
      wires: [[]],
      position: { x: 600, y: 200 }
    }
  ]
};