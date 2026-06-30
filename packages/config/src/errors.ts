/** A single structured validation/resolution problem. */
export interface ConfigIssue {
  /** Dot-path to the offending field (empty for top-level/file errors). */
  path: string;
  message: string;
}

/**
 * Thrown by `loadConfig`/`resolveTargets` with structured, human-readable issues
 * (so a CLI can print them line-by-line instead of dumping a raw zod error).
 */
export class ConfigError extends Error {
  readonly issues: ConfigIssue[];

  constructor(message: string, issues: ConfigIssue[] = []) {
    super(
      issues.length
        ? `${message}\n${issues
            .map((i) => `  - ${i.path ? `${i.path}: ` : ''}${i.message}`)
            .join('\n')}`
        : message,
    );
    this.name = 'ConfigError';
    this.issues = issues;
  }
}
