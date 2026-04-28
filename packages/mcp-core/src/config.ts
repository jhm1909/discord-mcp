import { z } from 'zod';

const ConfigSchema = z.object({
  DISCORD_TOKEN: z.string().min(50, 'DISCORD_TOKEN appears too short to be a valid bot token'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  GATEWAY: z
    .string()
    .optional()
    .transform((v) => v === '1' || v === 'true' || v === 'yes')
    .default(false),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = ConfigSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid configuration:\n${issues}`);
  }
  return parsed.data;
}
