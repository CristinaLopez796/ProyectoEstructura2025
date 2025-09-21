// lib/priorityQueue.ts
import { Patient } from "../../models/Patient";

export type HeapNode = {
  id: string;           // id del paciente (para indexarlo)
  priority: 1 | 2 | 3;  // 1=Alta, 2=Media, 3=Baja  (min-heap por prioridad)
  createdAt: number;    // desempate: primero el más antiguo
  value: Patient;       // el paciente
};

export default class PriorityQueue {
  private heap: HeapNode[] = [];
  private index: Map<string, number> = new Map(); // id -> índice en heap

  /** Tamaño actual */
  size() { return this.heap.length; }

  /** Inserta un paciente con prioridad y timestamp */
  insert(p: Patient, priority: 1 | 2 | 3, createdAt = Date.now()) {
    const node: HeapNode = { id: p.id, priority, createdAt, value: p };
    this.heap.push(node);
    const i = this.heap.length - 1;
    this.index.set(node.id, i);
    this.heapifyUp(i);
  }

  /** Mira el siguiente (sin quitar) */
  peek(): HeapNode | undefined {
    return this.heap[0];
  }

  /** Saca el siguiente (mejor prioridad / más antiguo) */
  pop(): HeapNode | undefined {
    if (this.heap.length === 0) return undefined;
    this.swap(0, this.heap.length - 1);
    const out = this.heap.pop()!;
    this.index.delete(out.id);
    if (this.heap.length > 0) {
      this.heapifyDown(0);
    }
    return out;
  }

  /** Cambia la prioridad de un paciente en la cola */
  changePriority(id: string, newPriority: 1 | 2 | 3) {
    const i = this.index.get(id);
    if (i === undefined) return;
    const old = this.heap[i].priority;
    if (old === newPriority) return;
    this.heap[i].priority = newPriority;
    // Decide si subir o bajar en el heap
    if (this.compare(i, Math.floor((i - 1) / 2)) < 0) {
      this.heapifyUp(i);
    } else {
      this.heapifyDown(i);
    }
  }

  /** Elimina un paciente por id (si está en espera) */
  removeById(id: string) {
    const i = this.index.get(id);
    if (i === undefined) return;
    this.swap(i, this.heap.length - 1);
    const out = this.heap.pop()!;
    this.index.delete(out.id);
    if (i < this.heap.length) {
      this.index.set(this.heap[i].id, i);
      // Recolocar
      this.heapifyUp(i);
      this.heapifyDown(i);
    }
  }

  /** Snapshot ordenado (no muta el heap) */
  toArrayOrdered(): HeapNode[] {
    // copia y ordena por comparator (prioridad, createdAt)
    return [...this.heap].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.createdAt - b.createdAt;
    });
  }

  /** Reconstruir desde un arreglo de pacientes (útil al hidratar) */
  rebuildFrom(patients: Patient[]) {
    this.heap = [];
    this.index.clear();
    const base = Date.now() - patients.length; // para desempatar con orden estable
    patients.forEach((p, idx) => {
      this.heap.push({
        id: p.id,
        priority: p.urgencia,
        createdAt: base + idx,
        value: p,
      });
      this.index.set(p.id, idx);
    });
    // Heapify en O(n)
    for (let i = Math.floor(this.heap.length / 2) - 1; i >= 0; i--) {
      this.heapifyDown(i);
    }
  }

  // ----------------- Internos del heap -----------------
  private swap(i: number, j: number) {
    const hi = this.heap[i];
    const hj = this.heap[j];
    this.heap[i] = hj;
    this.heap[j] = hi;
    this.index.set(this.heap[i].id, i);
    this.index.set(this.heap[j].id, j);
  }

  /** retorna <0 si a<b; 0 iguales; >0 si a>b por (priority, createdAt) */
  private compare(i: number, j: number): number {
    const a = this.heap[i], b = this.heap[j];
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.createdAt - b.createdAt;
    // min-heap: prioridad menor gana, si empatan gana el más antiguo
  }

  private heapifyUp(i: number) {
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (this.compare(i, p) < 0) {
        this.swap(i, p);
        i = p;
      } else {
        break;
      }
    }
  }

  private heapifyDown(i: number) {
    const n = this.heap.length;
    while (true) {
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      let best = i;

      if (l < n && this.compare(l, best) < 0) best = l;
      if (r < n && this.compare(r, best) < 0) best = r;

      if (best !== i) {
        this.swap(i, best);
        i = best;
      } else {
        break;
      }
    }
  }
}
