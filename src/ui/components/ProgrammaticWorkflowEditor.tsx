import { useState, useEffect } from "react";
import {
  IconDeviceFloppy,
  IconPlayerPlay,
  IconCopy,
  IconDownload,
  IconUpload,
} from "@tabler/icons-react";
import type { ProgrammaticWorkflow, CodeWorkflow } from "../../types/index";
import { programmaticWorkflowExamples } from "../../workflows/programmatic-examples";
import ProgrammaticCodeEditor from './ProgrammaticCodeEditor';

interface ProgrammaticWorkflowEditorProps {
  workflow: ProgrammaticWorkflow | null;
  onSave: (workflow: ProgrammaticWorkflow) => void;
  onClose: () => void;
  authToken: string;
}

export default function ProgrammaticWorkflowEditor({
  workflow,
  onSave,
  onClose,
  authToken,
}: ProgrammaticWorkflowEditorProps) {
  const [codeWorkflow, setCodeWorkflow] = useState<CodeWorkflow>(
    workflow?.codeWorkflow || {
      id: "",
      name: "",
      description: "",
      triggers: [],
      steps: [],
      autoStart: true,
    }
  );
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCodePreview, setShowCodePreview] = useState(false);
  const [showFullCodeEditor, setShowFullCodeEditor] = useState(false);

  useEffect(() => {
    // Validate workflow
    const valid =
      codeWorkflow.name.trim() !== "" &&
      codeWorkflow.triggers.length > 0 &&
      codeWorkflow.steps.length > 0;
    setIsValid(valid);
    setError(null);
  }, [codeWorkflow]);

  const handleSave = async () => {
    if (!isValid) return;

    try {
      const workflowData: Omit<
        ProgrammaticWorkflow,
        "id" | "createdAt" | "updatedAt"
      > = {
        name: codeWorkflow.name,
        type: "code",
        codeWorkflow,
      };

      const response = await fetch("/api/workflows/code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(workflowData),
      });

      if (!response.ok) {
        throw new Error("Failed to save workflow");
      }

      const result = await response.json();
      onSave(result.workflow);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleUpdate = async () => {
    if (!isValid || !workflow) return;

    try {
      const workflowData = {
        name: codeWorkflow.name,
        codeWorkflow,
      };

      const response = await fetch(`/api/workflows/code/${workflow.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(workflowData),
      });

      if (!response.ok) {
        throw new Error("Failed to update workflow");
      }

      const result = await response.json();
      onSave(result.workflow);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleExecute = async () => {
    if (!workflow) return;

    try {
      const response = await fetch(
        `/api/workflows/code/${workflow.id}/execute`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ initial: {} }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to execute workflow");
      }

      console.log("Workflow executed successfully");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleLoadExample = (example: CodeWorkflow) => {
    // Preserve the original example with all function implementations
    const workflowWithCode = {
      ...example,
      id: codeWorkflow.id || `workflow-${Date.now()}`,
      name: codeWorkflow.name || example.name,
    };
    
    // Store the original workflow with functions
    setCodeWorkflow(workflowWithCode);
    
    // Log the example to console for debugging
    console.log('Loaded workflow example:', example.name);
    console.log('Steps with implementations:', example.steps);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(codeWorkflow, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${codeWorkflow.name || "workflow"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string) as CodeWorkflow;
        setCodeWorkflow({
          ...imported,
          id: codeWorkflow.id || `workflow-${Date.now()}`,
        });
      } catch (err) {
        setError("Failed to import workflow file");
      }
    };
    reader.readAsText(file);
  };

  const updateCodeWorkflow = (updates: Partial<CodeWorkflow>) => {
    setCodeWorkflow((prev) => ({ ...prev, ...updates }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {workflow
              ? "Edit Programmatic Workflow"
              : "New Programmatic Workflow"}
          </h2>
          <div className="flex items-center gap-2">
            {workflow && (
              <button
                onClick={handleExecute}
                className="btn btn-sm bg-purple-500 hover:bg-purple-600 text-white border-transparent"
                title="Execute workflow"
              >
                <IconPlayerPlay size={16} />
                Run
              </button>
            )}
            <button
              onClick={() =>
                programmaticWorkflowExamples[0] &&
                handleLoadExample(programmaticWorkflowExamples[0])
              }
              className="btn btn-sm btn-secondary bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
              title="Load example"
            >
              <IconCopy size={16} />
              Example
            </button>
            <button
              onClick={handleExport}
              className="btn btn-sm btn-secondary bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
              title="Export workflow"
            >
              <IconDownload size={16} />
              Export
            </button>
            <label className="btn btn-sm btn-secondary bg-white hover:bg-gray-50 text-gray-700 border-gray-200 cursor-pointer">
              <IconUpload size={16} />
              Import
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
            <button
              onClick={onClose}
              className="btn btn-sm btn-secondary bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={workflow ? handleUpdate : handleSave}
              disabled={!isValid}
              className="btn btn-sm btn-primary bg-blue-600 hover:bg-blue-700 text-white border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <IconDeviceFloppy size={16} />
              {workflow ? "Update" : "Save"}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden p-6">
          <div className="h-full grid grid-cols-2 gap-6">
            {/* Left Column - Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Workflow Name
                </label>
                <input
                  type="text"
                  value={codeWorkflow.name}
                  onChange={(e) => updateCodeWorkflow({ name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter workflow name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={codeWorkflow.description || ""}
                  onChange={(e) =>
                    updateCodeWorkflow({ description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Describe what this workflow does"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Triggers
                </label>
                <div className="space-y-2">
                  {["http-in", "webhook", "mqtt"].map((trigger) => (
                    <label key={trigger} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={codeWorkflow.triggers.includes(trigger as any)}
                        onChange={(e) => {
                          const triggers = e.target.checked
                            ? [...codeWorkflow.triggers, trigger as any]
                            : codeWorkflow.triggers.filter(
                                (t) => t !== trigger
                              );
                          updateCodeWorkflow({ triggers });
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">
                        {trigger === "http-in"
                          ? "HTTP Input"
                          : trigger === "webhook"
                          ? "Webhook"
                          : "MQTT"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={codeWorkflow.autoStart}
                    onChange={(e) =>
                      updateCodeWorkflow({ autoStart: e.target.checked })
                    }
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Auto-start when triggers are detected
                  </span>
                </label>
              </div>

              {/* Examples */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Load Example
                </label>
                <select
                  onChange={(e) => {
                    const example =
                      programmaticWorkflowExamples[parseInt(e.target.value)];
                    if (example) handleLoadExample(example);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select an example...</option>
                  {programmaticWorkflowExamples.map((example, index) => (
                    <option key={example.id} value={index}>
                      {example.name} - {example.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right Column - Code Editor */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Workflow Code
                </label>
                <button
                  onClick={() => setShowFullCodeEditor(!showFullCodeEditor)}
                  className="btn btn-xs btn-secondary bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
                >
                  {showFullCodeEditor ? 'Show Form' : 'Show Full Code'}
                </button>
              </div>
              
              {showFullCodeEditor ? (
                <div className="h-96 border border-gray-300 rounded-md overflow-hidden">
                  <ProgrammaticCodeEditor
                    workflow={codeWorkflow}
                    onSave={(updatedWorkflow) => {
                      setCodeWorkflow(updatedWorkflow);
                      setShowFullCodeEditor(false);
                    }}
                    onClose={() => setShowFullCodeEditor(false)}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Workflow Structure (JSON)
                    </label>
                    <button
                      onClick={() => setShowCodePreview(!showCodePreview)}
                      className="btn btn-xs btn-secondary bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
                    >
                      {showCodePreview ? 'Hide Code' : 'Show Code'}
                    </button>
                  </div>
                  
                  <textarea
                    value={JSON.stringify(codeWorkflow, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setCodeWorkflow(parsed);
                        setError(null);
                      } catch (err) {
                        setError("Invalid JSON format");
                      }
                    }}
                    className="w-full h-64 px-3 py-2 font-mono text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Workflow structure will appear here..."
                  />
                  
                  {showCodePreview && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Step Implementations (Code Preview)
                      </label>
                      <div className="w-full h-32 px-3 py-2 font-mono text-xs border border-gray-300 rounded-md bg-gray-50 overflow-auto">
                        {codeWorkflow.steps.map((step) => (
                          <div key={step.id} className="mb-2">
                            <div className="font-semibold text-blue-600">
                              {step.id} ({step.type}):
                            </div>
                            {step.type === 'task' && step.run && (
                              <pre className="text-green-700 mt-1 whitespace-pre-wrap">
                                {step.run.toString().substring(0, 200)}
                                {step.run.toString().length > 200 && '...'}
                              </pre>
                            )}
                            {step.type === 'condition' && (
                              <div className="text-purple-600">
                                Condition: when function defined
                                <br />
                                Then: {step.then?.length || 0} steps
                                <br />
                                Else: {step.else?.length || 0} steps
                              </div>
                            )}
                            {step.type === 'parallel' && (
                              <div className="text-orange-600">
                                Parallel: {step.steps?.length || 0} steps
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
