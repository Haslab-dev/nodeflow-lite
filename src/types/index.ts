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
  type: 'flow' | 'step';
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
  language?: 'javascript' | 'json' | 'markdown' | 'text' | 'html'; // For code type
  options?: string[];
  default?: any;
  showWhen?: { field: string; value: any }; // Conditionally show field
}

// HTML Output node data store
export interface HtmlOutputData {
  nodeId: string;
  workflowId: string;
  slug: string;
  html: string;
  data: any;
  lastUpdated: number;
}

// Runtime service types
export interface RuntimeService {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
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
}