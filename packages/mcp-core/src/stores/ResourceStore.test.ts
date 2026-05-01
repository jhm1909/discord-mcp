import { describe, expect, it } from 'vitest';
import { ResourceStore } from './ResourceStore.js';

describe('ResourceStore', () => {
  it('list() returns 6 V2 resources (5 templates + 1 schema)', async () => {
    const store = new ResourceStore();
    const resources = await store.list();
    expect(resources.length).toBe(6);
  });

  it('list() includes the components-v2 schema URI', async () => {
    const store = new ResourceStore();
    const resources = await store.list();
    expect(resources.map((r) => r.uri)).toContain('discord://components-v2/schema');
  });

  it('list() includes the announcement template URI', async () => {
    const store = new ResourceStore();
    const resources = await store.list();
    expect(resources.map((r) => r.uri)).toContain('discord://components-v2/templates/announcement');
  });

  it('list() entries expose name + description + mimeType', async () => {
    const store = new ResourceStore();
    const resources = await store.list();
    for (const r of resources) {
      expect(r.uri).toBeTypeOf('string');
      expect(r.name).toBeTypeOf('string');
      expect(r.description).toBeTypeOf('string');
      expect(r.mimeType).toBe('application/json');
    }
  });

  it('read() returns content for a known template URI', async () => {
    const store = new ResourceStore();
    const content = await store.read('discord://components-v2/templates/announcement');
    expect(content).not.toBeNull();
    expect(content!.uri).toBe('discord://components-v2/templates/announcement');
    expect(content!.mimeType).toBe('application/json');
    const parsed = JSON.parse(content!.text);
    expect(parsed.name).toBe('announcement');
  });

  it('read() returns content for the schema URI', async () => {
    const store = new ResourceStore();
    const content = await store.read('discord://components-v2/schema');
    expect(content).not.toBeNull();
    expect(content!.mimeType).toBe('application/json');
    // Schema text is valid JSON.
    expect(() => JSON.parse(content!.text)).not.toThrow();
  });

  it('read() returns null for an unknown template name', async () => {
    const store = new ResourceStore();
    const content = await store.read('discord://components-v2/templates/does_not_exist');
    expect(content).toBeNull();
  });

  it('read() returns null for a malformed URI scheme', async () => {
    const store = new ResourceStore();
    const content = await store.read('not-a-discord-uri');
    expect(content).toBeNull();
  });

  it('read() returns null for an unrelated discord:// URI (no static match)', async () => {
    const store = new ResourceStore();
    const content = await store.read('discord://guild/123/info');
    expect(content).toBeNull();
  });

  it('multiple instances behave independently and idempotently', async () => {
    const a = new ResourceStore();
    const b = new ResourceStore();
    const [la, lb] = await Promise.all([a.list(), b.list()]);
    expect(la.length).toBe(lb.length);
    expect(la.map((r) => r.uri).sort()).toEqual(lb.map((r) => r.uri).sort());
  });
});
