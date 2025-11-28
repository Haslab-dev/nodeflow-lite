import { useState } from "react";
import { nodeDefinitions } from "../../nodes/node-definitions.ts";
import {
  IconSearch,
  IconX,
  IconWorld,
  IconDeviceAnalytics,
  IconDatabase,
  IconCode,
  IconBug,
  IconArrowRight,
  IconArrowLeft,
  IconServer,
  IconClock,
  IconFilter,
  IconSwitchHorizontal,
} from "@tabler/icons-react";

interface AddNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNode: (nodeType: string) => void;
}

const categories = [
  { id: "all", label: "All" },
  { id: "input", label: "Input" },
  { id: "output", label: "Output" },
  { id: "logic", label: "Logic" },
  { id: "data", label: "Data" },
];

const categoryColors: Record<string, string> = {
  input: "#3b82f6", // Blue
  output: "#22c55e", // Green
  logic: "#f59e0b", // Amber
  data: "#ec4899", // Pink
};

// Map node types to Tabler icons
const nodeIcons: Record<string, React.ReactNode> = {
  "http-in": <IconWorld size={20} />,
  "mqtt-in": <IconDeviceAnalytics size={20} />,
  "http-request": <IconWorld size={20} />,
  "db-insert": <IconDatabase size={20} />,
  "db-query": <IconDatabase size={20} />,
  "db-update": <IconDatabase size={20} />,
  "db-delete": <IconDatabase size={20} />,
  function: <IconCode size={20} />,
  debug: <IconBug size={20} />,
  inject: <IconClock size={20} />,
  switch: <IconSwitchHorizontal size={20} />,
  filter: <IconFilter size={20} />,
  delay: <IconClock size={20} />,
};

export function AddNodeModal({
  isOpen,
  onClose,
  onAddNode,
}: AddNodeModalProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  if (!isOpen) return null;

  const filteredNodes = nodeDefinitions.filter((node) => {
    const matchesSearch =
      node.label.toLowerCase().includes(search.toLowerCase()) ||
      node.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      activeCategory === "all" || node.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddNode = (nodeType: string) => {
    onAddNode(nodeType);
    onClose();
  };

  const getNodeIcon = (node: (typeof nodeDefinitions)[0]) => {
    if (nodeIcons[node.type]) {
      return nodeIcons[node.type];
    }
    return <IconServer size={20} />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 pointer-events-none">
      {/* Backdrop - clickable to close */}
      <div className="absolute inset-0 pointer-events-auto" onClick={onClose} />

      <div
        className="relative bg-white rounded-xl shadow-2xl w-[400px] max-h-[600px] flex flex-col overflow-hidden border border-gray-100 pointer-events-auto animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Add Node</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 pb-2">
          <div className="relative">
            <IconSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search nodes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-gray-400"
              autoFocus
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                activeCategory === cat.id
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Node list */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          <div className="space-y-1">
            {filteredNodes.map((node) => {
              const catColor = categoryColors[node.category] || "#6b7280";
              return (
                <button
                  key={node.type}
                  onClick={() => handleAddNode(node.type)}
                  className="w-full flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-gray-50 transition-all text-left group border border-transparent hover:border-gray-100"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105"
                    style={{
                      backgroundColor: `${catColor}15`,
                      color: catColor,
                    }}
                  >
                    {getNodeIcon(node)}
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-gray-900 text-sm">
                        {node.label}
                      </span>
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide opacity-60"
                        style={{
                          backgroundColor: `${catColor}20`,
                          color: catColor,
                        }}
                      >
                        {node.category}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                      {node.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredNodes.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <IconSearch className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No nodes found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400 text-center bg-gray-50/50">
          {filteredNodes.length} of {nodeDefinitions.length} essential nodes
        </div>
      </div>
    </div>
  );
}
