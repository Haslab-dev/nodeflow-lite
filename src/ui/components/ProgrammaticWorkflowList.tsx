import { useState, useEffect } from 'react';
import { IconPlus, IconEdit, IconTrash, IconPlayerPlay, IconCode } from '@tabler/icons-react';
import type { ProgrammaticWorkflow } from '../../types/index.ts';
import ProgrammaticWorkflowEditor from './ProgrammaticWorkflowEditor.tsx';

interface ProgrammaticWorkflowListProps {
  authToken: string;
}

export default function ProgrammaticWorkflowList({ authToken }: ProgrammaticWorkflowListProps) {
  const [workflows, setWorkflows] = useState<ProgrammaticWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingWorkflow, setEditingWorkflow] = useState<ProgrammaticWorkflow | null>(null);
  const [creatingWorkflow, setCreatingWorkflow] = useState(false);

  useEffect(() => {
    loadWorkflows();
  }, [authToken]);

  const loadWorkflows = async () => {
    try {
      const response = await fetch('/api/workflows/code', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load workflows');
      }

      const result = await response.json();
      if (result.success) {
        setWorkflows(result.workflows);
      } else {
        throw new Error(result.error || 'Failed to load workflows');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (workflow: ProgrammaticWorkflow) => {
    if (!confirm(`Are you sure you want to delete "${workflow.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/workflows/code/${workflow.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete workflow');
      }

      setWorkflows(prev => prev.filter(w => w.id !== workflow.id));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleExecute = async (workflow: ProgrammaticWorkflow) => {
    try {
      const response = await fetch(`/api/workflows/code/${workflow.id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ initial: {} })
      });

      if (!response.ok) {
        throw new Error('Failed to execute workflow');
      }

      const result = await response.json();
      if (result.success) {
        console.log('Workflow executed successfully:', result.result);
        alert('Workflow executed successfully! Check console for details.');
      } else {
        throw new Error(result.error || 'Failed to execute workflow');
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleSave = (workflow: ProgrammaticWorkflow) => {
    if (editingWorkflow) {
      // Update existing workflow
      setWorkflows(prev => prev.map(w => w.id === workflow.id ? workflow : w));
      setEditingWorkflow(null);
    } else {
      // Add new workflow
      setWorkflows(prev => [...prev, workflow]);
      setCreatingWorkflow(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getTriggerBadge = (triggers: string[]) => {
    if (triggers.length === 0) return <span className="text-xs text-gray-500">Manual</span>;
    
    return (
      <div className="flex gap-1">
        {triggers.map(trigger => (
          <span
            key={trigger}
            className={`text-xs px-2 py-1 rounded ${
              trigger === 'http-in' ? 'bg-blue-100 text-blue-700' :
              trigger === 'webhook' ? 'bg-green-100 text-green-700' :
              'bg-purple-100 text-purple-700'
            }`}
          >
            {trigger === 'http-in' ? 'HTTP' :
             trigger === 'webhook' ? 'Webhook' : 'MQTT'}
          </span>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading workflows...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Programmatic Workflows</h2>
          <p className="text-gray-600 mt-1">
            Code-based workflows with automatic trigger support for HTTP, Webhook, and MQTT events
          </p>
        </div>
        <button
          onClick={() => setCreatingWorkflow(true)}
          className="btn btn-primary bg-blue-600 hover:bg-blue-700 text-white border-transparent"
        >
          <IconPlus size={16} />
          New Workflow
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Workflow List */}
      {workflows.length === 0 ? (
        <div className="text-center py-12">
          <IconCode size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No programmatic workflows yet</h3>
          <p className="text-gray-600 mb-4">
            Create your first code-based workflow to get started with automatic triggers.
          </p>
          <button
            onClick={() => setCreatingWorkflow(true)}
            className="btn btn-primary bg-blue-600 hover:bg-blue-700 text-white border-transparent"
          >
            <IconPlus size={16} />
            Create Workflow
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {workflows.map(workflow => (
            <div key={workflow.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{workflow.name}</h3>
                    {getTriggerBadge(workflow.codeWorkflow.triggers)}
                  </div>
                  {workflow.codeWorkflow.description && (
                    <p className="text-gray-600 mb-3">{workflow.codeWorkflow.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{workflow.codeWorkflow.steps.length} steps</span>
                    <span>Created {formatDate(workflow.createdAt)}</span>
                    <span>Updated {formatDate(workflow.updatedAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleExecute(workflow)}
                    className="btn btn-sm bg-purple-500 hover:bg-purple-600 text-white border-transparent"
                    title="Execute workflow"
                  >
                    <IconPlayerPlay size={16} />
                  </button>
                  <button
                    onClick={() => setEditingWorkflow(workflow)}
                    className="btn btn-sm btn-secondary bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
                    title="Edit workflow"
                  >
                    <IconEdit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(workflow)}
                    className="btn btn-sm bg-red-500 hover:bg-red-600 text-white border-transparent"
                    title="Delete workflow"
                  >
                    <IconTrash size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {(editingWorkflow || creatingWorkflow) && (
        <ProgrammaticWorkflowEditor
          workflow={editingWorkflow}
          onSave={handleSave}
          onClose={() => {
            setEditingWorkflow(null);
            setCreatingWorkflow(false);
          }}
          authToken={authToken}
        />
      )}
    </div>
  );
}