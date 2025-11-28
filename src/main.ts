import { WorkflowEngine } from "./WorkflowEngine.ts";
import { simpleWorkflow, filterWorkflow, functionWorkflow, complexWorkflow } from "./workflows/examples.ts";

async function main() {
  const engine = new WorkflowEngine();

  // Load workflows
  engine.loadWorkflow(simpleWorkflow);
  engine.loadWorkflow(filterWorkflow);
  engine.loadWorkflow(functionWorkflow);
  engine.loadWorkflow(complexWorkflow);

  // Execute workflows
  try {
    await engine.executeWorkflow('simple-http');
    await engine.executeWorkflow('filter-transform');
    await engine.executeWorkflow('function-workflow');
    await engine.executeWorkflow('complex-pipeline');
  } catch (error) {
    console.error('Workflow execution error:', error);
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}

export { WorkflowEngine };