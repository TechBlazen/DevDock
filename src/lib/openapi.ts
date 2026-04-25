// ─── OpenAPI / Swagger spec parser ──────────────────────────────────────────
// Single seam between raw YAML/JSON spec text and the rest of the app:
//   • parseSpec(text) → ParsedSpec (kind, version, info, baseUrl, operations)
// PR 1 uses this to display operation lists. PR 2 will consume the same shape
// to drive the request builder. PR 3's codegen builds on it too.
//
// Uses @apidevtools/swagger-parser to validate + dereference $refs so the
// caller never has to walk a $ref chain. js-yaml handles YAML inputs.

import yaml from 'js-yaml';
import SwaggerParser from '@apidevtools/swagger-parser';

export type SpecKind = 'swagger' | 'openapi';
export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options';

const HTTP_METHODS: readonly HttpMethod[] = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;

export interface ParsedSpecInfo {
  title: string;
  description: string;
  version: string;
}

export interface ParsedParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie' | 'body' | 'formData';
  required: boolean;
  description: string;
  type: string;
  example?: unknown;
}

export interface ParsedOperation {
  operationId: string;
  method: HttpMethod;
  path: string;
  summary: string;
  description: string;
  tags: string[];
  parameters: ParsedParameter[];
  /** OpenAPI 3 only — Swagger 2 carries body via parameters. */
  requestBody?: { description: string; required: boolean; contentType: string };
  responses: { status: string; description: string; contentType?: string }[];
  deprecated: boolean;
}

export interface ParsedSpec {
  kind: SpecKind;
  /** Spec version as declared (e.g. "3.0.1" or "2.0"). */
  version: string;
  info: ParsedSpecInfo;
  /** Effective base URL: servers[0].url for OpenAPI 3, host+basePath for Swagger 2. */
  baseUrl: string;
  operations: ParsedOperation[];
}

/**
 * Best-effort detect whether the text is YAML or JSON, parse, and validate.
 * Throws with a human-readable error if the spec is malformed (the page UI
 * surfaces these directly to the user when they paste a bad URL).
 */
export async function parseSpec(text: string): Promise<ParsedSpec> {
  const obj = parseToObject(text);
  // dereference resolves $refs so consumers don't need to walk pointers;
  // also validates the spec shape and throws if it's not a valid 2.x or 3.x.
  const doc = await SwaggerParser.dereference(obj as never) as Record<string, unknown>;

  const kind: SpecKind = 'openapi' in doc ? 'openapi' : 'swagger';
  const version = String(kind === 'openapi' ? doc.openapi : doc.swagger);
  const info = (doc.info ?? {}) as Record<string, unknown>;

  return {
    kind,
    version,
    info: {
      title: String(info.title ?? '(untitled)'),
      description: String(info.description ?? ''),
      version: String(info.version ?? ''),
    },
    baseUrl: extractBaseUrl(doc, kind),
    operations: extractOperations(doc),
  };
}

function parseToObject(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Spec is empty');
  // JSON specs can also be parsed by yaml.load (YAML is a superset), but doing
  // an explicit JSON.parse first gives us a much clearer error message for
  // malformed JSON.
  if (trimmed.startsWith('{')) {
    try { return JSON.parse(trimmed) as Record<string, unknown>; }
    catch (e) { throw new Error(`Invalid JSON: ${(e as Error).message}`); }
  }
  try { return yaml.load(trimmed) as Record<string, unknown>; }
  catch (e) { throw new Error(`Invalid YAML: ${(e as Error).message}`); }
}

function extractBaseUrl(doc: Record<string, unknown>, kind: SpecKind): string {
  if (kind === 'openapi') {
    const servers = doc.servers as Array<{ url: string }> | undefined;
    return servers?.[0]?.url ?? '';
  }
  const scheme = (doc.schemes as string[] | undefined)?.[0] ?? 'https';
  const host = (doc.host as string | undefined) ?? '';
  const basePath = (doc.basePath as string | undefined) ?? '';
  return host ? `${scheme}://${host}${basePath}` : '';
}

function extractOperations(doc: Record<string, unknown>): ParsedOperation[] {
  const paths = (doc.paths ?? {}) as Record<string, Record<string, unknown>>;
  const out: ParsedOperation[] = [];

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;
    // Path-level parameters are inherited by every method on the path.
    const pathParams = (pathItem.parameters as unknown[] | undefined) ?? [];

    for (const method of HTTP_METHODS) {
      const op = pathItem[method] as Record<string, unknown> | undefined;
      if (!op) continue;

      const opParams = (op.parameters as unknown[] | undefined) ?? [];
      const parameters = [...pathParams, ...opParams].map(toParsedParam);
      const responses = parseResponses(op.responses as Record<string, unknown> | undefined);

      out.push({
        operationId: String(op.operationId ?? `${method}_${path}`),
        method,
        path,
        summary: String(op.summary ?? ''),
        description: String(op.description ?? ''),
        tags: (op.tags as string[] | undefined) ?? [],
        parameters,
        requestBody: parseRequestBody(op.requestBody as Record<string, unknown> | undefined),
        responses,
        deprecated: Boolean(op.deprecated),
      });
    }
  }
  return out;
}

function toParsedParam(raw: unknown): ParsedParameter {
  const p = (raw ?? {}) as Record<string, unknown>;
  // OpenAPI 3 nests type info under schema; Swagger 2 has it inline.
  const schema = (p.schema ?? {}) as Record<string, unknown>;
  return {
    name: String(p.name ?? ''),
    in: (String(p.in ?? 'query') as ParsedParameter['in']),
    required: Boolean(p.required),
    description: String(p.description ?? ''),
    type: String(schema.type ?? p.type ?? 'string'),
    example: p.example ?? schema.example,
  };
}

function parseRequestBody(rb: Record<string, unknown> | undefined): ParsedOperation['requestBody'] {
  if (!rb) return undefined;
  const content = (rb.content ?? {}) as Record<string, unknown>;
  // Pick the first content type — usually application/json, sometimes
  // multipart/form-data. The tester (PR 2) will let the user pick if there
  // are multiple, but for display we just show the first.
  const firstType = Object.keys(content)[0] ?? 'application/json';
  return {
    description: String(rb.description ?? ''),
    required: Boolean(rb.required),
    contentType: firstType,
  };
}

function parseResponses(responses: Record<string, unknown> | undefined): ParsedOperation['responses'] {
  if (!responses) return [];
  return Object.entries(responses).map(([status, body]) => {
    const b = (body ?? {}) as Record<string, unknown>;
    const content = (b.content ?? {}) as Record<string, unknown>;
    return {
      status,
      description: String(b.description ?? ''),
      contentType: Object.keys(content)[0],
    };
  });
}
