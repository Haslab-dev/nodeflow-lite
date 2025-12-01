import { useEffect, useState } from 'react';
import { IconDashboard, IconTrash } from '@tabler/icons-react';

interface UIWidget {
  nodeId: string;
  type: 'text' | 'number' | 'gauge' | 'switch';
  label: string;
  value: any;
  unit?: string;
  decimals?: number;
  min?: number;
  max?: number;
}

interface DashboardPanelProps {
  onClear: () => void;
}

export function DashboardPanel({ onClear }: DashboardPanelProps) {
  const [widgets, setWidgets] = useState<Map<string, UIWidget>>(new Map());
  const [layout, setLayout] = useState<'list' | 'grid'>('grid');

  useEffect(() => {
    // Poll for UI updates from server
    const fetchUIData = async () => {
      try {
        const res = await fetch('/api/ui-data');
        const data = await res.json();
        if (data.widgets) {
          setWidgets(new Map(Object.entries(data.widgets)));
        }
      } catch {}
    };

    fetchUIData();
    const interval = setInterval(fetchUIData, 500);
    return () => clearInterval(interval);
  }, []);

  const widgetArray = Array.from(widgets.values());

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
        <div className="flex items-center gap-2">
          <IconDashboard size={16} className="text-cyan-600" />
          <div className="text-xs font-semibold text-gray-700">Dashboard</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex p-0.5 bg-gray-200 rounded">
            <button
              onClick={() => setLayout('list')}
              className={`px-2 py-1 text-[10px] font-medium rounded transition-all ${
                layout === 'list' ? 'bg-white shadow-sm' : 'text-gray-600'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setLayout('grid')}
              className={`px-2 py-1 text-[10px] font-medium rounded transition-all ${
                layout === 'grid' ? 'bg-white shadow-sm' : 'text-gray-600'
              }`}
            >
              Grid
            </button>
          </div>
          <button
            onClick={onClear}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-200 rounded transition-colors"
            title="Clear dashboard"
          >
            <IconTrash size={14} />
          </button>
        </div>
      </div>

      {/* Widgets */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        {widgetArray.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <IconDashboard size={48} className="mb-3 opacity-20" />
            <p className="text-sm font-medium">No dashboard widgets</p>
            <p className="text-xs mt-1">Add UI nodes to see data here</p>
          </div>
        ) : (
          <div className={layout === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-3'}>
            {widgetArray.map((widget) => (
              <div
                key={widget.nodeId}
                className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="text-xs font-medium text-gray-500 mb-2">{widget.label}</div>
                
                {widget.type === 'text' && (
                  <div className="text-lg font-semibold text-gray-900 break-words">
                    {widget.value}
                  </div>
                )}
                
                {widget.type === 'number' && (
                  <div className="text-2xl font-bold text-cyan-600">
                    {typeof widget.value === 'number' 
                      ? widget.value.toFixed(widget.decimals || 0)
                      : widget.value}
                    {widget.unit && <span className="text-sm ml-1 text-gray-500">{widget.unit}</span>}
                  </div>
                )}
                
                {widget.type === 'gauge' && (
                  <div>
                    <div className="text-2xl font-bold text-cyan-600 mb-2">
                      {typeof widget.value === 'number' ? widget.value.toFixed(0) : widget.value}
                      {widget.unit && <span className="text-sm ml-1 text-gray-500">{widget.unit}</span>}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.max(0, ((widget.value - (widget.min || 0)) / ((widget.max || 100) - (widget.min || 0))) * 100))}%`
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>{widget.min || 0}</span>
                      <span>{widget.max || 100}</span>
                    </div>
                  </div>
                )}
                
                {widget.type === 'switch' && (
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-6 rounded-full transition-colors ${
                        widget.value ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform m-0.5 ${
                          widget.value ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </div>
                    <span className={`text-sm font-medium ${widget.value ? 'text-green-600' : 'text-gray-500'}`}>
                      {widget.value ? 'ON' : 'OFF'}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
