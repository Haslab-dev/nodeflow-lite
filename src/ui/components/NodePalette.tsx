import { nodeDefinitions } from '../../nodes/node-definitions.ts';
import type { NodeTypeDefinition } from '../../types/index.ts';

interface NodePaletteProps {
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
}

const categories = ['input', 'output', 'function', 'network', 'common'] as const;

export function NodePalette({ onDragStart }: NodePaletteProps) {
  const grouped = categories.reduce((acc, cat) => {
    acc[cat] = nodeDefinitions.filter(n => n.category === cat);
    return acc;
  }, {} as Record<string, NodeTypeDefinition[]>);

  const categoryIcons: Record<string, string> = {
    input: '📥',
    output: '📤',
    function: '⚙️',
    network: '🌐',
    common: '🔧'
  };

  return (
    <div className="w-64 shrink-0 bg-gradient-to-b from-gray-50 to-white border-r-2 border-gray-200 overflow-y-auto scrollbar-thin shadow-lg">
      <div className="p-4 border-b-2 border-gray-200 bg-gradient-to-br from-blue-50 to-purple-50">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-1">
          <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
            <span className="text-white text-sm">📦</span>
          </span>
          Node Palette
        </h3>
        <p className="text-xs text-gray-600 ml-10">Drag nodes to canvas</p>
      </div>
      
      <div className="p-4 space-y-5">
        {categories.map(category => (
          <div key={category} className="animate-fade-in">
            <div className="font-bold text-xs text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-2 px-2">
              <span className="text-base">{categoryIcons[category]}</span>
              <span>{category}</span>
              <div className="flex-1 h-px bg-gradient-to-r from-gray-300 to-transparent"></div>
            </div>
            <div className="space-y-2">
              {(grouped[category] || []).map(node => (
                <div
                  key={node.type}
                  draggable
                  onDragStart={(e) => onDragStart(e, node.type)}
                  className="group relative px-3 py-3 rounded-xl cursor-grab active:cursor-grabbing text-xs font-semibold border-2 transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95 bg-white hover:border-gray-400 border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shadow-md flex-shrink-0 transition-transform group-hover:scale-110"
                      style={{
                        background: `linear-gradient(135deg, ${node.color}20, ${node.color}35)`,
                        border: `2px solid ${node.color}50`,
                        boxShadow: `0 2px 8px ${node.color}20`
                      }}
                    >
                      {node.icon}
                    </div>
                    <span className="text-gray-800 group-hover:text-gray-900 truncate flex-1">
                      {node.label}
                    </span>
                  </div>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none"></div>
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-1 rounded-b-xl transition-all duration-300 opacity-0 group-hover:opacity-100"
                    style={{
                      background: `linear-gradient(90deg, ${node.color}60, ${node.color}, ${node.color}60)`
                    }}
                  ></div>
                </div>
              ))}
            </div>
            {(grouped[category] || []).length === 0 && (
              <div className="text-xs text-gray-400 italic text-center py-4 bg-gray-50 rounded-lg">
                No nodes in this category
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
