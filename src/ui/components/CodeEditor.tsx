import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import Editor from '@monaco-editor/react';
import type { WorkflowDefinition } from '../../types/index.ts';
import { IconAlertCircle } from '@tabler/icons-react';

interface CodeEditorProps {
  workflow: WorkflowDefinition | null;
  onSave: (workflow: WorkflowDefinition) => void;
  onClose: () => void;
  inline?: boolean;
}

export interface CodeEditorHandle {
  save: () => boolean;
  format: () => void;
}

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(
  ({ workflow, onSave, onClose, inline = false }, ref) => {
    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const editorRef = useRef<any>(null);

    useEffect(() => {
      if (workflow) {
        setCode(JSON.stringify(workflow, null, 2));
        setError(null);
      }
    }, [workflow]);

    const handleEditorDidMount = (editor: any) => {
      editorRef.current = editor;
    };

    const handleEditorChange = (value: string | undefined) => {
      if (value !== undefined) {
        setCode(value);
        setError(null);
      }
    };

    const handleSave = (): boolean => {
      try {
        const parsed = JSON.parse(code);
        
        if (!parsed.id || !parsed.name || !Array.isArray(parsed.nodes)) {
          throw new Error('Invalid workflow structure');
        }
        onSave(parsed);
        setError(null);
        return true;
      } catch (e) {
        setError((e as Error).message);
        return false;
      }
    };

    const handleFormat = () => {
      if (editorRef.current) {
        editorRef.current.getAction('editor.action.formatDocument')?.run();
      }
    };

    useImperativeHandle(ref, () => ({
      save: handleSave,
      format: handleFormat
    }));

    if (!workflow) return null;

    const editorContent = (
      <div className="h-full flex flex-col bg-white">
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <IconAlertCircle className="text-red-500 w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <div className="text-red-800 font-medium text-xs">Error</div>
                <div className="text-red-600 text-xs mt-0.5">{error}</div>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex-1 overflow-hidden">
          <Editor
            height="100%"
            language="json"
            value={code}
            onChange={handleEditorChange}
            onMount={handleEditorDidMount}
            theme="vs-dark"
            options={{
              minimap: { enabled: true },
              fontSize: 13,
              lineNumbers: 'on',
              roundedSelection: true,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              formatOnPaste: true,
              formatOnType: true,
              wordWrap: 'on',
              folding: true,
              bracketPairColorization: { enabled: true },
              readOnly: false,
            }}
          />
        </div>
      </div>
    );

    if (inline) {
      return editorContent;
    }

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col border border-gray-200">
          {editorContent}
        </div>
      </div>
    );
  }
);
