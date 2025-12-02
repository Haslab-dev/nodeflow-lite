import { Database } from "bun:sqlite";
import type { User, AuthSession } from "../types/index.ts";

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

  close() {
    this.db.close();
  }
}

// Singleton instance
export const db = new WorkflowDatabase();