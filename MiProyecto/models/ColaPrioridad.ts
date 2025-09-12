import { Nodo } from "./Nodo";

export class ColaPrioridad {
  alta: Nodo | null;
  media: Nodo | null;
  baja: Nodo | null;

  constructor() {
    this.alta = null;
    this.media = null;
    this.baja = null;
  }

  insertar(nombre: string, edad: string, sintomas: string, urgencia: 1 | 2 | 3, expediente: string) {
    const Paciente_nuevo = new Nodo(nombre, edad, sintomas, urgencia, expediente);

    if (urgencia === 1) {
      Paciente_nuevo.next = this.alta;
      this.alta = nuevo;
    } else if (urgencia === 2) {
      Paciente_nuevo.next = this.media;
      this.media = Paciente_nuevo;
    } else {
      Paciente_nuevo.next = this.baja;
      this.baja = Paciente_nuevo;
    }
  }

  atender(): Nodo | null {
    if (this.alta) {
      const atendido = this.alta;
      this.alta = this.alta.next;
      return atendido;
    } else if (this.media) {
      const atendido = this.media;
      this.media = this.media.next;
      return atendido;
    } else if (this.baja) {
      const atendido = this.baja;
      this.baja = this.baja.next;
      return atendido;
    } else {
      return null;
    }
  }

  mostrar(): Nodo[] {
    const lista: Nodo[] = [];

    let actual = this.alta;
    while (actual) {
      lista.push(actual);
      actual = actual.next;
    }

    actual = this.media;
    while (actual) {
      lista.push(actual);
      actual = actual.next;
    }

    actual = this.baja;
    while (actual) {
      lista.push(actual);
      actual = actual.next;
    }

    return lista;
  }
}
