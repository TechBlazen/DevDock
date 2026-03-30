import { useState, useMemo } from 'react';
import { GitBranch, Copy, Check, ChevronDown } from 'lucide-react';
import { Button } from '../ui';

type GitOperation =
  | 'clone' | 'init' | 'commit' | 'branch' | 'checkout'
  | 'merge' | 'rebase' | 'stash' | 'reset' | 'cherry-pick'
  | 'tag' | 'remote' | 'pull' | 'push';

interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  required?: boolean;
}

interface FlagDef {
  key: string;
  label: string;
  flag: string;
}

interface OperationConfig {
  fields: FieldDef[];
  flags: FlagDef[];
  build: (fields: Record<string, string>, flags: Set<string>) => string;
}

const OPERATIONS: Record<GitOperation, OperationConfig> = {
  clone: {
    fields: [
      { key: 'url', label: 'Repository URL', placeholder: 'https://github.com/user/repo.git', required: true },
      { key: 'directory', label: 'Directory', placeholder: 'my-project' },
    ],
    flags: [
      { key: 'depth1', label: 'Shallow (--depth 1)', flag: '--depth 1' },
      { key: 'bare', label: 'Bare', flag: '--bare' },
      { key: 'recursive', label: 'Recursive', flag: '--recursive' },
      { key: 'single-branch', label: 'Single branch', flag: '--single-branch' },
    ],
    build: (f, fl) => {
      const parts = ['git clone'];
      fl.forEach((flag) => parts.push(flag));
      if (f.url) parts.push(f.url);
      if (f.directory) parts.push(f.directory);
      return parts.join(' ');
    },
  },
  init: {
    fields: [
      { key: 'directory', label: 'Directory', placeholder: '.' },
    ],
    flags: [
      { key: 'bare', label: 'Bare', flag: '--bare' },
      { key: 'initial-branch', label: 'Initial branch: main', flag: '--initial-branch=main' },
    ],
    build: (f, fl) => {
      const parts = ['git init'];
      fl.forEach((flag) => parts.push(flag));
      if (f.directory) parts.push(f.directory);
      return parts.join(' ');
    },
  },
  commit: {
    fields: [
      { key: 'message', label: 'Commit Message', placeholder: 'feat: add new feature', required: true },
    ],
    flags: [
      { key: 'amend', label: 'Amend', flag: '--amend' },
      { key: 'no-edit', label: 'No edit', flag: '--no-edit' },
      { key: 'allow-empty', label: 'Allow empty', flag: '--allow-empty' },
      { key: 'signoff', label: 'Sign off', flag: '--signoff' },
      { key: 'all', label: 'Stage all (-a)', flag: '-a' },
    ],
    build: (f, fl) => {
      const parts = ['git commit'];
      fl.forEach((flag) => parts.push(flag));
      if (f.message && !fl.has('--no-edit')) parts.push(`-m "${f.message}"`);
      return parts.join(' ');
    },
  },
  branch: {
    fields: [
      { key: 'name', label: 'Branch Name', placeholder: 'feature/my-branch' },
    ],
    flags: [
      { key: 'delete', label: 'Delete (-d)', flag: '-d' },
      { key: 'force-delete', label: 'Force delete (-D)', flag: '-D' },
      { key: 'list', label: 'List (-a)', flag: '-a' },
      { key: 'move', label: 'Rename (-m)', flag: '-m' },
      { key: 'verbose', label: 'Verbose (-v)', flag: '-v' },
    ],
    build: (f, fl) => {
      const parts = ['git branch'];
      fl.forEach((flag) => parts.push(flag));
      if (f.name) parts.push(f.name);
      return parts.join(' ');
    },
  },
  checkout: {
    fields: [
      { key: 'target', label: 'Branch / Commit', placeholder: 'main', required: true },
    ],
    flags: [
      { key: 'create', label: 'Create new (-b)', flag: '-b' },
      { key: 'force', label: 'Force', flag: '--force' },
      { key: 'track', label: 'Track', flag: '--track' },
    ],
    build: (f, fl) => {
      const parts = ['git checkout'];
      fl.forEach((flag) => parts.push(flag));
      if (f.target) parts.push(f.target);
      return parts.join(' ');
    },
  },
  merge: {
    fields: [
      { key: 'branch', label: 'Branch to Merge', placeholder: 'feature/my-branch', required: true },
    ],
    flags: [
      { key: 'no-ff', label: 'No fast-forward (--no-ff)', flag: '--no-ff' },
      { key: 'squash', label: 'Squash', flag: '--squash' },
      { key: 'abort', label: 'Abort', flag: '--abort' },
      { key: 'no-commit', label: 'No commit', flag: '--no-commit' },
    ],
    build: (f, fl) => {
      const parts = ['git merge'];
      fl.forEach((flag) => parts.push(flag));
      if (f.branch && !fl.has('--abort')) parts.push(f.branch);
      return parts.join(' ');
    },
  },
  rebase: {
    fields: [
      { key: 'branch', label: 'Onto Branch', placeholder: 'main', required: true },
    ],
    flags: [
      { key: 'interactive', label: 'Interactive (-i)', flag: '-i' },
      { key: 'continue', label: 'Continue', flag: '--continue' },
      { key: 'abort', label: 'Abort', flag: '--abort' },
      { key: 'autosquash', label: 'Autosquash', flag: '--autosquash' },
    ],
    build: (f, fl) => {
      const parts = ['git rebase'];
      fl.forEach((flag) => parts.push(flag));
      if (f.branch && !fl.has('--continue') && !fl.has('--abort')) parts.push(f.branch);
      return parts.join(' ');
    },
  },
  stash: {
    fields: [
      { key: 'message', label: 'Stash Message', placeholder: 'WIP: working on feature' },
    ],
    flags: [
      { key: 'pop', label: 'Pop', flag: 'pop' },
      { key: 'list', label: 'List', flag: 'list' },
      { key: 'apply', label: 'Apply', flag: 'apply' },
      { key: 'drop', label: 'Drop', flag: 'drop' },
      { key: 'include-untracked', label: 'Include untracked (-u)', flag: '-u' },
    ],
    build: (f, fl) => {
      const subcommands = ['pop', 'list', 'apply', 'drop'];
      const sub = subcommands.find((s) => fl.has(s));
      const otherFlags = Array.from(fl).filter((s) => !subcommands.includes(s));
      const parts = ['git stash'];
      if (sub) {
        parts.push(sub);
      } else if (f.message) {
        parts.push('push');
        otherFlags.forEach((flag) => parts.push(flag));
        parts.push(`-m "${f.message}"`);
        return parts.join(' ');
      }
      otherFlags.forEach((flag) => parts.push(flag));
      return parts.join(' ');
    },
  },
  reset: {
    fields: [
      { key: 'target', label: 'Commit / Ref', placeholder: 'HEAD~1' },
    ],
    flags: [
      { key: 'soft', label: 'Soft', flag: '--soft' },
      { key: 'mixed', label: 'Mixed', flag: '--mixed' },
      { key: 'hard', label: 'Hard', flag: '--hard' },
    ],
    build: (f, fl) => {
      const parts = ['git reset'];
      fl.forEach((flag) => parts.push(flag));
      if (f.target) parts.push(f.target);
      return parts.join(' ');
    },
  },
  'cherry-pick': {
    fields: [
      { key: 'commit', label: 'Commit SHA', placeholder: 'abc1234', required: true },
    ],
    flags: [
      { key: 'no-commit', label: 'No commit (-n)', flag: '-n' },
      { key: 'edit', label: 'Edit (-e)', flag: '-e' },
      { key: 'signoff', label: 'Sign off (-x)', flag: '-x' },
      { key: 'abort', label: 'Abort', flag: '--abort' },
    ],
    build: (f, fl) => {
      const parts = ['git cherry-pick'];
      fl.forEach((flag) => parts.push(flag));
      if (f.commit && !fl.has('--abort')) parts.push(f.commit);
      return parts.join(' ');
    },
  },
  tag: {
    fields: [
      { key: 'name', label: 'Tag Name', placeholder: 'v1.0.0', required: true },
      { key: 'message', label: 'Message', placeholder: 'Release 1.0.0' },
    ],
    flags: [
      { key: 'annotated', label: 'Annotated (-a)', flag: '-a' },
      { key: 'delete', label: 'Delete (-d)', flag: '-d' },
      { key: 'force', label: 'Force (-f)', flag: '-f' },
      { key: 'list', label: 'List (-l)', flag: '-l' },
    ],
    build: (f, fl) => {
      const parts = ['git tag'];
      fl.forEach((flag) => parts.push(flag));
      if (f.name) parts.push(f.name);
      if (f.message && fl.has('-a')) parts.push(`-m "${f.message}"`);
      return parts.join(' ');
    },
  },
  remote: {
    fields: [
      { key: 'name', label: 'Remote Name', placeholder: 'origin' },
      { key: 'url', label: 'Remote URL', placeholder: 'https://github.com/user/repo.git' },
    ],
    flags: [
      { key: 'add', label: 'Add', flag: 'add' },
      { key: 'remove', label: 'Remove', flag: 'remove' },
      { key: 'verbose', label: 'Verbose (-v)', flag: '-v' },
      { key: 'set-url', label: 'Set URL', flag: 'set-url' },
    ],
    build: (f, fl) => {
      const subcommands = ['add', 'remove', 'set-url'];
      const sub = subcommands.find((s) => fl.has(s));
      const otherFlags = Array.from(fl).filter((s) => !subcommands.includes(s));
      const parts = ['git remote'];
      if (sub) parts.push(sub);
      otherFlags.forEach((flag) => parts.push(flag));
      if (f.name) parts.push(f.name);
      if (f.url && (sub === 'add' || sub === 'set-url')) parts.push(f.url);
      return parts.join(' ');
    },
  },
  pull: {
    fields: [
      { key: 'remote', label: 'Remote', placeholder: 'origin' },
      { key: 'branch', label: 'Branch', placeholder: 'main' },
    ],
    flags: [
      { key: 'rebase', label: 'Rebase', flag: '--rebase' },
      { key: 'no-ff', label: 'No fast-forward', flag: '--no-ff' },
      { key: 'force', label: 'Force', flag: '--force' },
      { key: 'prune', label: 'Prune', flag: '--prune' },
    ],
    build: (f, fl) => {
      const parts = ['git pull'];
      fl.forEach((flag) => parts.push(flag));
      if (f.remote) parts.push(f.remote);
      if (f.branch) parts.push(f.branch);
      return parts.join(' ');
    },
  },
  push: {
    fields: [
      { key: 'remote', label: 'Remote', placeholder: 'origin' },
      { key: 'branch', label: 'Branch', placeholder: 'main' },
    ],
    flags: [
      { key: 'force', label: 'Force (-f)', flag: '--force' },
      { key: 'force-with-lease', label: 'Force with lease', flag: '--force-with-lease' },
      { key: 'set-upstream', label: 'Set upstream (-u)', flag: '-u' },
      { key: 'tags', label: 'Tags', flag: '--tags' },
      { key: 'delete', label: 'Delete', flag: '--delete' },
    ],
    build: (f, fl) => {
      const parts = ['git push'];
      fl.forEach((flag) => parts.push(flag));
      if (f.remote) parts.push(f.remote);
      if (f.branch) parts.push(f.branch);
      return parts.join(' ');
    },
  },
};

const ALL_OPERATIONS: GitOperation[] = [
  'clone', 'init', 'commit', 'branch', 'checkout',
  'merge', 'rebase', 'stash', 'reset', 'cherry-pick',
  'tag', 'remote', 'pull', 'push',
];

export const GitGenerator = () => {
  const [operation, setOperation] = useState<GitOperation>('clone');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [activeFlags, setActiveFlags] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const config = OPERATIONS[operation];

  const handleOperationChange = (op: GitOperation) => {
    setOperation(op);
    setFields({});
    setActiveFlags(new Set());
  };

  const updateField = (key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const toggleFlag = (flag: string) => {
    setActiveFlags((prev) => {
      const next = new Set(prev);
      if (next.has(flag)) next.delete(flag);
      else next.add(flag);
      return next;
    });
  };

  const command = useMemo(
    () => config.build(fields, activeFlags),
    [config, fields, activeFlags]
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0 flex-wrap"
        style={{ borderBottom: '1px solid var(--border-color)' }}
      >
        <GitBranch size={14} style={{ color: 'var(--accent)' }} />
        <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>
          Git Command Generator
        </span>

        <div className="relative ml-2">
          <select
            value={operation}
            onChange={(e) => handleOperationChange(e.target.value as GitOperation)}
            className="appearance-none rounded-md px-3 py-1.5 pr-7 text-[12px] font-mono font-semibold outline-none cursor-pointer"
            style={{
              background: 'var(--accent-bg)',
              color: 'var(--accent)',
              border: '1px solid var(--accent)',
            }}
          >
            {ALL_OPERATIONS.map((op) => (
              <option key={op} value={op}>
                git {op}
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--accent)' }}
          />
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-auto p-4">
        {/* Fields */}
        <div className="space-y-3 mb-4">
          {config.fields.map((field) => (
            <div key={field.key}>
              <label
                className="block text-[11px] font-semibold mb-1.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                {field.label}
                {field.required && <span style={{ color: '#ef4444' }}> *</span>}
              </label>
              <input
                value={fields[field.key] || ''}
                onChange={(e) => updateField(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full rounded-md px-3 py-2 text-[13px] font-mono outline-none transition-all"
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-input)',
                  color: 'var(--text-primary)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.border = '1px solid var(--accent)';
                  e.currentTarget.style.boxShadow = '0 0 0 2px var(--accent-bg)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.border = '1px solid var(--border-input)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          ))}
        </div>

        {/* Flags */}
        {config.flags.length > 0 && (
          <div>
            <label
              className="block text-[11px] font-semibold mb-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              Flags
            </label>
            <div className="flex flex-wrap gap-2">
              {config.flags.map((flag) => (
                <button
                  key={flag.key}
                  onClick={() => toggleFlag(flag.flag)}
                  className="px-2.5 py-1.5 rounded-md text-[11px] font-mono transition-all"
                  style={
                    activeFlags.has(flag.flag)
                      ? {
                          background: 'var(--accent-bg)',
                          color: 'var(--accent)',
                          border: '1px solid var(--accent)',
                        }
                      : {
                          background: 'var(--bg-surface)',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--border-input)',
                        }
                  }
                >
                  {flag.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Generated command */}
      <div
        className="flex-shrink-0 p-4"
        style={{ borderTop: '1px solid var(--border-color)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-faint)' }}
          >
            Generated Command
          </span>
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <div
          className="rounded-md p-3 font-mono text-[13px] overflow-x-auto whitespace-pre"
          style={{
            background: 'var(--code-bg)',
            color: 'var(--code-text)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {command}
        </div>
      </div>
    </div>
  );
};
