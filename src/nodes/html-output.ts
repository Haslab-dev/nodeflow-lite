// HTML Output Node - Serves HTML templates with real-time data updates
import type { WorkflowMessage, NodeExecutionContext, NodeExecutor, HtmlOutputData } from "../types/index.ts";

// Store for HTML output pages
const htmlOutputStore = new Map<string, HtmlOutputData>();

// Get all registered HTML outputs
export function getHtmlOutputs(): HtmlOutputData[] {
  return Array.from(htmlOutputStore.values());
}

// Get HTML output by slug
export function getHtmlOutputBySlug(slug: string): HtmlOutputData | undefined {
  return Array.from(htmlOutputStore.values()).find(h => h.slug === slug);
}

// Update data for an HTML output (for real-time updates)
export function updateHtmlOutputData(slug: string, data: any): boolean {
  const output = getHtmlOutputBySlug(slug);
  if (output) {
    output.data = { ...output.data, ...data };
    output.lastUpdated = Date.now();
    return true;
  }
  return false;
}

// Clear all HTML outputs (for undeploy)
export function clearHtmlOutputs(workflowId?: string) {
  if (workflowId) {
    for (const [key, value] of htmlOutputStore.entries()) {
      if (value.workflowId === workflowId) {
        htmlOutputStore.delete(key);
      }
    }
  } else {
    htmlOutputStore.clear();
  }
}

// Generate the HTML page with embedded real-time script
function generateHtmlPage(template: string, data: any, slug: string, wsPort: number = 1884): string {
  // Process template with data
  let processedHtml = template.replace(/\{\{(.+?)\}\}/g, (_match: string, path: string) => {
    const keys = path.trim().split('.');
    let value: any = data;
    for (const key of keys) {
      value = value?.[key];
    }
    return value !== undefined ? String(value) : '';
  });

  // Inject real-time update script
  const realtimeScript = `
<script>
(function() {
  const slug = '${slug}';
  let ws;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 10;
  
  function connect() {
    ws = new WebSocket('ws://localhost:${wsPort}');
    
    ws.onopen = function() {
      console.log('[HTML Output] Connected to real-time updates');
      reconnectAttempts = 0;
      // Subscribe to this page's updates
      ws.send(JSON.stringify({ type: 'subscribe', topic: 'html-output/' + slug }));
    };
    
    ws.onmessage = function(event) {
      try {
        const msg = JSON.parse(event.data);
        if (msg.topic === 'html-output/' + slug && msg.payload) {
          updatePage(msg.payload);
        }
      } catch (e) {
        console.error('[HTML Output] Parse error:', e);
      }
    };
    
    ws.onclose = function() {
      console.log('[HTML Output] Disconnected');
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        setTimeout(connect, 2000);
      }
    };
    
    ws.onerror = function(err) {
      console.error('[HTML Output] WebSocket error:', err);
    };
  }
  
  function updatePage(data) {
    // Update elements with data-bind attribute
    document.querySelectorAll('[data-bind]').forEach(function(el) {
      const path = el.getAttribute('data-bind');
      const keys = path.split('.');
      let value = data;
      for (const key of keys) {
        value = value && value[key];
      }
      if (value !== undefined) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.value = value;
        } else {
          el.textContent = value;
        }
      }
    });
    
    // Update elements with data-bind-html attribute (for HTML content)
    document.querySelectorAll('[data-bind-html]').forEach(function(el) {
      const path = el.getAttribute('data-bind-html');
      const keys = path.split('.');
      let value = data;
      for (const key of keys) {
        value = value && value[key];
      }
      if (value !== undefined) {
        el.innerHTML = value;
      }
    });
    
    // Update style bindings
    document.querySelectorAll('[data-bind-style]').forEach(function(el) {
      const binding = el.getAttribute('data-bind-style');
      const [prop, path] = binding.split(':');
      const keys = path.split('.');
      let value = data;
      for (const key of keys) {
        value = value && value[key];
      }
      if (value !== undefined) {
        el.style[prop] = value;
      }
    });
    
    // Dispatch custom event for advanced use cases
    window.dispatchEvent(new CustomEvent('htmloutput:update', { detail: data }));
  }
  
  // Expose API for manual updates
  window.HtmlOutput = {
    getData: function() { return window.__htmlOutputData || {}; },
    send: function(data) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'publish', topic: 'html-input/' + slug, payload: data }));
      }
    }
  };
  
  // Store initial data
  window.__htmlOutputData = ${JSON.stringify(data)};
  
  // Connect on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', connect);
  } else {
    connect();
  }
})();
</script>`;

  // Insert script before </body> or at end
  if (processedHtml.includes('</body>')) {
    processedHtml = processedHtml.replace('</body>', realtimeScript + '\n</body>');
  } else {
    processedHtml += realtimeScript;
  }

  return processedHtml;
}

// Register HTML Output nodes
export function registerHtmlOutputNodes(
  engine: { 
    registerNodeType: (type: string, executor: NodeExecutor) => void;
    emit: (event: string, ...args: any[]) => boolean;
  },
  wsService?: any
) {
  // HTML OUTPUT NODE - Registers an HTML page and updates data
  engine.registerNodeType('html-output', async (msg: WorkflowMessage, ctx: NodeExecutionContext) => {
    const { 
      slug = 'dashboard',
      html = '<html><body><h1>Hello {{name}}</h1><p data-bind="value">--</p></body></html>',
      title = 'Dashboard'
    } = ctx.node.config;

    const workflowId = ctx.workflowId || 'default';
    const nodeId = ctx.node.id;
    const storeKey = `${workflowId}-${nodeId}`;

    // Get or create the HTML output entry
    let output = htmlOutputStore.get(storeKey);
    
    if (!output) {
      // First time - register the page
      output = {
        nodeId,
        workflowId,
        slug,
        html,
        data: msg.payload || {},
        lastUpdated: Date.now()
      };
      htmlOutputStore.set(storeKey, output);
      ctx.log(`📄 HTML Output registered at /${slug}/ui`);
    } else {
      // Update data
      output.data = { ...output.data, ...msg.payload };
      output.lastUpdated = Date.now();
    }

    // Publish real-time update via WebSocket
    if (wsService) {
      wsService.publish(`html-output/${slug}`, msg.payload);
      ctx.log(`📤 Real-time update sent to /${slug}/ui`);
    }

    ctx.log(`📄 Data: ${JSON.stringify(msg.payload).substring(0, 100)}`);
  });

  // HTML OUTPUT SETUP NODE - Just registers the page without sending data
  engine.registerNodeType('html-output-setup', async (_msg: WorkflowMessage, ctx: NodeExecutionContext) => {
    const { 
      slug = 'dashboard',
      html = '<html><body><h1>Dashboard</h1></body></html>'
    } = ctx.node.config;

    const workflowId = ctx.workflowId || 'default';
    const nodeId = ctx.node.id;
    const storeKey = `${workflowId}-${nodeId}`;

    // Register the page
    const output: HtmlOutputData = {
      nodeId,
      workflowId,
      slug,
      html,
      data: {},
      lastUpdated: Date.now()
    };
    htmlOutputStore.set(storeKey, output);
    
    ctx.log(`📄 HTML Output page registered at /${slug}/ui`);
  });
}

// Export the page generator for the server
export { generateHtmlPage };
