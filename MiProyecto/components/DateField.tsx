// components/DateField.tsx
// Selector de fecha con tres desplegables: dia, mes y año.
//
// Entrega y recibe la fecha como "DD/MM/AAAA", el mismo formato de texto que
// ya usaba el campo escrito a mano, para no tener que tocar nada de lo que
// viene despues (validaciones, modelo Patient, columna fecha_nacimiento).
//
// El componente lleva su propio estado de dia/mes/año. Asi puedes elegir "15"
// en el dia aunque todavia no hayas puesto mes ni año: la seleccion se queda.
// Al formulario solo se le entrega la fecha cuando esta completa; mientras
// tanto recibe "" y su validacion pide que se termine de elegir.

import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Palette } from "../theme/colors";
import { useTheme } from "../theme/ThemeContext";

type Props = {
  /** Fecha en formato "DD/MM/AAAA". Cadena vacia si no hay nada elegido. */
  value: string;
  onChange: (ddmmyyyy: string) => void;
};

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** Dias reales del mes, contando años bisiestos. */
function diasDelMes(mes: number, anio: number): number {
  if (!mes) return 31;
  // El dia 0 del mes siguiente es el ultimo del actual.
  return new Date(anio || 2000, mes, 0).getDate();
}

function partir(valor: string): { d: number; m: number; a: number } {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor.trim());
  if (!match) return { d: 0, m: 0, a: 0 };
  return { d: Number(match[1]), m: Number(match[2]), a: Number(match[3]) };
}

function unir(d: number, m: number, a: number): string {
  if (!d || !m || !a) return "";
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${a}`;
}

type Opcion = { label: string; value: number };

export default function DateField({ value, onChange }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => crearEstilos(colors), [colors]);

  // Estado interno: permite selecciones parciales (dia sin mes, etc.).
  const inicial = partir(value);
  const [d, setD] = useState(inicial.d);
  const [m, setM] = useState(inicial.m);
  const [a, setA] = useState(inicial.a);

  // Si el formulario cambia el valor por fuera (p. ej. lo limpia tras registrar
  // un paciente), hay que reflejarlo en los desplegables. Se compara por la
  // fecha ya unida para no entrar en bucle cuando el cambio vino de aqui mismo.
  useEffect(() => {
    const p = partir(value);
    if (unir(p.d, p.m, p.a) !== unir(d, m, a)) {
      setD(p.d);
      setM(p.m);
      setA(p.a);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Rango de años: desde hace 120 hasta hoy, del mas reciente al mas antiguo,
  // que es como se busca una fecha de nacimiento.
  const anios = useMemo<Opcion[]>(() => {
    const actual = new Date().getFullYear();
    return Array.from({ length: 121 }, (_, i) => ({
      label: String(actual - i),
      value: actual - i,
    }));
  }, []);

  const maxDia = diasDelMes(m, a);
  const dias = useMemo<Opcion[]>(
    () => Array.from({ length: maxDia }, (_, i) => ({ label: String(i + 1), value: i + 1 })),
    [maxDia]
  );
  const meses = useMemo<Opcion[]>(
    () => MESES.map((nombre, i) => ({ label: nombre, value: i + 1 })),
    []
  );

  const actualizar = (nuevoD: number, nuevoM: number, nuevoA: number) => {
    // Si cambiar de mes o año deja el dia fuera de rango (31 de enero -> febrero),
    // se recorta al ultimo dia valido en vez de generar una fecha imposible.
    const tope = diasDelMes(nuevoM, nuevoA);
    const diaValido = nuevoD > tope ? tope : nuevoD;
    setD(diaValido);
    setM(nuevoM);
    setA(nuevoA);
    // "" mientras la fecha este incompleta; "DD/MM/AAAA" cuando ya estan los 3.
    onChange(unir(diaValido, nuevoM, nuevoA));
  };

  return (
    <View style={styles.fila}>
      <Columna
        etiqueta="Día"
        placeholder="--"
        seleccion={d}
        opciones={dias}
        onSelect={(v) => actualizar(v, m, a)}
        colors={colors}
        styles={styles}
      />
      <Columna
        etiqueta="Mes"
        placeholder="--"
        ancho={2}
        seleccion={m}
        opciones={meses}
        onSelect={(v) => actualizar(d, v, a)}
        colors={colors}
        styles={styles}
      />
      <Columna
        etiqueta="Año"
        placeholder="----"
        seleccion={a}
        opciones={anios}
        onSelect={(v) => actualizar(d, m, v)}
        colors={colors}
        styles={styles}
      />
    </View>
  );
}

function Columna({
  etiqueta,
  placeholder,
  seleccion,
  opciones,
  onSelect,
  colors,
  styles,
  ancho = 1,
}: {
  etiqueta: string;
  placeholder: string;
  seleccion: number;
  opciones: Opcion[];
  onSelect: (v: number) => void;
  colors: Palette;
  styles: ReturnType<typeof crearEstilos>;
  ancho?: number;
}) {
  // En Android y en Web el <select>/Picker no hereda el color del texto ni el
  // fondo: hay que darselo a cada opcion o en modo oscuro el desplegable sale
  // ilegible (texto oscuro sobre oscuro, o la lista en blanco).
  const nativo = Platform.OS === "android" || Platform.OS === "web";
  const colorItem = nativo ? colors.text : undefined;
  const estiloItem =
    Platform.OS === "web" ? { backgroundColor: colors.input, color: colors.text } : undefined;

  return (
    <View style={[styles.columna, ancho === 2 && styles.columnaMes]}>
      <Text style={styles.mini}>{etiqueta}</Text>
      <View style={styles.caja}>
        <Picker
          selectedValue={seleccion}
          onValueChange={(v) => onSelect(Number(v))}
          style={styles.picker}
          dropdownIconColor={colors.textMuted}
          itemStyle={{ color: colors.text }}
          accessibilityLabel={`${etiqueta} de nacimiento`}
        >
          <Picker.Item label={placeholder} value={0} color={colorItem} style={estiloItem} />
          {opciones.map((o) => (
            <Picker.Item
              key={o.value}
              label={o.label}
              value={o.value}
              color={colorItem}
              style={estiloItem}
            />
          ))}
        </Picker>
      </View>
    </View>
  );
}

const crearEstilos = (c: Palette) =>
  StyleSheet.create({
    fila: { flexDirection: "row", gap: 8 },
    columna: { flexGrow: 1, flexShrink: 1, flexBasis: 90 },
    // El mes necesita mas espacio: "Septiembre" no cabe en el ancho de un dia.
    columnaMes: { flexBasis: 130 },
    mini: { color: c.textMuted, fontSize: 11, fontWeight: "600", marginBottom: 4 },
    caja: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      backgroundColor: c.input,
      overflow: "hidden",
      justifyContent: "center",
      ...Platform.select({ ios: { paddingHorizontal: 4 } }),
    },
    picker: {
      borderWidth: 0,
      color: c.text,
      ...Platform.select({
        // En web el <select> nativo necesita fondo y color explicitos para que
        // la lista desplegable respete el modo oscuro.
        web: {
          paddingVertical: 10,
          paddingHorizontal: 8,
          backgroundColor: c.input,
          color: c.text,
        },
        android: { height: 50, backgroundColor: "transparent" },
        ios: { height: 150, backgroundColor: "transparent" },
      }),
    },
  });
