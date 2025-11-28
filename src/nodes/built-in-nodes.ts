import type { WorkflowMessage, NodeExecutionContext, NodeExecutor } from "../types/index.ts";

export function registerBuiltInNodes(engine: { registerNodeType: (type: string, executor: NodeExecutor) => void }) {
  // TRIGGER/INJECT NODE
  engine.registerNodeType('inject', async (msg: WorkflowMessage, ctx: NodeExecutionContext) => {
    const data = ctx.node.config.payload || msg.payload;
    ctx.log(`Injecting: ${JSON.stringify(data)}`);
    ctx.send({ payload: data });
  });

  engine.registerNodeType('trigger', async (msg: WorkflowMessage, ctx: NodeExecutionContext) => {
    ctx.log('Workflow triggered');
    ctx.send(msg);
  });

  // HTTP REQUEST NODE
  engine.registerNodeType('http-request', async (msg: WorkflowMessage, ctx: NodeExecutionContext) => {
    const { method = 'GET', url } = ctx.node.config;
    
    ctx.log(`${method} ${url}`);
    
    try {
      const headers: Record<string, string> = { ...ctx.node.config.headers };
      if (method !== 'GET') {
        headers['Content-Type'] = 'application/json';
      }
      
      const response = await fetch(url, {
        method,
        headers,
        body: method !== 'GET' ? JSON.stringify(msg.payload) : undefined
      });

      let data;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
      
      ctx.log(`✓ Response: ${response.status}`);
      ctx.send({ payload: data, metadata: { statusCode: response.status } });
    } catch (error) {
      ctx.error('HTTP request failed', error as Error);
      ctx.send({ ...msg, error: (error as Error).message });
    }
  });

  // FUNCTION NODE
  engine.registerNodeType('function', async (msg: WorkflowMessage, ctx: NodeExecutionContext) => {
    const code = ctx.node.config.code || 'return msg;';
    
    try {
      const func = new Function('msg', 'node', 'log', code);
      const result = await func(msg, ctx.node, ctx.log);
      
      if (result) {
        ctx.send(result);
      }
    } catch (error) {
      ctx.error('Function execution failed', error as Error);
    }
  });

  // FILTER/SWITCH NODE
  engine.registerNodeType('filter', async (msg: WorkflowMessage, ctx: NodeExecutionContext) => {
    const condition = ctx.node.config.condition || 'true';
    
    try {
      const func = new Function('msg', `return ${condition}`);
      const result = func(msg);
      
      ctx.log(`Condition result: ${result}`);
      
      // Output 0 for true, Output 1 for false
      ctx.send(msg, result ? 0 : 1);
    } catch (error) {
      ctx.error('Filter evaluation failed', error as Error);
    }
  });

  // DELAY NODE
  engine.registerNodeType('delay', async (msg: WorkflowMessage, ctx: NodeExecutionContext) => {
    const delay = ctx.node.config.delay || 1000;
    ctx.log(`Delaying ${delay}ms`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    ctx.send(msg);
  });

  // TRANSFORM NODE
  engine.registerNodeType('transform', async (msg: WorkflowMessage, ctx: NodeExecutionContext) => {
    const { operation, field, value } = ctx.node.config;
    
    let result = { ...msg };
    
    switch (operation) {
      case 'set':
        result.payload[field] = value;
        break;
      case 'delete':
        delete result.payload[field];
        break;
      case 'rename':
        result.payload[value] = result.payload[field];
        delete result.payload[field];
        break;
    }
    
    ctx.log(`Transformed: ${operation} ${field}`);
    ctx.send(result);
  });

  // DEBUG/LOG NODE
  engine.registerNodeType('debug', async (msg: WorkflowMessage, ctx: NodeExecutionContext) => {
    const output = ctx.node.config.output || 'payload';
    const data = output === 'payload' ? msg.payload : msg;
    
    ctx.log(`📋 ${JSON.stringify(data, null, 2)}`);
  });

  // TEMPLATE NODE
  engine.registerNodeType('template', async (msg: WorkflowMessage, ctx: NodeExecutionContext) => {
    const template = ctx.node.config.template || '';
    let result = template;
    
    // Simple template replacement
    result = result.replace(/\{\{(.+?)\}\}/g, (match: string, path: string) => {
      const keys = path.trim().split('.');
      let value: any = msg;
      for (const key of keys) {
        value = value?.[key];
      }
      return value !== undefined ? value : match;
    });
    
    ctx.send({ payload: result });
  });

  // JOIN NODE
  engine.registerNodeType('join', async (msg: WorkflowMessage, ctx: NodeExecutionContext) => {
    const { mode = 'array', timeout = 5000 } = ctx.node.config;
    
    // Simple implementation - in production, would need message buffering
    ctx.log(`Joining messages (${mode})`);
    ctx.send(msg);
  });

  // SPLIT NODE
  engine.registerNodeType('split', async (msg: WorkflowMessage, ctx: NodeExecutionContext) => {
    const { field = 'payload' } = ctx.node.config;
    const data = field === 'payload' ? msg.payload : (msg as any)[field];
    
    if (Array.isArray(data)) {
      ctx.log(`Splitting array (${data.length} items)`);
      for (const item of data) {
        ctx.send({ payload: item });
      }
    } else {
      ctx.send(msg);
    }
  });

  // AGGREGATE NODE
  engine.registerNodeType('aggregate', async (msg: WorkflowMessage, ctx: NodeExecutionContext) => {
    const { operation = 'sum', field } = ctx.node.config;
    const data = Array.isArray(msg.payload) ? msg.payload : [msg.payload];
    
    let result: any;
    
    switch (operation) {
      case 'sum':
        result = data.reduce((acc, item) => acc + (item[field] || item), 0);
        break;
      case 'avg':
        const sum = data.reduce((acc, item) => acc + (item[field] || item), 0);
        result = sum / data.length;
        break;
      case 'count':
        result = data.length;
        break;
      case 'min':
        result = Math.min(...data.map(item => item[field] || item));
        break;
      case 'max':
        result = Math.max(...data.map(item => item[field] || item));
        break;
    }
    
    ctx.log(`${operation}: ${result}`);
    ctx.send({ payload: result });
  });
}