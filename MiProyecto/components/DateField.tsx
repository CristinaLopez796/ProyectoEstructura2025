// components/DateField.tsx
// Selector de fecha con tres desplegables: dia, mes y año.
//
// Entrega y recibe la fecha como "DD/MM/AAAA", el mismo formato de texto que
// ya usaba el campo escrito a mano, para no tener que tocar nada de lo que
// viene despues (validaciones, modelo Patient, columna fecha_nacimiento).

import React, { useMemo } from "react";
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

export default function DateField({ value, onChange }: Props) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => crearEstilos(colors), [colors]);

  const { d, m, a } = partir(value);

  // Rango de años: desde hace 120 hasta hoy, del mas reciente al mas antiguo,
  // que es como se busca una fecha de nacimiento.
  const anios = useMemo(() => {
    const actual = new Date().getFullYear();
    return Array.from({ length: 121 }, (_, i) => actual - i);
  }, []);

  const maxDia = diasDelMes(m, a);
  const dias = useMemo(
    () => Array.from({ length: maxDia }, (_, i) => i + 1),
    [maxDia]
  );

  const actualizar = (nuevoD: number, nuevoM: number, nuevoA: number) => {
    // Si cambiar de mes o año deja el dia fuera de rango (31 de enero -> febrero),
    // se recorta al ultimo dia valido en vez de generar una fecha imposible.
    const tope = diasDelMes(nuevoM, nuevoA);
    const diaValido = nuevoD > tope ? tope : nuevoD;
    onChange(unir(diaValido, nuevoM, nuevoA));
  };

  // En Android el Picker pinta su propio texto; hay que pasarle el color
  // explicitamente o en modo oscuro sale negro sobre negro.
  const colorItem = Platform.OS === "android" ? colors.text : undefined;

  return (
    <View style={styles.fila}>
      <View style={styles.columna}>
        <Text style={styles.mini}>Día</Text>
        <View style={styles.caja}>
          <Picker
            selectedValue={d}
            onValueChange={(v) => actualizar(Number(v), m, a)}
            style={[styles.picker, { color: colors.text }]}
            dropdownIconColor={colors.textMuted}
            itemStyle={{ color: colors.text }}
            accessibilityLabel="Día de nacimiento"
          >
            <Picker.Item label="--" value={0} color={colorItem} />
            {dias.map((n) => (
              <Picker.Item key={n} label={String(n)} value={n} color={colorItem} />
            ))}
          </Picker>
        </View>
      </View>

      <View style={[styles.columna, styles.columnaMes]}>
        <Text style={styles.mini}>Mes</Text>
        <View style={styles.caja}>
          <Picker
            selectedValue={m}
            onValueChange={(v) => actualizar(d, Number(v), a)}
            style={[styles.picker, { color: colors.text }]}
            dropdownIconColor={colors.textMuted}
            itemStyle={{ color: colors.text }}
            accessibilityLabel="Mes de nacimiento"
          >
            <Picker.Item label="--" value={0} color={colorItem} />
            {MESES.map((nombre, i) => (
              <Picker.Item key={nombre} label={nombre} value={i + 1} color={colorItem} />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.columna}>
        <Text style={styles.mini}>Año</Text>
        <View style={styles.caja}>
          <Picker
            selectedValue={a}
            onValueChange={(v) => actualizar(d, m, Number(v))}
            style={[styles.picker, { color: colors.text }]}
            dropdownIconColor={colors.textMuted}
            itemStyle={{ color: colors.text }}
            accessibilityLabel="Año de nacimiento"
          >
            <Picker.Item label="----" value={0} color={colorItem} />
            {anios.map((n) => (
              <Picker.Item key={n} label={String(n)} value={n} color={colorItem} />
            ))}
          </Picker>
        </View>
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
    mini: { color: c.textMuted, fontSize: 11, marginBottom: 4 },
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
      backgroundColor: "transparent",
      borderWidth: 0,
      ...Platform.select({
        web: { paddingVertical: 10, paddingHorizontal: 8 },
        android: { height: 50 },
        ios: { height: 150 },
      }),
    },
  });
