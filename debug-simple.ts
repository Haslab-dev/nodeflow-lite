import { WorkflowEngine } from "./src/WorkflowEngine.js";

const engine = new WorkflowEngine();

const simpleWorkflow = {
  id: 'simple-test',
  name: 'Simple Test',
  nodes: [
    {
      id: '1',
      type: 'inject',
      name: 'Start',
      config: {
        payload: { test: 'data' }
      },
      wires: [['2']]
    },
    {
      id: '2',
      type: 'debug',
      name: 'Debug',
      config: {},
      wires: [[]]
    }
  ]
};

engine.loadWorkflow(simpleWorkflow);

console.log('Starting workflow execution...');
const startTime = Date.now();
await engine.executeWorkflow('simple-test');
const endTime = Date.now();
console.log(`Workflow completed in ${endTime - startTime}ms`);