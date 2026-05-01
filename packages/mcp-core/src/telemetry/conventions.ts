/**
 * Semantic-convention attribute keys used by discord-mcp telemetry.
 *
 * Span and metric attribute names are stable contracts: changing one is
 * a breaking observability change for downstream dashboards/alerts.
 * Centralizing them here makes drift visible.
 *
 * `mcp.*` keys are project-private — there is no published OTel namespace
 * for MCP yet. We keep the shape close to the OTel rpc.* conventions for
 * forward compatibility.
 */

// --- Tool / call attributes ---
export const ATTR_MCP_TOOL_NAME = 'mcp.tool.name';
export const ATTR_MCP_TOOL_CATEGORY = 'mcp.tool.category';
export const ATTR_MCP_TOOL_IDEMPOTENT = 'mcp.tool.idempotent';
export const ATTR_MCP_REQUEST_ID = 'mcp.request_id';
export const ATTR_MCP_TRANSPORT = 'mcp.transport';

// --- Result / status attributes ---
// "ok" | "error" | "tool_error"
export const ATTR_MCP_TOOL_STATUS = 'status';
export const ATTR_MCP_ERROR_CODE = 'mcp.error.code';

// --- Metric names ---
export const METRIC_TOOL_DURATION = 'mcp.tool.duration_ms';
export const METRIC_TOOL_CALLS = 'mcp.tool.calls';
export const METRIC_TOOL_ERRORS = 'mcp.tool.errors';

// --- Tracer / Meter identity (also used by middleware) ---
export const TELEMETRY_INSTRUMENTATION_NAME = '@discord-mcp/core';
export const TELEMETRY_INSTRUMENTATION_VERSION = '0.8.0';
