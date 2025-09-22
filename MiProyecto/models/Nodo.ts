export class Nodo {
  nombre: string;
  edad: string;
  sintomas: string;
  urgencia: 1 | 2 | 3;
  expediente: string;
  next: Nodo | null;
//PROBANDO SI SE GUARDA EN EL REPOSITORIO
  constructor(nombre: string, edad: string, sintomas: string, urgencia: 1 | 2 | 3, expediente: string) {
    this.nombre = nombre;
    this.edad = edad;
    this.sintomas = sintomas;
    this.urgencia = urgencia;
    this.expediente = expediente;
    this.next = null;
  }
}
