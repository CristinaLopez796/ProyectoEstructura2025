export default class Stack<T> {
  private data: T[] = [];

  push(item: T) { this.data.push(item); }
  pop(): T | undefined { return this.data.pop(); }
  peek(): T | undefined { return this.data[this.data.length - 1]; }
  size() { return this.data.length; }
  isEmpty() { return this.data.length === 0; }

  toArray(): T[] { return [...this.data]; }

  rebuildFrom(values: T[]) {
    this.data = [...values];
  }
}
