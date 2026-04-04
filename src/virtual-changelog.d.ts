declare module 'virtual:changelog' {
  interface ChangelogCommit {
    sha: string;
    message: string;
    date: string;
    type: 'feat' | 'fix' | 'chore' | 'refactor' | 'docs' | 'perf' | 'test' | 'other';
  }

  interface ChangelogRelease {
    version: string;
    date: string;
    title: string;
    commits: ChangelogCommit[];
  }

  const releases: ChangelogRelease[];
  export default releases;
}
