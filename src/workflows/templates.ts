import type { WorkflowDefinition } from "../types/index.ts";

export interface Project {
  id: string;
  name: string;
  workflows: WorkflowDefinition[];
  createdAt: number;
  updatedAt: number;
}

// Hyperflow Demo Template
const hyperflowDemoTemplate: WorkflowDefinition = {
  id: 'template-hyperflow-demo',
  name: '🌊 Hyperflow Demo',
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

// Hyperflow AI + Tools Demo Template
const hyperflowAiToolsTemplate: WorkflowDefinition = {
  id: 'template-hyperflow-ai-tools',
  name: '🤖 Hyperflow AI + Tools',
  type: 'flow',
  nodes: [
    {
      id: 'inject-ai',
      type: 'inject',
      name: 'Inject Query',
      config: {
        payload: JSON.stringify({
          query: 'What is the weather like?',
          location: 'Tokyo'
        })
      },
      wires: [['hyperflow-ai']],
      position: { x: 100, y: 200 }
    },
    {
      id: 'hyperflow-ai',
      type: 'hyperflow',
      name: 'AI + Tools Pipeline',
      config: {
        code: `// Hyperflow with AI and Tools Demo
hyper
  .state('query', input.query)
  .state('location', input.location)
  
  // Register tools
  .tool('getWeather', async (location) => {
    // Simulated weather API
    const temps = { Tokyo: 22, London: 15, NYC: 18, Paris: 17 };
    return {
      location,
      temperature: temps[location] || 20,
      condition: 'Sunny',
      humidity: 65
    };
  })
  
  .tool('formatResponse', (data) => {
    return \`Weather in \${data.location}: \${data.temperature}°C, \${data.condition}\`;
  })
  
  // Step 1: Call weather tool
  .step('fetchWeather', async (ctx, { callTool }) => {
    const weather = await callTool('getWeather', ctx.location.value);
    ctx.weather = new Signal(weather);
  })
  
  // Step 2: Format the response
  .step('format', async (ctx, { callTool }) => {
    const formatted = await callTool('formatResponse', ctx.weather.value);
    ctx.formatted = new Signal(formatted);
  })
  
  // DAG: Parallel enrichment
  .dag('enrich', (g) => {
    g.node('timestamp', async (ctx) => {
      ctx.timestamp = new Signal(new Date().toISOString());
    });
    
    g.node('metadata', async (ctx) => {
      ctx.metadata = new Signal({
        source: 'hyperflow',
        version: '1.0'
      });
    });
    
    g.node('result', ['timestamp', 'metadata'], async (ctx) => {
      ctx.result = new Signal({
        query: ctx.query.value,
        response: ctx.formatted.value,
        weather: ctx.weather.value,
        timestamp: ctx.timestamp.value,
        metadata: ctx.metadata.value
      });
    });
  });`,
        aiConfig: null
      },
      wires: [['debug-ai']],
      position: { x: 350, y: 200 }
    },
    {
      id: 'debug-ai',
      type: 'debug',
      name: 'Output',
      config: { output: 'full' },
      wires: [[]],
      position: { x: 600, y: 200 }
    }
  ]
};

// Hyperflow DAG Demo Template
const hyperflowDagTemplate: WorkflowDefinition = {
  id: 'template-hyperflow-dag',
  name: '🔀 Hyperflow DAG Demo',
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

// Pre-built template workflows - vertical layout
export const templateWorkflows: WorkflowDefinition[] = [
  // Kitchen Sink - All 16 nodes in one workflow
  {
    id: 'template-kitchen-sink',
    name: '🚀 Kitchen Sink (All Nodes)',
    type: 'flow',
    nodes: [
      // === LEFT COLUMN: HTTP Flow ===
      // Row 1: Input triggers
      { id: 'inject1', type: 'inject', name: 'Manual Trigger', config: { payload: { source: 'manual', items: [10, 20, 30], name: 'Test User' } }, wires: [['func1']], position: { x: 100, y: 50 } },
      { id: 'trigger1', type: 'trigger', name: 'Auto Trigger', config: {}, wires: [['func1']], position: { x: 250, y: 50 } },
      
      // Row 2: Function processing
      { id: 'func1', type: 'function', name: 'Enrich Data', config: { code: 'msg.payload.timestamp = Date.now();\nmsg.payload.processed = true;\nlog("Enriched: " + JSON.stringify(msg.payload));\nreturn msg;' }, wires: [['transform1']], position: { x: 175, y: 150 } },
      
      // Row 3: Transform
      { id: 'transform1', type: 'transform', name: 'Add Status', config: { operation: 'set', field: 'status', value: 'active' }, wires: [['filter1']], position: { x: 175, y: 250 } },
      
      // Row 4: Filter with branching
      { id: 'filter1', type: 'filter', name: 'Check Items', config: { condition: 'msg.payload.items && msg.payload.items.length > 0' }, wires: [['split1'], ['debug_empty']], position: { x: 175, y: 350 } },
      
      // Row 5: Split branch (left) and empty branch (right)
      { id: 'split1', type: 'split', name: 'Split Items', config: {}, wires: [['delay1']], position: { x: 100, y: 450 } },
      { id: 'debug_empty', type: 'debug', name: 'No Items', config: { output: 'full' }, wires: [[]], position: { x: 280, y: 450 } },
      
      // Row 6: Delay
      { id: 'delay1', type: 'delay', name: 'Wait 500ms', config: { delay: 500 }, wires: [['join1']], position: { x: 100, y: 550 } },
      
      // Row 7: Join
      { id: 'join1', type: 'join', name: 'Collect Results', config: {}, wires: [['template1']], position: { x: 100, y: 650 } },
      
      // Row 8: Template
      { id: 'template1', type: 'template', name: 'Format Output', config: { template: 'Hello {{payload.name}}! Processed {{payload.items.length}} items.' }, wires: [['http_req1']], position: { x: 100, y: 750 } },
      
      // Row 9: HTTP Request
      { id: 'http_req1', type: 'http-request', name: 'Call API', config: { method: 'GET', url: 'https://jsonplaceholder.typicode.com/posts/1' }, wires: [['debug_final']], position: { x: 100, y: 850 } },
      
      // Row 10: Final Debug
      { id: 'debug_final', type: 'debug', name: 'Final Output', config: { output: 'payload' }, wires: [[]], position: { x: 100, y: 950 } },
      
      // === RIGHT COLUMN: HTTP Server + MQTT Flow ===
      // HTTP In listener
      { id: 'http_in1', type: 'http-in', name: 'HTTP Endpoint', config: { method: 'POST', path: '/api/data' }, wires: [['func2']], position: { x: 450, y: 50 } },
      
      // Process HTTP request
      { id: 'func2', type: 'function', name: 'Process Request', config: { code: 'log("HTTP Request received");\nmsg.payload.receivedAt = Date.now();\nreturn msg;' }, wires: [['http_resp1', 'mqtt_out1']], position: { x: 450, y: 150 } },
      
      // HTTP Response
      { id: 'http_resp1', type: 'http-response', name: 'Send Response', config: { statusCode: 200 }, wires: [[]], position: { x: 380, y: 250 } },
      
      // MQTT Out
      { id: 'mqtt_out1', type: 'mqtt-out', name: 'Publish Event', config: { topic: 'events/http' }, wires: [[]], position: { x: 520, y: 250 } },
      
      // === FAR RIGHT: MQTT Subscriber ===
      { id: 'mqtt_in1', type: 'mqtt-in', name: 'Subscribe Events', config: { topic: 'events/#' }, wires: [['debug_mqtt']], position: { x: 650, y: 50 } },
      { id: 'debug_mqtt', type: 'debug', name: 'MQTT Log', config: { output: 'full' }, wires: [[]], position: { x: 650, y: 150 } }
    ]
  },
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
  },
  {
    id: 'template-ui-dashboard',
    name: '📊 UI Dashboard Demo',
    type: 'flow',
    nodes: [
      // === MQTT PUBLISHERS (Left side) ===
      // Temperature publisher
      { id: '1', type: 'inject', name: 'Send Temp', config: { payload: {} }, wires: [['2']], position: { x: 50, y: 50 } },
      { id: '2', type: 'function', name: 'Gen Temp', config: { code: 'msg.payload = Math.round(Math.random() * 40 + 10);\nreturn msg;' }, wires: [['3']], position: { x: 50, y: 130 } },
      { id: '3', type: 'mqtt-out', name: 'Pub Temp', config: { topic: 'sensors/temperature' }, wires: [[]], position: { x: 50, y: 210 } },
      
      // Humidity publisher
      { id: '4', type: 'inject', name: 'Send Humidity', config: { payload: {} }, wires: [['5']], position: { x: 50, y: 290 } },
      { id: '5', type: 'function', name: 'Gen Humidity', config: { code: 'msg.payload = Math.round(Math.random() * 100);\nreturn msg;' }, wires: [['6']], position: { x: 50, y: 370 } },
      { id: '6', type: 'mqtt-out', name: 'Pub Humidity', config: { topic: 'sensors/humidity' }, wires: [[]], position: { x: 50, y: 450 } },
      
      // Status publisher
      { id: '7', type: 'inject', name: 'Send Status', config: { payload: {} }, wires: [['8']], position: { x: 50, y: 530 } },
      { id: '8', type: 'function', name: 'Gen Status', config: { code: 'msg.payload = Math.random() > 0.5;\nreturn msg;' }, wires: [['9']], position: { x: 50, y: 610 } },
      { id: '9', type: 'mqtt-out', name: 'Pub Status', config: { topic: 'sensors/status' }, wires: [[]], position: { x: 50, y: 690 } },
      
      // Message publisher
      { id: '10', type: 'inject', name: 'Send Message', config: { payload: {} }, wires: [['11']], position: { x: 50, y: 770 } },
      { id: '11', type: 'function', name: 'Gen Message', config: { code: 'msg.payload = "Sensor reading at " + new Date().toLocaleTimeString();\nreturn msg;' }, wires: [['12']], position: { x: 50, y: 850 } },
      { id: '12', type: 'mqtt-out', name: 'Pub Message', config: { topic: 'sensors/message' }, wires: [[]], position: { x: 50, y: 930 } },
      
      // === MQTT SUBSCRIBERS (Middle) ===
      { id: '13', type: 'mqtt-in', name: 'Sub Temp', config: { topic: 'sensors/temperature' }, wires: [['17']], position: { x: 250, y: 130 } },
      { id: '14', type: 'mqtt-in', name: 'Sub Humidity', config: { topic: 'sensors/humidity' }, wires: [['18']], position: { x: 250, y: 370 } },
      { id: '15', type: 'mqtt-in', name: 'Sub Status', config: { topic: 'sensors/status' }, wires: [['19']], position: { x: 250, y: 610 } },
      { id: '16', type: 'mqtt-in', name: 'Sub Message', config: { topic: 'sensors/message' }, wires: [['20']], position: { x: 250, y: 850 } },
      
      // === UI DASHBOARD (Right side) ===
      { id: '17', type: 'ui-gauge', name: 'Temperature', config: { label: 'Temperature', min: 0, max: 50, unit: '°C' }, wires: [[]], position: { x: 450, y: 130 } },
      { id: '18', type: 'ui-gauge', name: 'Humidity', config: { label: 'Humidity', min: 0, max: 100, unit: '%' }, wires: [[]], position: { x: 450, y: 370 } },
      { id: '19', type: 'ui-switch', name: 'System Status', config: { label: 'System Active' }, wires: [[]], position: { x: 450, y: 610 } },
      { id: '20', type: 'ui-text', name: 'Last Update', config: { label: 'Last Update', format: '{{payload}}' }, wires: [[]], position: { x: 450, y: 850 } }
    ]
  },
  // Hyperflow templates
  hyperflowDemoTemplate,
  hyperflowAiToolsTemplate,
  hyperflowDagTemplate
];

export const defaultProject: Project = {
  id: 'default',
  name: 'My Project',
  workflows: [
    // Kitchen Sink - All 16 nodes in one workflow
    {
      id: 'kitchen-sink',
      name: '🚀 Kitchen Sink (All Nodes)',
      type: 'flow',
      nodes: [
        // === LEFT COLUMN: HTTP Flow ===
        { id: 'inject1', type: 'inject', name: 'Manual Trigger', config: { payload: { source: 'manual', items: [10, 20, 30], name: 'Test User' } }, wires: [['func1']], position: { x: 100, y: 50 } },
        { id: 'trigger1', type: 'trigger', name: 'Auto Trigger', config: {}, wires: [['func1']], position: { x: 250, y: 50 } },
        { id: 'func1', type: 'function', name: 'Enrich Data', config: { code: 'msg.payload.timestamp = Date.now();\nmsg.payload.processed = true;\nlog("Enriched: " + JSON.stringify(msg.payload));\nreturn msg;' }, wires: [['transform1']], position: { x: 175, y: 150 } },
        { id: 'transform1', type: 'transform', name: 'Add Status', config: { operation: 'set', field: 'status', value: 'active' }, wires: [['filter1']], position: { x: 175, y: 250 } },
        { id: 'filter1', type: 'filter', name: 'Check Items', config: { condition: 'msg.payload.items && msg.payload.items.length > 0' }, wires: [['split1'], ['debug_empty']], position: { x: 175, y: 350 } },
        { id: 'split1', type: 'split', name: 'Split Items', config: {}, wires: [['delay1']], position: { x: 100, y: 450 } },
        { id: 'debug_empty', type: 'debug', name: 'No Items', config: { output: 'full' }, wires: [[]], position: { x: 280, y: 450 } },
        { id: 'delay1', type: 'delay', name: 'Wait 500ms', config: { delay: 500 }, wires: [['join1']], position: { x: 100, y: 550 } },
        { id: 'join1', type: 'join', name: 'Collect Results', config: {}, wires: [['template1']], position: { x: 100, y: 650 } },
        { id: 'template1', type: 'template', name: 'Format Output', config: { template: 'Hello {{payload.name}}! Processed {{payload.items.length}} items.' }, wires: [['http_req1']], position: { x: 100, y: 750 } },
        { id: 'http_req1', type: 'http-request', name: 'Call API', config: { method: 'GET', url: 'https://jsonplaceholder.typicode.com/posts/1' }, wires: [['debug_final']], position: { x: 100, y: 850 } },
        { id: 'debug_final', type: 'debug', name: 'Final Output', config: { output: 'payload' }, wires: [[]], position: { x: 100, y: 950 } },
        // === RIGHT COLUMN: HTTP Server + MQTT ===
        { id: 'http_in1', type: 'http-in', name: 'HTTP Endpoint', config: { method: 'POST', path: '/api/data' }, wires: [['func2']], position: { x: 450, y: 50 } },
        { id: 'func2', type: 'function', name: 'Process Request', config: { code: 'log("HTTP Request received");\nmsg.payload.receivedAt = Date.now();\nreturn msg;' }, wires: [['http_resp1', 'mqtt_out1']], position: { x: 450, y: 150 } },
        { id: 'http_resp1', type: 'http-response', name: 'Send Response', config: { statusCode: 200 }, wires: [[]], position: { x: 380, y: 250 } },
        { id: 'mqtt_out1', type: 'mqtt-out', name: 'Publish Event', config: { topic: 'events/http' }, wires: [[]], position: { x: 520, y: 250 } },
        { id: 'mqtt_in1', type: 'mqtt-in', name: 'Subscribe Events', config: { topic: 'events/#' }, wires: [['debug_mqtt']], position: { x: 650, y: 50 } },
        { id: 'debug_mqtt', type: 'debug', name: 'MQTT Log', config: { output: 'full' }, wires: [[]], position: { x: 650, y: 150 } }
      ]
    },
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
    },
    // Simple AI Demo: Inject -> Prompt -> AI -> Format -> Debug
    {
      id: 'demo-ai-simple',
      name: '🤖 AI Demo (Simple)',
      type: 'flow',
      nodes: [
        { id: '1', type: 'inject', name: 'Trigger', config: { payload: { prompt: 'Write a haiku about programming' } }, wires: [['2']], position: { x: 200, y: 50 } },
        { id: '2', type: 'ai-generate', name: 'Call AI', config: { aiConfig: null, prompt: '{{payload.prompt}}', temperature: 0.7 }, wires: [['3']], position: { x: 200, y: 150 } },
        { id: '3', type: 'function', name: 'Format Response', config: { code: 'msg.payload = {\n  prompt: msg.payload.prompt,\n  response: msg.payload.response,\n  timestamp: new Date().toLocaleTimeString()\n};\nreturn msg;' }, wires: [['4']], position: { x: 200, y: 250 } },
        { id: '4', type: 'debug', name: 'Show Result', config: { output: 'payload' }, wires: [[]], position: { x: 200, y: 350 } }
      ]
    },
    {
      id: 'demo-loop-ai',
      name: '🔁 Loop + AI Demo',
      type: 'flow',
      nodes: [
        { id: '1', type: 'inject', name: 'Start', config: { payload: {} }, wires: [['2']], position: { x: 100, y: 50 } },
        { id: '2', type: 'data-table', name: 'Load Prompts', config: { data: '[{"prompt":"Write a short joke about cats"},{"prompt":"Write a short joke about dogs"},{"prompt":"Write a short joke about birds"}]' }, wires: [['3']], position: { x: 100, y: 150 } },
        { id: '3', type: 'loop', name: 'Foreach Item', config: { mode: 'foreach', count: 3, arrayPath: 'payload.table' }, wires: [['4']], position: { x: 100, y: 250 } },
        { id: '4', type: 'ai-generate', name: 'Generate Joke', config: { aiConfig: null, prompt: '{{payload.prompt}}', temperature: 0.9 }, wires: [['5']], position: { x: 100, y: 350 } },
        { id: '5', type: 'debug', name: 'Show Result', config: { output: 'payload' }, wires: [[]], position: { x: 100, y: 450 } }
      ]
    },
    {
      id: 'demo-ui-dashboard',
      name: '📊 UI Dashboard Demo',
      type: 'flow',
      nodes: [
        // === MQTT PUBLISHERS (Left side) ===
        // Temperature publisher
        { id: '1', type: 'inject', name: 'Send Temp', config: { payload: {} }, wires: [['2']], position: { x: 50, y: 50 } },
        { id: '2', type: 'function', name: 'Gen Temp', config: { code: 'msg.payload = Math.round(Math.random() * 40 + 10);\nreturn msg;' }, wires: [['3']], position: { x: 50, y: 130 } },
        { id: '3', type: 'mqtt-out', name: 'Pub Temp', config: { topic: 'sensors/temperature' }, wires: [[]], position: { x: 50, y: 210 } },
        
        // Humidity publisher
        { id: '4', type: 'inject', name: 'Send Humidity', config: { payload: {} }, wires: [['5']], position: { x: 50, y: 290 } },
        { id: '5', type: 'function', name: 'Gen Humidity', config: { code: 'msg.payload = Math.round(Math.random() * 100);\nreturn msg;' }, wires: [['6']], position: { x: 50, y: 370 } },
        { id: '6', type: 'mqtt-out', name: 'Pub Humidity', config: { topic: 'sensors/humidity' }, wires: [[]], position: { x: 50, y: 450 } },
        
        // Status publisher
        { id: '7', type: 'inject', name: 'Send Status', config: { payload: {} }, wires: [['8']], position: { x: 50, y: 530 } },
        { id: '8', type: 'function', name: 'Gen Status', config: { code: 'msg.payload = Math.random() > 0.5;\nreturn msg;' }, wires: [['9']], position: { x: 50, y: 610 } },
        { id: '9', type: 'mqtt-out', name: 'Pub Status', config: { topic: 'sensors/status' }, wires: [[]], position: { x: 50, y: 690 } },
        
        // Message publisher
        { id: '10', type: 'inject', name: 'Send Message', config: { payload: {} }, wires: [['11']], position: { x: 50, y: 770 } },
        { id: '11', type: 'function', name: 'Gen Message', config: { code: 'msg.payload = "Sensor reading at " + new Date().toLocaleTimeString();\nreturn msg;' }, wires: [['12']], position: { x: 50, y: 850 } },
        { id: '12', type: 'mqtt-out', name: 'Pub Message', config: { topic: 'sensors/message' }, wires: [[]], position: { x: 50, y: 930 } },
        
        // === MQTT SUBSCRIBERS (Middle) ===
        { id: '13', type: 'mqtt-in', name: 'Sub Temp', config: { topic: 'sensors/temperature' }, wires: [['17']], position: { x: 250, y: 130 } },
        { id: '14', type: 'mqtt-in', name: 'Sub Humidity', config: { topic: 'sensors/humidity' }, wires: [['18']], position: { x: 250, y: 370 } },
        { id: '15', type: 'mqtt-in', name: 'Sub Status', config: { topic: 'sensors/status' }, wires: [['19']], position: { x: 250, y: 610 } },
        { id: '16', type: 'mqtt-in', name: 'Sub Message', config: { topic: 'sensors/message' }, wires: [['20']], position: { x: 250, y: 850 } },
        
        // === UI DASHBOARD (Right side) ===
        { id: '17', type: 'ui-gauge', name: 'Temperature', config: { label: 'Temperature', min: 0, max: 50, unit: '°C' }, wires: [[]], position: { x: 450, y: 130 } },
        { id: '18', type: 'ui-gauge', name: 'Humidity', config: { label: 'Humidity', min: 0, max: 100, unit: '%' }, wires: [[]], position: { x: 450, y: 370 } },
        { id: '19', type: 'ui-switch', name: 'System Status', config: { label: 'System Active' }, wires: [[]], position: { x: 450, y: 610 } },
        { id: '20', type: 'ui-text', name: 'Last Update', config: { label: 'Last Update', format: '{{payload}}' }, wires: [[]], position: { x: 450, y: 850 } }
      ]
    },
    // Hyperflow AI + Tools Demo
    {
      id: 'demo-hyperflow-ai',
      name: '🤖 Hyperflow AI + Tools',
      type: 'flow',
      nodes: [
        {
          id: 'inject-ai-demo',
          type: 'inject',
          name: 'Inject Query',
          config: {
            payload: JSON.stringify({
              query: 'Summarize this data',
              items: ['apple', 'banana', 'cherry'],
              count: 3
            })
          },
          wires: [['hyperflow-ai-demo']],
          position: { x: 100, y: 200 }
        },
        {
          id: 'hyperflow-ai-demo',
          type: 'hyperflow',
          name: 'AI + Tools Pipeline',
          config: {
            code: `// Hyperflow with Tools Demo
hyper
  .state('query', input.query)
  .state('items', input.items)
  
  // Tool: Transform items
  .tool('transform', (items) => items.map(i => i.toUpperCase()))
  
  // Tool: Count items
  .tool('count', (items) => ({ total: items.length, items }))
  
  // Tool: Generate summary
  .tool('summarize', (data) => \`Processed \${data.total} items: \${data.items.join(', ')}\`)
  
  // Step 1: Transform
  .step('transform', async (ctx, { callTool }) => {
    ctx.transformed = new Signal(await callTool('transform', ctx.items.value));
  })
  
  // Step 2: Count
  .step('count', async (ctx, { callTool }) => {
    ctx.counted = new Signal(await callTool('count', ctx.transformed.value));
  })
  
  // Step 3: Summarize
  .step('summarize', async (ctx, { callTool }) => {
    ctx.summary = new Signal(await callTool('summarize', ctx.counted.value));
  })
  
  // DAG: Final assembly
  .dag('assemble', (g) => {
    g.node('meta', async (ctx) => {
      ctx.meta = new Signal({ ts: Date.now(), version: '1.0' });
    });
    
    g.node('result', ['meta'], async (ctx) => {
      ctx.result = new Signal({
        query: ctx.query.value,
        summary: ctx.summary.value,
        data: ctx.counted.value,
        meta: ctx.meta.value
      });
    });
  });`
          },
          wires: [['debug-ai-demo']],
          position: { x: 350, y: 200 }
        },
        {
          id: 'debug-ai-demo',
          type: 'debug',
          name: 'Output',
          config: { output: 'full' },
          wires: [[]],
          position: { x: 600, y: 200 }
        }
      ]
    },
    // Hyperflow Demo: Inject -> Hyperflow -> Debug
    {
      id: 'demo-hyperflow',
      name: '🌊 Hyperflow Demo',
      type: 'flow',
      nodes: [
        {
          id: 'inject-hf',
          type: 'inject',
          name: 'Inject Payload',
          config: {
            payload: JSON.stringify({
              user: 'Kamera',
              items: ['apple', 'banana', 'cherry'],
              count: 3
            })
          },
          wires: [['hyperflow-hf']],
          position: { x: 100, y: 200 }
        },
        {
          id: 'hyperflow-hf',
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
          wires: [['debug-hf']],
          position: { x: 350, y: 200 }
        },
        {
          id: 'debug-hf',
          type: 'debug',
          name: 'Output Debug',
          config: {
            output: 'full'
          },
          wires: [[]],
          position: { x: 600, y: 200 }
        }
      ]
    }
  ],
  createdAt: Date.now(),
  updatedAt: Date.now()
};
