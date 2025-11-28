import { db } from "../database/index.ts";
import type { User, AuthSession } from "../types/index.ts";

export class AuthService {
  private static instance: AuthService;
  private sessionTimeout: number = 24 * 60 * 60 * 1000; // 24 hours

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Hash password using Web Crypto API
  async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Verify password
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const passwordHash = await this.hashPassword(password);
    return passwordHash === hash;
  }

  // Create user (for initial setup)
  async createUser(username: string, password: string, role: 'admin' | 'user' = 'user'): Promise<User> {
    const passwordHash = await this.hashPassword(password);
    return await db.createUser({ username, passwordHash, role });
  }

  // Authenticate user and create session
  async login(username: string, password: string): Promise<{ user: User; session: AuthSession } | null> {
    const user = await db.getUserByUsername(username);
    if (!user) return null;

    const isValidPassword = await this.verifyPassword(password, user.passwordHash);
    if (!isValidPassword) return null;

    // Create session
    const token = this.generateToken();
    const expiresAt = Date.now() + this.sessionTimeout;
    
    const session = await db.createSession({
      userId: user.id,
      token,
      expiresAt
    });

    // Clean up expired sessions
    await db.deleteExpiredSessions();

    return { user, session };
  }

  // Validate session token
  async validateToken(token: string): Promise<User | null> {
    const session = await db.getSessionByToken(token);
    if (!session) return null;

    const user = await db.getUserById(session.userId);
    return user;
  }

  // Logout user
  async logout(token: string): Promise<boolean> {
    return await db.deleteSession(token);
  }

  // Generate random token
  private generateToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Initialize default admin user if none exists
  async initializeDefaultAdmin(): Promise<void> {
    const adminUser = await db.getUserByUsername('admin');
    if (!adminUser) {
      await this.createUser('admin', 'admin', 'admin');
      console.log('🔐 Default admin user created: username=admin, password=admin');
    }
  }

  // Middleware for Express/Bun-style routes
  authMiddleware() {
    return async (req: Request & { user?: User }): Promise<Response | null> => {
      const authHeader = req.headers.get('authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Authorization header required' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const token = authHeader.substring(7);
      const user = await this.validateToken(token);
      
      if (!user) {
        return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      req.user = user;
      return null; // Continue to next handler
    };
  }

  // Admin-only middleware
  adminMiddleware() {
    return async (req: Request & { user?: User }): Promise<Response | null> => {
      const authResult = await this.authMiddleware()(req);
      if (authResult) return authResult;

      if (!req.user || req.user.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Admin access required' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return null;
    };
  }
}

export const authService = AuthService.getInstance();