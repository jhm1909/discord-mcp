const TEMPLATE_RE = /\{\{(\w+)\}\}/g;

export function interpolateTemplate<T>(value: T, vars: Record<string, string>): T {
  if (typeof value === 'string') {
    return value.replace(TEMPLATE_RE, (_, key: string) => vars[key] ?? `{{${key}}}`) as never as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => interpolateTemplate(v, vars)) as never as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = interpolateTemplate(v, vars);
    }
    return out as T;
  }
  return value;
}
