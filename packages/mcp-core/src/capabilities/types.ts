export interface ClientCapabilitiesSnapshot {
  readonly protocolVersion: string;
  readonly sampling: boolean;
  readonly elicitation: boolean;
  readonly completion: boolean;
  readonly progress: boolean;
  readonly cancellation: boolean;
  readonly resourcesSubscribe: boolean;
  readonly tasks: boolean;
}

export type CapabilityFlag = Exclude<keyof ClientCapabilitiesSnapshot, 'protocolVersion'>;
