import type { CapabilityFlag, ClientCapabilitiesSnapshot } from './types.js';

export class CapabilityRouter {
  public constructor(public readonly caps: ClientCapabilitiesSnapshot) {}

  public has(flag: CapabilityFlag): boolean {
    return this.caps[flag] === true;
  }

  public protocolAtLeast(target: string): boolean {
    return this.caps.protocolVersion >= target;
  }

  public summary(): Record<string, unknown> {
    return {
      protocol_version: this.caps.protocolVersion,
      sampling: this.caps.sampling,
      elicitation: this.caps.elicitation,
      completion: this.caps.completion,
      progress: this.caps.progress,
      cancellation: this.caps.cancellation,
      resources_subscribe: this.caps.resourcesSubscribe,
      tasks: this.caps.tasks,
    };
  }

  public async runOrFallback<T>(
    flag: CapabilityFlag,
    primary: () => Promise<T>,
    fallback: () => Promise<T>,
  ): Promise<T> {
    return this.has(flag) ? primary() : fallback();
  }
}
