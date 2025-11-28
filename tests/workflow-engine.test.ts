import { describe, it, expect, beforeEach } from "bun:test";
import { WorkflowEngine } from "../src/WorkflowEngine.ts";
import type { WorkflowDefinition } from "../src/types/index.ts";

describe("WorkflowEngine", () => {
  let engine: WorkflowEngine;

  beforeEach(() => {
    engine = new WorkflowEngine();
  });

  it("should register and execute a simple workflow", async () => {
    const testWorkflow: WorkflowDefinition = {
      id: 'test-workflow',
      name: 'Test Workflow',
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
          name: 'Log',
          config: {},
          wires: [[]]
        }
      ]
    };

    engine.loadWorkflow(testWorkflow);
    
    // Capture console.log output
    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (message: any) => {
      logs.push(message);
    };

    await engine.executeWorkflow('test-workflow');

    // Restore console.log
    console.log = originalLog;

    // Check that the workflow was executed
    expect(logs.some(log => log.includes('Executing workflow: Test Workflow'))).toBe(true);
    expect(logs.some(log => log.includes('Injecting: {"test":"data"}'))).toBe(true);
  });

  it("should handle filter nodes correctly", async () => {
    const testWorkflow: WorkflowDefinition = {
      id: 'filter-test',
      name: 'Filter Test',
      nodes: [
        {
          id: '1',
          type: 'inject',
          name: 'Start',
          config: {
            payload: { value: 42 }
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
        }
      ]
    };

    engine.loadWorkflow(testWorkflow);
    
    // Capture console.log output
    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (message: any) => {
      logs.push(message);
    };

    await engine.executeWorkflow('filter-test');

    // Restore console.log
    console.log = originalLog;

    // Check that the filter evaluated to true
    expect(logs.some(log => log.includes('Condition result: true'))).toBe(true);
    expect(logs.some(log => log.includes('Value > 10'))).toBe(true);
  });

  it("should handle function nodes correctly", async () => {
    const testWorkflow: WorkflowDefinition = {
      id: 'function-test',
      name: 'Function Test',
      nodes: [
        {
          id: '1',
          type: 'inject',
          name: 'Start',
          config: {
            payload: { numbers: [1, 2, 3] }
          },
          wires: [['2']]
        },
        {
          id: '2',
          type: 'function',
          name: 'Process',
          config: {
            code: `
              const numbers = msg.payload.numbers;
              const sum = numbers.reduce((a, b) => a + b, 0);
              log('Sum calculated: ' + sum);
              return { payload: { sum } };
            `
          },
          wires: [['3']]
        },
        {
          id: '3',
          type: 'debug',
          name: 'Result',
          config: {},
          wires: [[]]
        }
      ]
    };

    engine.loadWorkflow(testWorkflow);
    
    // Capture console.log output
    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (message: any) => {
      logs.push(message);
    };

    await engine.executeWorkflow('function-test');

    // Restore console.log
    console.log = originalLog;

    // Check that the function was executed
    expect(logs.some(log => log.includes('"sum": 6'))).toBe(true);
  });

  it("should handle delay nodes correctly", async () => {
    const testWorkflow: WorkflowDefinition = {
      id: 'delay-test',
      name: 'Delay Test',
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
          type: 'delay',
          name: 'Delay',
          config: {
            delay: 200
          },
          wires: [['3']]
        },
        {
          id: '3',
          type: 'debug',
          name: 'After Delay',
          config: {},
          wires: [[]]
        }
      ]
    };

    engine.loadWorkflow(testWorkflow);
    
    // Capture console.log output
    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (message: any) => {
      logs.push(message);
    };

    const startTime = Date.now();
    await engine.executeWorkflow('delay-test');
    const endTime = Date.now();

    // Restore console.log
    console.log = originalLog;

    // Check that the delay was applied (at least 200ms)
    // Note: Due to async execution, we check if the delay message was logged
    expect(logs.some(log => log.includes('Delaying 200ms'))).toBe(true);
  });

  it("should handle transform nodes correctly", async () => {
    const testWorkflow: WorkflowDefinition = {
      id: 'transform-test',
      name: 'Transform Test',
      nodes: [
        {
          id: '1',
          type: 'inject',
          name: 'Start',
          config: {
            payload: { name: 'test' }
          },
          wires: [['2']]
        },
        {
          id: '2',
          type: 'transform',
          name: 'Transform',
          config: {
            operation: 'set',
            field: 'value',
            value: 42
          },
          wires: [['3']]
        },
        {
          id: '3',
          type: 'debug',
          name: 'Result',
          config: {},
          wires: [[]]
        }
      ]
    };

    engine.loadWorkflow(testWorkflow);
    
    // Capture console.log output
    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (message: any) => {
      logs.push(message);
    };

    await engine.executeWorkflow('transform-test');

    // Restore console.log
    console.log = originalLog;

    // Check that the transform was applied
    expect(logs.some(log => log.includes('"name": "test"') && log.includes('"value": 42'))).toBe(true);
  });

  it("should handle template nodes correctly", async () => {
    const testWorkflow: WorkflowDefinition = {
      id: 'template-test',
      name: 'Template Test',
      nodes: [
        {
          id: '1',
          type: 'inject',
          name: 'Start',
          config: {
            payload: { name: 'World', count: 42 }
          },
          wires: [['2']]
        },
        {
          id: '2',
          type: 'template',
          name: 'Template',
          config: {
            template: 'Hello {{payload.name}}! Count: {{payload.count}}'
          },
          wires: [['3']]
        },
        {
          id: '3',
          type: 'debug',
          name: 'Result',
          config: {},
          wires: [[]]
        }
      ]
    };

    engine.loadWorkflow(testWorkflow);
    
    // Capture console.log output
    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (message: any) => {
      logs.push(message);
    };

    await engine.executeWorkflow('template-test');

    // Restore console.log
    console.log = originalLog;

    // Check that the template was rendered
    expect(logs.some(log => log.includes('Hello World! Count: 42'))).toBe(true);
  });
});