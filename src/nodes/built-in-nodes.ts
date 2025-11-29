import type { WorkflowMessage, NodeExecutionContext, NodeExecutor } from "../types/index.ts";
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createZhipu } from 'zhipu-ai-provider';
import { generateText } from 'ai';

export function registerBuiltInNodes(engine: { registerNodeType: (type: string, executor: NodeExecutor) => void }) {
  // TRIGGER/INJECT NODE
  engine.registerNodeType('inject', async (msg: WorkflowMessage, ctx: NodeExecutionContext) => {
    let data = ctx.node.config.payload || msg.payload;
    
    // Parse payload if it's a JSON string
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        // If parsing fails, keep as string
      }
    }
    
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

  // AI GENERATE NODE - Using AI SDK with multiple providers
  engine.registerNodeType('ai-generate', async (msg: WorkflowMessage, ctx: NodeExecutionContext) => {
    const { aiConfig, prompt, temperature = 0.7 } = ctx.node.config;
    
    if (!aiConfig) {
      ctx.error('AI configuration not set');
      ctx.send({ ...msg, error: 'AI configuration not set' });
      return;
    }

    // Process template in prompt
    let processedPrompt = prompt.replace(/\{\{(.+?)\}\}/g, (_match: string, path: string) => {
      const keys = path.trim().split('.');
      let value: any = msg;
      for (const key of keys) {
        value = value?.[key];
      }
      return value !== undefined ? String(value) : '';
    });

    ctx.log(`🤖 Prompt: "${processedPrompt.length > 100 ? processedPrompt.substring(0, 100) + '...' : processedPrompt}"`);

    try {
      // Create provider based on type and call generateText
      const providerType = aiConfig.provider || 'openai-compatible';
      let result: { text: string; usage?: any };
      
      switch (providerType) {
        case 'deepseek': {
          const deepseek = createDeepSeek({ apiKey: aiConfig.apiKey });
          result = await generateText({
            model: deepseek(aiConfig.model),
            prompt: processedPrompt,
            temperature,
          });
          break;
        }
        case 'openrouter': {
          const openrouter = createOpenRouter({ apiKey: aiConfig.apiKey });
          result = await generateText({
            model: openrouter.chat(aiConfig.model),
            prompt: processedPrompt,
            temperature,
          });
          break;
        }
        case 'zhipu': {
          const zhipu = createZhipu({ 
            apiKey: aiConfig.apiKey,
            baseURL: aiConfig.baseUrl 
          });
          result = await generateText({
            model: zhipu(aiConfig.model) as any,
            prompt: processedPrompt,
            temperature,
          });
          break;
        }
        case 'openai-compatible':
        default: {
          const provider = createOpenAICompatible({
            name: aiConfig.name || 'custom-provider',
            apiKey: aiConfig.apiKey,
            baseURL: aiConfig.baseUrl,
          });
          result = await generateText({
            model: provider(aiConfig.model),
            prompt: processedPrompt,
            temperature,
          });
          break;
        }
      }

      const { text, usage } = result;

      ctx.log(`✓ Response: "${text.substring(0, 100)}..."`);
      
      ctx.send({
        payload: {
          ...msg.payload,
          response: text,
          usage
        }
      });
    } catch (error) {
      ctx.error('AI Generate failed', error as Error);
      ctx.send({ ...msg, error: (error as Error).message });
    }
  });

}