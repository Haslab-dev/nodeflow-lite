import { useState, useEffect } from 'react';
import { programmaticWorkflowExamples } from '../../workflows/programmatic-examples';
import { IconCode, IconDeviceFloppy, IconPlayerPlay } from '@tabler/icons-react';

interface ProgrammaticCodeEditorProps {
  workflow: any;
  onSave: (workflow: any) => void;
  onClose: () => void;
}

export default function ProgrammaticCodeEditor({ workflow, onSave, onClose }: ProgrammaticCodeEditorProps) {
  const [code, setCode] = useState('');
  const [isModified, setIsModified] = useState(false);

  useEffect(() => {
    if (workflow) {
      // Find the original example to get the proper format
      const originalExample = programmaticWorkflowExamples.find(ex => ex.id === workflow.id);
      
      if (originalExample) {
        // Format the workflow in the exact desired format
        const formattedCode = formatWorkflowCode(originalExample);
        setCode(formattedCode);
      } else {
        // For new workflows, create a template
        setCode(createNewWorkflowTemplate(workflow));
      }
      setIsModified(false);
    }
  }, [workflow]);

  const formatWorkflowCode = (example: any) => {
    let code = `export const programmaticWorkflowExamples: CodeWorkflow[] = [\n`;
    code += `  {\n`;
    code += `    id: '${example.id}',\n`;
    code += `    name: '${example.name}',\n`;
    code += `    description: '${example.description}',\n`;
    code += `    triggers: ${JSON.stringify(example.triggers)},\n`;
    code += `    autoStart: ${example.autoStart},\n`;
    code += `    steps: stepsToArray({\n`;
    
    // Format each step
    example.steps.forEach((step: any, index: number) => {
      code += formatStep(step, 3);
      if (index < example.steps.length - 1) code += ',';
      code += '\n';
    });
    
    code += `    })\n`;
    code += `  }\n`;
    code += `];`;
    
    return code;
  };

  const formatStep = (step: any, indentLevel: number): string => {
    const indent = '  '.repeat(indentLevel);
    let stepCode = `${indent}${step.id}: {\n`;
    stepCode += `${indent}  id: "${step.id}",\n`;
    stepCode += `${indent}  type: "task" as const,\n`;
    
    if (step.type === 'task' && step.run) {
      stepCode += `${indent}  run: ${step.run.toString()},\n`;
    } else if (step.type === 'condition') {
      stepCode += `${indent}  // Condition step\n`;
      if (step.when) {
        stepCode += `${indent}  when: ${step.when.toString()},\n`;
      }
      if (step.then) {
        stepCode += `${indent}  then: [\n`;
        step.then.forEach((thenStep: any, i: number) => {
          stepCode += formatStep(thenStep, indentLevel + 2);
          if (i < step.then.length - 1) stepCode += ',';
          stepCode += '\n';
        });
        stepCode += `${indent}  ],\n`;
      }
      if (step.else) {
        stepCode += `${indent}  else: [\n`;
        step.else.forEach((elseStep: any, i: number) => {
          stepCode += formatStep(elseStep, indentLevel + 2);
          if (i < step.else.length - 1) stepCode += ',';
          stepCode += '\n';
        });
        stepCode += `${indent}  ],\n`;
      }
    } else if (step.type === 'parallel' && step.steps) {
      stepCode += `${indent}  steps: [\n`;
      step.steps.forEach((parallelStep: any, i: number) => {
        stepCode += formatStep(parallelStep, indentLevel + 2);
        if (i < step.steps.length - 1) stepCode += ',';
        stepCode += '\n';
      });
      stepCode += `${indent}  ]\n`;
    }
    
    stepCode += `${indent}}`;
    return stepCode;
  };

  const createNewWorkflowTemplate = (workflow: any) => {
    return `export const programmaticWorkflowExamples: CodeWorkflow[] = [
  {
    id: '${workflow.id}',
    name: '${workflow.name}',
    description: '${workflow.description || 'A new code workflow'}',
    triggers: ${JSON.stringify(workflow.triggers || [])},
    autoStart: ${workflow.autoStart || false},
    steps: stepsToArray({
      // Add your workflow steps here
      exampleStep: {
        id: "exampleStep",
        type: "task" as const,
        run: async (ctx) => {
          console.log('Example step executed');
          return ctx;
        },
      }
    })
  }
];`;
  };

  const handleSave = () => {
    try {
      // Parse the code to extract the workflow object
      const workflowMatch = code.match(/\{[\s\S]*\}/);
      if (!workflowMatch) {
        throw new Error('Could not parse workflow from code');
      }
      
      // This is a simplified parser - in a real implementation you'd want a proper AST parser
      const workflowObj = eval(`(${workflowMatch[0]})`);
      onSave(workflowObj);
      setIsModified(false);
    } catch (error) {
      console.error('Error saving workflow:', error);
      alert('Error saving workflow. Please check the code format.');
    }
  };

  const handleCodeChange = (value: string) => {
    setCode(value);
    setIsModified(true);
  };

  if (!workflow) return null;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <IconCode size={20} className="text-purple-600" />
          <div>
            <h3 className="font-semibold text-gray-900">{workflow.name}</h3>
            <p className="text-sm text-gray-500">{workflow.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="btn btn-sm bg-purple-600 hover:bg-purple-700 text-white border-transparent"
            disabled={!isModified}
          >
            <IconDeviceFloppy size={16} />
            Save
          </button>
          <button
            onClick={() => {
              // Execute workflow logic would go here
              console.log('Executing workflow:', workflow);
            }}
            className="btn btn-sm bg-green-600 hover:bg-green-700 text-white border-transparent"
          >
            <IconPlayerPlay size={16} />
            Run
          </button>
        </div>
      </div>

      {/* Code Editor */}
      <div className="flex-1 overflow-hidden">
        <textarea
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          className="w-full h-full p-4 font-mono text-sm bg-gray-50 border-0 resize-none focus:outline-none focus:ring-0"
          spellCheck={false}
          placeholder="Workflow code will appear here..."
        />
      </div>
    </div>
  );
}