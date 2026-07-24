/**
 * Neo4j service — chat history and context graph.
 *
 * Graph model
 * ──────────────────────────────────────────────────────────────────────────
 *  (:User {userId})
 *    -[:HAS_SESSION]->
 *  (:ChatSession {id, userId, mode, title, pageContext, createdAt, updatedAt})
 *    -[:FIRST_MESSAGE]->
 *  (:ChatMessage {id, sessionId, role, content, timestamp, provider, traceId, chatMode})
 *    -[:NEXT]->
 *  (:ChatMessage) ...
 *
 * The service is a no-op (all methods resolve immediately) when Neo4j is not
 * configured, so the rest of the app treats it as purely optional.
 */
import neo4j, { type Driver, type Session as Neo4jSession } from 'neo4j-driver';
import { nanoid } from 'nanoid';
import type { Neo4jConfig } from '../config.js';

export interface ChatSessionRow {
  id: string;
  userId: string;
  mode: string;
  title: string;
  pageContext: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageRow {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  timestamp: string;
  provider?: string;
  traceId?: string;
  chatMode?: string;
}

export class Neo4jService {
  readonly enabled: boolean;
  private driver: Driver | null = null;

  constructor(config: Neo4jConfig) {
    this.enabled = config.enabled;
    if (this.enabled) {
      this.driver = neo4j.driver(
        config.url,
        neo4j.auth.basic(config.username, config.password),
        { disableLosslessIntegers: true },
      );
    }
  }

  async connect(): Promise<void> {
    if (!this.driver) return;
    await this.driver.verifyConnectivity();
    // Ensure constraints / indexes exist (idempotent)
    const s = this.driver.session();
    try {
      await s.run(`
        CREATE CONSTRAINT chatSession_id IF NOT EXISTS
        FOR (n:ChatSession) REQUIRE n.id IS UNIQUE
      `);
      await s.run(`
        CREATE CONSTRAINT chatMessage_id IF NOT EXISTS
        FOR (n:ChatMessage) REQUIRE n.id IS UNIQUE
      `);
      await s.run(`
        CREATE INDEX chatSession_userId IF NOT EXISTS
        FOR (n:ChatSession) ON (n.userId)
      `);
    } finally {
      await s.close();
    }
    console.log('Neo4j connected and constraints ready');
  }

  async close(): Promise<void> {
    await this.driver?.close();
  }

  // ─── Sessions ─────────────────────────────────────────────────────────────

  /** Create a new chat session node and link it to the user. */
  async createSession(
    userId: string,
    mode: string,
    pageContext: string,
    title?: string,
  ): Promise<ChatSessionRow> {
    if (!this.driver) {
      return this.stubSession(userId, mode, pageContext, title);
    }
    const id = nanoid();
    const now = new Date().toISOString();
    const sessionTitle = title ?? `${mode} session`;
    const s = this.driver.session();
    try {
      await s.run(
        `MERGE (u:User {userId: $userId})
         CREATE (sess:ChatSession {
           id: $id, userId: $userId, mode: $mode,
           title: $title, pageContext: $pageContext,
           messageCount: 0,
           createdAt: $now, updatedAt: $now
         })
         CREATE (u)-[:HAS_SESSION]->(sess)`,
        { id, userId, mode, title: sessionTitle, pageContext, now },
      );
    } finally {
      await s.close();
    }
    return { id, userId, mode, title: sessionTitle, pageContext, messageCount: 0, createdAt: now, updatedAt: now };
  }

  /** Return the 20 most-recently-updated sessions for a user, newest first. */
  async getSessions(userId: string, limit = 20): Promise<ChatSessionRow[]> {
    if (!this.driver) return [];
    const s = this.driver.session();
    try {
      const result = await s.run(
        `MATCH (u:User {userId: $userId})-[:HAS_SESSION]->(sess:ChatSession)
         RETURN sess
         ORDER BY sess.updatedAt DESC
         LIMIT $limit`,
        { userId, limit },
      );
      return result.records.map((r) => r.get('sess').properties as ChatSessionRow);
    } finally {
      await s.close();
    }
  }

  /** Return a single session by id, or null if it doesn't exist. */
  async getSession(sessionId: string): Promise<ChatSessionRow | null> {
    if (!this.driver) return null;
    const s = this.driver.session();
    try {
      const result = await s.run(
        `MATCH (sess:ChatSession {id: $sessionId}) RETURN sess`,
        { sessionId },
      );
      if (!result.records.length) return null;
      return result.records[0].get('sess').properties as ChatSessionRow;
    } finally {
      await s.close();
    }
  }

  // ─── Messages ─────────────────────────────────────────────────────────────

  /**
   * Append a message to the session chain.
   * Maintains FIRST_MESSAGE / LAST_MESSAGE / NEXT links and bumps
   * messageCount + updatedAt on the session.
   */
  async appendMessage(
    sessionId: string,
    role: string,
    content: string,
    meta: { provider?: string; traceId?: string; chatMode?: string } = {},
  ): Promise<ChatMessageRow> {
    if (!this.driver) {
      return this.stubMessage(sessionId, role, content, meta);
    }
    const id = nanoid();
    const timestamp = new Date().toISOString();
    const s = this.driver.session();
    try {
      await s.run(
        `MATCH (sess:ChatSession {id: $sessionId})
         // Create the new message node
         CREATE (msg:ChatMessage {
           id: $id, sessionId: $sessionId, role: $role, content: $content,
           timestamp: $timestamp, provider: $provider, traceId: $traceId,
           chatMode: $chatMode
         })
         // Wire into chain: if there's an existing last message, link it
         WITH sess, msg
         OPTIONAL MATCH (sess)-[lr:LAST_MESSAGE]->(prev:ChatMessage)
         FOREACH (_ IN CASE WHEN prev IS NOT NULL THEN [1] ELSE [] END |
           CREATE (prev)-[:NEXT]->(msg)
           DELETE lr
         )
         // If this is the first message, create FIRST_MESSAGE too
         FOREACH (_ IN CASE WHEN prev IS NULL THEN [1] ELSE [] END |
           CREATE (sess)-[:FIRST_MESSAGE]->(msg)
         )
         // Always set the new LAST_MESSAGE pointer and bump counters
         CREATE (sess)-[:LAST_MESSAGE]->(msg)
         SET sess.messageCount = sess.messageCount + 1, sess.updatedAt = $timestamp`,
        {
          sessionId, id, role, content, timestamp,
          provider: meta.provider ?? null,
          traceId: meta.traceId ?? null,
          chatMode: meta.chatMode ?? null,
        },
      );
    } finally {
      await s.close();
    }
    return { id, sessionId, role, content, timestamp, ...meta };
  }

  /**
   * Walk the NEXT chain from FIRST_MESSAGE and return all messages in order.
   */
  async getSessionMessages(sessionId: string): Promise<ChatMessageRow[]> {
    if (!this.driver) return [];
    const s = this.driver.session();
    try {
      const result = await s.run(
        `MATCH (sess:ChatSession {id: $sessionId})-[:FIRST_MESSAGE]->(first:ChatMessage)
         MATCH path = (first)-[:NEXT*0..]->(msg:ChatMessage)
         RETURN msg ORDER BY length(path)`,
        { sessionId },
      );
      return result.records.map((r) => r.get('msg').properties as ChatMessageRow);
    } finally {
      await s.close();
    }
  }

  /** Update the title of a session (derived from first user message). */
  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    if (!this.driver) return;
    const s = this.driver.session();
    try {
      await s.run(
        `MATCH (sess:ChatSession {id: $sessionId})
         SET sess.title = $title, sess.updatedAt = $now`,
        { sessionId, title, now: new Date().toISOString() },
      );
    } finally {
      await s.close();
    }
  }

  // ─── Stubs (used when Neo4j is disabled) ──────────────────────────────────

  private stubSession(userId: string, mode: string, pageContext: string, title?: string): ChatSessionRow {
    const now = new Date().toISOString();
    return {
      id: nanoid(), userId, mode,
      title: title ?? `${mode} session`,
      pageContext, messageCount: 0,
      createdAt: now, updatedAt: now,
    };
  }

  private stubMessage(
    sessionId: string, role: string, content: string,
    meta: { provider?: string; traceId?: string; chatMode?: string },
  ): ChatMessageRow {
    return { id: nanoid(), sessionId, role, content, timestamp: new Date().toISOString(), ...meta };
  }

  // ─── Internal session helper ──────────────────────────────────────────────

  /** Return a raw driver session for one-off ad-hoc queries. */
  session(): Neo4jSession {
    if (!this.driver) throw new Error('Neo4j is not enabled');
    return this.driver.session();
  }
}
