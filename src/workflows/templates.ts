import type { WorkflowDefinition } from "../types/index.ts";

export interface Project {
  id: string;
  name: string;
  workflows: WorkflowDefinition[];
  createdAt: number;
  updatedAt: number;
}

// Hyperflow Demo Template - Vertical Layout
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
      position: { x: 200, y: 50 }
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
      position: { x: 200, y: 150 }
    },
    {
      id: 'debug-1',
      type: 'debug',
      name: 'Output Debug',
      config: {
        output: 'full'
      },
      wires: [[]],
      position: { x: 200, y: 250 }
    }
  ]
};

// Hyperflow AI + Tools Demo Template - Vertical Layout
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
          query: 'What is the weather like in Tokyo? Give me a brief, friendly response.',
          location: 'Tokyo'
        })
      },
      wires: [['hyperflow-ai']],
      position: { x: 200, y: 50 }
    },
    {
      id: 'hyperflow-ai',
      type: 'hyperflow',
      name: 'AI + Tools Pipeline',
      config: {
        code: `// Hyperflow with AI and Tools Demo
// This demo uses REAL AI to generate responses!
hyper
  .state('query', input.query)
  .state('location', input.location)
  
  // Register tools for data fetching
  .tool('getWeather', async (location) => {
    // Simulated weather API (in real app, call actual API)
    const temps = { Tokyo: 22, London: 15, NYC: 18, Paris: 17, Beijing: 19 };
    return {
      location,
      temperature: temps[location] || 20,
      condition: 'Sunny',
      humidity: 65,
      wind: '10 km/h'
    };
  })
  
  // Step 1: Fetch weather data using tool
  .step('fetchWeather', async (ctx, { callTool }) => {
    const weather = await callTool('getWeather', ctx.location.value);
    ctx.weather = new Signal(weather);
  })
  
  // Step 2: Use AI to generate a natural language response
  .ai('aiResponse', (ctx) => {
    const w = ctx.weather.value;
    return \`You are a friendly weather assistant. Based on this weather data for \${w.location}:
- Temperature: \${w.temperature}°C
- Condition: \${w.condition}
- Humidity: \${w.humidity}%
- Wind: \${w.wind}

Please provide a brief, friendly weather summary in 2-3 sentences. Include a suggestion for what to wear or do.\`;
  })
  
  // DAG: Parallel enrichment
  .dag('enrich', (g) => {
    g.node('timestamp', async (ctx) => {
      ctx.timestamp = new Signal(new Date().toISOString());
    });
    
    g.node('metadata', async (ctx) => {
      ctx.metadata = new Signal({
        source: 'hyperflow-ai',
        version: '1.0',
        aiEnabled: true
      });
    });
    
    g.node('result', ['timestamp', 'metadata'], async (ctx) => {
      ctx.result = new Signal({
        query: ctx.query.value,
        location: ctx.location.value,
        weather: ctx.weather.value,
        aiResponse: ctx.aiResponse.value,
        timestamp: ctx.timestamp.value,
        metadata: ctx.metadata.value
      });
    });
  });`,
        // Configure AI - set your API key and provider here
        aiConfig: {
          provider: 'openai-compatible',
          name: 'hyperflow-ai',
          apiKey: '', // User needs to set their API key
          baseUrl: 'https://api.openai.com/v1',
          model: 'gpt-3.5-turbo'
        }
      },
      wires: [['debug-ai']],
      position: { x: 200, y: 150 }
    },
    {
      id: 'debug-ai',
      type: 'debug',
      name: 'Output',
      config: { output: 'full' },
      wires: [[]],
      position: { x: 200, y: 250 }
    }
  ]
};

// Hyperflow DAG Demo Template - Vertical Layout
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
      position: { x: 200, y: 50 }
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
      position: { x: 200, y: 150 }
    },
    {
      id: 'debug-dag',
      type: 'debug',
      name: 'DAG Output',
      config: {
        output: 'payload'
      },
      wires: [[]],
      position: { x: 200, y: 250 }
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
      // === MQTT PUBLISHERS (Left column - vertical flows) ===
      // Temperature publisher flow
      { id: '1', type: 'inject', name: 'Send Temp', config: { payload: {} }, wires: [['2']], position: { x: 50, y: 50 } },
      { id: '2', type: 'function', name: 'Gen Temp', config: { code: 'msg.payload = Math.round(Math.random() * 40 + 10);\nreturn msg;' }, wires: [['3']], position: { x: 50, y: 130 } },
      { id: '3', type: 'mqtt-out', name: 'Pub Temp', config: { topic: 'sensors/temperature' }, wires: [[]], position: { x: 50, y: 210 } },
      
      // Humidity publisher flow
      { id: '4', type: 'inject', name: 'Send Humidity', config: { payload: {} }, wires: [['5']], position: { x: 50, y: 310 } },
      { id: '5', type: 'function', name: 'Gen Humidity', config: { code: 'msg.payload = Math.round(Math.random() * 100);\nreturn msg;' }, wires: [['6']], position: { x: 50, y: 390 } },
      { id: '6', type: 'mqtt-out', name: 'Pub Humidity', config: { topic: 'sensors/humidity' }, wires: [[]], position: { x: 50, y: 470 } },
      
      // Status publisher flow
      { id: '7', type: 'inject', name: 'Send Status', config: { payload: {} }, wires: [['8']], position: { x: 50, y: 570 } },
      { id: '8', type: 'function', name: 'Gen Status', config: { code: 'msg.payload = Math.random() > 0.5;\nreturn msg;' }, wires: [['9']], position: { x: 50, y: 650 } },
      { id: '9', type: 'mqtt-out', name: 'Pub Status', config: { topic: 'sensors/status' }, wires: [[]], position: { x: 50, y: 730 } },
      
      // === MQTT SUBSCRIBERS -> UI (Right column - vertical flows) ===
      // Temperature subscriber -> gauge
      { id: '13', type: 'mqtt-in', name: 'Sub Temp', config: { topic: 'sensors/temperature' }, wires: [['17']], position: { x: 280, y: 50 } },
      { id: '17', type: 'ui-gauge', name: 'Temperature', config: { label: 'Temperature', min: 0, max: 50, unit: '°C' }, wires: [[]], position: { x: 280, y: 130 } },
      
      // Humidity subscriber -> gauge
      { id: '14', type: 'mqtt-in', name: 'Sub Humidity', config: { topic: 'sensors/humidity' }, wires: [['18']], position: { x: 280, y: 230 } },
      { id: '18', type: 'ui-gauge', name: 'Humidity', config: { label: 'Humidity', min: 0, max: 100, unit: '%' }, wires: [[]], position: { x: 280, y: 310 } },
      
      // Status subscriber -> switch
      { id: '15', type: 'mqtt-in', name: 'Sub Status', config: { topic: 'sensors/status' }, wires: [['19']], position: { x: 280, y: 410 } },
      { id: '19', type: 'ui-switch', name: 'System Status', config: { label: 'System Active' }, wires: [[]], position: { x: 280, y: 490 } },
      
      // Message subscriber -> text
      { id: '16', type: 'mqtt-in', name: 'Sub Message', config: { topic: 'sensors/message' }, wires: [['20']], position: { x: 280, y: 590 } },
      { id: '20', type: 'ui-text', name: 'Last Update', config: { label: 'Last Update', format: '{{payload}}' }, wires: [[]], position: { x: 280, y: 670 } }
    ]
  },
  // Hyperflow templates
  hyperflowDemoTemplate,
  hyperflowAiToolsTemplate,
  hyperflowDagTemplate,

  // HTML Output Demo - Real-time dashboard
  {
    id: 'template-html-output-demo',
    name: '🌐 HTML Output Demo',
    type: 'flow',
    nodes: [
      // Interval node sends random data every second
      {
        id: 'interval-1',
        type: 'interval',
        name: 'Random Data',
        config: {
          interval: 1000,
          payload: `{
  value: Math.round(Math.random() * 100),
  status: Math.random() > 0.5 ? 'Online' : 'Processing',
  temperature: (20 + Math.random() * 15).toFixed(1),
  timestamp: new Date().toLocaleTimeString()
}`,
          maxCount: 0
        },
        wires: [['html-out-1']],
        position: { x: 200, y: 50 }
      },
      // HTML Output displays the data
      {
        id: 'html-out-1',
        type: 'html-output',
        name: 'Dashboard Page',
        config: {
          slug: 'demo',
          title: 'Real-time Dashboard',
          html: `<!DOCTYPE html>
<html>
<head>
  <title>Real-time Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: system-ui, -apple-system, sans-serif; 
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      color: #eee;
      padding: 2rem;
    }
    h1 { 
      text-align: center; 
      margin-bottom: 2rem;
      font-weight: 300;
      font-size: 2rem;
    }
    .dashboard {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      max-width: 1000px;
      margin: 0 auto;
    }
    .card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 16px;
      padding: 1.5rem;
      backdrop-filter: blur(10px);
    }
    .card-label {
      color: #888;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 0.5rem;
    }
    .card-value {
      font-size: 3rem;
      font-weight: 600;
      background: linear-gradient(90deg, #00d9ff, #00ff88);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .card-unit {
      font-size: 1.2rem;
      color: #666;
      margin-left: 0.25rem;
    }
    .status-badge {
      display: inline-block;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.9rem;
      font-weight: 500;
    }
    .status-online { background: rgba(0,255,136,0.2); color: #00ff88; }
    .status-processing { background: rgba(255,200,0,0.2); color: #ffc800; }
    .timestamp {
      text-align: center;
      margin-top: 2rem;
      color: #666;
      font-size: 0.9rem;
    }
    .pulse {
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
  </style>
</head>
<body>
  <h1>📊 Real-time Dashboard</h1>
  
  <div class="dashboard">
    <div class="card">
      <div class="card-label">Current Value</div>
      <div class="card-value pulse" data-bind="value">--</div>
    </div>
    
    <div class="card">
      <div class="card-label">Temperature</div>
      <div class="card-value" data-bind="temperature">--</div>
      <span class="card-unit">°C</span>
    </div>
    
    <div class="card">
      <div class="card-label">System Status</div>
      <div class="status-badge status-online" data-bind="status">Waiting...</div>
    </div>
    
    <div class="card">
      <div class="card-label">Last Update</div>
      <div style="font-size: 1.5rem; color: #aaa;" data-bind="timestamp">--:--:--</div>
    </div>
  </div>
  
  <div class="timestamp">
    Visit <strong>/demo/ui</strong> to see this page • Data updates in real-time via WebSocket
  </div>
</body>
</html>`
        },
        wires: [[]],
        position: { x: 200, y: 150 }
      }
    ]
  }
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
        // === MQTT PUBLISHERS (Left column - vertical flows) ===
        // Temperature publisher flow
        { id: '1', type: 'inject', name: 'Send Temp', config: { payload: {} }, wires: [['2']], position: { x: 50, y: 50 } },
        { id: '2', type: 'function', name: 'Gen Temp', config: { code: 'msg.payload = Math.round(Math.random() * 40 + 10);\nreturn msg;' }, wires: [['3']], position: { x: 50, y: 130 } },
        { id: '3', type: 'mqtt-out', name: 'Pub Temp', config: { topic: 'sensors/temperature' }, wires: [[]], position: { x: 50, y: 210 } },
        
        // Humidity publisher flow
        { id: '4', type: 'inject', name: 'Send Humidity', config: { payload: {} }, wires: [['5']], position: { x: 50, y: 310 } },
        { id: '5', type: 'function', name: 'Gen Humidity', config: { code: 'msg.payload = Math.round(Math.random() * 100);\nreturn msg;' }, wires: [['6']], position: { x: 50, y: 390 } },
        { id: '6', type: 'mqtt-out', name: 'Pub Humidity', config: { topic: 'sensors/humidity' }, wires: [[]], position: { x: 50, y: 470 } },
        
        // Status publisher flow
        { id: '7', type: 'inject', name: 'Send Status', config: { payload: {} }, wires: [['8']], position: { x: 50, y: 570 } },
        { id: '8', type: 'function', name: 'Gen Status', config: { code: 'msg.payload = Math.random() > 0.5;\nreturn msg;' }, wires: [['9']], position: { x: 50, y: 650 } },
        { id: '9', type: 'mqtt-out', name: 'Pub Status', config: { topic: 'sensors/status' }, wires: [[]], position: { x: 50, y: 730 } },
        
        // === MQTT SUBSCRIBERS -> UI (Right column - vertical flows) ===
        // Temperature subscriber -> gauge
        { id: '13', type: 'mqtt-in', name: 'Sub Temp', config: { topic: 'sensors/temperature' }, wires: [['17']], position: { x: 280, y: 50 } },
        { id: '17', type: 'ui-gauge', name: 'Temperature', config: { label: 'Temperature', min: 0, max: 50, unit: '°C' }, wires: [[]], position: { x: 280, y: 130 } },
        
        // Humidity subscriber -> gauge
        { id: '14', type: 'mqtt-in', name: 'Sub Humidity', config: { topic: 'sensors/humidity' }, wires: [['18']], position: { x: 280, y: 230 } },
        { id: '18', type: 'ui-gauge', name: 'Humidity', config: { label: 'Humidity', min: 0, max: 100, unit: '%' }, wires: [[]], position: { x: 280, y: 310 } },
        
        // Status subscriber -> switch
        { id: '15', type: 'mqtt-in', name: 'Sub Status', config: { topic: 'sensors/status' }, wires: [['19']], position: { x: 280, y: 410 } },
        { id: '19', type: 'ui-switch', name: 'System Status', config: { label: 'System Active' }, wires: [[]], position: { x: 280, y: 490 } },
        
        // Message subscriber -> text
        { id: '16', type: 'mqtt-in', name: 'Sub Message', config: { topic: 'sensors/message' }, wires: [['20']], position: { x: 280, y: 590 } },
        { id: '20', type: 'ui-text', name: 'Last Update', config: { label: 'Last Update', format: '{{payload}}' }, wires: [[]], position: { x: 280, y: 670 } }
      ]
    },
    // Hyperflow AI + Tools Demo - Vertical Layout
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
              query: 'What is the weather like in Tokyo?',
              location: 'Tokyo'
            })
          },
          wires: [['hyperflow-ai-demo']],
          position: { x: 200, y: 50 }
        },
        {
          id: 'hyperflow-ai-demo',
          type: 'hyperflow',
          name: 'AI + Tools Pipeline',
          config: {
            code: `// Hyperflow with AI and Tools Demo
// This demo uses REAL AI to generate responses!
hyper
  .state('query', input.query)
  .state('location', input.location)
  
  // Tool: Get weather data (simulated API)
  .tool('getWeather', async (location) => {
    const temps = { Tokyo: 22, London: 15, NYC: 18, Paris: 17, Beijing: 19 };
    return {
      location,
      temperature: temps[location] || 20,
      condition: 'Sunny',
      humidity: 65,
      wind: '10 km/h'
    };
  })
  
  // Step 1: Fetch weather using tool
  .step('fetchWeather', async (ctx, { callTool }) => {
    const weather = await callTool('getWeather', ctx.location.value);
    ctx.weather = new Signal(weather);
  })
  
  // Step 2: Use AI to generate natural language response
  .ai('aiResponse', (ctx) => {
    const w = ctx.weather.value;
    return \`You are a friendly weather assistant. Based on this weather data for \${w.location}:
- Temperature: \${w.temperature}°C
- Condition: \${w.condition}
- Humidity: \${w.humidity}%
- Wind: \${w.wind}

Please provide a brief, friendly weather summary in 2-3 sentences.\`;
  })
  
  // DAG: Final assembly
  .dag('assemble', (g) => {
    g.node('meta', async (ctx) => {
      ctx.meta = new Signal({ ts: Date.now(), version: '1.0', aiEnabled: true });
    });
    
    g.node('result', ['meta'], async (ctx) => {
      ctx.result = new Signal({
        query: ctx.query.value,
        location: ctx.location.value,
        weather: ctx.weather.value,
        aiResponse: ctx.aiResponse.value,
        meta: ctx.meta.value
      });
    });
  });`,
            // Configure your AI provider here
            aiConfig: {
              provider: 'openai-compatible',
              name: 'hyperflow-ai',
              apiKey: '', // SET YOUR API KEY HERE
              baseUrl: 'https://api.openai.com/v1',
              model: 'gpt-3.5-turbo'
            }
          },
          wires: [['debug-ai-demo']],
          position: { x: 200, y: 150 }
        },
        {
          id: 'debug-ai-demo',
          type: 'debug',
          name: 'Output',
          config: { output: 'full' },
          wires: [[]],
          position: { x: 200, y: 250 }
        }
      ]
    },
    // Hyperflow Demo: Inject -> Hyperflow -> Debug - Vertical Layout
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
          position: { x: 200, y: 50 }
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
          position: { x: 200, y: 150 }
        },
        {
          id: 'debug-hf',
          type: 'debug',
          name: 'Output Debug',
          config: {
            output: 'full'
          },
          wires: [[]],
          position: { x: 200, y: 250 }
        }
      ]
    },
    // HTML Output Demo - Real-time dashboard with all features
    {
      id: 'demo-html-output',
      name: '🌐 HTML Output Demo',
      type: 'flow',
      nodes: [
        {
          id: 'interval-demo',
          type: 'interval',
          name: 'Sensor Data',
          config: {
            interval: 1000,
            payload: `{
  value: Math.round(Math.random() * 100),
  temperature: 20 + Math.random() * 15,
  humidity: 40 + Math.random() * 40,
  pressure: 1000 + Math.random() * 30,
  status: Math.random() > 0.3 ? 'online' : 'warning',
  cpu: Math.random() * 100,
  memory: 30 + Math.random() * 50,
  requests: Math.floor(Math.random() * 1000),
  errors: Math.floor(Math.random() * 10),
  uptime: Date.now(),
  message: '<strong>System OK</strong> - All services running'
}`,
            maxCount: 0
          },
          wires: [['html-demo']],
          position: { x: 200, y: 50 }
        },
        {
          id: 'html-demo',
          type: 'html-output',
          name: 'Full Demo Dashboard',
          config: {
            slug: 'demo',
            title: 'Real-time Dashboard',
            html: `<!DOCTYPE html>
<html>
<head>
  <title>Real-time Dashboard - Full Demo</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: system-ui, -apple-system, sans-serif; 
      background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
      min-height: 100vh;
      color: #eee;
      padding: 1.5rem;
    }
    
    .header {
      text-align: center;
      margin-bottom: 2rem;
    }
    .header h1 {
      font-size: 1.8rem;
      font-weight: 300;
      margin-bottom: 0.5rem;
    }
    .header .subtitle {
      color: #666;
      font-size: 0.85rem;
    }
    .connection-status {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0.75rem;
      background: rgba(0,255,136,0.1);
      border-radius: 20px;
      font-size: 0.75rem;
      color: #00ff88;
      margin-top: 0.5rem;
    }
    .connection-status.disconnected {
      background: rgba(255,100,100,0.1);
      color: #ff6464;
    }
    .connection-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .dashboard {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.25rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      padding: 1.25rem;
      transition: all 0.3s ease;
    }
    .card:hover {
      background: rgba(255,255,255,0.05);
      border-color: rgba(255,255,255,0.15);
      transform: translateY(-2px);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .card-label {
      color: #888;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .card-badge {
      padding: 0.2rem 0.5rem;
      border-radius: 8px;
      font-size: 0.7rem;
      font-weight: 500;
    }
    .badge-success { background: rgba(0,255,136,0.15); color: #00ff88; }
    .badge-warning { background: rgba(255,200,0,0.15); color: #ffc800; }
    .badge-danger { background: rgba(255,100,100,0.15); color: #ff6464; }
    
    .card-value {
      font-size: 2.5rem;
      font-weight: 600;
      background: linear-gradient(90deg, #00d9ff, #00ff88);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1.2;
    }
    .card-unit {
      font-size: 1rem;
      color: #666;
      margin-left: 0.25rem;
      font-weight: 400;
    }
    
    /* Progress bar */
    .progress-container {
      margin-top: 1rem;
    }
    .progress-bar {
      height: 8px;
      background: rgba(255,255,255,0.1);
      border-radius: 4px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #00d9ff, #00ff88);
      border-radius: 4px;
      transition: width 0.5s ease;
    }
    .progress-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 0.5rem;
      font-size: 0.75rem;
      color: #666;
    }
    
    /* Gauge */
    .gauge-container {
      position: relative;
      width: 120px;
      height: 60px;
      margin: 0 auto;
    }
    .gauge-bg {
      position: absolute;
      width: 120px;
      height: 60px;
      border-radius: 60px 60px 0 0;
      background: rgba(255,255,255,0.1);
      overflow: hidden;
    }
    .gauge-fill {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 120px;
      height: 60px;
      border-radius: 60px 60px 0 0;
      background: linear-gradient(90deg, #00ff88, #ffc800, #ff6464);
      transform-origin: bottom center;
      transition: transform 0.5s ease;
    }
    .gauge-cover {
      position: absolute;
      bottom: 0;
      left: 10px;
      width: 100px;
      height: 50px;
      border-radius: 50px 50px 0 0;
      background: #1a1a2e;
    }
    .gauge-value {
      position: absolute;
      bottom: 5px;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 1.2rem;
      font-weight: 600;
      color: #fff;
    }
    
    /* Stats grid */
    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-top: 0.5rem;
    }
    .stat-item {
      text-align: center;
      padding: 0.75rem;
      background: rgba(255,255,255,0.03);
      border-radius: 8px;
    }
    .stat-value {
      font-size: 1.5rem;
      font-weight: 600;
      color: #00d9ff;
    }
    .stat-label {
      font-size: 0.7rem;
      color: #666;
      margin-top: 0.25rem;
    }
    
    /* Message card */
    .message-content {
      padding: 1rem;
      background: rgba(0,217,255,0.05);
      border-left: 3px solid #00d9ff;
      border-radius: 0 8px 8px 0;
      font-size: 0.9rem;
      line-height: 1.5;
    }
    
    /* History chart placeholder */
    .chart-container {
      height: 80px;
      display: flex;
      align-items: flex-end;
      gap: 4px;
      padding-top: 1rem;
    }
    .chart-bar {
      flex: 1;
      background: linear-gradient(to top, #00d9ff, #00ff88);
      border-radius: 2px 2px 0 0;
      transition: height 0.3s ease;
      min-height: 4px;
    }
    
    .footer {
      text-align: center;
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(255,255,255,0.05);
      color: #444;
      font-size: 0.8rem;
    }
    .footer a {
      color: #00d9ff;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Real-time Dashboard</h1>
    <div class="subtitle">Full Demo - All Binding Features</div>
    <div class="connection-status" id="conn-status">
      <div class="connection-dot"></div>
      <span>Connected</span>
    </div>
  </div>
  
  <div class="dashboard">
    <!-- Card 1: Simple data-bind -->
    <div class="card">
      <div class="card-header">
        <span class="card-label">📈 Current Value</span>
        <span class="card-badge badge-success">LIVE</span>
      </div>
      <div class="card-value" data-bind="value">--</div>
      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" id="value-progress"></div>
        </div>
        <div class="progress-labels">
          <span>0</span>
          <span>100</span>
        </div>
      </div>
    </div>
    
    <!-- Card 2: Formatted via JS -->
    <div class="card">
      <div class="card-header">
        <span class="card-label">🌡️ Temperature</span>
        <span class="card-badge" id="temp-badge">--</span>
      </div>
      <div class="card-value"><span id="temp-value">--</span><span class="card-unit">°C</span></div>
      <div class="gauge-container">
        <div class="gauge-bg"></div>
        <div class="gauge-fill" id="temp-gauge"></div>
        <div class="gauge-cover"></div>
        <div class="gauge-value" id="temp-gauge-value">--°</div>
      </div>
    </div>
    
    <!-- Card 3: Multiple values with JS formatting -->
    <div class="card">
      <div class="card-header">
        <span class="card-label">💧 Environment</span>
      </div>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value" id="humidity-value">--</div>
          <div class="stat-label">Humidity %</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" id="pressure-value">--</div>
          <div class="stat-label">Pressure hPa</div>
        </div>
      </div>
    </div>
    
    <!-- Card 4: Status with conditional styling -->
    <div class="card">
      <div class="card-header">
        <span class="card-label">🖥️ System Status</span>
        <span class="card-badge" id="status-badge">--</span>
      </div>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value" id="cpu-value">--</div>
          <div class="stat-label">CPU %</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" id="memory-value">--</div>
          <div class="stat-label">Memory %</div>
        </div>
      </div>
      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" id="cpu-progress"></div>
        </div>
      </div>
    </div>
    
    <!-- Card 5: Requests with history chart -->
    <div class="card">
      <div class="card-header">
        <span class="card-label">📊 Traffic</span>
      </div>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value" id="requests-value">--</div>
          <div class="stat-label">Requests</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" id="errors-value">--</div>
          <div class="stat-label">Errors</div>
        </div>
      </div>
      <div class="chart-container" id="history-chart"></div>
    </div>
    
    <!-- Card 6: HTML content binding -->
    <div class="card">
      <div class="card-header">
        <span class="card-label">💬 System Message</span>
      </div>
      <div class="message-content" data-bind-html="message">Waiting for data...</div>
      <div style="margin-top: 1rem; font-size: 0.75rem; color: #666;">
        Uptime: <span id="uptime-value">--</span>
      </div>
    </div>
  </div>
  
  <div class="footer">
    Visit <a href="/demo/ui">/demo/ui</a> • Real-time via WebSocket • 
    <span id="update-count">0</span> updates received
  </div>

  <script>
    // Track history for chart
    const history = [];
    const maxHistory = 20;
    let updateCount = 0;
    
    // Listen for real-time updates
    window.addEventListener('htmloutput:update', (e) => {
      const data = e.detail;
      updateCount++;
      document.getElementById('update-count').textContent = updateCount;
      
      // === FORMATTED VALUES (Custom JS) ===
      
      // Temperature with formatting and conditional badge
      const temp = parseFloat(data.temperature);
      document.getElementById('temp-value').textContent = temp.toFixed(1);
      document.getElementById('temp-gauge-value').textContent = temp.toFixed(0) + '°';
      
      // Temperature gauge (0-40°C range)
      const tempPercent = Math.min(100, Math.max(0, (temp / 40) * 100));
      document.getElementById('temp-gauge').style.transform = 
        'rotate(' + (tempPercent * 1.8 - 180) + 'deg)';
      
      // Temperature badge
      const tempBadge = document.getElementById('temp-badge');
      if (temp > 30) {
        tempBadge.textContent = 'HOT';
        tempBadge.className = 'card-badge badge-danger';
      } else if (temp > 25) {
        tempBadge.textContent = 'WARM';
        tempBadge.className = 'card-badge badge-warning';
      } else {
        tempBadge.textContent = 'NORMAL';
        tempBadge.className = 'card-badge badge-success';
      }
      
      // Environment values
      document.getElementById('humidity-value').textContent = 
        parseFloat(data.humidity).toFixed(0);
      document.getElementById('pressure-value').textContent = 
        parseFloat(data.pressure).toFixed(0);
      
      // System status
      const statusBadge = document.getElementById('status-badge');
      if (data.status === 'online') {
        statusBadge.textContent = 'ONLINE';
        statusBadge.className = 'card-badge badge-success';
      } else {
        statusBadge.textContent = 'WARNING';
        statusBadge.className = 'card-badge badge-warning';
      }
      
      // CPU & Memory
      const cpu = parseFloat(data.cpu);
      const memory = parseFloat(data.memory);
      document.getElementById('cpu-value').textContent = cpu.toFixed(0);
      document.getElementById('memory-value').textContent = memory.toFixed(0);
      document.getElementById('cpu-progress').style.width = cpu + '%';
      
      // Value progress bar
      document.getElementById('value-progress').style.width = data.value + '%';
      
      // Traffic stats
      document.getElementById('requests-value').textContent = data.requests;
      document.getElementById('errors-value').textContent = data.errors;
      
      // Uptime formatting
      const uptimeMs = Date.now() - data.uptime;
      const uptimeSec = Math.floor(uptimeMs / 1000);
      document.getElementById('uptime-value').textContent = 
        Math.floor(uptimeSec / 60) + 'm ' + (uptimeSec % 60) + 's';
      
      // === HISTORY CHART ===
      history.push(data.value);
      if (history.length > maxHistory) history.shift();
      
      const chartContainer = document.getElementById('history-chart');
      chartContainer.innerHTML = history.map(v => 
        '<div class="chart-bar" style="height: ' + v + '%"></div>'
      ).join('');
    });
    
    // Connection status indicator
    const connStatus = document.getElementById('conn-status');
    window.addEventListener('online', () => {
      connStatus.classList.remove('disconnected');
      connStatus.querySelector('span').textContent = 'Connected';
    });
    window.addEventListener('offline', () => {
      connStatus.classList.add('disconnected');
      connStatus.querySelector('span').textContent = 'Disconnected';
    });
  </script>
</body>
</html>`
          },
          wires: [[]],
          position: { x: 200, y: 150 }
        }
      ]
    }
  ],
  createdAt: Date.now(),
  updatedAt: Date.now()
};
