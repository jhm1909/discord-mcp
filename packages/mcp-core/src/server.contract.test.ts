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

  it('lists 102 tools after auto-discovery (Plan 0+1+2+3+4+5 + Plan 7 A + B + C complete)', async () => {
    const { tools } = await client.listTools();
    expect(tools.length).toBe(102);
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
      'mcp_pipeline',
      'intelligence_summarize_channel',
      'intelligence_classify_messages',
      'intelligence_draft_response',
      'intelligence_moderate_content',
      'intelligence_extract_entities',
    ]) {
      expect(names.has(expected)).toBe(true);
    }
  });

  it('intelligence_summarize_channel returns fallback when client lacks sampling', async () => {
    const r = await client.callTool({
      name: 'intelligence_summarize_channel',
      arguments: { channel_id: '112233445566778899', limit: 10, style: 'bullet' },
    });
    expect(r.isError).toBe(false);
    expect(r.structuredContent).toMatchObject({
      _meta: expect.objectContaining({ fallback: 'host_llm_should_process' }),
    });
  });

  it('mcp_pipeline executes a 2-step pipeline end-to-end', async () => {
    const r = await client.callTool({
      name: 'mcp_pipeline',
      arguments: {
        steps: [
          { id: 'step1', tool: 'channels_list', args: { guild_id: '999000999000999000' } },
          {
            id: 'step2',
            tool: 'messages_send',
            args: { channel_id: '{{step1.channels[0].id}}', content: 'pipeline ran' },
          },
        ],
      },
    });
    expect(r.isError).toBe(false);
    expect(r.structuredContent).toMatchObject({
      aborted: false,
      steps: expect.arrayContaining([
        expect.objectContaining({ id: 'step1', status: 'success' }),
        expect.objectContaining({ id: 'step2', status: 'success' }),
      ]),
    });
  });

  it('mcp_pipeline rejects nested pipeline calls', async () => {
    const r = await client.callTool({
      name: 'mcp_pipeline',
      arguments: { steps: [{ id: 'inner', tool: 'mcp_pipeline', args: { steps: [] } }] },
    });
    expect(r.isError).toBe(false);
    expect(r.structuredContent).toMatchObject({
      aborted: true,
      steps: expect.arrayContaining([
        expect.objectContaining({
          status: 'error',
          error: expect.objectContaining({ code: 'PIPELINE_RECURSION' }),
        }),
      ]),
    });
  });

  it('messages_delete returns DRY_RUN_PREVIEW without __confirm', async () => {
    const r = await client.callTool({
      name: 'messages_delete',
      arguments: { channel_id: '111122223333444455', message_id: '999000999000999000' },
    });
    expect(r.isError).toBe(true);
    expect(r.structuredContent).toMatchObject({ code: 'DRY_RUN_PREVIEW', tool: 'messages_delete' });
  });

  it('lists 6 V2 resources via MCP resources/list', async () => {
    const { resources } = await client.listResources();
    expect(resources.length).toBe(6);
    expect(resources.map((r) => r.uri)).toContain('discord://components-v2/templates/announcement');
    expect(resources.map((r) => r.uri)).toContain('discord://components-v2/schema');
  });

  it('reads V2 announcement template via resources/read', async () => {
    const r = await client.readResource({ uri: 'discord://components-v2/templates/announcement' });
    expect(r.contents).toHaveLength(1);
    const c = r.contents[0]!;
    expect(c.mimeType).toBe('application/json');
    const text = c.text as string;
    const parsed = JSON.parse(text);
    expect(parsed.name).toBe('announcement');
  });

  it('handles resources/subscribe + resources/unsubscribe roundtrip', async () => {
    const uri = 'discord://guild/999000999000999000/info';
    await client.subscribeResource({ uri });
    await client.unsubscribeResource({ uri });
  });
});
