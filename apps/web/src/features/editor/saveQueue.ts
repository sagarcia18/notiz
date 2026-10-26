export type SaveStatus = 'saved' | 'pending' | 'saving' | 'error';

export interface SaveQueueOptions<T> {
  save: (value: T) => Promise<void>;
  delayMs: number;
  onStatus: (status: SaveStatus) => void;
}

/**
 * Debounced, serialized saving: only the latest value is saved, never two
 * saves run at once, and a value changed during a save is saved right after.
 */
export class SaveQueue<T> {
  private latest: { value: T } | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running: Promise<void> | undefined;

  constructor(private readonly options: SaveQueueOptions<T>) {}

  schedule(value: T): void {
    this.latest = { value };
    this.options.onStatus('pending');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), this.options.delayMs);
  }

  /** Saves a pending value now; resolves when everything queued is saved. */
  async flush(): Promise<void> {
    clearTimeout(this.timer);
    this.timer = undefined;
    while (this.running) {
      await this.running;
    }
    const next = this.latest;
    if (!next) return;
    this.latest = undefined;
    let succeeded = false;
    this.running = this.run(next.value).then((ok) => {
      succeeded = ok;
    });
    await this.running;
    this.running = undefined;
    if (succeeded && this.latest && this.timer === undefined) {
      await this.flush();
    }
  }

  hasPending(): boolean {
    return this.latest !== undefined || this.running !== undefined;
  }

  private async run(value: T): Promise<boolean> {
    this.options.onStatus('saving');
    try {
      await this.options.save(value);
      if (!this.latest) this.options.onStatus('saved');
      return true;
    } catch {
      // Keep the failed value so the next change or flush retries it.
      this.latest ??= { value };
      this.options.onStatus('error');
      return false;
    }
  }
}
