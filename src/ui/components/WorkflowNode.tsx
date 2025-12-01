import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { nodeDefinitionMap } from '../../nodes/node-definitions.ts';
import { 
  IconWorld, 
  IconDeviceAnalytics, 
  IconCode, 
  IconBug,
  IconClock,
  IconFilter,
  IconSwitchHorizontal,
  IconServer,
  IconTransform,
  IconTemplate,
  IconPlayerPlay,
  IconX,
  IconRobot,
  IconRepeat,
  IconTable
} from '@tabler/icons-react';

interface WorkflowNodeProps {
  id: string;
  data: {
    label: string;
    type: string;
    config: Record<string, any>;
    onInject?: (nodeId: string) => void;
    onDelete?: (nodeId: string) => void;
    isDeployed?: boolean;
    isExecuting?: boolean;
  };
  selected?: boolean;
}

// Map node types to Tabler icons
const nodeIcons: Record<string, React.ReactNode> = {
  'http-in': <IconWorld size={16} />,
  'mqtt-in': <IconDeviceAnalytics size={16} />,
  
  'debug': <IconBug size={16} />,
  'http-response': <IconWorld size={16} />,
  'mqtt-out': <IconDeviceAnalytics size={16} />,
  
  'function': <IconCode size={16} />,
  'filter': <IconFilter size={16} />,
  'transform': <IconTransform size={16} />,
  'template': <IconTemplate size={16} />,
  
  'http-request': <IconWorld size={16} />,
  'delay': <IconClock size={16} />,
  'split': <IconSwitchHorizontal size={16} />,
  'join': <IconSwitchHorizontal size={16} />,
  
  'inject': <IconPlayerPlay size={16} />,
  'trigger': <IconPlayerPlay size={16} />,
  
  // AI node
  'ai-generate': <IconRobot size={16} />,
  
  // Loop and Data nodes
  'loop': <IconRepeat size={16} />,
  'data-table': <IconTable size={16} />,
  
  // UI Dashboard nodes
  'ui-text': <IconCode size={16} />,
  'ui-number': <IconCode size={16} />,
  'ui-gauge': <IconCode size={16} />,
  'ui-switch': <IconCode size={16} />,
};

function WorkflowNode({ id, data, selected }: WorkflowNodeProps) {
  const nodeDef = nodeDefinitionMap.get(data.type);
  const color = nodeDef?.color || '#6b7280';
  const inputs = nodeDef?.inputs || 0;
  const outputs = nodeDef?.outputs || 0;
  const isInject = data.type === 'inject' || data.type === 'trigger';

  const handleInjectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onInject && data.isDeployed) {
      data.onInject(id);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onDelete) {
      data.onDelete(id);
    }
  };

  const Icon = nodeIcons[data.type] || <IconServer size={16} />;

  return (
    <div
      className={`relative group bg-white rounded-lg shadow-sm transition-all duration-200 border-2 ${
        data.isExecuting
          ? 'border-orange-500 animate-executing-pulse shadow-lg shadow-orange-200'
          : selected 
            ? 'border-blue-500 ring-2 ring-blue-100' 
            : data.isDeployed 
              ? 'border-green-500 animate-border-pulse' 
              : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
      }`}
      style={{
        minWidth: 140,
        maxWidth: 200,
      }}
    >
      {/* Delete button - top right corner - only show when NOT deployed */}
      {!data.isDeployed && (
        <button
          onClick={handleDeleteClick}
          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
          title="Delete node"
        >
          <IconX size={12} />
        </button>
      )}

      {/* Input handle */}
      {inputs > 0 && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-2.5 !h-2.5 !border-2 !border-white !bg-gray-400 !-top-1.5 !left-1/2 !-translate-x-1/2 transition-colors hover:!bg-blue-500"
        />
      )}
      
      {/* Node content */}
      <div className="flex items-center gap-3 p-2.5">
        {/* Icon Container */}
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center text-white shrink-0 shadow-sm"
          style={{
            backgroundColor: color,
          }}
        >
          {isInject ? (
             <button
              onClick={handleInjectClick}
              disabled={!data.isDeployed}
              className={`w-full h-full flex items-center justify-center transition-colors rounded-md ${
                data.isDeployed ? 'hover:bg-white/20 cursor-pointer' : 'cursor-not-allowed opacity-80'
              }`}
              title={data.isDeployed ? 'Run this node' : 'Deploy workflow first'}
             >
               {Icon}
             </button>
          ) : (
            Icon
          )}
        </div>
        
        {/* Label */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-700 text-xs leading-tight truncate">{data.label}</div>
          <div className="text-[10px] text-gray-400 truncate mt-0.5">{data.type}</div>
        </div>
      </div>
      
      {/* Output handles */}
      {outputs > 0 && Array.from({ length: outputs }).map((_, i) => (
        <Handle
          key={i}
          type="source"
          position={Position.Bottom}
          id={`output-${i}`}
          className="!w-2.5 !h-2.5 !border-2 !border-white !bg-gray-400 !-bottom-1.5 transition-colors hover:!bg-blue-500"
          style={{
            left: outputs === 1 ? '50%' : `${35 + (i * 30)}%`,
            transform: 'translateX(-50%)'
          }}
        />
      ))}
    </div>
  );
}

export default memo(WorkflowNode);
