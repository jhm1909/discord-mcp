import { HttpResponse, http } from 'msw';

const DISCORD_API = 'https://discord.com/api/v10';

export const handlers = [
  // Default: messages_send happy path
  http.post(`${DISCORD_API}/channels/:channelId/messages`, async ({ params, request }) => {
    const body = (await request.json()) as { content?: string; tts?: boolean };
    return HttpResponse.json({
      id: '999000999000999000',
      channel_id: params.channelId,
      content: body.content ?? '',
      tts: body.tts ?? false,
      timestamp: '2026-04-28T12:00:00.000000+00:00',
      author: { id: '111', username: 'TestBot', global_name: 'TestBot', bot: true },
      type: 0,
    });
  }),
];
