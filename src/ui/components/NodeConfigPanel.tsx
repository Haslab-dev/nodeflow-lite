import { useState, useEffect } from 'react';
import { nodeDefinitionMap } from '../../nodes/node-definitions.ts';
import type { NodeConfig } from '../../types/index.ts';
import Editor from '@monaco-editor/react';
import { 
  IconPencil, 
  IconCode, 
  IconX, 
  IconPackage,
  IconRobot,
  IconPlus,
  IconTrash
} from '@tabler/icons-react';
import { getAIConfigs, saveAIConfig, deleteAIConfig, AI_PRESETS, type AIConfig, type AIProvider } from '../utils/ai-config';

interface NodeConfigPanelProps {
  node: NodeConfig | null;
  onUpdate: (nodeId: string, config: Record<string, any>) => void;
  onClose?: () => void;
}

export function NodeConfigPanel({ node, onUpdate, onClose }: NodeConfigPanelProps) {
  const [aiConfigs, setAiConfigs] = useState<AIConfig[]>([]);
  const [showNewAIConfig, setShowNewAIConfig] = useState(false);
  const [newAIConfig, setNewAIConfig] = useState<{ name: string; provider: AIProvider; baseUrl: string; apiKey: string; model: string }>({ 
    name: '', 
    provider: 'openai-compatible',
    baseUrl: '', 
    apiKey: '', 
    model: '' 
  });
  const [selectedPreset, setSelectedPreset] = useState('');

  useEffect(() => {
    setAiConfigs(getAIConfigs());
  }, []);

  if (!node) return null;

  const nodeDef = nodeDefinitionMap.get(node.type);
  const fields = nodeDef?.configFields || [];
  const nodeColor = nodeDef?.color || '#6b7280';

  const handleChange = (fieldName: string, value: any) => {
    onUpdate(node.id, { ...node.config, [fieldName]: value });
  };

  const handleSaveAIConfig = () => {
    if (!newAIConfig.name || !newAIConfig.apiKey || !newAIConfig.model) return;
    const saved = saveAIConfig(newAIConfig);
    setAiConfigs([...aiConfigs, saved]);
    handleChange('aiConfig', saved);
    setShowNewAIConfig(false);
    setNewAIConfig({ name: '', provider: 'openai-compatible', baseUrl: '', apiKey: '', model: '' });
    setSelectedPreset('');
  };

  const handleDeleteAIConfig = (id: string) => {
    deleteAIConfig(id);
    setAiConfigs(aiConfigs.filter(c => c.id !== id));
    if (node.config.aiConfig?.id === id) {
      handleChange('aiConfig', null);
    }
  };

  const handlePresetChange = (presetName: string) => {
    setSelectedPreset(presetName);
    const preset = AI_PRESETS.find(p => p.name === presetName);
    if (preset) {
      setNewAIConfig(prev => ({ 
        ...prev, 
        name: preset.name, 
        provider: preset.provider,
        baseUrl: preset.baseUrl, 
        model: preset.model 
      }));
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-br from-gray-50 to-white shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-md"
              style={{
                background: `linear-gradient(135deg, ${nodeColor}20, ${nodeColor}35)`,
                border: `2px solid ${nodeColor}40`,
                color: nodeColor
              }}
            >
              {/* We can't easily render the node icon here as it might be a component in other contexts, 
                  but for now we'll use a generic package icon if it's a string emoji, or just render it if it's a component */}
               <IconPackage size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{node.name}</h3>
              <p className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded">{node.type}</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-600 transition-all hover:scale-110"
              title="Close panel"
            >
              <IconX size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Configuration Form - Scrollable */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 pb-20 space-y-3">
        {/* Name Field */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-3 rounded-lg border border-blue-100">
          <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
            <IconPencil size={12} className="text-blue-600" />
            Node Name
          </label>
          <input
            type="text"
            value={node.name}
            onChange={(e) => onUpdate(node.id, { ...node.config, _name: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter node name..."
          />
        </div>

        {/* Dynamic Fields */}
        {fields.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
              Configuration
            </div>
            {fields.map(field => (
              <div key={field.name} className="bg-white p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  {field.label}
                </label>
            
            {field.type === 'string' && (
              <input
                type="text"
                value={node.config[field.name] ?? field.default ?? ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={`Enter ${field.label.toLowerCase()}...`}
              />
            )}
            
            {field.type === 'number' && (
              <input
                type="number"
                value={node.config[field.name] ?? field.default ?? 0}
                onChange={(e) => handleChange(field.name, Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={`Enter ${field.label.toLowerCase()}...`}
              />
            )}
            
            {field.type === 'select' && (
              <select
                value={node.config[field.name] ?? field.default ?? ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">Select an option...</option>
                {field.options?.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}
            
            {field.type === 'code' && (
              <div 
                className="relative border border-gray-300 rounded-md overflow-hidden"
                onKeyDown={(e) => e.stopPropagation()}
              >
                <div className="absolute top-1 right-1 z-10 text-[10px] text-gray-400 bg-gray-800/80 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <IconCode size={10} /> {field.language?.toUpperCase() || 'TEXT'}
                </div>
                <Editor
                  height="400px"
                  language={field.language === 'text' ? 'plaintext' : (field.language || 'javascript')}
                  value={(() => {
                    const val = node.config[field.name] ?? field.default ?? '';
                    if (typeof val === 'object' && val !== null) {
                      return JSON.stringify(val, null, 2);
                    }
                    return String(val);
                  })()}
                  onChange={(value) => handleChange(field.name, value || '')}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 12,
                    lineNumbers: field.language === 'text' ? 'off' : 'on',
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    tabSize: 2,
                    automaticLayout: true,
                    formatOnPaste: true,
                    formatOnType: true,
                    padding: { top: 8, bottom: 8 },
                    // Prevent ReactFlow from capturing keyboard events
                    overviewRulerLanes: 0,
                  }}
                  onMount={(editor) => {
                    // Ensure the editor captures all keyboard events
                    editor.onKeyDown((e) => {
                      e.stopPropagation();
                    });
                  }}
                />
              </div>
            )}
            
            {field.type === 'boolean' && (
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-md border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-all">
                <input
                  type="checkbox"
                  checked={node.config[field.name] ?? field.default ?? false}
                  onChange={(e) => handleChange(field.name, e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  {field.label}
                </span>
              </label>
            )}

            {field.type === 'ai-config' && (
              <div className="space-y-2">
                {/* Saved configs dropdown */}
                <select
                  value={node.config[field.name]?.id || ''}
                  onChange={(e) => {
                    const config = aiConfigs.find(c => c.id === e.target.value);
                    handleChange(field.name, config || null);
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                >
                  <option value="">Select AI configuration...</option>
                  {aiConfigs.map(config => (
                    <option key={config.id} value={config.id}>
                      {config.name} ({config.model})
                    </option>
                  ))}
                </select>

                {/* Selected config info */}
                {node.config[field.name] && (
                  <div className="p-2 bg-emerald-50 rounded-md border border-emerald-200 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-emerald-700">
                        <IconRobot size={12} className="inline mr-1" />
                        {node.config[field.name].name}
                      </span>
                      <button
                        onClick={() => handleDeleteAIConfig(node.config[field.name].id)}
                        className="text-red-500 hover:text-red-700"
                        title="Delete this config"
                      >
                        <IconTrash size={12} />
                      </button>
                    </div>
                    <div className="text-gray-500 mt-1">
                      <span className="bg-emerald-100 px-1 rounded">{node.config[field.name].provider || 'openai-compatible'}</span> • {node.config[field.name].model}
                    </div>
                  </div>
                )}

                {/* Add new config button */}
                {!showNewAIConfig && (
                  <button
                    onClick={() => setShowNewAIConfig(true)}
                    className="w-full px-3 py-2 text-xs border border-dashed border-gray-300 rounded-md text-gray-500 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center justify-center gap-1"
                  >
                    <IconPlus size={12} /> Add New AI Config
                  </button>
                )}

                {/* New config form */}
                {showNewAIConfig && (
                  <div className="p-3 bg-gray-50 rounded-md border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-700">New AI Configuration</span>
                      <button onClick={() => setShowNewAIConfig(false)} className="text-gray-400 hover:text-gray-600">
                        <IconX size={14} />
                      </button>
                    </div>
                    
                    {/* Preset selector */}
                    <select
                      value={selectedPreset}
                      onChange={(e) => handlePresetChange(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded bg-white"
                    >
                      <option value="">Use preset...</option>
                      {AI_PRESETS.map(p => (
                        <option key={p.name} value={p.name}>{p.name}</option>
                      ))}
                    </select>

                    <input
                      type="text"
                      placeholder="Config Name"
                      value={newAIConfig.name}
                      onChange={(e) => setNewAIConfig(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded"
                    />
                    {/* Only show baseUrl for openai-compatible and zhipu */}
                    {(newAIConfig.provider === 'openai-compatible' || newAIConfig.provider === 'zhipu') && (
                      <input
                        type="text"
                        placeholder="Base URL (e.g., https://api.openai.com/v1)"
                        value={newAIConfig.baseUrl}
                        onChange={(e) => setNewAIConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded"
                      />
                    )}
                    <input
                      type="password"
                      placeholder="API Key"
                      value={newAIConfig.apiKey}
                      onChange={(e) => setNewAIConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded"
                    />
                    <input
                      type="text"
                      placeholder="Model (e.g., gpt-4o-mini)"
                      value={newAIConfig.model}
                      onChange={(e) => setNewAIConfig(prev => ({ ...prev, model: e.target.value }))}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded"
                    />
                    <button
                      onClick={handleSaveAIConfig}
                      disabled={!newAIConfig.name || !newAIConfig.apiKey || !newAIConfig.model}
                      className="w-full px-3 py-1.5 text-xs bg-emerald-500 text-white rounded hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save & Use
                    </button>
                  </div>
                )}
              </div>
            )}
              </div>
            ))}
          </div>
        )}

        {/* Node Information - Compact */}
        <div className="pt-3 border-t border-gray-200">
          <div className="flex flex-wrap gap-2 text-[10px]">
            <span className="px-2 py-1 bg-gray-100 rounded text-gray-600">
              <span className="font-medium">ID:</span> <span className="font-mono">{node.id}</span>
            </span>
            <span className="px-2 py-1 bg-gray-100 rounded text-gray-600">
              <span className="font-medium">Type:</span> <span className="font-mono">{node.type}</span>
            </span>
            <span className="px-2 py-1 bg-gray-100 rounded text-gray-600 capitalize">
              <span className="font-medium">Cat:</span> {nodeDef?.category || 'unknown'}
            </span>
          </div>
          {nodeDef?.description && (
            <p className="mt-2 text-[11px] text-gray-500 leading-relaxed">{nodeDef.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
