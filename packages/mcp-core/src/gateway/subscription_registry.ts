export class SubscriptionRegistry {
  private readonly subscribed = new Set<string>();

  public get size(): number {
    return this.subscribed.size;
  }

  public subscribe(uri: string): void {
    this.subscribed.add(uri);
  }

  public unsubscribe(uri: string): void {
    this.subscribed.delete(uri);
  }

  public has(uri: string): boolean {
    return this.subscribed.has(uri);
  }

  public list(): string[] {
    return [...this.subscribed];
  }

  public matchPattern(re: RegExp): string[] {
    return [...this.subscribed].filter((uri) => re.test(uri));
  }

  public clear(): void {
    this.subscribed.clear();
  }
}
