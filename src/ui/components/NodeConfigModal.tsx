import { useState } from 'react';
import { IconX, IconPlayerPlay, IconInfoCircle } from '@tabler/icons-react';
import { NodeConfigPanel } from './NodeConfigPanel';
import type { NodeConfig } from '../../types/index';

interface NodeConfigModalProps {
  node: NodeConfig | null;
  onUpdate: (nodeId: string, config: Record<string, any>) => void;
  onClose: () => void;
  onTest?: (nodeId: string) => void;
  authToken: string | null;
}

export function NodeConfigModal({ node, onUpdate, onClose, onTest, authToken }: NodeConfigModalProps) {
  // Set default input based on node type
  const getDefaultInput = () => {
    if (node?.type === 'ai-generate') {
      return JSON.stringify({ payload: { prompt: "Hello, how are you?" } }, null, 2);
    }
    return JSON.stringify({ payload: {} }, null, 2);
  };

  const [testInput, setTestInput] = useState(getDefaultInput());
  const [testOutput, setTestOutput] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  if (!node) return null;

  const handleTest = async () => {
    if (!node) return;
    
    if (!authToken) {
      setTestError('Not authenticated. Please log in again.');
      return;
    }
    
    setIsTesting(true);
    setTestError(null);
    setTestOutput(null);

    try {
      // Parse test input
      let inputData;
      try {
        inputData = JSON.parse(testInput);
      } catch (e) {
        throw new Error(`Invalid JSON input: ${(e as Error).message}`);
      }
      
      // Ensure payload exists
      if (!inputData.payload) {
        inputData = { payload: inputData };
      }

      // Create a minimal workflow with just this node for testing
      const testWorkflow = {
        id: `test-${Date.now()}`,
        name: 'Test Workflow',
        nodes: [
          {
            ...node,
            wires: [[]] // No output connections for test
          }
        ]
      };

      // Execute the test
      const response = await fetch('/api/workflow/test-node', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          workflow: testWorkflow,
          nodeId: node.id,
          input: inputData
        })
      });

      if (!response.ok) {
        let errorMessage = 'Test failed';
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Test failed');
      }
      
      setTestOutput(result.output);
      
      // Call the onTest callback if provided
      if (onTest) {
        onTest(node.id);
      }
    } catch (error) {
      setTestError((error as Error).message);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full h-[90vh] flex flex-col border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
              {node.type.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{node.name}</h2>
              <p className="text-xs text-gray-500 font-mono">{node.type}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleTest}
              disabled={isTesting}
              className="btn btn-sm bg-green-600 hover:bg-green-700 text-white border-transparent"
              title="Test this node"
            >
              {isTesting ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <IconPlayerPlay size={16} />
              )}
              Test Node
            </button>
            <button
              onClick={() => {
                // Save is automatic as config updates happen in real-time
                // Just show a brief feedback
              }}
              className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white border-transparent"
              title="Configuration is saved automatically"
            >
              Save
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-colors"
              title="Close"
            >
              <IconX size={20} />
            </button>
          </div>
        </div>

        {/* 3-Column Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Input */}
          <div className="w-80 border-r border-gray-200 flex flex-col bg-gray-50">
            <div className="px-4 py-3 border-b border-gray-200 bg-white">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Input
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-600">Test Input (JSON)</label>
                <textarea
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  className="w-full h-64 px-3 py-2 text-xs font-mono border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder='{\n  "payload": {\n    "prompt": "Your test data"\n  }\n}'
                />
                <p className="text-xs text-gray-500">
                  Enter test data as JSON. The data will be passed to the node as input.
                </p>
              </div>
            </div>
          </div>

          {/* Center: Configuration */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                Configuration
              </h3>
            </div>
            <div className="flex-1 overflow-hidden">
              <NodeConfigPanel
                node={node}
                onUpdate={onUpdate}
                onClose={undefined}
              />
            </div>
          </div>

          {/* Right: Output */}
          <div className="w-80 border-l border-gray-200 flex flex-col bg-gray-50">
            <div className="px-4 py-3 border-b border-gray-200 bg-white">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Output
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {testError ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <IconInfoCircle className="text-red-500 w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-red-800 font-medium text-xs">Test Error</div>
                      <div className="text-red-600 text-xs mt-1">{testError}</div>
                    </div>
                  </div>
                </div>
              ) : testOutput ? (
                <div className="space-y-3">
                  {/* Execution Logs */}
                  {testOutput.execution && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Execution</label>
                      <div className="px-3 py-2 text-xs font-mono border border-gray-300 rounded-md bg-white whitespace-pre-wrap">
                        {testOutput.execution}
                      </div>
                    </div>
                  )}
                  
                  {/* Debug Output */}
                  {testOutput.debug && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Debug Output</label>
                      <div className="px-3 py-2 text-xs font-mono border border-gray-300 rounded-md bg-white whitespace-pre-wrap">
                        {testOutput.debug}
                      </div>
                    </div>
                  )}
                  
                  {/* All Logs */}
                  {testOutput.logs && testOutput.logs.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">All Logs</label>
                      <div className="border border-gray-300 rounded-md bg-white overflow-hidden">
                        {testOutput.logs.map((log: any, i: number) => (
                          <div key={i} className="px-3 py-2 border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                            <div className="text-[10px] text-gray-400">{log.timestamp}</div>
                            <div className="text-xs font-mono text-gray-700 mt-0.5 whitespace-pre-wrap">{log.message}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <IconPlayerPlay size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-xs">Click "Test Node" to see output</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
