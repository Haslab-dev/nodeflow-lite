import { useState } from 'react';
import type { WorkflowDefinition } from '../../types/index.ts';
import type { Project } from '../../workflows/templates.ts';
import { nodeDefinitions } from '../../nodes/node-definitions.ts';
import { programmaticWorkflowExamples } from '../../workflows/programmatic-examples';
import {
  IconSitemap,
  IconPlus,
  IconTrash,
  IconFolder,
  IconSearch,
  IconWorld,
  IconDeviceAnalytics,
  IconDatabase,
  IconCode,
  IconBug,
  IconClock,
  IconFilter,
  IconSwitchHorizontal,
  IconServer,
  IconMail,
  IconBrandSlack,
  IconFileText,
  IconRepeat,
  IconTransform,
  IconTemplate,
  IconShieldLock,
  IconJson,
  IconPlayerPlay,
  IconLayoutGrid,
  IconBox,
  IconLayoutSidebarLeftCollapse,
  IconLogout,
  IconUser
} from '@tabler/icons-react';

interface ProjectSidebarProps {
  projects: Project[];
  currentProject: Project | null;
  currentWorkflow: WorkflowDefinition | null;
  onSelectProject: (project: Project) => void;
  onSelectWorkflow: (workflow: WorkflowDefinition) => void;
  onCreateProject: (name: string) => void;
  onCreateWorkflow: (name: string) => void;
  onDeleteProject: (id: string) => void;
  onDeleteWorkflow: (id: string) => void;
  onLoadTemplate: (template: WorkflowDefinition) => void;
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
  onCollapse?: () => void;
  currentView?: 'workflows' | 'programmatic';
  onViewChange?: (view: 'workflows' | 'programmatic') => void;
  onSelectProgrammaticWorkflow?: (workflow: any) => void;
  onCreateProgrammaticWorkflow?: () => void;
  onDeleteProgrammaticWorkflow?: (id: string) => void;
  user?: { id: string; username: string; role: string } | null;
  onLogout?: () => void;
}

// Map node types to Tabler icons (reused from WorkflowNode/AddNodeModal)
const nodeIcons: Record<string, React.ReactNode> = {
  'http-in': <IconWorld size={16} />,
  'mqtt-in': <IconDeviceAnalytics size={16} />,
  'cron': <IconClock size={16} />,
  'webhook': <IconWorld size={16} />,
  'file-watch': <IconFileText size={16} />,
  
  'debug': <IconBug size={16} />,
  'http-response': <IconWorld size={16} />,
  'mqtt-out': <IconDeviceAnalytics size={16} />,
  'email': <IconMail size={16} />,
  'slack': <IconBrandSlack size={16} />,
  'file-write': <IconFileText size={16} />,
  
  'function': <IconCode size={16} />,
  'filter': <IconFilter size={16} />,
  'switch': <IconSwitchHorizontal size={16} />,
  'transform': <IconTransform size={16} />,
  'template': <IconTemplate size={16} />,
  'loop': <IconRepeat size={16} />,
  'try-catch': <IconShieldLock size={16} />,
  
  'http-request': <IconWorld size={16} />,
  'db-insert': <IconDatabase size={16} />,
  'db-query': <IconDatabase size={16} />,
  'db-update': <IconDatabase size={16} />,
  'db-delete': <IconDatabase size={16} />,
  'delay': <IconClock size={16} />,
  'split': <IconSwitchHorizontal size={16} />,
  'join': <IconSwitchHorizontal size={16} />,
  'aggregate': <IconDeviceAnalytics size={16} />,
  'cache': <IconDatabase size={16} />,
  'json-parse': <IconJson size={16} />,
  'json-stringify': <IconJson size={16} />,
  
  'inject': <IconPlayerPlay size={16} />,
  'trigger': <IconPlayerPlay size={16} />,
};

const categoryColors: Record<string, string> = {
  input: "#3b82f6", // Blue
  output: "#22c55e", // Green
  logic: "#f59e0b", // Amber
  data: "#ec4899", // Pink
};

export function ProjectSidebar({
  projects,
  currentProject,
  currentWorkflow,
  onSelectProject,
  onSelectWorkflow,
  onCreateProject,
  onCreateWorkflow,
  onDeleteProject,
  onDeleteWorkflow,
  onDragStart,
  onCollapse,
  currentView = 'workflows',
  onViewChange,
  onSelectProgrammaticWorkflow,
  onCreateProgrammaticWorkflow,
  onDeleteProgrammaticWorkflow,
  user,
  onLogout
}: ProjectSidebarProps) {
  const [activeTab, setActiveTab] = useState<'projects' | 'nodes'>('projects');
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewWorkflow, setShowNewWorkflow] = useState(false);
  const [newName, setNewName] = useState('');
  const [nodeSearch, setNodeSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [showProgrammaticExamples, setShowProgrammaticExamples] = useState(true);

  const handleCreateProject = () => {
    if (newName.trim()) {
      onCreateProject(newName.trim());
      setNewName('');
      setShowNewProject(false);
    }
  };

  const handleCreateWorkflow = () => {
    if (newName.trim()) {
      onCreateWorkflow(newName.trim());
      setNewName('');
      setShowNewWorkflow(false);
    }
  };

  const filteredNodes = nodeDefinitions.filter((node) => {
    const matchesSearch =
      node.label.toLowerCase().includes(nodeSearch.toLowerCase()) ||
      node.description?.toLowerCase().includes(nodeSearch.toLowerCase());
    const matchesCategory =
      activeCategory === "all" || node.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { id: "all", label: "All" },
    { id: "input", label: "Input" },
    { id: "output", label: "Output" },
    { id: "logic", label: "Logic" },
    { id: "data", label: "Data" },
  ];

  return (
    <div className="w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Logo Area */}
      <div className="p-4 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
            <IconSitemap className="text-white w-4 h-4" />
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-gray-900 text-sm leading-tight">NodeFlow Lite</h1>
            <p className="text-[9px] text-gray-500 font-medium tracking-wide uppercase">Workflow Automation</p>
          </div>
          {onCollapse && (
            <button
              onClick={onCollapse}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-colors shrink-0"
              title="Hide sidebar"
            >
              <IconLayoutSidebarLeftCollapse size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Workflow Type Toggle */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => onViewChange?.('workflows')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${
              currentView === 'workflows'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <IconLayoutGrid size={13} />
            Visual
          </button>
          <button
            onClick={() => onViewChange?.('programmatic')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${
              currentView === 'programmatic'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <IconCode size={13} />
            Code
          </button>
        </div>
      </div>

      {/* Tabs - Only show for Visual workflows */}
      {currentView === 'workflows' && (
        <div className="px-3 mb-2">
          <div className="flex p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setActiveTab('projects')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'projects'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <IconFolder size={13} />
              Projects
            </button>
            <button
              onClick={() => setActiveTab('nodes')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'nodes'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <IconBox size={13} />
              Nodes
            </button>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 scrollbar-thin">
        
        {/* Code Workflows View */}
        {currentView === 'programmatic' ? (
          <div className="space-y-4">
            {/* Example Workflows */}
            <div>
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Examples</span>
                <button
                  onClick={() => setShowProgrammaticExamples(!showProgrammaticExamples)}
                  className="text-gray-400 hover:text-blue-500 p-0.5 hover:bg-blue-50 rounded"
                  title={showProgrammaticExamples ? 'Hide examples' : 'Show examples'}
                >
                  <IconCode size={12} />
                </button>
              </div>
              
              {showProgrammaticExamples && (
                <div className="space-y-0.5">
                  {programmaticWorkflowExamples.map((example) => (
                    <button
                      key={example.id}
                      onClick={() => onSelectProgrammaticWorkflow?.(example)}
                      className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs transition-colors group ${
                        currentWorkflow?.id === example.id
                          ? 'bg-purple-50 text-purple-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <IconCode size={14} className={currentWorkflow?.id === example.id ? 'text-purple-500' : 'text-gray-400'} />
                      <div className="flex-1 text-left min-w-0">
                        <div className="truncate">{example.name}</div>
                        <div className="text-[10px] text-gray-400 truncate">{example.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Create New Code Workflow */}
            <div>
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">My Workflows</span>
                <button
                  onClick={() => onCreateProgrammaticWorkflow?.()}
                  className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-purple-500 transition-colors"
                  title="Create new code workflow"
                >
                  <IconPlus size={14} />
                </button>
              </div>
              <div className="text-center py-4 text-gray-400">
                <p className="text-[10px]">Click + to create a new code workflow</p>
              </div>
            </div>
          </div>
        ) : activeTab === 'projects' ? (
          <div className="space-y-4">
            {/* Projects List */}
            <div>
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Projects</span>
                <button
                  onClick={() => setShowNewProject(true)}
                  className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-500 transition-colors"
                >
                  <IconPlus size={14} />
                </button>
              </div>

              {showNewProject && (
                <div className="mb-2 px-2">
                  <input
                    autoFocus
                    type="text"
                    className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:border-blue-500"
                    placeholder="Project name..."
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
                    onBlur={() => setShowNewProject(false)}
                  />
                </div>
              )}

              <div className="space-y-1">
                {projects.map(p => (
                  <div key={p.id}>
                    <button
                      onClick={() => onSelectProject(p)}
                      className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs transition-colors ${
                        currentProject?.id === p.id
                          ? 'bg-gray-100 text-gray-900 font-medium'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                      }`}
                    >
                      <IconFolder size={16} className={currentProject?.id === p.id ? 'text-blue-500' : 'text-gray-400'} />
                      <span className="truncate flex-1 text-left">{p.name}</span>
                    </button>

                    {/* Workflows for current project */}
                    {currentProject?.id === p.id && currentView === 'workflows' && (
                      <div className="pl-4 mt-1 space-y-0.5 border-l border-gray-100 ml-2.5">
                        <div className="flex items-center justify-between px-2 py-1.5">
                          <span className="text-[10px] text-gray-400 font-medium">FLOWS</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowNewWorkflow(true); }}
                            className="text-gray-400 hover:text-blue-500 p-0.5 hover:bg-blue-50 rounded"
                          >
                            <IconPlus size={12} />
                          </button>
                        </div>
                        
                        {showNewWorkflow && (
                          <div className="px-2 mb-1">
                            <input
                              autoFocus
                              type="text"
                              className="w-full px-2 py-1 text-[10px] border rounded focus:outline-none focus:border-blue-500"
                              placeholder="Flow name..."
                              value={newName}
                              onChange={e => setNewName(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleCreateWorkflow()}
                              onBlur={() => setShowNewWorkflow(false)}
                            />
                          </div>
                        )}

                        {p.workflows.map(w => (
                          <button
                            key={w.id}
                            onClick={() => onSelectWorkflow(w)}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors group ${
                              currentWorkflow?.id === w.id
                                ? 'bg-blue-50 text-blue-600 font-medium'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${currentWorkflow?.id === w.id ? 'bg-blue-500' : 'bg-gray-300'}`} />
                            <span className="truncate flex-1 text-left">{w.name}</span>
                            <div
                              onClick={(e) => { e.stopPropagation(); onDeleteWorkflow(w.id); }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-50 hover:text-red-500 rounded transition-opacity"
                            >
                              <IconTrash size={12} />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <IconSearch
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                size={14}
              />
              <input
                type="text"
                placeholder="Search nodes..."
                value={nodeSearch}
                onChange={(e) => setNodeSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-gray-400"
              />
            </div>

            {/* Categories */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all whitespace-nowrap ${
                    activeCategory === cat.id
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Node List */}
            <div className="space-y-2">
              {filteredNodes.map((node) => {
                const catColor = categoryColors[node.category] || "#6b7280";
                return (
                  <div
                    key={node.type}
                    draggable
                    onDragStart={(event) => onDragStart(event, node.type)}
                    className="group bg-white border border-gray-200 rounded-lg p-2 hover:border-blue-300 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105"
                        style={{
                          backgroundColor: `${catColor}15`,
                          color: catColor,
                        }}
                      >
                        {nodeIcons[node.type] || <IconServer size={16} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-xs truncate">
                          {node.label}
                        </div>
                        <div className="text-[10px] text-gray-500 truncate">
                          {node.type}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {filteredNodes.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-xs">No nodes found</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* User Info & Logout - Bottom */}
      {user && (
        <div className="p-3 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <IconUser size={14} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-gray-900 truncate">{user.username}</div>
              <div className="text-[10px] text-gray-500 capitalize">{user.role}</div>
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 hover:text-red-600 transition-colors"
              title="Logout"
            >
              <IconLogout size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
