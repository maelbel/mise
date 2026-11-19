export interface LimiterOptions {
  /** Failed attempts allowed within the window. */
  max: number
  windowMs: number
  now?: () => number
}

/**
 * Counts failed logins per key (an email or an address) in a sliding window.
 * In memory: it resets when the server restarts, which is fine for one server.
 */
export class LoginLimiter {
  private readonly failures = new Map<string, number[]>()
  private readonly now: () => number

  constructor(private readonly options: LimiterOptions) {
    this.now = options.now ?? Date.now
  }

  private recent(key: string): number[] {
    const since = this.now() - this.options.windowMs
    const list = (this.failures.get(key) ?? []).filter((t) => t > since)
    if (list.length) this.failures.set(key, list)
    else this.failures.delete(key)
    return list
  }

  /** Seconds to wait before trying again, or 0 when the key may try now. */
  retryAfter(key: string): number {
    const list = this.recent(key)
    if (list.length < this.options.max) return 0
    const oldest = list[list.length - this.options.max]!
    return Math.max(1, Math.ceil((oldest + this.options.windowMs - this.now()) / 1000))
  }

  fail(key: string): void {
    this.failures.set(key, [...this.recent(key), this.now()])
  }

  reset(key: string): void {
    this.failures.delete(key)
  }
}

const FIFTEEN_MINUTES = 15 * 60 * 1000

/** 5 failures per account, 50 per address (several people may share one). */
export const loginLimits = {
  email: new LoginLimiter({ max: 5, windowMs: FIFTEEN_MINUTES }),
  address: new LoginLimiter({ max: 50, windowMs: FIFTEEN_MINUTES }),
}
