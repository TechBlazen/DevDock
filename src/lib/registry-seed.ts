import type { GalleryItem } from '../types';

// Curated "official" gallery items so the showcase looks populated on first run
// and demonstrates the SKILL.md packaging unit (the format the Agent Builder
// already emits). In Phase 1 these become seeded rows in the registry DB; for
// now they render read-only in the Gallery. `content` is real SKILL.md text.

function skillMd(name: string, description: string, body: string, extra?: Record<string, string>): string {
  const meta = extra
    ? '\n' + Object.entries(extra).map(([k, v]) => `${k}: ${v}`).join('\n')
    : '';
  return `---
name: ${name}
description: ${description}${meta}
---

${body}`;
}

export const REGISTRY_SEED: GalleryItem[] = [
  {
    id: 'official:pr-reviewer',
    kind: 'skill',
    name: 'pr-reviewer',
    description: 'Review a pull request diff for correctness bugs and reuse/simplification cleanups.',
    source: 'official',
    category: 'Code Quality',
    tags: ['review', 'git', 'quality'],
    capabilities: ['read-diff', 'comment'],
    compatibility: 'Claude Code, Cursor, Gemini CLI',
    author: 'DevDock',
    verified: true,
    score: 48,
    installCount: 312,
    icon: 'GitPullRequest',
    content: skillMd(
      'pr-reviewer',
      'Review a pull request diff for correctness bugs and reuse/simplification cleanups. Use when asked to review a PR or a diff.',
      `# PR Reviewer

When reviewing a diff:
1. Read the full diff before commenting.
2. Flag correctness bugs first (logic, edge cases, error handling).
3. Then note reuse/simplification opportunities — only high-confidence ones.
4. Keep comments concise and reference \`file:line\`.`,
      { license: 'MIT' },
    ),
  },
  {
    id: 'official:k8s-debugger',
    kind: 'agent',
    name: 'k8s-debugger',
    description: 'Diagnose failing Kubernetes workloads — pods, rollouts, ingress, and resource pressure.',
    source: 'official',
    category: 'Infrastructure',
    tags: ['Kubernetes', 'GKE', 'diagnostics', 'SRE'],
    capabilities: ['kubectl', 'logs', 'events'],
    compatibility: 'Any MCP-enabled runtime',
    author: 'DevDock',
    verified: true,
    score: 41,
    installCount: 198,
    icon: 'Boxes',
    content: skillMd(
      'k8s-debugger',
      'Diagnose failing Kubernetes workloads. Use when a pod is CrashLooping, a rollout is stuck, or ingress is unhealthy.',
      `# Kubernetes Debugger

Workflow:
1. Identify the failing object (pod / deployment / ingress).
2. Pull \`kubectl describe\` + recent events + container logs.
3. Correlate to a root cause (image, probe, resources, config).
4. Propose the minimal fix and the command to apply it.`,
    ),
  },
  {
    id: 'official:openapi-author',
    kind: 'skill',
    name: 'openapi-author',
    description: 'Draft and refine OpenAPI 3 specs from a plain-language description of an endpoint.',
    source: 'official',
    category: 'API',
    tags: ['OpenAPI', 'Swagger', 'API design'],
    capabilities: ['generate-spec', 'validate'],
    compatibility: 'Claude Code, Cursor',
    author: 'DevDock',
    verified: true,
    score: 27,
    installCount: 140,
    icon: 'Webhook',
    content: skillMd(
      'openapi-author',
      'Draft and refine OpenAPI 3 specs from a description. Use when designing or documenting a REST API.',
      `# OpenAPI Author

1. Capture resources, methods, and auth from the description.
2. Emit a valid OpenAPI 3 document (components/schemas reused).
3. Validate before returning; list any gaps you assumed.`,
    ),
  },
  {
    id: 'official:terraform-planner',
    kind: 'agent',
    name: 'terraform-planner',
    description: 'Plan and review Terraform changes with an eye on drift, blast radius, and cost.',
    source: 'official',
    category: 'Infrastructure',
    tags: ['Terraform', 'IaC', 'GCP', 'review'],
    capabilities: ['plan', 'policy-check'],
    author: 'DevDock',
    verified: true,
    score: 33,
    installCount: 121,
    icon: 'Cloud',
    content: skillMd(
      'terraform-planner',
      'Plan and review Terraform changes. Use before applying infra changes to assess drift, blast radius, and cost.',
      `# Terraform Planner

1. Summarize what the plan creates / changes / destroys.
2. Call out blast radius and any destroy-then-recreate risk.
3. Note cost-affecting and security-affecting resources explicitly.`,
    ),
  },
  {
    id: 'official:otel-tracer',
    kind: 'skill',
    name: 'otel-tracer',
    description: 'Add OpenTelemetry spans and correlate traces across a service to find latency hotspots.',
    source: 'official',
    category: 'Observability',
    tags: ['OpenTelemetry', 'tracing', 'performance'],
    capabilities: ['instrument', 'query-traces'],
    author: 'DevDock',
    verified: true,
    score: 22,
    installCount: 96,
    icon: 'Activity',
    content: skillMd(
      'otel-tracer',
      'Add OpenTelemetry spans and correlate traces to find latency hotspots. Use when investigating slow requests.',
      `# OTel Tracer

1. Identify the slow operation from the trace list.
2. Add spans around suspected hotspots with meaningful attributes.
3. Re-run and compare P99; report the dominant contributor.`,
    ),
  },
  {
    id: 'official:mcp-scaffold',
    kind: 'agent',
    name: 'mcp-server-scaffold',
    description: 'Scaffold a Model Context Protocol server (stdio/SSE) with a typed tools/list handshake.',
    source: 'official',
    category: 'MCP',
    tags: ['MCP', 'TypeScript', 'Python', 'tools'],
    capabilities: ['scaffold', 'tools/list'],
    author: 'DevDock',
    verified: true,
    score: 19,
    installCount: 84,
    icon: 'Cpu',
    content: skillMd(
      'mcp-server-scaffold',
      'Scaffold an MCP server with a typed tools/list handshake. Use when building a new MCP integration.',
      `# MCP Server Scaffold

1. Choose transport (stdio for local, SSE for remote).
2. Generate the server skeleton + one example tool with a JSON Schema.
3. Wire the initialize → tools/list handshake and a smoke test.`,
    ),
  },
];
