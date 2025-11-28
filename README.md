# NodeFlow Lite

A lightweight workflow automation engine for Bun inspired by n8n and Node-RED. Build powerful automation workflows with a simple, extensible node-based system.

## Features

- 🚀 Fast and lightweight workflow engine built on Bun
- 🔧 Extensible node system with built-in node types
- 📡 HTTP request nodes for API integration
- 🔄 Function nodes for custom JavaScript logic
- 🎯 Filter and transform nodes for data processing
- ⏱️ Delay nodes for timing control
- 🐛 Debug nodes for logging and inspection
- 📝 Template nodes for string formatting
- 🧪 Comprehensive test suite

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd nodeflow-lite-code

# Install dependencies
bun install
```

## Quick Start

```bash
# Run the example workflows
bun run start

# Run in development mode with watch
bun run dev

# Run tests
bun test

# Type check
bun run lint
```

## Project Structure

```
src/
├── types/           # TypeScript type definitions
├── nodes/           # Built-in node implementations
├── workflows/       # Example workflow definitions
├── WorkflowEngine.ts # Core workflow engine
├── main.ts         # Main entry point for running examples
└── index.ts        # Library exports
tests/              # Test files
```

## Usage

### Basic Workflow

```typescript
import { WorkflowEngine } from './src/WorkflowEngine.js';

const engine = new WorkflowEngine();

// Define a simple workflow
const workflow = {
  id: 'my-workflow',
  name: 'My Workflow',
  nodes: [
    {
      id: '1',
      type: 'inject',
      name: 'Start',
      config: { payload: { message: 'Hello World' } },
      wires: [['2']]
    },
    {
      id: '2',
      type: 'debug',
      name: 'Log',
      config: {},
      wires: [[]]
    }
  ]
};

// Load and execute
engine.loadWorkflow(workflow);
await engine.executeWorkflow('my-workflow');
```

### Built-in Node Types

1. **inject** - Inject static data into the workflow
2. **trigger** - Manual trigger node
3. **http-request** - Make HTTP requests
4. **function** - Execute custom JavaScript code
5. **filter** - Conditionally route messages
6. **delay** - Add delays to workflow execution
7. **transform** - Transform message data
8. **debug** - Log message contents
9. **template** - String templating with message data
10. **split** - Split arrays into individual messages
11. **join** - Join multiple messages
12. **aggregate** - Aggregate data (sum, avg, count, min, max)

### Custom Node Types

```typescript
// Register a custom node type
engine.registerNodeType('my-node', async (msg, ctx) => {
  ctx.log('Processing message');
  
  // Your custom logic here
  const result = processMessage(msg.payload);
  
  ctx.send({ payload: result });
});
```

## API Reference

### WorkflowEngine

#### Methods

- `registerNodeType(type: string, executor: NodeExecutor)` - Register a new node type
- `loadWorkflow(workflow: WorkflowDefinition)` - Load a workflow definition
- `executeWorkflow(workflowId: string, initialData?: any)` - Execute a workflow

### Types

```typescript
interface WorkflowMessage {
  payload: any;
  metadata?: Record<string, any>;
  error?: string;
}

interface NodeConfig {
  id: string;
  type: string;
  name: string;
  config: Record<string, any>;
  wires: string[][];
}

interface WorkflowDefinition {
  id: string;
  name: string;
  nodes: NodeConfig[];
}
```

## Testing

The project includes a comprehensive test suite using Bun's built-in test runner:

```bash
bun test
```

Tests cover:
- Basic workflow execution
- Node type functionality
- Error handling
- Message routing

## Development

This project was created using `bun init` in bun v1.3.1. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

## License

MIT
