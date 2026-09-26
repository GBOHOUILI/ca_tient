export type Clock = () => number;

const MAX_SUFFIX = 10;

export class KeyPool {
  private readonly pausedUntil = new Map<number, number>();
  private readonly disabled = new Set<number>();

  constructor(
    private readonly keys: readonly string[],
    private readonly now: Clock = Date.now,
  ) {}

  static fromEnv(prefix: string, env: NodeJS.ProcessEnv = process.env, now: Clock = Date.now): KeyPool {
    const names = [prefix];
    for (let suffix = 2; suffix <= MAX_SUFFIX; suffix++) {
      names.push(`${prefix}_${suffix}`);
    }

    const keys = names.map((name) => env[name]?.trim() ?? "").filter((key) => key.length > 0);

    // A key listed twice would be retried right after being rate-limited.
    return new KeyPool([...new Set(keys)], now);
  }

  get size(): number {
    return this.keys.length;
  }

  available(): { index: number; key: string }[] {
    const now = this.now();
    return this.keys.flatMap((key, index) =>
      this.disabled.has(index) || (this.pausedUntil.get(index) ?? 0) > now ? [] : [{ index, key }],
    );
  }

  pause(index: number, durationMs: number): void {
    this.pausedUntil.set(index, this.now() + durationMs);
  }

  disable(index: number): void {
    this.disabled.add(index);
  }
}
