// AI Memory Management - Server-side conversation history storage

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  timestamp?: number;
  toolCallId?: string;
  toolName?: string;
}

export interface ConversationMemory {
  id: string;
  messages: Message[];
  maxMessages?: number;
  createdAt: number;
  updatedAt: number;
}

// In-memory storage (can be replaced with database later)
const conversations = new Map<string, ConversationMemory>();

export class AIMemoryManager {
  // Get or create conversation
  static getConversation(conversationId: string, maxMessages: number = 50): ConversationMemory {
    if (!conversations.has(conversationId)) {
      conversations.set(conversationId, {
        id: conversationId,
        messages: [],
        maxMessages,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    return conversations.get(conversationId)!;
  }

  // Add message to conversation
  static addMessage(conversationId: string, message: Message): void {
    const conversation = this.getConversation(conversationId);
    
    message.timestamp = Date.now();
    conversation.messages.push(message);
    
    // Trim to max messages (keep system messages)
    if (conversation.maxMessages && conversation.messages.length > conversation.maxMessages) {
      const systemMessages = conversation.messages.filter(m => m.role === 'system');
      const otherMessages = conversation.messages.filter(m => m.role !== 'system');
      
      // Keep all system messages + last N other messages
      const trimmedOthers = otherMessages.slice(-conversation.maxMessages);
      conversation.messages = [...systemMessages, ...trimmedOthers];
    }
    
    conversation.updatedAt = Date.now();
  }

  // Get conversation history
  static getHistory(conversationId: string): Message[] {
    const conversation = conversations.get(conversationId);
    return conversation ? [...conversation.messages] : [];
  }

  // Clear conversation
  static clearConversation(conversationId: string): void {
    conversations.delete(conversationId);
  }

  // Get all conversation IDs
  static getAllConversationIds(): string[] {
    return Array.from(conversations.keys());
  }

  // Get conversation info
  static getConversationInfo(conversationId: string): { messageCount: number; lastUpdated: number } | null {
    const conversation = conversations.get(conversationId);
    if (!conversation) return null;
    
    return {
      messageCount: conversation.messages.length,
      lastUpdated: conversation.updatedAt,
    };
  }

  // Export conversation (for backup/persistence)
  static exportConversation(conversationId: string): ConversationMemory | null {
    return conversations.get(conversationId) || null;
  }

  // Import conversation (for restore)
  static importConversation(conversation: ConversationMemory): void {
    conversations.set(conversation.id, conversation);
  }

  // Clean old conversations (optional - for memory management)
  static cleanOldConversations(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [id, conv] of conversations.entries()) {
      if (now - conv.updatedAt > maxAgeMs) {
        conversations.delete(id);
        cleaned++;
      }
    }
    
    return cleaned;
  }

  // Get statistics
  static getStats(): { totalConversations: number; totalMessages: number } {
    let totalMessages = 0;
    for (const conv of conversations.values()) {
      totalMessages += conv.messages.length;
    }
    
    return {
      totalConversations: conversations.size,
      totalMessages,
    };
  }
}
