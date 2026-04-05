import type { FastifyInstance } from 'fastify';
import type { DatabaseProvider } from '../db/provider.js';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

interface RunRequest {
  language: string;
  code: string;
}

interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

function runInShell(cmd: string, timeout = 10000): RunResult {
  const start = Date.now();
  try {
    const stdout = execSync(cmd, {
      timeout,
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { stdout: stdout ?? '', stderr: '', exitCode: 0, duration: Date.now() - start };
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? String(e),
      exitCode: err.status ?? 1,
      duration: Date.now() - start,
    };
  }
}

function runWithTempFile(ext: string, cmd: (path: string) => string, code: string): RunResult {
  const dir = mkdtempSync(join(tmpdir(), 'devdock-'));
  const filePath = join(dir, `script.${ext}`);
  try {
    writeFileSync(filePath, code, 'utf-8');
    return runInShell(cmd(filePath));
  } finally {
    try { unlinkSync(filePath); } catch { /* ignore */ }
  }
}

// Check if a command exists on the system
function isCommandAvailable(cmd: string): boolean {
  try {
    execSync(`which ${cmd} 2>/dev/null || where ${cmd} 2>NUL`, { encoding: 'utf-8', timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

const INSTALL_HINTS: Record<string, { cmd: string; install: string }> = {
  python:  { cmd: 'python3', install: 'Install Python 3: https://python.org/downloads or `brew install python3`' },
  ruby:    { cmd: 'ruby',    install: 'Install Ruby: https://ruby-lang.org or `brew install ruby`' },
  go:      { cmd: 'go',      install: 'Install Go: https://go.dev/dl or `brew install go`' },
  bash:    { cmd: 'bash',    install: 'Bash should be available on most systems. Install via your package manager.' },
  php:     { cmd: 'php',     install: 'Install PHP: https://php.net or `brew install php`' },
  perl:    { cmd: 'perl',    install: 'Install Perl: https://perl.org or `brew install perl`' },
  rust:    { cmd: 'rustc',   install: 'Install Rust: https://rustup.rs or `curl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh`' },
};

function checkRuntime(language: string): string | null {
  const hint = INSTALL_HINTS[language];
  if (!hint) return null;
  if (!isCommandAvailable(hint.cmd)) {
    return `${hint.cmd} is not installed on this system.\n\n${hint.install}`;
  }
  return null;
}

const runners: Record<string, (code: string) => RunResult> = {
  python: (code) => runWithTempFile('py', (p) => `python3 "${p}" 2>&1`, code),
  ruby: (code) => runWithTempFile('rb', (p) => `ruby "${p}" 2>&1`, code),
  go: (code) => runWithTempFile('go', (p) => `go run "${p}" 2>&1`, code),
  bash: (code) => runWithTempFile('sh', (p) => `bash "${p}" 2>&1`, code),
};

export function registerCodeRunnerRoutes(app: FastifyInstance, _db: DatabaseProvider, _jwtSecret: string) {
  // Execute code server-side (for non-browser languages)
  app.post('/api/code/run', async (request) => {
    const { language, code } = request.body as RunRequest;

    if (!code?.trim()) {
      return { stdout: '', stderr: 'No code provided', exitCode: 1, duration: 0 };
    }

    // Browser-executable languages don't need server-side execution
    if (['javascript', 'typescript', 'html', 'css'].includes(language)) {
      return { stdout: '', stderr: 'This language runs in the browser', exitCode: 0, duration: 0, browserOnly: true };
    }

    // Check if the runtime is installed before attempting execution
    const missingMsg = checkRuntime(language);
    if (missingMsg) {
      return { stdout: '', stderr: missingMsg, exitCode: 1, duration: 0 };
    }

    const runner = runners[language];
    if (!runner) {
      return { stdout: '', stderr: `Language "${language}" is not supported for server-side execution. Supported: ${Object.keys(runners).join(', ')}`, exitCode: 1, duration: 0 };
    }

    return runner(code);
  });

  // Check which languages are available on the server
  app.get('/api/code/languages', async () => {
    const checks: Record<string, string> = {
      python: 'python3 --version',
      ruby: 'ruby --version',
      go: 'go version',
      bash: 'bash --version',
    };

    const available: Record<string, { installed: boolean; version: string }> = {};
    for (const [lang, cmd] of Object.entries(checks)) {
      try {
        const version = execSync(`${cmd} 2>&1`, { encoding: 'utf-8', timeout: 5000 }).trim().split('\n')[0];
        available[lang] = { installed: true, version };
      } catch {
        available[lang] = { installed: false, version: '' };
      }
    }

    // Browser languages are always available
    available.javascript = { installed: true, version: 'Browser runtime' };
    available.typescript = { installed: true, version: 'Browser transpilation' };
    available.html = { installed: true, version: 'Browser rendering' };
    available.css = { installed: true, version: 'Browser rendering' };

    return available;
  });
}
