/**
 * Vitest config for @discord-mcp/cli (mcp-server).
 *
 * Plan 12 Phase C.3: introduces a `globalSetup` hook that auto-builds
 * `dist/cli.js` (and transitively `@discord-mcp/core`) when missing, so
 * `cli.smoke.test.ts` no longer needs the `describe.skipIf(!cliBuilt)`
 * gate. See vitest.global-setup.ts for the setup body.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globalSetup: ['./vitest.global-setup.ts'],
  },
});
