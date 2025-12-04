# NodeFlow Lite

A lightweight workflow automation engine for Bun inspired by n8n and Node-RED. Build powerful automation workflows with a visual node-based editor and real-time HTML dashboards.

## Features

- 🚀 **Fast & Lightweight** - Built on Bun for maximum performance
- 🎨 **Visual Editor** - Drag-and-drop workflow builder with React Flow
- 📡 **Real-time Communication** - Built-in MQTT & WebSocket brokers
- 🌐 **HTTP Endpoints** - Create REST APIs with HTTP In/Out nodes
- 🤖 **AI Integration** - Connect to OpenAI, DeepSeek, OpenRouter, and more
- 📊 **HTML Dashboards** - Serve real-time HTML pages with WebSocket updates
- ⏰ **Interval Triggers** - Schedule recurring tasks with dynamic payloads
- � T**Hyperflow DAG** - Advanced parallel execution with dependencies
- 💾 **Persistent Deployments** - Workflows survive server restarts
- 🔐 **Authentication** - Built-in user authentication system

## Quick Start

```bash
# Install dependencies
bun install

# Start the server
bun run dev

# Open in browser
open http://localhost:3000
```

## Node Types

### Input Nodes
| Node | Description |
|------|-------------|
| **Inject** 💉 | Manually trigger a flow with static payload |
| **Interval** ⏰ | Send messages at regular intervals |
| **HTTP In** 🌐 | Create REST endpoints |
| **MQTT In** 📶 | Subscribe to MQTT topics |
| **WebSocket In** 🔌 | Subscribe to WebSocket topics |

### Output Nodes
| Node | Description |
|------|-------------|
| **Debug** 🔍 | Log messages for debugging |
| **HTTP Response** 📤 | Send HTTP response |
| **MQTT Out** 📢 | Publish to MQTT topic |
| **WebSocket Out** 🔌 | Publish to WebSocket topic |
| **HTML Output** 🌐 | Serve HTML page with real-time data |
| **UI Gauge/Text/Number/Switch** 📊 | Dashboard widgets |

### Logic Nodes
| Node | Description |
|------|-------------|
| **Function** ⚙️ | Run custom JavaScript code |
| **Filter** 🔀 | Route messages by condition |
| **Transform** 🔄 | Modify message properties |
| **Template** 📝 | Generate text from template |
| **Loop** 🔁 | Iterate over arrays or count |
| **AI Generate** 🤖 | Generate text with AI |
| **Hyperflow** 🌊 | Execute DAG pipelines |

### Data Nodes
| Node | Description |
|------|-------------|
| **HTTP Request** 🔗 | Make API calls |
| **Delay** ⏱️ | Pause flow execution |
| **Split** ✂️ | Split array into messages |
| **Join** 🔗 | Combine messages into array |
| **Data Table** 📊 | Create/manipulate data tables |

---

## HTML Output Node

Serve dynamic HTML pages with real-time data updates via WebSocket.

### Basic Usage

1. Add an **Interval** node to generate data
2. Connect to an **HTML Output** node
3. Configure the slug (e.g., `demo`)
4. Deploy the workflow
5. Visit `http://localhost:3000/demo/ui`

### Data Binding

#### Simple Binding
```html
<!-- Bind text content to a property -->
<div data-bind="value">--</div>

<!-- Nested properties -->
<div data-bind="user.name">--</div>
<div data-bind="sensor.temperature">--</div>
```

#### HTML Content Binding
```html
<!-- Render HTML (not escaped) -->
<div data-bind-html="htmlContent"></div>
```

#### Style Binding
```html
<!-- Dynamic styles (format: property:path) -->
<div data-bind-style="width:progress">0%</div>
<div data-bind-style="backgroundColor:statusColor"></div>
```

### Custom JavaScript Formatting

Use the `htmloutput:update` event for complex transformations:

```html
<div id="formatted-temp">--</div>
<div id="status-badge">--</div>

<script>
  window.addEventListener('htmloutput:update', (e) => {
    const data = e.detail;
    
    // Format temperature with unit
    document.getElementById('formatted-temp').textContent = 
      data.temperature.toFixed(1) + '°C';
    
    // Conditional styling
    const badge = document.getElementById('status-badge');
    if (data.value > 80) {
      badge.textContent = '⚠️ HIGH';
      badge.style.color = 'red';
    } else {
      badge.textContent = '✓ Normal';
      badge.style.color = 'green';
    }
    
    // Calculate derived values
    const heatIndex = data.temperature + (data.humidity * 0.1);
    document.getElementById('heat-index').textContent = heatIndex.toFixed(1);
  });
</script>
```

### JavaScript API

```javascript
// Get current data
const data = HtmlOutput.getData();

// Send data back to workflow (bidirectional)
HtmlOutput.send({ buttonClicked: true, value: 42 });

// Listen for updates
window.addEventListener('htmloutput:update', (e) => {
  console.log('New data:', e.detail);
});
```

### Complete Example

**Interval Node Payload:**
```javascript
{
  value: Math.round(Math.random() * 100),
  temperature: 20 + Math.random() * 15,
  humidity: 40 + Math.random() * 40,
  status: Math.random() > 0.5 ? 'online' : 'warning',
  timestamp: Date.now()
}
```

**HTML Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <title>Dashboard</title>
  <style>
    body { font-family: system-ui; background: #1a1a2e; color: #fff; padding: 2rem; }
    .card { background: rgba(255,255,255,0.05); border-radius: 12px; padding: 1.5rem; margin: 1rem 0; }
    .value { font-size: 3rem; color: #00d9ff; }
    .label { color: #888; font-size: 0.9rem; }
  </style>
</head>
<body>
  <h1>📊 Real-time Dashboard</h1>
  
  <!-- Simple data-bind -->
  <div class="card">
    <div class="label">Current Value</div>
    <div class="value" data-bind="value">--</div>
  </div>
  
  <!-- Custom JS formatting -->
  <div class="card">
    <div class="label">Temperature</div>
    <div class="value" id="temp-display">--</div>
  </div>
  
  <!-- Status with conditional styling -->
  <div class="card">
    <div class="label">Status</div>
    <div id="status-display">Waiting...</div>
  </div>
  
  <!-- History chart -->
  <div class="card">
    <div class="label">History</div>
    <div id="chart" style="display:flex;gap:2px;height:60px;align-items:flex-end;"></div>
  </div>

  <script>
    const history = [];
    
    window.addEventListener('htmloutput:update', (e) => {
      const data = e.detail;
      
      // Format temperature
      document.getElementById('temp-display').textContent = 
        data.temperature.toFixed(1) + '°C';
      
      // Status with color
      const status = document.getElementById('status-display');
      status.textContent = data.status === 'online' ? '🟢 Online' : '🟡 Warning';
      
      // Update history chart
      history.push(data.value);
      if (history.length > 20) history.shift();
      
      document.getElementById('chart').innerHTML = history
        .map(v => `<div style="flex:1;background:#00d9ff;height:${v}%;border-radius:2px;"></div>`)
        .join('');
    });
  </script>
</body>
</html>
```

---

## Interval Node

Send messages at regular intervals with dynamic JavaScript payloads.

### Configuration

| Field | Description |
|-------|-------------|
| **Interval (ms)** | Time between messages (default: 1000) |
| **Payload** | JavaScript expression that returns an object |
| **Max Count** | Stop after N messages (0 = infinite) |

### Example Payloads

```javascript
// Random sensor data
{
  value: Math.round(Math.random() * 100),
  temperature: (20 + Math.random() * 15).toFixed(1),
  timestamp: new Date().toISOString()
}

// Counter
{
  count: Date.now() % 1000,
  tick: true
}

// Simulated metrics
{
  cpu: Math.random() * 100,
  memory: 30 + Math.random() * 50,
  requests: Math.floor(Math.random() * 1000)
}
```

---

## AI Generate Node

Connect to various AI providers using the Vercel AI SDK.

### Supported Providers

- **OpenAI Compatible** - Any OpenAI-compatible API
- **DeepSeek** - DeepSeek AI models
- **OpenRouter** - Access multiple models via OpenRouter
- **Zhipu** - Zhipu AI (GLM models)

### Configuration

1. Click "Add New AI Config"
2. Select a preset or enter custom settings
3. Enter your API key
4. Select the model

### Prompt Templates

Use `{{path}}` syntax to inject message data:

```
Summarize this text: {{payload.text}}

User: {{payload.question}}
Context: {{payload.context}}
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/workflow/deploy` | POST | Deploy a workflow |
| `/api/workflow/undeploy` | POST | Undeploy a workflow |
| `/api/workflow/stop` | POST | Stop intervals without undeploy |
| `/api/workflow/deployed` | GET | List deployed workflows |
| `/api/workflow/inject` | POST | Trigger an inject node |
| `/api/status` | GET | Get server status |
| `/api/metrics` | GET | Get execution metrics |
| `/:slug/ui` | GET | Serve HTML output page |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    NodeFlow Server                       │
│                    (Bun + React)                         │
├─────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │ HTTP In │  │ MQTT    │  │ WS      │  │ Interval│    │
│  │ :3001   │  │ :1883   │  │ :1884   │  │ Timer   │    │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘    │
│       │            │            │            │          │
│       └────────────┴────────────┴────────────┘          │
│                         │                                │
│              ┌──────────▼──────────┐                    │
│              │   Workflow Engine   │                    │
│              │   (Node Executor)   │                    │
│              └──────────┬──────────┘                    │
│                         │                                │
│       ┌─────────────────┼─────────────────┐             │
│       │                 │                 │             │
│  ┌────▼────┐      ┌─────▼─────┐     ┌────▼────┐        │
│  │ Debug   │      │ HTML Out  │     │ MQTT Out│        │
│  │ Logs    │      │ /slug/ui  │     │ Publish │        │
│  └─────────┘      └───────────┘     └─────────┘        │
└─────────────────────────────────────────────────────────┘
```

---

## Development

```bash
# Run in development mode
bun run dev

# Run tests
bun test

# Type check
bun run lint
```

## License

MIT
