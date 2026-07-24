import type { FastifyInstance } from 'fastify';
import { authGuard, getRequestUser } from '../middleware/auth.js';
import type { Neo4jService } from '../services/neo4j-service.js';

export function registerChatHistoryRoutes(
  app: FastifyInstance,
  jwtSecret: string,
  neo4j: Neo4jService,
) {
  const guard = authGuard(jwtSecret);

  const neo4jDisabled = (reply: Parameters<Parameters<typeof app.get>[1]>[1]) =>
    reply.status(503).send({ error: 'Chat history requires Neo4j — set DEVDOCK_NEO4J_URL, DEVDOCK_NEO4J_USER and DEVDOCK_NEO4J_PASSWORD' });

  // ── GET /api/chat/status ────────────────────────────────────────────────
  // Public capability check — lets the UI know whether history is available.
  app.get('/api/chat/status', async () => ({
    neo4jEnabled: neo4j.enabled,
  }));

  // ── POST /api/chat/sessions ─────────────────────────────────────────────
  // Create a new chat session in the graph.
  app.post('/api/chat/sessions', { preHandler: [guard] }, async (request, reply) => {
    if (!neo4j.enabled) return neo4jDisabled(reply);
    const user = getRequestUser(request);
    const { mode = 'devdock', pageContext = '', title } = request.body as {
      mode?: string;
      pageContext?: string;
      title?: string;
    };
    const session = await neo4j.createSession(user.userId, mode, pageContext, title);
    return session;
  });

  // ── GET /api/chat/sessions ──────────────────────────────────────────────
  // List the caller's 20 most-recently-updated sessions.
  app.get('/api/chat/sessions', { preHandler: [guard] }, async (request, reply) => {
    if (!neo4j.enabled) return neo4jDisabled(reply);
    const user = getRequestUser(request);
    const sessions = await neo4j.getSessions(user.userId);
    return { sessions };
  });

  // ── GET /api/chat/sessions/:id ──────────────────────────────────────────
  // Return session metadata.
  app.get('/api/chat/sessions/:id', { preHandler: [guard] }, async (request, reply) => {
    if (!neo4j.enabled) return neo4jDisabled(reply);
    const { id } = request.params as { id: string };
    const session = await neo4j.getSession(id);
    if (!session) return reply.status(404).send({ error: 'Session not found' });

    // Ownership check — only the session owner or an admin may read it.
    const user = getRequestUser(request);
    if (session.userId !== user.userId && user.role !== 'admin') {
      return reply.status(403).send({ error: 'Forbidden' });
    }
    return session;
  });

  // ── GET /api/chat/sessions/:id/messages ────────────────────────────────
  // Return all messages for a session in chronological order.
  app.get('/api/chat/sessions/:id/messages', { preHandler: [guard] }, async (request, reply) => {
    if (!neo4j.enabled) return neo4jDisabled(reply);
    const { id } = request.params as { id: string };
    const session = await neo4j.getSession(id);
    if (!session) return reply.status(404).send({ error: 'Session not found' });

    const user = getRequestUser(request);
    if (session.userId !== user.userId && user.role !== 'admin') {
      return reply.status(403).send({ error: 'Forbidden' });
    }
    const messages = await neo4j.getSessionMessages(id);
    return { messages };
  });

  // ── POST /api/chat/sessions/:id/messages ───────────────────────────────
  // Append a message to an existing session.
  app.post('/api/chat/sessions/:id/messages', { preHandler: [guard] }, async (request, reply) => {
    if (!neo4j.enabled) return neo4jDisabled(reply);
    const { id } = request.params as { id: string };
    const session = await neo4j.getSession(id);
    if (!session) return reply.status(404).send({ error: 'Session not found' });

    const user = getRequestUser(request);
    if (session.userId !== user.userId && user.role !== 'admin') {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const { role, content, provider, traceId, chatMode } = request.body as {
      role: string;
      content: string;
      provider?: string;
      traceId?: string;
      chatMode?: string;
    };

    if (!role || !content) {
      return reply.status(400).send({ error: 'role and content are required' });
    }

    // Auto-title the session from the first user message (truncated).
    if (role === 'user' && session.messageCount === 0) {
      const title = content.length > 60 ? content.slice(0, 57) + '…' : content;
      await neo4j.updateSessionTitle(id, title);
    }

    const message = await neo4j.appendMessage(id, role, content, { provider, traceId, chatMode });
    return message;
  });
}
