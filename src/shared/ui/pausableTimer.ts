export class PausableTimer {
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private startedAt = 0;
  private remainingMs: number;
  private isPaused = false;
  private fired = false;

  constructor(
    private readonly callback: () => void,
    delayMs: number,
  ) {
    this.remainingMs = Math.max(0, delayMs);
  }

  start(): void {
    if (this.timerId !== null || this.fired) return;
    this.isPaused = false;
    this.armed();
  }

  pause(): void {
    if (this.timerId === null || this.isPaused) return;
    clearTimeout(this.timerId);
    this.timerId = null;
    this.isPaused = true;
    this.remainingMs = Math.max(0, this.remainingMs - (Date.now() - this.startedAt));
  }

  resume(): void {
    if (!this.isPaused || this.fired) return;
    this.isPaused = false;
    this.armed();
  }

  clear(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.isPaused = false;
  }

  get paused(): boolean {
    return this.isPaused;
  }

  private armed(): void {
    this.startedAt = Date.now();
    this.timerId = setTimeout(() => {
      this.timerId = null;
      this.fired = true;
      this.callback();
    }, this.remainingMs);
  }
}
