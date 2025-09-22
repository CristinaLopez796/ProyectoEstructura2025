export class ListNode<T> {
  constructor(public value: T, public next: ListNode<T> | null = null) {}
}

export default class LinkedList<T> {
  private head: ListNode<T> | null = null;
  private tail: ListNode<T> | null = null;
  private _size = 0;

  size() { return this._size; }
  isEmpty() { return this._size === 0; }

  append(value: T) {
    const node = new ListNode(value);
    if (!this.head) {
      this.head = this.tail = node;
    } else {
      this.tail!.next = node;
      this.tail = node;
    }
    this._size++;
  }

  toArray(): T[] {
    const out: T[] = [];
    let cur = this.head;
    while (cur) { out.push(cur.value); cur = cur.next; }
    return out;
  }

  // reconstruye la lista rápidamente desde un array (para hidratar)
  rebuildFrom(values: T[]) {
    this.head = this.tail = null;
    this._size = 0;
    for (const v of values) this.append(v);
  }
}
