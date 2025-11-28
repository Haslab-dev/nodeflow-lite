import { nodeDefinitionMap } from '../../nodes/node-definitions.ts';
import type { NodeConfig } from '../../types/index.ts';
import { 
  IconPencil, 
  IconCode, 
  IconInfoCircle, 
  IconBook, 
  IconX, 
  IconPackage 
} from '@tabler/icons-react';

interface NodeConfigPanelProps {
  node: NodeConfig | null;
  onUpdate: (nodeId: string, config: Record<string, any>) => void;
  onClose?: () => void;
}

export function NodeConfigPanel({ node, onUpdate, onClose }: NodeConfigPanelProps) {
  if (!node) return null;

  const nodeDef = nodeDefinitionMap.get(node.type);
  const fields = nodeDef?.configFields || [];
  const nodeColor = nodeDef?.color || '#6b7280';

  const handleChange = (fieldName: string, value: any) => {
    onUpdate(node.id, { ...node.config, [fieldName]: value });
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
      <div className="flex-1 overflow-y-auto scrollbar-thin pl-4 pr-8 py-4 pb-20 space-y-5">
        {/* Name Field */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-xl border border-blue-100">
          <label className="block text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <IconPencil size={16} className="text-blue-600" />
            Node Name
          </label>
          <input
            type="text"
            value={node.name}
            onChange={(e) => onUpdate(node.id, { ...node.config, _name: e.target.value })}
            className="input input-md shadow-sm"
            placeholder="Enter node name..."
          />
        </div>

        {/* Dynamic Fields */}
        {fields.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              Configuration
            </div>
            {fields.map(field => (
              <div key={field.name} className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  {field.label}
                </label>
            
            {field.type === 'string' && (
              <input
                type="text"
                value={node.config[field.name] ?? field.default ?? ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                className="input input-md"
                placeholder={`Enter ${field.label.toLowerCase()}...`}
              />
            )}
            
            {field.type === 'number' && (
              <input
                type="number"
                value={node.config[field.name] ?? field.default ?? 0}
                onChange={(e) => handleChange(field.name, Number(e.target.value))}
                className="input input-md"
                placeholder={`Enter ${field.label.toLowerCase()}...`}
              />
            )}
            
            {field.type === 'select' && (
              <select
                value={node.config[field.name] ?? field.default ?? ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                className="input input-md"
              >
                <option value="">Select an option...</option>
                {field.options?.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}
            
            {field.type === 'code' && (
              <div className="relative">
                <textarea
                  value={node.config[field.name] ?? field.default ?? ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  className="input input-md font-mono min-h-[140px] resize-y bg-gray-900 text-gray-100 border-gray-700 focus:border-blue-500"
                  placeholder={`Enter ${field.label.toLowerCase()}...`}
                  spellCheck={false}
                />
                <div className="absolute top-2 right-2 text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded border border-gray-700 flex items-center gap-1">
                  <IconCode size={12} /> Code
                </div>
              </div>
            )}
            
            {field.type === 'boolean' && (
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border-2 border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-all">
                <input
                  type="checkbox"
                  checked={node.config[field.name] ?? field.default ?? false}
                  onChange={(e) => handleChange(field.name, e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  {field.label}
                </span>
              </label>
            )}
              </div>
            ))}
          </div>
        )}

        {/* Node Information */}
        <div className="pt-4 border-t-2 border-gray-200">
          <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <IconInfoCircle size={16} className="text-blue-600" />
            Node Information
          </h4>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
              <span className="text-gray-600 font-medium">Node ID:</span>
              <span className="font-mono text-gray-800 bg-white px-2 py-1 rounded border border-gray-200">{node.id}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
              <span className="text-gray-600 font-medium">Type:</span>
              <span className="font-mono text-gray-800 bg-white px-2 py-1 rounded border border-gray-200">{node.type}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
              <span className="text-gray-600 font-medium">Category:</span>
              <span className="text-gray-800 capitalize bg-white px-2 py-1 rounded border border-gray-200">{nodeDef?.category || 'unknown'}</span>
            </div>
            {nodeDef?.description && (
              <div className="mt-3 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                <div className="text-gray-600 font-semibold mb-2 flex items-center gap-1">
                  <IconBook size={14} />
                  Description:
                </div>
                <div className="text-gray-700 leading-relaxed">{nodeDef.description}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
