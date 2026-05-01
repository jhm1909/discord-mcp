import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

const VALID_TOKEN = 'Bot fake.test.token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

describe('loadConfig', () => {
  it('throws when DISCORD_TOKEN is missing or too short', () => {
    expect(() => loadConfig({} as NodeJS.ProcessEnv)).toThrow(/DISCORD_TOKEN/);
    expect(() => loadConfig({ DISCORD_TOKEN: 'short' } as NodeJS.ProcessEnv)).toThrow(/too short/);
  });

  it('returns defaults when only DISCORD_TOKEN provided', () => {
    const c = loadConfig({ DISCORD_TOKEN: VALID_TOKEN } as NodeJS.ProcessEnv);
    expect(c.LOG_LEVEL).toBe('info');
    expect(c.GATEWAY).toBe(false);
  });

  describe('OpenTelemetry fields (Plan 8 Phase A)', () => {
    it('OTEL_ENABLED defaults to false', () => {
      const c = loadConfig({ DISCORD_TOKEN: VALID_TOKEN } as NodeJS.ProcessEnv);
      expect(c.OTEL_ENABLED).toBe(false);
    });

    it('OTEL_ENABLED accepts truthy strings', () => {
      for (const v of ['1', 'true', 'yes']) {
        const c = loadConfig({ DISCORD_TOKEN: VALID_TOKEN, OTEL_ENABLED: v } as NodeJS.ProcessEnv);
        expect(c.OTEL_ENABLED).toBe(true);
      }
      const off = loadConfig({
        DISCORD_TOKEN: VALID_TOKEN,
        OTEL_ENABLED: 'no',
      } as NodeJS.ProcessEnv);
      expect(off.OTEL_ENABLED).toBe(false);
    });

    it('OTEL_SERVICE_NAME defaults to "discord-mcp" and accepts override', () => {
      const def = loadConfig({ DISCORD_TOKEN: VALID_TOKEN } as NodeJS.ProcessEnv);
      expect(def.OTEL_SERVICE_NAME).toBe('discord-mcp');
      const overridden = loadConfig({
        DISCORD_TOKEN: VALID_TOKEN,
        OTEL_SERVICE_NAME: 'custom',
      } as NodeJS.ProcessEnv);
      expect(overridden.OTEL_SERVICE_NAME).toBe('custom');
    });

    it('OTEL_SERVICE_VERSION defaults to "0.8.0" and accepts override', () => {
      const def = loadConfig({ DISCORD_TOKEN: VALID_TOKEN } as NodeJS.ProcessEnv);
      expect(def.OTEL_SERVICE_VERSION).toBe('0.8.0');
      const overridden = loadConfig({
        DISCORD_TOKEN: VALID_TOKEN,
        OTEL_SERVICE_VERSION: '1.2.3',
      } as NodeJS.ProcessEnv);
      expect(overridden.OTEL_SERVICE_VERSION).toBe('1.2.3');
    });

    it('OTEL_EXPORTER_OTLP_ENDPOINT is optional and validates URL', () => {
      const def = loadConfig({ DISCORD_TOKEN: VALID_TOKEN } as NodeJS.ProcessEnv);
      expect(def.OTEL_EXPORTER_OTLP_ENDPOINT).toBeUndefined();
      const ok = loadConfig({
        DISCORD_TOKEN: VALID_TOKEN,
        OTEL_EXPORTER_OTLP_ENDPOINT: 'http://localhost:4318',
      } as NodeJS.ProcessEnv);
      expect(ok.OTEL_EXPORTER_OTLP_ENDPOINT).toBe('http://localhost:4318');
      expect(() =>
        loadConfig({
          DISCORD_TOKEN: VALID_TOKEN,
          OTEL_EXPORTER_OTLP_ENDPOINT: 'not-a-url',
        } as NodeJS.ProcessEnv),
      ).toThrow();
    });

    it('OTEL_EXPORTER_OTLP_PROTOCOL defaults to "http/protobuf" and accepts the enum', () => {
      const def = loadConfig({ DISCORD_TOKEN: VALID_TOKEN } as NodeJS.ProcessEnv);
      expect(def.OTEL_EXPORTER_OTLP_PROTOCOL).toBe('http/protobuf');
      for (const v of ['http/protobuf', 'http/json', 'grpc'] as const) {
        const c = loadConfig({
          DISCORD_TOKEN: VALID_TOKEN,
          OTEL_EXPORTER_OTLP_PROTOCOL: v,
        } as NodeJS.ProcessEnv);
        expect(c.OTEL_EXPORTER_OTLP_PROTOCOL).toBe(v);
      }
      expect(() =>
        loadConfig({
          DISCORD_TOKEN: VALID_TOKEN,
          OTEL_EXPORTER_OTLP_PROTOCOL: 'bogus',
        } as NodeJS.ProcessEnv),
      ).toThrow();
    });

    it('OTEL_EXPORTER_OTLP_HEADERS is optional', () => {
      const def = loadConfig({ DISCORD_TOKEN: VALID_TOKEN } as NodeJS.ProcessEnv);
      expect(def.OTEL_EXPORTER_OTLP_HEADERS).toBeUndefined();
      const c = loadConfig({
        DISCORD_TOKEN: VALID_TOKEN,
        OTEL_EXPORTER_OTLP_HEADERS: 'k=v,a=b',
      } as NodeJS.ProcessEnv);
      expect(c.OTEL_EXPORTER_OTLP_HEADERS).toBe('k=v,a=b');
    });

    it('OTEL_TRACES_SAMPLER defaults to "parentbased_always_on"', () => {
      const def = loadConfig({ DISCORD_TOKEN: VALID_TOKEN } as NodeJS.ProcessEnv);
      expect(def.OTEL_TRACES_SAMPLER).toBe('parentbased_always_on');
      const c = loadConfig({
        DISCORD_TOKEN: VALID_TOKEN,
        OTEL_TRACES_SAMPLER: 'traceidratio',
      } as NodeJS.ProcessEnv);
      expect(c.OTEL_TRACES_SAMPLER).toBe('traceidratio');
      expect(() =>
        loadConfig({
          DISCORD_TOKEN: VALID_TOKEN,
          OTEL_TRACES_SAMPLER: 'unknown',
        } as NodeJS.ProcessEnv),
      ).toThrow();
    });

    it('OTEL_TRACES_SAMPLER_ARG defaults to 1 and clamps via [0,1]', () => {
      const def = loadConfig({ DISCORD_TOKEN: VALID_TOKEN } as NodeJS.ProcessEnv);
      expect(def.OTEL_TRACES_SAMPLER_ARG).toBe(1);
      const half = loadConfig({
        DISCORD_TOKEN: VALID_TOKEN,
        OTEL_TRACES_SAMPLER_ARG: '0.25',
      } as NodeJS.ProcessEnv);
      expect(half.OTEL_TRACES_SAMPLER_ARG).toBe(0.25);
      expect(() =>
        loadConfig({
          DISCORD_TOKEN: VALID_TOKEN,
          OTEL_TRACES_SAMPLER_ARG: '2',
        } as NodeJS.ProcessEnv),
      ).toThrow();
      expect(() =>
        loadConfig({
          DISCORD_TOKEN: VALID_TOKEN,
          OTEL_TRACES_SAMPLER_ARG: '-1',
        } as NodeJS.ProcessEnv),
      ).toThrow();
    });

    it('OTEL_CONSOLE_EXPORTER defaults to false and accepts truthy strings', () => {
      const def = loadConfig({ DISCORD_TOKEN: VALID_TOKEN } as NodeJS.ProcessEnv);
      expect(def.OTEL_CONSOLE_EXPORTER).toBe(false);
      const on = loadConfig({
        DISCORD_TOKEN: VALID_TOKEN,
        OTEL_CONSOLE_EXPORTER: 'true',
      } as NodeJS.ProcessEnv);
      expect(on.OTEL_CONSOLE_EXPORTER).toBe(true);
    });
  });
});
