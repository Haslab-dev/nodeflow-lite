import { Database } from "bun:sqlite";
import type { User, AuthSession, ProgrammaticWorkflow } from "../types/index.ts";

export class WorkflowDatabase {
  private db: Database;

  constructor(dbPath: string = ":memory:") {
    this.db = new Database(dbPath);
    this.initializeTables();
  }

  private initializeTables() {
    // Users table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
        created_at INTEGER NOT NULL
      )
    `);

    // Auth sessions table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Programmatic workflows table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS workflows (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'code',
        code_workflow TEXT NOT NULL, -- JSON string
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // Create indexes
    this.db.run("CREATE INDEX IF NOT EXISTS idx_sessions_token ON auth_sessions(token)");
    this.db.run("CREATE INDEX IF NOT EXISTS idx_sessions_user ON auth_sessions(user_id)");
    this.db.run("CREATE INDEX IF NOT EXISTS idx_sessions_expires ON auth_sessions(expires_at)");
  }

  // User management
  async createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const id = crypto.randomUUID();
    const createdAt = Date.now();
    
    this.db.run(
      `INSERT INTO users (id, username, password_hash, role, created_at) 
       VALUES (?, ?, ?, ?, ?)`,
      [id, user.username, user.passwordHash, user.role, createdAt]
    );

    return { id, ...user, createdAt };
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const user = this.db.query(
      `SELECT id, username, password_hash, role, created_at FROM users WHERE username = ?`
    ).get(username) as any;
    
    if (!user) return null;
    
    return {
      id: user.id,
      username: user.username,
      passwordHash: user.password_hash,
      role: user.role,
      createdAt: user.created_at
    };
  }

  async getUserById(id: string): Promise<User | null> {
    const user = this.db.query(
      `SELECT id, username, password_hash, role, created_at FROM users WHERE id = ?`
    ).get(id) as any;
    
    if (!user) return null;
    
    return {
      id: user.id,
      username: user.username,
      passwordHash: user.password_hash,
      role: user.role,
      createdAt: user.created_at
    };
  }

  // Session management
  async createSession(session: Omit<AuthSession, 'id' | 'createdAt'>): Promise<AuthSession> {
    const id = crypto.randomUUID();
    const createdAt = Date.now();
    
    this.db.run(
      `INSERT INTO auth_sessions (id, user_id, token, expires_at, created_at) 
       VALUES (?, ?, ?, ?, ?)`,
      [id, session.userId, session.token, session.expiresAt, createdAt]
    );

    return { id, ...session, createdAt };
  }

  async getSessionByToken(token: string): Promise<AuthSession | null> {
    const session = this.db.query(
      `SELECT id, user_id, token, expires_at, created_at FROM auth_sessions 
       WHERE token = ? AND expires_at > ?`
    ).get(token, Date.now()) as any;
    
    if (!session) return null;
    
    return {
      id: session.id,
      userId: session.user_id,
      token: session.token,
      expiresAt: session.expires_at,
      createdAt: session.created_at
    };
  }

  async deleteSession(token: string): Promise<boolean> {
    const result = this.db.run(
      `DELETE FROM auth_sessions WHERE token = ?`,
      [token]
    );
    return result.changes > 0;
  }

  async deleteExpiredSessions(): Promise<number> {
    const result = this.db.run(
      `DELETE FROM auth_sessions WHERE expires_at <= ?`,
      [Date.now()]
    );
    return result.changes;
  }

  // Workflow management
  async createWorkflow(workflow: Omit<ProgrammaticWorkflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProgrammaticWorkflow> {
    const id = crypto.randomUUID();
    const now = Date.now();
    
    this.db.run(
      `INSERT INTO workflows (id, name, type, code_workflow, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, workflow.name, workflow.type, JSON.stringify(workflow.codeWorkflow), now, now]
    );

    return { id, ...workflow, createdAt: now, updatedAt: now };
  }

  async updateWorkflow(id: string, workflow: Partial<Omit<ProgrammaticWorkflow, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ProgrammaticWorkflow | null> {
    const existing = await this.getWorkflowById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: any[] = [];

    if (workflow.name !== undefined) {
      updates.push("name = ?");
      values.push(workflow.name);
    }
    
    if (workflow.codeWorkflow !== undefined) {
      updates.push("code_workflow = ?");
      values.push(JSON.stringify(workflow.codeWorkflow));
    }

    if (updates.length === 0) return existing;

    updates.push("updated_at = ?");
    values.push(Date.now());
    values.push(id);

    this.db.run(
      `UPDATE workflows SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    return await this.getWorkflowById(id);
  }

  async getWorkflowById(id: string): Promise<ProgrammaticWorkflow | null> {
    const workflow = this.db.query(
      `SELECT id, name, type, code_workflow, created_at, updated_at FROM workflows WHERE id = ?`
    ).get(id) as any;
    
    if (!workflow) return null;
    
    return {
      id: workflow.id,
      name: workflow.name,
      type: workflow.type,
      codeWorkflow: JSON.parse(workflow.code_workflow),
      createdAt: workflow.created_at,
      updatedAt: workflow.updated_at
    };
  }

  async getAllWorkflows(): Promise<ProgrammaticWorkflow[]> {
    const workflows = this.db.query(
      `SELECT id, name, type, code_workflow, created_at, updated_at FROM workflows ORDER BY updated_at DESC`
    ).all() as any[];
    
    return workflows.map(workflow => ({
      id: workflow.id,
      name: workflow.name,
      type: workflow.type,
      codeWorkflow: JSON.parse(workflow.code_workflow),
      createdAt: workflow.created_at,
      updatedAt: workflow.updated_at
    }));
  }

  async deleteWorkflow(id: string): Promise<boolean> {
    const result = this.db.run(
      `DELETE FROM workflows WHERE id = ?`,
      [id]
    );
    return result.changes > 0;
  }

  // Utility methods
  async getWorkflowsByTrigger(trigger: 'http-in' | 'webhook' | 'mqtt'): Promise<ProgrammaticWorkflow[]> {
    const workflows = this.db.query(
      `SELECT id, name, type, code_workflow, created_at, updated_at FROM workflows`
    ).all() as any[];
    
    return workflows
      .map(workflow => ({
        id: workflow.id,
        name: workflow.name,
        type: workflow.type,
        codeWorkflow: JSON.parse(workflow.code_workflow),
        createdAt: workflow.created_at,
        updatedAt: workflow.updated_at
      }))
      .filter(workflow => workflow.codeWorkflow.triggers.includes(trigger));
  }

  close() {
    this.db.close();
  }
}

// Singleton instance
export const db = new WorkflowDatabase();