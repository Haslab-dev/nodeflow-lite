// Core types for the workflow engine

export interface WorkflowMessage {
  payload: any;
  metadata?: Record<string, any>;
  error?: string;
}

export interface NodeConfig {
  id: string;
  type: string;
  name: string;
  config: Record<string, any>;
  wires: string[][]; // Array of output wire arrays
  position?: { x: number; y: number }; // For UI positioning
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  type: 'flow' | 'step' | 'code'; // New: workflow type including programmatic code
  nodes: NodeConfig[];
}

export interface NodeExecutionContext {
  node: NodeConfig;
  workflowId?: string;
  send: (msg: WorkflowMessage, output?: number) => void;
  log: (msg: string) => void;
  error: (msg: string, err?: Error) => void;
}

export type NodeExecutor = (
  msg: WorkflowMessage,
  context: NodeExecutionContext
) => Promise<void> | void;

// Node type metadata for UI
export interface NodeTypeDefinition {
  type: string;
  label: string;
  category: 'input' | 'output' | 'logic' | 'data';
  color: string;
  inputs: number;
  outputs: number;
  icon?: string;
  description?: string;
  configFields?: ConfigField[];
}

export interface ConfigField {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'code' | 'select' | 'ai-config' | 'mqtt-config';
  language?: 'javascript' | 'json' | 'markdown' | 'text'; // For code type
  options?: string[];
  default?: any;
}

// Runtime service types
export interface RuntimeService {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
}

// Programmatic workflow types based on workflow-reference.ts
export type Ctx = Record<string, any>;
export type StepFn = (ctx: Ctx) => Promise<Ctx> | Ctx;

export type Step =
  | { id: string; type: "task"; run: StepFn }
  | { id: string; type: "parallel"; steps: Step[] }
  | {
      id: string;
      type: "condition";
      when: (ctx: Ctx) => boolean;
      then: Step[];
      else?: Step[];
    };

export interface CodeWorkflow {
  id: string;
  name: string;
  description?: string;
  triggers: ('http-in' | 'webhook' | 'mqtt')[];
  steps: Step[];
  autoStart?: boolean; // Auto-start if contains trigger nodes
}

export interface ProgrammaticWorkflow {
  id: string;
  name: string;
  type: 'code';
  codeWorkflow: CodeWorkflow;
  createdAt: number;
  updatedAt: number;
}

// Authentication types
export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: 'admin' | 'user';
  createdAt: number;
}

export interface AuthSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: number;
  createdAt: number;
}

// Database types
export interface DatabaseSchema {
  users: User;
  auth_sessions: AuthSession;
  workflows: ProgrammaticWorkflow;
}