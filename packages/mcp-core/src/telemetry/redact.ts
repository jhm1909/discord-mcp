/**
 * Discord REST route normalization for span attributes / metric labels.
 *
 * The Discord API uses snowflake IDs (17–20 digits) inside path segments
 * — `/channels/123456789012345678/messages/987654321098765432`. Sending
 * those raw to a tracing backend produces high-cardinality routes that
 * overflow per-route metric series and leak guild/channel/user IDs to
 * operators viewing traces.
 *
 * `redactRoute` collapses snowflakes to the literal `:id` so dashboards
 * can group by route shape. The `@me` literal (used in
 * `/users/@me/...`) and the `@original` literal (interactions edge case)
 * are preserved verbatim; both are stable route segments, not IDs.
 *
 * Query strings are stripped — they contain pagination cursors and
 * limits that are operationally interesting but bloat the cardinality
 * the same way IDs do. Surface them as separate span attributes when
 * needed, not via the route key.
 *
 * @example
 *   redactRoute('/channels/123456789012345678/messages/987654321098765432')
 *   // → '/channels/:id/messages/:id'
 *
 *   redactRoute('/users/@me/guilds/111122223333444455')
 *   // → '/users/@me/guilds/:id'
 *
 *   redactRoute('/guilds/111/regions?limit=10')
 *   // → '/guilds/:id/regions'
 */
export function redactRoute(path: string): string {
  // Strip query string first; everything after `?` is operator-tunable
  // and should not be part of the route key.
  const queryIdx = path.indexOf('?');
  const withoutQuery = queryIdx >= 0 ? path.slice(0, queryIdx) : path;

  // Replace any sequence of 17–20 digits (Discord snowflake range) with
  // `:id`. We do NOT touch `@me` / `@original` because they have no
  // digits and the regex is digit-only by construction.
  return withoutQuery.replace(/\d{17,20}/g, ':id');
}
