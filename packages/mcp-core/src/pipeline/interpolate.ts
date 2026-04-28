const TEMPLATE_RE = /\{\{([^}]+)\}\}/g;
const SINGLE_TEMPLATE_RE = /^\{\{([^}]+)\}\}$/;

export function resolvePath(path: string, vars: Record<string, unknown>): unknown {
  const segments = path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  let cur: unknown = vars;
  for (const seg of segments) {
    if (cur === null || cur === undefined) return undefined;
    if (typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

export function interpolate<T>(value: T, vars: Record<string, unknown>): T {
  if (typeof value === 'string') {
    const single = value.match(SINGLE_TEMPLATE_RE);
    if (single !== null) {
      const path = single[1]!.trim();
      return resolvePath(path, vars) as never as T;
    }
    return value.replace(TEMPLATE_RE, (full, path: string) => {
      const resolved = resolvePath(path.trim(), vars);
      return resolved === undefined ? full : String(resolved);
    }) as never as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => interpolate(v, vars)) as never as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = interpolate(v, vars);
    }
    return out as T;
  }
  return value;
}

export function evalCondition(expr: string, vars: Record<string, unknown>): boolean {
  const trimmed = expr.trim();
  const single = trimmed.match(SINGLE_TEMPLATE_RE);
  const path = single !== null ? single[1]!.trim() : trimmed;
  const value = resolvePath(path, vars);
  return Boolean(value);
}
