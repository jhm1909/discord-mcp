import { describe, it, expect } from 'vitest';
import { compose, type MiddlewareContext } from './compose.js';
import { Precondition } from '../pieces/Precondition.js';
import { PreconditionStore } from '../stores/PreconditionStore.js';
import { preconditionMiddleware } from './precondition.js';

class AlwaysOk extends Precondition {
  override readonly identifier = 'always_ok';
  override async run(): Promise<void> {
    /* no-op */
  }
}

class AlwaysFail extends Precondition {
  override readonly identifier = 'always_fail';
  override async run(): Promise<void> {
    throw new Error('reason: nope');
  }
}

function makeStore(...precs: Precondition[]): PreconditionStore {
  const store = new PreconditionStore();
  for (const p of precs) {
    store.set(p.identifier, p);
  }
  return store;
}

const ctxBase = (toolPreconditions: readonly string[]): MiddlewareContext<unknown> => ({
  tool: { name: 'messages_send', category: 'messages', idempotent: false },
  args: {},
  meta: new Map([['toolPreconditions', toolPreconditions]]),
});

describe('preconditionMiddleware', () => {
  it('passes when all required preconditions resolve', async () => {
    const store = makeStore(
      new AlwaysOk({ name: 'always_ok', path: 'inline', root: 'inline', store: null as never }, { name: 'always_ok', enabled: true }),
    );
    const dispatch = compose([preconditionMiddleware(store)], async () => 'ok');
    expect(await dispatch(ctxBase(['always_ok']))).toBe('ok');
  });

  it('throws when any required precondition rejects', async () => {
    const store = makeStore(
      new AlwaysOk({ name: 'always_ok', path: 'inline', root: 'inline', store: null as never }, { name: 'always_ok', enabled: true }),
      new AlwaysFail({ name: 'always_fail', path: 'inline', root: 'inline', store: null as never }, { name: 'always_fail', enabled: true }),
    );
    const dispatch = compose([preconditionMiddleware(store)], async () => 'ok');
    await expect(dispatch(ctxBase(['always_ok', 'always_fail']))).rejects.toThrow(/reason: nope/);
  });

  it('skips middleware entirely when tool declares no preconditions', async () => {
    const store = makeStore();
    const dispatch = compose([preconditionMiddleware(store)], async () => 'reached');
    expect(await dispatch(ctxBase([]))).toBe('reached');
  });

  it('throws if tool references an unknown precondition identifier', async () => {
    const store = makeStore();
    const dispatch = compose([preconditionMiddleware(store)], async () => 'unreached');
    await expect(dispatch(ctxBase(['nonexistent']))).rejects.toThrow(/unknown precondition.*nonexistent/i);
  });
});
