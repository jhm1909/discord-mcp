import { describe, it, expect } from 'vitest';
import { listV2Resources, readV2Resource } from './components-v2.js';

describe('Components V2 MCP resources', () => {
  it('listV2Resources returns 5 templates + 1 schema = 6 resources', async () => {
    const resources = await listV2Resources();
    expect(resources.length).toBe(6);
    expect(resources.map((r) => r.uri)).toContain('discord://components-v2/templates/announcement');
    expect(resources.map((r) => r.uri)).toContain('discord://components-v2/schema');
  });

  it('readV2Resource returns template JSON for a known URI', async () => {
    const r = await readV2Resource('discord://components-v2/templates/welcome_card');
    expect(r).not.toBeNull();
    expect(r!.mimeType).toBe('application/json');
    const parsed = JSON.parse(r!.text);
    expect(parsed.name).toBe('welcome_card');
    expect(Array.isArray(parsed.components)).toBe(true);
  });

  it('readV2Resource returns the schema as JSON Schema for the schema URI', async () => {
    const r = await readV2Resource('discord://components-v2/schema');
    expect(r).not.toBeNull();
    const parsed = JSON.parse(r!.text);
    // The schema export is a JSON Schema fragment describing ComponentsV2Array.
    // Look for any of: type "array", or oneOf/anyOf at the top level (zod 4 emits union as anyOf typically).
    const hasArrayShape = parsed.type === 'array' || parsed.items !== undefined;
    const hasUnionShape = Array.isArray(parsed.oneOf) || Array.isArray(parsed.anyOf);
    expect(hasArrayShape || hasUnionShape).toBe(true);
  });

  it('readV2Resource returns null for an unknown URI', async () => {
    const r = await readV2Resource('discord://components-v2/templates/does_not_exist');
    expect(r).toBeNull();
  });

  it('readV2Resource returns null for a malformed URI', async () => {
    const r = await readV2Resource('not-a-discord-uri');
    expect(r).toBeNull();
  });
});
