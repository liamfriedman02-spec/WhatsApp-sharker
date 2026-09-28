/**
 * Runs tasks sequentially per key (e.g. per phone number) so a Boss's messages are
 * always handled in order, while different Bosses are processed concurrently.
 */
export class KeyedQueue {
  private readonly tails = new Map<string, Promise<void>>();

  run(key: string, task: () => Promise<void>): Promise<void> {
    const prev = this.tails.get(key) ?? Promise.resolve();
    const next = prev.then(task, task);
    const tail = next.catch(() => {});
    this.tails.set(key, tail);
    void tail.then(() => {
      if (this.tails.get(key) === tail) this.tails.delete(key);
    });
    return next;
  }

  async idle(): Promise<void> {
    while (this.tails.size > 0) await Promise.all([...this.tails.values()]);
  }
}
