export class ConfigEntries<T> implements Iterable<[string, T]> {
  private readonly items: Record<string, T>;

  constructor(
    raw: Record<string, any>,
    normalise: (id: string, value: any) => T
  ) {
    this.items = Object.fromEntries(
      Object.entries(raw).map(([id, value]) => [id, normalise(id, value)])
    );
  }

  get(id: string): T | undefined {
    return this.items[id];
  }

  keys(): IterableIterator<string> {
    return Object.keys(this.items)[Symbol.iterator]();
  }

  values(): IterableIterator<T> {
    return Object.values(this.items)[Symbol.iterator]();
  }

  [Symbol.iterator](): IterableIterator<[string, T]> {
    return Object.entries(this.items)[Symbol.iterator]() as IterableIterator<
      [string, T]
    >;
  }

  toJSON(): Record<string, T> {
    return this.items;
  }
}
