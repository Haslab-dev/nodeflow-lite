import type { WorkflowMessage, NodeExecutionContext, NodeExecutor } from "../types/index.ts";
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createZhipu } from 'zhipu-ai-provider';
import { generateText } from 'ai';

export function registerBuiltInNodes(engine: { registerNodeType: (type: string, executor: NodeExecutor) => void; emit: (event: string, ...args: any[]) => boolean }) {
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
    const customPath = ctx.node.config.customPath || 'payload';
    
    let data: any;
    
    if (output === 'full') {
      // Show entire message object
      data = msg;
    } else if (output === 'custom' && customPath) {
      // Show custom path (e.g., "payload.result", "metadata.timestamp")
      const keys = customPath.trim().split('.');
      data = msg as any;
      for (const key of keys) {
        if (data === undefined || data === null) break;
        data = data[key];
      }
      if (data === undefined) {
        data = { error: `Path "${customPath}" not found in message` };
      }
    } else {
      // Default: show only payload
      data = msg.payload;
    }
    
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

  // LOOP NODE
  engine.registerNodeType('loop', async (msg: WorkflowMessage, ctx: NodeExecutionContext) => {
    const { mode = 'count', count = 3, arrayPath = 'payload.items', delay = 0 } = ctx.node.config;
    
    if (mode === 'foreach') {
      // Get array from message using path
      const keys = arrayPath.split('.');
      let array: any = msg;
      for (const key of keys) {
        array = array?.[key];
      }
      
      if (!Array.isArray(array)) {
        ctx.error('Array not found at specified path');
        return;
      }
      
      ctx.log(`Looping foreach (${array.length} items)${delay > 0 ? ` with ${delay}ms delay` : ''}`);
      for (let i = 0; i < array.length; i++) {
        if (delay > 0 && i > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        ctx.log(`  → Iteration ${i + 1}/${array.length}`);
        ctx.send({ 
          payload: array[i],
          metadata: { ...msg.metadata, loopIndex: i, loopTotal: array.length }
        });
      }
    } else {
      // Count mode - loop N times
      ctx.log(`Looping ${count} times (count mode)${delay > 0 ? ` with ${delay}ms delay` : ''}`);
      for (let i = 0; i < count; i++) {
        if (delay > 0 && i > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        ctx.log(`  → Loop iteration ${i + 1}/${count}`);
        ctx.send({ 
          ...msg,
          metadata: { ...msg.metadata, loopIndex: i, loopTotal: count }
        });
      }
    }
  });

  // DATA TABLE NODE
  engine.registerNodeType('data-table', async (msg: WorkflowMessage, ctx: NodeExecutionContext) => {
    const { data } = ctx.node.config;
    
    try {
      // Parse data if it's a string
      let tableData = data;
      if (typeof data === 'string') {
        const cleanData = data.trim();
        ctx.log(`Parsing data: ${cleanData.substring(0, 100)}...`);
        
        // Try JSON first
        try {
          tableData = JSON.parse(cleanData);
        } catch (jsonError) {
          // If JSON fails, try CSV parsing
          ctx.log('JSON parsing failed, trying CSV...');
          const rows = cleanData.split('\n').filter(row => row.trim());
          
          if (rows.length === 0) {
            ctx.error('No data rows found');
            return;
          }
          
          // Assume first row is header
          const delimiter = ',';
          const firstRow = rows[0];
          if (!firstRow) {
            ctx.error('No header row found');
            return;
          }
          const headers = firstRow.split(delimiter).map(h => h.trim());
          const dataRows = rows.slice(1);
          
          tableData = dataRows.map(row => {
            const values = row.split(delimiter).map(v => v.trim());
            const obj: any = {};
            headers.forEach((header, i) => {
              obj[header] = values[i] || '';
            });
            return obj;
          });
          
          ctx.log(`Parsed CSV: ${tableData.length} rows, ${headers.length} columns`);
        }
      }
      
      if (!Array.isArray(tableData)) {
        ctx.error('Data must be an array');
        return;
      }
      
      ctx.log(`Data table with ${tableData.length} rows`);
      ctx.send({ 
        payload: {
          ...msg.payload,
          table: tableData
        }
      });
    } catch (error) {
      ctx.error(`Failed to parse table data: ${(error as Error).message}`, error as Error);
      ctx.log(`Raw data: ${JSON.stringify(data)}`);
    }
  });

  // AI GENERATE NODE - Using AI SDK with multiple providers + Memory + Tools
  engine.registerNodeType('ai-generate', async (msg: WorkflowMessage, ctx: NodeExecutionContext) => {
    const { 
      aiConfig, 
      prompt, 
      systemPrompt = '',
      temperature = 0.7, 
      maxTokens = 1000,
      memory = '[]',
      tools = '[]',
      outputParser = 'none'
    } = ctx.node.config;
    
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

    // Process system prompt
    let processedSystemPrompt = systemPrompt ? systemPrompt.replace(/\{\{(.+?)\}\}/g, (_match: string, path: string) => {
      const keys = path.trim().split('.');
      let value: any = msg;
      for (const key of keys) {
        value = value?.[key];
      }
      return value !== undefined ? String(value) : '';
    }) : '';

    ctx.log(`🤖 Prompt: "${processedPrompt.length > 100 ? processedPrompt.substring(0, 100) + '...' : processedPrompt}"`);

    try {
      // Parse memory configuration
      let memoryConfig: any[] = [];
      try {
        memoryConfig = JSON.parse(memory);
      } catch (e) {
        ctx.log('⚠️ Invalid memory JSON, using empty array');
      }

      // Parse tools configuration
      let toolsConfig: any[] = [];
      try {
        toolsConfig = JSON.parse(tools);
      } catch (e) {
        ctx.log('⚠️ Invalid tools JSON, using empty array');
      }

      // Get conversation ID from payload or use node ID
      const conversationId = msg.payload.conversationId || ctx.node.id;
      
      // Import AI Memory Manager
      const { AIMemoryManager } = await import('./ai-memory.ts');
      
      // Get conversation history
      const history = AIMemoryManager.getHistory(conversationId);
      
      // Build messages array
      const messages: any[] = [];
      
      // Add system prompt if provided
      if (processedSystemPrompt) {
        messages.push({ role: 'system', content: processedSystemPrompt });
      }
      
      // Add conversation history
      messages.push(...history.map(h => ({ role: h.role, content: h.content })));
      
      // Add current user message
      messages.push({ role: 'user', content: processedPrompt });
      
      // Add user message to memory
      AIMemoryManager.addMessage(conversationId, {
        role: 'user',
        content: processedPrompt,
      });

      // Create provider based on type
      const providerType = aiConfig.provider || 'openai-compatible';
      let result: { text: string; usage?: any; toolCalls?: any[] };
      
      const generateOptions: any = {
        messages,
        temperature,
        maxTokens,
      };

      // Add tools if configured
      if (toolsConfig.length > 0) {
        generateOptions.tools = toolsConfig;
      }

      switch (providerType) {
        case 'deepseek': {
          const deepseek = createDeepSeek({ apiKey: aiConfig.apiKey });
          result = await generateText({
            model: deepseek(aiConfig.model),
            ...generateOptions,
          });
          break;
        }
        case 'openrouter': {
          const openrouter = createOpenRouter({ apiKey: aiConfig.apiKey });
          result = await generateText({
            model: openrouter.chat(aiConfig.model),
            ...generateOptions,
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
            ...generateOptions,
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
            ...generateOptions,
          });
          break;
        }
      }

      const { text, usage, toolCalls } = result;

      // Add assistant response to memory
      AIMemoryManager.addMessage(conversationId, {
        role: 'assistant',
        content: text,
      });

      ctx.log(`✓ Response: "${text.substring(0, 100)}..."`);
      ctx.log(`💾 Memory: ${AIMemoryManager.getHistory(conversationId).length} messages`);
      
      // Parse output based on parser type
      let parsedOutput = text;
      if (outputParser === 'json') {
        try {
          parsedOutput = JSON.parse(text);
        } catch (e) {
          ctx.log('⚠️ Failed to parse JSON output, returning raw text');
        }
      }
      
      ctx.send({
        payload: {
          ...msg.payload,
          response: parsedOutput,
          conversationId,
          usage,
          toolCalls,
          messageCount: AIMemoryManager.getHistory(conversationId).length
        }
      });
    } catch (error) {
      ctx.error('AI Generate failed', error as Error);
      ctx.send({ ...msg, error: (error as Error).message });
    }
  });

  // UI DASHBOARD NODES
  engine.registerNodeType('ui-text', async (msg: WorkflowMessage, ctx: NodeExecutionContext) => {
    const { label = 'Text', format = '{{payload}}' } = ctx.node.config;
    
    // Process format template
    let value = format.replace(/\{\{(.+?)\}\}/g, (_match: string, path: string) => {
      const keys = path.trim().split('.');
      let val: any = msg;
      for (const key of keys) {
        val = val?.[key];
      }
      return val !== undefined ? String(val) : '';
    });
    
    ctx.log(`📝 UI Text [${label}]: ${value}`);
    // Emit UI update event with unique key
    const widgetKey = `${ctx.workflowId || 'default'}-${ctx.node.id}`;
    engine.emit('ui-update', { nodeId: widgetKey, type: 'text', label, value });
  });

  engine.registerNodeType('ui-number', async (msg: WorkflowMessage, ctx: NodeExecutionContext) => {
    const { label = 'Number', unit = '', decimals = 2 } = ctx.node.config;
    const value = typeof msg.payload === 'number' ? msg.payload : parseFloat(msg.payload);
    
    ctx.log(`🔢 UI Number [${label}]: ${value.toFixed(decimals)}${unit}`);
    const widgetKey = `${ctx.workflowId || 'default'}-${ctx.node.id}`;
    engine.emit('ui-update', { nodeId: widgetKey, type: 'number', label, value, unit, decimals });
  });

  engine.registerNodeType('ui-gauge', async (msg: WorkflowMessage, ctx: NodeExecutionContext) => {
    const { label = 'Gauge', min = 0, max = 100, unit = '%' } = ctx.node.config;
    const value = typeof msg.payload === 'number' ? msg.payload : parseFloat(msg.payload);
    
    ctx.log(`📊 UI Gauge [${label}]: ${value}${unit} (${min}-${max})`);
    const widgetKey = `${ctx.workflowId || 'default'}-${ctx.node.id}`;
    engine.emit('ui-update', { nodeId: widgetKey, type: 'gauge', label, value, min, max, unit });
  });

  engine.registerNodeType('ui-switch', async (msg: WorkflowMessage, ctx: NodeExecutionContext) => {
    const { label = 'Switch' } = ctx.node.config;
    const value = Boolean(msg.payload);
    
    ctx.log(`🔘 UI Switch [${label}]: ${value ? 'ON' : 'OFF'}`);
    const widgetKey = `${ctx.workflowId || 'default'}-${ctx.node.id}`;
    engine.emit('ui-update', { nodeId: widgetKey, type: 'switch', label, value });
  });
}