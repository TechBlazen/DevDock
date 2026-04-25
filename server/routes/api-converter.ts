import type { FastifyInstance } from 'fastify';
import { authGuard } from '../middleware/auth.js';
import { convertSpec, detectSpecFormat, type SpecFormat, type SpecSyntax } from '../services/spec-converter.js';

/**
 * Register API conversion routes
 * Provides endpoints for converting between OpenAPI/Swagger formats
 */
export function registerApiConverterRoutes(app: FastifyInstance, jwtSecret: string) {
  const guard = authGuard(jwtSecret);

  /**
   * POST /api/convert/spec
   * Convert an API specification between formats
   * 
   * Request body:
   * {
   *   spec: string,              // The specification to convert
   *   from: 'openapi_3' | 'swagger_2',
   *   to: 'openapi_3' | 'swagger_2',
   *   syntax?: 'json' | 'yaml'   // Output format (default: json)
   * }
   * 
   * Response:
   * {
   *   spec: string,              // Converted specification
   *   format: string,            // Target format
   *   syntax: string             // Output syntax
   * }
   */
  app.post('/api/convert/spec', { preHandler: guard }, async (request, reply) => {
    const body = request.body as Record<string, unknown>;

    // Validate required fields
    if (!body.spec || typeof body.spec !== 'string') {
      return reply.status(400).send({ error: 'spec is required and must be a string' });
    }
    if (!body.from || typeof body.from !== 'string') {
      return reply.status(400).send({ error: 'from format is required' });
    }
    if (!body.to || typeof body.to !== 'string') {
      return reply.status(400).send({ error: 'to format is required' });
    }

    const from = body.from as SpecFormat;
    const to = body.to as SpecFormat;
    const syntax = (body.syntax as SpecSyntax) || 'json';

    try {
      const result = await convertSpec(body.spec, { from, to, syntax });
      return reply.send(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return reply.status(400).send({ error: message });
    }
  });

  /**
   * POST /api/convert/detect
   * Detect the format of an API specification
   * 
   * Request body:
   * {
   *   spec: string  // The specification to analyze
   * }
   * 
   * Response:
   * {
   *   format: 'openapi_3' | 'swagger_2' | null,
   *   detected: boolean
   * }
   */
  app.post('/api/convert/detect', { preHandler: guard }, async (request, reply) => {
    const body = request.body as Record<string, unknown>;

    if (!body.spec || typeof body.spec !== 'string') {
      return reply.status(400).send({ error: 'spec is required and must be a string' });
    }

    const format = detectSpecFormat(body.spec);
    return reply.send({
      format,
      detected: format !== null,
    });
  });

  /**
   * GET /api/convert/formats
   * Get available conversion formats
   * 
   * Response:
   * {
   *   formats: string[],
   *   conversions: { from: string, to: string }[]
   * }
   */
  app.get('/api/convert/formats', { preHandler: guard }, async (request, reply) => {
    return reply.send({
      formats: ['openapi_3', 'swagger_2'],
      syntaxes: ['json', 'yaml'],
      conversions: [
        { from: 'swagger_2', to: 'openapi_3', description: 'Convert Swagger 2.0 to OpenAPI 3.0' },
        { from: 'openapi_3', to: 'swagger_2', description: 'Convert OpenAPI 3.0 to Swagger 2.0' },
      ],
    });
  });
}
