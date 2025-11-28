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

    // Helper to format a step recursively
    const formatStep = (step: any, indent: string = '  '): string => {
      if (step.type === 'task') {
        let code = `${indent}{\n`;
        code += `${indent}  id: "${step.id}",\n`;
        code += `${indent}  type: "task",\n`;
        if (step.run) {
          const runStr = step.run.toString();
          code += `${indent}  run: ${runStr}\n`;
        }
        code += `${indent}}`;
        return code;
      } else if (step.type === 'parallel') {
        let code = `${indent}StepFunctions.parallel([\n`;
        if (step.steps && Array.isArray(step.steps)) {
          code += step.steps.map((s: any) => formatStep(s, indent + '  ')).join(',\n');
        }
        code += `\n${indent}])`;
        return code;
      } else if (step.type === 'condition') {
        let code = `${indent}StepFunctions.condition(\n`;
        code += `${indent}  ${step.when ? step.when.toString() : '(ctx) => true'},\n`;
        code += `${indent}  [\n`;
        if (step.then && Array.isArray(step.then)) {
          code += step.then.map((s: any) => formatStep(s, indent + '    ')).join(',\n');
        }
        code += `\n${indent}  ]`;
        if (step.else && step.else.length > 0) {
          code += `,\n${indent}  [\n`;
          code += step.else.map((s: any) => formatStep(s, indent + '    ')).join(',\n');
          code += `\n${indent}  ]`;
        }
        code += `\n${indent})`;
        return code;
      }
      return `${indent}// Unknown step type: ${step.type}`;
    };

    useEffect(() => {
      if (workflow) {
        // For programmatic workflows, we need to handle the code structure differently
        if (workflow.type === 'code' || (workflow as any).triggers) {
          // Show the programmatic workflow structure with code in the proper format
          const codeWorkflow = (workflow as any).codeWorkflow || workflow;
          if (codeWorkflow) {
            let finalCode = `// Code Workflow: ${codeWorkflow.name}\n`;
            finalCode += `// ${codeWorkflow.description || 'No description'}\n\n`;
            finalCode += `import { StepFunctions, stepsToArray } from "../CodeWorkflowEngine";\n\n`;
            finalCode += `export const workflow = {\n`;
            finalCode += `  id: '${codeWorkflow.id}',\n`;
            finalCode += `  name: '${codeWorkflow.name}',\n`;
            finalCode += `  description: '${codeWorkflow.description || ''}',\n`;
            finalCode += `  triggers: ${JSON.stringify(codeWorkflow.triggers)},\n`;
            finalCode += `  autoStart: ${codeWorkflow.autoStart},\n`;
            finalCode += `  steps: [\n`;
            
            if (codeWorkflow.steps && Array.isArray(codeWorkflow.steps)) {
              finalCode += codeWorkflow.steps.map((step: any) => formatStep(step, '    ')).join(',\n\n');
            }
            
            finalCode += `\n  ]\n`;
            finalCode += `};\n`;
            
            setCode(finalCode);
          } else {
            setCode(JSON.stringify(workflow, null, 2));
          }
        } else {
          setCode(JSON.stringify(workflow, null, 2));
        }
        setError(null);
      }
    }, [workflow]);

    const handleEditorDidMount = (editor: any) => {
      editorRef.current = editor;
    };

    const handleEditorChange = (value: string | undefined) => {
      if (value !== undefined) {
        setCode(value);
        // Validate JSON in real-time
        try {
          JSON.parse(value);
          setError(null);
        } catch (e) {
          setError((e as Error).message);
        }
      }
    };

    const handleSave = (): boolean => {
      try {
        const parsed = JSON.parse(code, (key, value) => {
          // Try to revive function strings back to actual functions
          if (typeof value === 'string') {
            // Check if this looks like a function
            if (value.includes('function') || value.includes('=>')) {
              try {
                // For arrow functions and simple functions
                if (value.includes('=>') || value.includes('function')) {
                  // Create a function from the string
                  return new Function('return ' + value)();
                }
              } catch (e) {
                // If revival fails, keep as string
                return value;
              }
            }
          }
          return value;
        });

        // For programmatic workflows, we need to handle the structure differently
        if (parsed.type === 'code' || (parsed as any).triggers) {
          // This is a programmatic workflow, validate the structure
          if (!parsed.id || !parsed.name || !Array.isArray(parsed.steps)) {
            throw new Error('Invalid programmatic workflow structure');
          }
          
          // Create the proper workflow structure
          const workflow: any = {
            ...parsed,
            type: 'code',
            nodes: [] // Required by WorkflowDefinition but not used for code workflows
          };
          
          onSave(workflow);
        } else {
          // Regular workflow
          if (!parsed.id || !parsed.name || !Array.isArray(parsed.nodes)) {
            throw new Error('Invalid workflow structure');
          }
          onSave(parsed);
        }
        
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

    // Determine if this is a code workflow (TypeScript) or regular workflow (JSON)
    const isCodeWorkflow = workflow.type === 'code' || (workflow as any).triggers;
    const editorLanguage = isCodeWorkflow ? 'typescript' : 'json';

    const editorContent = (
      <div className="h-full flex flex-col bg-white">
        {/* Error Display */}
        {error && !isCodeWorkflow && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <IconAlertCircle className="text-red-500 w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <div className="text-red-800 font-medium text-xs">JSON Error</div>
                <div className="text-red-600 text-xs mt-0.5">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Read-only notice for code workflows */}
        {isCodeWorkflow && (
          <div className="mx-4 mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="text-purple-800 font-medium text-xs">Code Workflow (Read-only)</div>
            <div className="text-purple-600 text-xs mt-0.5">
              This is a pre-defined code workflow. Click Run to execute it.
            </div>
          </div>
        )}
        
        {/* Monaco Editor */}
        <div className="flex-1 overflow-hidden">
          <Editor
            height="100%"
            language={editorLanguage}
            value={code}
            onChange={isCodeWorkflow ? undefined : handleEditorChange}
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
              formatOnPaste: !isCodeWorkflow,
              formatOnType: !isCodeWorkflow,
              wordWrap: 'on',
              folding: true,
              bracketPairColorization: { enabled: true },
              readOnly: isCodeWorkflow,
              suggest: {
                showKeywords: true,
              },
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
