import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;
  username: string;
  role: string;
}

export function createToken(payload: JwtPayload, secret: string): string {
  return jwt.sign(payload, secret, { expiresIn: '24h' });
}

export function verifyToken(token: string, secret: string): JwtPayload | null {
  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch {
    return null;
  }
}

// Fastify preHandler hook — attaches user to request
export function authGuard(secret: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.slice(7);
    const payload = verifyToken(token, secret);
    if (!payload) {
      return reply.status(401).send({ error: 'Invalid or expired token' });
    }

    // Attach to request for downstream use
    (request as FastifyRequest & { user: JwtPayload }).user = payload;
  };
}

// Helper to extract user from request (call after authGuard)
export function getRequestUser(request: FastifyRequest): JwtPayload {
  return (request as FastifyRequest & { user: JwtPayload }).user;
}
