import { REST } from '@discordjs/rest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';
import { createLogger } from './logger.js';
import { buildServer } from './server.js';

describe('MCP protocol contract', () => {
  const fakeEnv = {
    DISCORD_TOKEN: 'Bot fake.test.token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    LOG_LEVEL: 'fatal',
  } as NodeJS.ProcessEnv;
  const config = loadConfig(fakeEnv);
  const logger = createLogger(config);

  let client: Client;

  beforeAll(async () => {
    // Construct REST inside beforeAll so the `fetch` reference is captured AFTER msw has
    // patched globalThis.fetch in the setupFiles beforeAll hook.
    const rest = new REST({ version: '10', makeRequest: fetch }).setToken('fake-token');
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const { server } = await buildServer({ rest, logger, config });
    client = new Client({ name: 'contract-test', version: '0.0.0' }, { capabilities: {} });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  });

  afterAll(async () => {
    await client.close();
  });

  it('listTools returns at least 1 tool with valid JSON Schema', async () => {
    const { tools } = await client.listTools();
    expect(tools.length).toBeGreaterThanOrEqual(1);
    for (const t of tools) {
      expect(t.name).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(t.description).toBeTypeOf('string');
      expect(t.inputSchema).toMatchObject({ type: 'object' });
    }
  });

  it('messages_send is registered', async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toContain('messages_send');
  });

  it('callTool with invalid args returns isError=true (not throws)', async () => {
    const r = await client.callTool({ name: 'messages_send', arguments: {} });
    expect(r.isError).toBe(true);
    const text = (r.content as Array<{ type: string; text: string }>)[0];
    expect(text.type).toBe('text');
    expect(text.text).toMatch(/input error/i);
  });

  it('callTool with valid args returns dualResult shape', async () => {
    const r = await client.callTool({
      name: 'messages_send',
      arguments: { channel_id: '112233445566778899', content: 'hi' },
    });
    expect(r.isError).toBe(false);
    expect(r.structuredContent).toMatchObject({
      message_id: '999000999000999000',
      jump_url: expect.stringContaining('discord.com/channels/'),
    });
  });

  it('callTool with malformed channel_id returns DISCORD-formatted ValidationError', async () => {
    const r = await client.callTool({
      name: 'messages_send',
      arguments: { channel_id: 'not-a-snowflake', content: 'hi' },
    });
    expect(r.isError).toBe(true);
    expect(r.structuredContent).toMatchObject({
      code: 'VALIDATION_FAILED',
      retriable: false,
      category: 'client',
    });
    const text = (r.content as Array<{ text: string }>)[0]!.text;
    expect(text).toMatch(/Input Error/);
    expect(text).toMatch(/channel_id/);
  });

  it('lists 23 tools after auto-discovery (Plan 0+1+2+3D+3E+3F cumulative)', async () => {
    const { tools } = await client.listTools();
    expect(tools.length).toBe(23);
    const names = new Set(tools.map((t) => t.name));
    for (const expected of [
      'messages_send',
      'messages_read',
      'messages_edit',
      'messages_delete',
      'channels_list',
      'channels_get',
      'members_get',
      'members_search',
      'roles_list',
      'guild_get',
      'audit_log_get',
      'webhooks_list_channel',
      'events_list',
      'commands_list_guild',
      'users_get_current',
      'components_v2_build_container',
      'components_v2_build_section',
      'components_v2_build_media_gallery',
      'components_v2_validate',
      'components_v2_preview',
      'components_v2_send',
      'components_v2_edit',
      'components_v2_send_from_template',
    ]) {
      expect(names.has(expected)).toBe(true);
    }
  });

  it('messages_delete returns DRY_RUN_PREVIEW without __confirm', async () => {
    const r = await client.callTool({
      name: 'messages_delete',
      arguments: { channel_id: '111122223333444455', message_id: '999000999000999000' },
    });
    expect(r.isError).toBe(true);
    expect(r.structuredContent).toMatchObject({ code: 'DRY_RUN_PREVIEW', tool: 'messages_delete' });
  });
});
