import { describe, it, expect } from 'vitest';
import { parseSpec } from '../../lib/openapi';

const OPENAPI_3_YAML = `
openapi: 3.0.1
info:
  title: Pet Store
  description: Demo API
  version: 1.0.0
servers:
  - url: https://api.example.com/v1
paths:
  /pets:
    get:
      operationId: listPets
      summary: List all pets
      tags: [pets]
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
      responses:
        '200':
          description: A list of pets
          content:
            application/json:
              schema:
                type: array
    post:
      operationId: createPet
      summary: Add a pet
      tags: [pets]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
      responses:
        '201':
          description: Created
  /pets/{id}:
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
    get:
      operationId: getPet
      summary: Get one pet
      tags: [pets]
      responses:
        '200':
          description: OK
`;

const SWAGGER_2_JSON = JSON.stringify({
  swagger: '2.0',
  info: { title: 'Legacy API', description: 'old', version: '0.1.0' },
  host: 'legacy.example.com',
  basePath: '/api',
  schemes: ['https'],
  paths: {
    '/users': {
      get: {
        operationId: 'listUsers',
        summary: 'List users',
        tags: ['users'],
        parameters: [{ name: 'q', in: 'query', type: 'string', required: false }],
        responses: { '200': { description: 'OK' } },
      },
    },
  },
});

describe('parseSpec', () => {
  it('parses an OpenAPI 3 YAML spec', async () => {
    const spec = await parseSpec(OPENAPI_3_YAML);
    expect(spec.kind).toBe('openapi');
    expect(spec.version).toBe('3.0.1');
    expect(spec.info.title).toBe('Pet Store');
    expect(spec.baseUrl).toBe('https://api.example.com/v1');
    expect(spec.operations).toHaveLength(3);
    const list = spec.operations.find((o) => o.operationId === 'listPets')!;
    expect(list.method).toBe('get');
    expect(list.path).toBe('/pets');
    expect(list.tags).toEqual(['pets']);
    const create = spec.operations.find((o) => o.operationId === 'createPet')!;
    expect(create.requestBody?.contentType).toBe('application/json');
    expect(create.requestBody?.required).toBe(true);
  });

  it('inherits path-level parameters into each operation', async () => {
    const spec = await parseSpec(OPENAPI_3_YAML);
    const getPet = spec.operations.find((o) => o.operationId === 'getPet')!;
    expect(getPet.parameters).toHaveLength(1);
    expect(getPet.parameters[0].name).toBe('id');
    expect(getPet.parameters[0].in).toBe('path');
    expect(getPet.parameters[0].required).toBe(true);
  });

  it('parses a Swagger 2 JSON spec and synthesizes baseUrl from host+basePath', async () => {
    const spec = await parseSpec(SWAGGER_2_JSON);
    expect(spec.kind).toBe('swagger');
    expect(spec.version).toBe('2.0');
    expect(spec.baseUrl).toBe('https://legacy.example.com/api');
    expect(spec.operations).toHaveLength(1);
    const op = spec.operations[0];
    expect(op.parameters[0].type).toBe('string');
  });

  it('throws on empty input', async () => {
    await expect(parseSpec('')).rejects.toThrow(/empty/i);
  });

  it('throws on malformed JSON', async () => {
    await expect(parseSpec('{ "openapi": "3.0.0",')).rejects.toThrow(/invalid json/i);
  });
});
