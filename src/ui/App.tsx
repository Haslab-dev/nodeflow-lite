import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  type NodeTypes,
  type BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { IconDeviceFloppy, IconBug, IconInfoCircle, IconSitemap, IconLayoutSidebarRightCollapse, IconLayoutSidebarRightExpand, IconBrush, IconPlayerPlay, IconCode, IconLogin } from '@tabler/icons-react';

import WorkflowNode from './components/WorkflowNode.tsx';
import { NodeConfigPanel } from './components/NodeConfigPanel.tsx';
import { LogPanel } from './components/LogPanel.tsx';
import { ProjectSidebar } from './components/ProjectSidebar.tsx';
import { CodeEditor } from './components/CodeEditor.tsx';
import { nodeDefinitionMap } from '../nodes/node-definitions.ts';
import { defaultProject, type Project } from '../workflows/templates.ts';
import type { NodeConfig, WorkflowDefinition } from '../types/index.ts';

interface WorkflowNodeData {
  label: string;
  type: string;
  config: Record<string, any>;
  [key: string]: unknown;
}

type FlowNode = Node<WorkflowNodeData>;

const nodeTypes: NodeTypes = { workflow: WorkflowNode as any };

let nodeId = 0;
const getId = () => `node_${nodeId++}`;

const STORAGE_KEY = 'nodeflow-projects';
const loadProjects = (): Project[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      // No data, return default project with demo workflows
      return [{ ...defaultProject, id: crypto.randomUUID() }];
    }
    
    const projects = JSON.parse(data) as Project[];
    
    // Migrate old workflows to add type field
    const migratedProjects = projects.map(project => ({
      ...project,
      workflows: project.workflows.map(workflow => ({
        ...workflow,
        type: workflow.type || 'flow' // Default to 'flow' for old workflows
      }))
    }));
    
    return migratedProjects;
  } catch {
    return [{ ...defaultProject, id: crypto.randomUUID() }];
  }
};
const saveProjects = (projects: Project[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
};

export default function App() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<NodeConfig | null>(null);
  const [infoLogs, setInfoLogs] = useState<Array<{ timestamp: string; message: string }>>([]);
  const [debugLogs, setDebugLogs] = useState<Array<{ timestamp: string; message: string }>>([]);
  const [runtimeStatus, setRuntimeStatus] = useState({ http: false, mqtt: false, mqttClients: 0 });
  const [isDeployed, setIsDeployed] = useState(false);
  const [rightSidebarTab, setRightSidebarTab] = useState<'info' | 'debug'>('debug');
  const [leftSidebarVisible, setLeftSidebarVisible] = useState(true);
  const [rightSidebarVisible, setRightSidebarVisible] = useState(true);
  
  const [projects, setProjects] = useState<Project[]>(loadProjects);
  const [currentProject, setCurrentProject] = useState<Project | null>(projects[0] || null);
  const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowDefinition | null>(null);
  const [viewMode, setViewMode] = useState<'builder' | 'code'>('builder');
  
  // Authentication state
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; username: string; role: string } | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  
  // UI state
  const [currentView, setCurrentView] = useState<'workflows' | 'programmatic'>('workflows');
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => { saveProjects(projects); }, [projects]);
  
  // Check for existing auth token on load
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      validateToken(token);
    } else {
      setShowLogin(true);
    }
  }, []);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/status');
        const status = await res.json() as { http: boolean; mqtt: boolean; mqttClients?: number; deployed?: boolean };
        setRuntimeStatus({ http: status.http, mqtt: status.mqtt, mqttClients: status.mqttClients || 0 });
      } catch {}
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const validateToken = async (token: string) => {
    try {
      const response = await fetch('/api/auth/validate', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setAuthToken(token);
        setUser(result.user);
        localStorage.setItem('authToken', token);
        setShowLogin(false);
      } else {
        setShowLogin(true);
      }
    } catch (err) {
      setShowLogin(true);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const result = await response.json();
      if (result.success) {
        setAuthToken(result.token);
        setUser(result.user);
        localStorage.setItem('authToken', result.token);
        setShowLogin(false);
        setLoginForm({ username: '', password: '' });
      } else {
        alert('Invalid credentials');
      }
    } catch (err) {
      alert('Login failed');
    }
  };

  const handleLogout = async () => {
    if (authToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
    setAuthToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
    setShowLogin(true);
  };

  // Fetch logs from server periodically
  useEffect(() => {
    if (!authToken) return;
    
    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/logs', {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json() as {
          infoLogs: Array<{ timestamp: string; message: string }>;
          debugLogs: Array<{ timestamp: string; message: string }>;
        };
        setInfoLogs(data.infoLogs);
        setDebugLogs(data.debugLogs);
      } catch {}
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 500); // Poll every 500ms for real-time updates
    return () => clearInterval(interval);
  }, [authToken]);

  // Refs to avoid circular dependencies
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const currentWorkflowRef = useRef(currentWorkflow);
  
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);
  useEffect(() => { currentWorkflowRef.current = currentWorkflow; }, [currentWorkflow]);

  // Trigger inject node - uses refs to avoid circular deps
  const authTokenRef = useRef(authToken);
  useEffect(() => { authTokenRef.current = authToken; }, [authToken]);
  
  const triggerInject = useCallback(async (nodeId: string) => {
    const ns = nodesRef.current;
    const es = edgesRef.current;
    const wf = currentWorkflowRef.current;
    const token = authTokenRef.current;
    
    const workflowNodes: NodeConfig[] = ns.map((n) => {
      const outEdges = es.filter((e) => e.source === n.id);
      const wires: string[][] = [];
      outEdges.forEach((e) => {
        const outputIdx = e.sourceHandle ? parseInt(e.sourceHandle.replace('output-', '')) : 0;
        while (wires.length <= outputIdx) wires.push([]);
        wires[outputIdx]!.push(e.target);
      });
      if (wires.length === 0) wires.push([]);
      return { id: n.id, type: n.data.type, name: n.data.label, config: n.data.config, wires, position: n.position };
    });
    const workflow = { id: wf?.id || `workflow-${Date.now()}`, name: wf?.name || 'Untitled', nodes: workflowNodes };

    try {
      const response = await fetch('/api/workflow/inject', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ workflow, nodeId })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to trigger inject');
      }
    } catch (err) {
      setDebugLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), message: `❌ ${(err as Error).message}` }]);
    }
  }, []); // No dependencies - uses refs

  const loadWorkflowToCanvas = (workflow: WorkflowDefinition) => {
    const flowNodes: FlowNode[] = workflow.nodes.map((n, i) => ({
      id: n.id,
      type: 'workflow',
      position: n.position || { x: 100, y: 100 + i * 120 },
      data: { label: n.name, type: n.type, config: n.config, onInject: triggerInject, isDeployed: false, onDelete: handleDeleteNode }
    }));

    const flowEdges: Edge[] = [];
    workflow.nodes.forEach(n => {
      n.wires.forEach((outputs, outputIdx) => {
        outputs.forEach(targetId => {
          flowEdges.push({
            id: `${n.id}-${outputIdx}-${targetId}`,
            source: n.id,
            target: targetId,
            sourceHandle: `output-${outputIdx}`,
            animated: true
          });
        });
      });
    });

    setNodes(flowNodes);
    setEdges(flowEdges);
    setIsDeployed(false);
    nodeId = Math.max(...workflow.nodes.map(n => parseInt(n.id.replace(/\D/g, '')) || 0), 0) + 1;
  };

  // Update nodes when deploy state changes
  useEffect(() => {
    setNodes(nds => nds.map(n => ({
      ...n,
      data: { ...n.data, isDeployed, onInject: triggerInject, onDelete: handleDeleteNode }
    })));
  }, [isDeployed]); // triggerInject is stable (no deps)

  const buildWorkflow = (): WorkflowDefinition => {
    const workflowType = currentWorkflow?.type || 'flow';
    
    if (workflowType === 'step') {
      // Step workflow: auto-wire nodes sequentially
      const workflowNodes: NodeConfig[] = nodes.map((n, index) => ({
        id: n.id,
        type: n.data.type,
        name: n.data.label,
        config: n.data.config,
        wires: index < nodes.length - 1 ? [[nodes[index + 1]!.id]] : [[]],
        position: undefined
      }));
      return { id: currentWorkflow?.id || `workflow-${Date.now()}`, name: currentWorkflow?.name || 'Untitled', type: 'step', nodes: workflowNodes };
    }
    
    // Flow workflow: use edges for wiring
    const workflowNodes: NodeConfig[] = nodes.map((n) => {
      const outEdges = edges.filter((e) => e.source === n.id);
      const wires: string[][] = [];
      outEdges.forEach((e) => {
        const outputIdx = e.sourceHandle ? parseInt(e.sourceHandle.replace('output-', '')) : 0;
        while (wires.length <= outputIdx) wires.push([]);
        wires[outputIdx]!.push(e.target);
      });
      if (wires.length === 0) wires.push([]);
      return { id: n.id, type: n.data.type, name: n.data.label, config: n.data.config, wires, position: n.position };
    });
    return { id: currentWorkflow?.id || `workflow-${Date.now()}`, name: currentWorkflow?.name || 'Untitled', type: 'flow', nodes: workflowNodes };
  };

  const saveCurrentWorkflow = () => {
    if (!currentProject || !currentWorkflow) return;
    
    // If in code mode, trigger the code editor save
    if (viewMode === 'code' && codeEditorRef.current) {
      codeEditorRef.current.save();
      return;
    }
    
    // Otherwise save from builder
    const updated = buildWorkflow();
    setProjects(prev => prev.map(p => p.id === currentProject.id 
      ? { ...p, workflows: p.workflows.map(w => w.id === currentWorkflow.id ? updated : w), updatedAt: Date.now() } 
      : p));
    setCurrentWorkflow(updated);
  };

  // Run workflow - trigger the first inject node
  const runWorkflow = async () => {
    if (!currentWorkflow) return;
    
    const workflow = buildWorkflow();
    const injectNode = workflow.nodes.find(n => n.type === 'inject');
    
    if (!injectNode) {
      alert('No inject node found in workflow');
      return;
    }
    
    await triggerInject(injectNode.id);
  };

  // Run code workflow
  const runCodeWorkflow = async () => {
    if (!currentWorkflow || currentView !== 'programmatic') return;
    
    try {
      const response = await fetch('/api/workflows/code/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ 
          workflow: currentWorkflow,
          initial: {} 
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to execute workflow');
      }
      
      const result = await response.json();
      console.log('Code workflow executed:', result);
    } catch (err) {
      setDebugLogs(prev => [...prev, { 
        timestamp: new Date().toLocaleTimeString(), 
        message: `❌ ${(err as Error).message}` 
      }]);
    }
  };

  // Deploy workflow - registers all listeners
  const deployWorkflow = async () => {
    const workflow = buildWorkflow();
    try {
      const response = await fetch('/api/workflow/deploy', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(workflow)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to deploy');
      }
      setIsDeployed(true);
    } catch (err) {
      setDebugLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), message: `❌ ${(err as Error).message}` }]);
    }
  };

  // Undeploy - stop listeners
  const undeployWorkflow = async () => {
    try {
      const response = await fetch('/api/workflow/undeploy', { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to undeploy');
      }
      setIsDeployed(false);
    } catch (err) {
      setDebugLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), message: `❌ ${(err as Error).message}` }]);
    }
  };

  const handleSelectProject = (project: Project) => {
    setCurrentProject(project);
    setCurrentWorkflow(null);
    setNodes([]);
    setEdges([]);
    setIsDeployed(false);
  };

  const handleSelectWorkflow = (workflow: WorkflowDefinition) => {
    setCurrentWorkflow(workflow);
    loadWorkflowToCanvas(workflow);
  };

  const handleCreateProject = (name: string) => {
    const newProject: Project = { id: crypto.randomUUID(), name, workflows: [], createdAt: Date.now(), updatedAt: Date.now() };
    setProjects(prev => [...prev, newProject]);
    setCurrentProject(newProject);
    setCurrentWorkflow(null);
    setNodes([]);
    setEdges([]);
  };

  const handleCreateWorkflow = (name: string, type: 'flow' | 'step' = 'flow') => {
    if (!currentProject) return;
    const newWorkflow: WorkflowDefinition = { id: `workflow-${Date.now()}`, name, type, nodes: [] };
    setProjects(prev => prev.map(p => p.id === currentProject.id ? { ...p, workflows: [...p.workflows, newWorkflow], updatedAt: Date.now() } : p));
    setCurrentProject(prev => prev ? { ...prev, workflows: [...prev.workflows, newWorkflow] } : null);
    setCurrentWorkflow(newWorkflow);
    setNodes([]);
    setEdges([]);
  };

  const handleDeleteProject = (id: string) => {
    setProjects(prev => {
      const filtered = prev.filter(p => p.id !== id);
      if (currentProject?.id === id) { setCurrentProject(filtered[0] || null); setCurrentWorkflow(null); setNodes([]); setEdges([]); }
      return filtered;
    });
  };

  const handleDeleteWorkflow = (id: string) => {
    if (!currentProject) return;
    setProjects(prev => prev.map(p => p.id === currentProject.id ? { ...p, workflows: p.workflows.filter(w => w.id !== id), updatedAt: Date.now() } : p));
    setCurrentProject(prev => prev ? { ...prev, workflows: prev.workflows.filter(w => w.id !== id) } : null);
    if (currentWorkflow?.id === id) { setCurrentWorkflow(null); setNodes([]); setEdges([]); }
  };

  const handleDeleteNode = (nodeId: string) => {
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  };

  const handleLoadTemplate = (template: WorkflowDefinition) => {
    if (!currentProject) return;
    const newWorkflow: WorkflowDefinition = { ...template, id: `workflow-${Date.now()}`, name: `${template.name} (copy)` };
    setProjects(prev => prev.map(p => p.id === currentProject.id ? { ...p, workflows: [...p.workflows, newWorkflow], updatedAt: Date.now() } : p));
    setCurrentProject(prev => prev ? { ...prev, workflows: [...prev.workflows, newWorkflow] } : null);
    setCurrentWorkflow(newWorkflow);
    loadWorkflowToCanvas(newWorkflow);
  };

  // Programmatic workflow handlers
  const handleSelectProgrammaticWorkflow = (workflow: any) => {
    setCurrentWorkflow(workflow);
  };

  const handleCreateProgrammaticWorkflow = () => {
    // Create a new empty programmatic workflow
    const newWorkflow: any = {
      id: `code-workflow-${Date.now()}`,
      name: 'New Code Workflow',
      description: 'A new code-based workflow',
      type: 'code',
      triggers: [],
      steps: [],
      autoStart: false,
      nodes: [] // Required by WorkflowDefinition but not used for code workflows
    };
    setCurrentWorkflow(newWorkflow);
  };

  const handleDeleteProgrammaticWorkflow = (id: string) => {
    // For now, just clear the current workflow if it matches
    if (currentWorkflow?.id === id) {
      setCurrentWorkflow(null);
    }
  };

  const codeEditorRef = useRef<{ save: () => boolean; format: () => void } | null>(null);

  const handleCodeSave = (workflow: WorkflowDefinition) => {
    if (!currentProject) return;
    setProjects(prev => prev.map(p => p.id === currentProject.id ? { ...p, workflows: p.workflows.map(w => w.id === workflow.id ? workflow : w), updatedAt: Date.now() } : p));
    setCurrentWorkflow(workflow);
    loadWorkflowToCanvas(workflow);
  };

  const onConnect = useCallback((params: Connection) => { setEdges((eds) => addEdge({ ...params, animated: true }, eds)); }, [setEdges]);
  const onDragStart = (event: React.DragEvent, nodeType: string) => { event.dataTransfer.setData('application/reactflow', nodeType); event.dataTransfer.effectAllowed = 'move'; };
  const onDragOver = useCallback((event: React.DragEvent) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow');
    if (!type || !reactFlowWrapper.current) return;
    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const position = { x: event.clientX - bounds.left - 60, y: event.clientY - bounds.top - 20 };
    const nodeDef = nodeDefinitionMap.get(type);
    const newNode: FlowNode = { id: getId(), type: 'workflow', position, data: { label: nodeDef?.label || type, type, config: {}, onInject: triggerInject, isDeployed, onDelete: handleDeleteNode } };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes, isDeployed, triggerInject]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: FlowNode) => {
    setSelectedNode({ id: node.id, type: node.data.type, name: node.data.label, config: node.data.config, wires: [] });
    setRightSidebarTab('info');
  }, []);

  const updateNodeConfig = (id: string, config: Record<string, any>) => {
    setNodes((nds) => nds.map((n) => {
      if (n.id === id) {
        const newName = config._name || n.data.label;
        const newConfig = { ...config };
        delete newConfig._name;
        return { ...n, data: { ...n.data, label: newName, config: newConfig } };
      }
      return n;
    }));
    if (selectedNode?.id === id) setSelectedNode({ ...selectedNode, config, name: config._name || selectedNode.name });
  };

  const clearInfoLogs = async () => {
    if (!authToken) return;
    
    try {
      await fetch('/api/logs/info', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      setInfoLogs([]);
    } catch (err) {
      console.error('Failed to clear info logs:', err);
      setInfoLogs([]);
    }
  };

  const clearDebugLogs = async () => {
    if (!authToken) return;
    
    try {
      await fetch('/api/logs/debug', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      setDebugLogs([]);
    } catch (err) {
      console.error('Failed to clear debug logs:', err);
      setDebugLogs([]);
    }
  };





  // Login Modal
  if (showLogin) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Login to NodeFlow</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter username"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter password"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full btn btn-primary bg-blue-600 hover:bg-blue-700 text-white border-transparent"
            >
              <IconLogin size={16} className="mr-2" />
              Login
            </button>
          </form>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700">
            <strong>Default credentials:</strong><br />
            Username: admin<br />
            Password: admin
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex bg-gray-50 overflow-hidden">
      {/* Left Sidebar */}
      {leftSidebarVisible && (
        <ProjectSidebar
          projects={projects}
          currentProject={currentProject}
          currentWorkflow={currentWorkflow}
          onSelectProject={handleSelectProject}
          onSelectWorkflow={handleSelectWorkflow}
          onCreateProject={handleCreateProject}
          onCreateWorkflow={handleCreateWorkflow}
          onDeleteProject={handleDeleteProject}
          onDeleteWorkflow={handleDeleteWorkflow}
          onLoadTemplate={handleLoadTemplate}
          onDragStart={onDragStart}
          onCollapse={() => setLeftSidebarVisible(false)}
          currentView={currentView}
          onViewChange={setCurrentView}
          onSelectProgrammaticWorkflow={handleSelectProgrammaticWorkflow}
          onCreateProgrammaticWorkflow={handleCreateProgrammaticWorkflow}
          onDeleteProgrammaticWorkflow={handleDeleteProgrammaticWorkflow}
          user={user}
          onLogout={handleLogout}
        />
      )}
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLeftSidebarVisible(!leftSidebarVisible)}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-gray-900 transition-colors"
              title={leftSidebarVisible ? 'Hide sidebar' : 'Show sidebar'}
            >
              <IconSitemap size={20} />
            </button>
            
            {/* Service Status Indicators */}
            <div className="flex items-center gap-2 border-r border-gray-200 pr-4">
              <div
                className={`flex items-center gap-2 px-2 py-1 rounded text-xs font-medium ${
                  runtimeStatus.http
                    ? 'text-green-700'
                    : 'text-gray-500'
                }`}
                title={runtimeStatus.http ? 'HTTP Server: Connected' : 'HTTP Server: Disconnected'}
              >
                <span className={`w-2 h-2 rounded-full ${runtimeStatus.http ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
                HTTP
              </div>
              <div
                className={`flex items-center gap-2 px-2 py-1 rounded text-xs font-medium ${
                  runtimeStatus.mqtt
                    ? 'text-green-700'
                    : 'text-gray-500'
                }`}
                title={runtimeStatus.mqtt ? 'MQTT Broker: Connected' : 'MQTT Broker: Disconnected'}
              >
                <span className={`w-2 h-2 rounded-full ${runtimeStatus.mqtt ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
                MQTT
              </div>
            </div>
            
            <h1 className="text-xl font-bold text-gray-900">
              {currentWorkflow ? currentWorkflow.name : 'Dashboard'}
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Code Workflow Actions */}
            {currentView === 'programmatic' && currentWorkflow && (
              <button
                onClick={async () => {
                  setIsRunning(true);
                  setRightSidebarVisible(true);
                  setRightSidebarTab('debug');
                  try {
                    await runCodeWorkflow();
                  } finally {
                    setTimeout(() => setIsRunning(false), 1000);
                  }
                }}
                disabled={isRunning}
                className={`btn btn-sm text-white border-transparent transition-all ${
                  isRunning 
                    ? 'bg-purple-400 cursor-wait animate-pulse' 
                    : 'bg-purple-500 hover:bg-purple-600'
                }`}
                title="Run code workflow"
              >
                {isRunning ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <IconPlayerPlay size={16} />
                )}
                {isRunning ? 'Running...' : 'Run'}
              </button>
            )}

            {/* Visual Workflow Actions */}
            {currentWorkflow && currentView === 'workflows' && (
              <>
                {/* View Mode Tabs */}
                <div className="flex p-1 bg-gray-100 rounded-lg">
                  <button
                    onClick={() => setViewMode('builder')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      viewMode === 'builder'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Builder
                  </button>
                  <button
                    onClick={() => setViewMode('code')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      viewMode === 'code'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Code
                  </button>
                </div>
                
                {/* Format button - only show in code mode */}
                {viewMode === 'code' && (
                  <button
                    onClick={() => codeEditorRef.current?.format()}
                    className="btn btn-sm btn-secondary bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
                    title="Format JSON"
                  >
                    <IconBrush size={16} />
                    Format
                  </button>
                )}
                
                {/* Run button - deploys and triggers inject */}
                <button
                  onClick={async () => {
                    setIsRunning(true);
                    setRightSidebarVisible(true);
                    setRightSidebarTab('debug');
                    try {
                      await deployWorkflow();
                      await runWorkflow();
                    } finally {
                      setTimeout(() => setIsRunning(false), 1500);
                    }
                  }}
                  disabled={isRunning}
                  className={`btn btn-sm text-white border-transparent transition-all ${
                    isRunning 
                      ? 'bg-green-400 cursor-wait animate-pulse' 
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                  title="Deploy and run workflow"
                >
                  {isRunning ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <IconPlayerPlay size={16} />
                  )}
                  {isRunning ? 'Running...' : 'Run'}
                </button>
                
                <button
                  onClick={saveCurrentWorkflow}
                  className="btn btn-sm btn-primary bg-blue-600 hover:bg-blue-700 text-white border-transparent"
                >
                  <IconDeviceFloppy size={16} />
                  Save
                </button>
              </>
            )}
          </div>
        </header>

        {/* Canvas Area */}
        <div className="flex-1 flex overflow-hidden relative">
          {currentView === 'programmatic' && currentWorkflow ? (
            <div className="flex-1 overflow-hidden bg-gray-50">
              <CodeEditor
                ref={codeEditorRef}
                workflow={currentWorkflow}
                onSave={handleCodeSave}
                onClose={() => setCurrentWorkflow(null)}
                inline={true}
              />
            </div>
          ) : currentView === 'programmatic' ? (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center text-gray-500">
                <IconCode size={48} className="mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-medium mb-2">No Code Workflow Selected</h3>
                <p className="text-sm">Select a code workflow from the sidebar to start editing</p>
              </div>
            </div>
          ) : viewMode === 'builder' ? (
            <div ref={reactFlowWrapper} className="flex-1 overflow-hidden bg-gray-50">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onNodeClick={onNodeClick as any}
                nodeTypes={nodeTypes}
                fitView
                proOptions={{ hideAttribution: true }}
              >
                <Controls
                  position="bottom-left"
                  className="bg-white border border-gray-200 rounded-lg shadow-lg !m-4"
                />
                <Background
                  gap={20}
                  size={1}
                  variant={'dots' as BackgroundVariant}
                  color="#e5e7eb"
                />
              </ReactFlow>
            </div>
          ) : currentView === 'workflows' ? (
            <div className="flex-1 overflow-hidden bg-gray-50">
              <CodeEditor
                ref={codeEditorRef}
                workflow={currentWorkflow}
                onSave={handleCodeSave}
                onClose={() => setViewMode('builder')}
                inline={true}
              />
            </div>
          ) : null}
          
          {/* Right Sidebar - Info and Debug with Tabs */}
          {rightSidebarVisible && (
            <div className="w-80 bg-white border-l border-gray-200 shadow-xl flex flex-col">
              {/* Tabs */}
              <div className="px-4 pt-4 pb-2 shrink-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 flex p-1 bg-gray-100 rounded-lg">
                    <button
                      onClick={() => setRightSidebarTab('info')}
                      className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all ${
                        rightSidebarTab === 'info'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <IconInfoCircle size={14} />
                      Info
                    </button>
                    <button
                      onClick={() => setRightSidebarTab('debug')}
                      className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all ${
                        rightSidebarTab === 'debug'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <IconBug size={14} />
                      Debug
                    </button>
                  </div>
                  <button
                    onClick={() => setRightSidebarVisible(false)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-colors shrink-0"
                    title="Hide sidebar"
                  >
                    <IconLayoutSidebarRightCollapse size={16} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden">
                {rightSidebarTab === 'info' ? (
                  selectedNode ? (
                    <NodeConfigPanel
                      node={selectedNode}
                      onUpdate={updateNodeConfig}
                      onClose={undefined}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center">
                      <IconInfoCircle size={48} className="mb-3 opacity-20" />
                      <p className="text-sm font-medium">No node selected</p>
                      <p className="text-xs mt-1">Click on a node to view its configuration</p>
                    </div>
                  )
                ) : (
                  <LogPanel 
                    infoLogs={infoLogs}
                    debugLogs={debugLogs} 
                    onClearInfo={clearInfoLogs}
                    onClearDebug={clearDebugLogs} 
                  />
                )}
              </div>
            </div>
          )}
          
          {/* Right Sidebar Toggle Button (when hidden) */}
          {!rightSidebarVisible && (
            <button
              onClick={() => setRightSidebarVisible(true)}
              className="absolute top-20 right-4 p-2 bg-white border border-gray-200 rounded-lg shadow-lg hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-all z-10"
              title="Show sidebar"
            >
              <IconLayoutSidebarRightExpand size={20} />
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
