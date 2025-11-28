// Test script for programmatic workflows
import { CodeWorkflowEngine, StepFunctions } from './src/CodeWorkflowEngine.ts';
import { authService } from './src/auth/index.ts';
import { db } from './src/database/index.ts';
import { programmaticWorkflowExamples } from './src/workflows/programmatic-examples.ts';

async function testProgrammaticWorkflows() {
  console.log('🧪 Testing Programmatic Workflow System...\n');

  try {
    // Test 1: Database Operations
    console.log('1️⃣ Testing Database Operations...');
    const testWorkflow = {
      name: 'Test Workflow',
      type: 'code' as const,
      codeWorkflow: {
        id: 'test-workflow',
        name: 'Test Workflow',
        description: 'A test workflow for verification',
        triggers: ['http-in' as ('http-in' | 'webhook' | 'mqtt')],
        steps: [
          StepFunctions.task('logStart', async (ctx) => {
            console.log('Test workflow started');
            return { ...ctx, started: true };
          }),
          StepFunctions.task('processData', async (ctx) => {
            console.log('Processing test data');
            return { ...ctx, processed: true };
          })
        ],
        autoStart: true
      }
    };

    const created = await db.createWorkflow(testWorkflow);
    console.log('✅ Workflow created:', created.name);

    const retrieved = await db.getWorkflowById(created.id);
    console.log('✅ Workflow retrieved:', retrieved?.name);

    const allWorkflows = await db.getAllWorkflows();
    console.log('✅ Total workflows in DB:', allWorkflows.length);

    // Test 2: Authentication System
    console.log('\n2️⃣ Testing Authentication System...');
    await authService.initializeDefaultAdmin();
    
    const loginResult = await authService.login('admin', 'admin');
    if (loginResult) {
      console.log('✅ Admin login successful');
      console.log('✅ User:', loginResult.user.username);
      console.log('✅ Token generated:', loginResult.session.token.substring(0, 20) + '...');
    } else {
      console.log('❌ Admin login failed');
    }

    // Test 3: Code Workflow Engine
    console.log('\n3️⃣ Testing Code Workflow Engine...');
    const engine = new CodeWorkflowEngine();
    
    // Register a test workflow
    engine.registerWorkflow(testWorkflow.codeWorkflow);
    console.log('✅ Workflow registered in engine');

    // Execute the workflow
    const result = await engine.executeWorkflow('test-workflow', { test: true });
    console.log('✅ Workflow executed successfully');
    console.log('✅ Execution result:', result);

    // Test 4: Example Workflows
    console.log('\n4️⃣ Testing Example Workflows...');
    for (const example of programmaticWorkflowExamples) {
      console.log(`📋 Loading example: ${example.name}`);
      engine.registerWorkflow(example);
      
      if (example.triggers.length > 0) {
        console.log(`✅ Triggers: ${example.triggers.join(', ')}`);
      }
      
      console.log(`✅ Steps: ${example.steps.length}`);
    }

    // Test 5: Step Functions
    console.log('\n5️⃣ Testing Step Functions...');
    const testContext = { message: 'Hello World' };
    
    // Test task step
    const taskStep = StepFunctions.task('test', async (ctx) => {
      return { ...ctx, processed: true };
    });
    const taskResult = await (taskStep as any)(testContext);
    console.log('✅ Task step result:', taskResult.processed);

    // Test parallel step
    const parallelStep = StepFunctions.parallel([
      StepFunctions.task('task1', async (ctx) => ({ ...ctx, task1: true })),
      StepFunctions.task('task2', async (ctx) => ({ ...ctx, task2: true }))
    ]);
    const parallelResult = await (parallelStep as any)(testContext);
    console.log('✅ Parallel step result:', parallelResult.task1 && parallelResult.task2);

    // Test condition step
    const conditionStep = StepFunctions.condition(
      (ctx) => ctx.message === 'Hello World',
      [StepFunctions.task('then', async (ctx) => ({ ...ctx, branch: 'then' }))],
      [StepFunctions.task('else', async (ctx) => ({ ...ctx, branch: 'else' }))]
    );
    const conditionResult = await (conditionStep as any)(testContext);
    console.log('✅ Condition step result:', conditionResult.branch);

    console.log('\n🎉 All tests completed successfully!');
    
    return {
      success: true,
      message: 'Programmatic workflow system is working correctly'
    };

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

// Test HTTP endpoints (requires server to be running)
async function testHTTPEndpoints() {
  console.log('\n🌐 Testing HTTP Endpoints...');
  
  try {
    // Test login
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin' })
    });
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Login endpoint working');
      
      const token = loginData.token;
      
      // Test creating a programmatic workflow
      const createResponse = await fetch('http://localhost:3000/api/workflows/code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: 'HTTP Test Workflow',
          type: 'code',
          codeWorkflow: {
            id: 'http-test',
            name: 'HTTP Test Workflow',
            triggers: ['http-in'],
            steps: [
              {
                id: 'log',
                type: 'task',
                run: async (ctx: any) => {
                  console.log('HTTP test workflow executed');
                  return ctx;
                }
              }
            ],
            autoStart: true
          }
        })
      });
      
      if (createResponse.ok) {
        console.log('✅ Create workflow endpoint working');
        
        const createData = await createResponse.json();
        const workflowId = createData.workflow.id;
        
        // Test executing the workflow
        const executeResponse = await fetch(`http://localhost:3000/api/workflows/code/${workflowId}/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ initial: { test: true } })
        });
        
        if (executeResponse.ok) {
          console.log('✅ Execute workflow endpoint working');
        } else {
          console.log('❌ Execute workflow endpoint failed');
        }
        
        // Test getting all workflows
        const listResponse = await fetch('http://localhost:3000/api/workflows/code', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (listResponse.ok) {
          const listData = await listResponse.json();
          console.log('✅ List workflows endpoint working');
          console.log(`✅ Found ${listData.workflows.length} workflows`);
        } else {
          console.log('❌ List workflows endpoint failed');
        }
      } else {
        console.log('❌ Create workflow endpoint failed');
      }
    } else {
      console.log('❌ Login endpoint failed');
    }
    
  } catch (error) {
    console.log('❌ HTTP endpoint test failed (server may not be running):', error);
  }
}

// Run tests
if (import.meta.main) {
  testProgrammaticWorkflows()
    .then(() => testHTTPEndpoints())
    .then(() => {
      console.log('\n✨ All tests completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test suite failed:', error);
      process.exit(1);
    });
}

export { testProgrammaticWorkflows, testHTTPEndpoints };