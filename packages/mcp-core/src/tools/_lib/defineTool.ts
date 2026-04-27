import type { z } from 'zod';
import { Tool, type ToolAnnotations, type ToolRunContext } from '../../pieces/Tool.js';

const TOOL_NAME_RE = /^[a-z][a-z0-9_]{0,63}$/;

export interface ToolDefinition<I extends Record<string, z.ZodTypeAny>, O> {
  name: string;
  description: string;
  inputSchema: I;
  outputSchema?: Record<string, z.ZodTypeAny>;
  annotations: ToolAnnotations;
  idempotent?: boolean;
  handler: (args: { [K in keyof I]: z.infer<I[K]> }, ctx: ToolRunContext) => Promise<O>;
}

export function defineTool<I extends Record<string, z.ZodTypeAny>, O>(
  def: ToolDefinition<I, O>,
): typeof Tool {
  if (!TOOL_NAME_RE.test(def.name)) {
    throw new Error(
      `Tool name '${def.name}' invalid: must be snake_case starting with a lowercase letter, max 64 chars (regex: ${TOOL_NAME_RE.source}).`,
    );
  }

  class GeneratedTool extends Tool {
    public override readonly description = def.description;
    public override readonly inputSchema = def.inputSchema;
    public override readonly outputSchema = def.outputSchema;
    public override readonly annotations = def.annotations;
    public override readonly idempotent = def.idempotent ?? false;

    public override async run(args: unknown, ctx: ToolRunContext): Promise<unknown> {
      return def.handler(args as { [K in keyof I]: z.infer<I[K]> }, ctx);
    }
  }

  // Sapphire reads `name` from constructor.options at registration time —
  // we set the static name as a hint only.
  Object.defineProperty(GeneratedTool, 'name', { value: def.name });
  return GeneratedTool;
}
