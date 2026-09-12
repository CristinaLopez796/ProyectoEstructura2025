// components/MonthCalendar.tsx
// Calendario de un mes para filtrar el historial por dia.
//
// Cada casilla muestra el numero del dia y, debajo, cuantas atenciones hubo.
// Los dias sin atenciones se ven apagados y no se pueden pulsar: filtrar por
// ellos solo daria una lista vacia.

import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Palette } from "../theme/colors";
import { useTheme } from "../theme/ThemeContext";

type Props = {
  /** Mes a dibujar, en formato "AAAA-MM". */
  mes: string;
  /** Cuantas atenciones hay por dia: { 1: 3, 5: 1, ... } */
  conteoPorDia: Record<number, number>;
  /** Dia seleccionado, o null si se ven todos los del mes. */
  diaElegido: number | null;
  onElegirDia: (dia: number | null) => void;
};

const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];

export default function MonthCalendar({ mes, conteoPorDia, diaElegido, onElegirDia }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => crearEstilos(colors), [colors]);

  const [anio, mesNum] = mes.split("-").map(Number);

  const celdas = useMemo(() => {
    const diasDelMes = new Date(anio, mesNum, 0).getDate();

    // getDay() devuelve 0 para domingo; aqui la semana empieza en lunes, asi
    // que se rota para que lunes sea 0 y domingo 6.
    const primerDia = new Date(anio, mesNum - 1, 1).getDay();
    const huecosIniciales = (primerDia + 6) % 7;

    const lista: (number | null)[] = Array(huecosIniciales).fill(null);
    for (let d = 1; d <= diasDelMes; d++) lista.push(d);
    // Se completa la ultima semana para que la rejilla no quede coja.
    while (lista.length % 7 !== 0) lista.push(null);
    return lista;
  }, [anio, mesNum]);

  return (
    <View style={styles.contenedor}>
      <View style={styles.filaSemana}>
        {DIAS_SEMANA.map((d, i) => (
          <Text key={`${d}-${i}`} style={styles.cabeceraDia}>
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.rejilla}>
        {celdas.map((dia, i) => {
          if (dia === null) return <View key={`vacio-${i}`} style={styles.celda} />;

          const n = conteoPorDia[dia] ?? 0;
          const activo = diaElegido === dia;
          const conDatos = n > 0;

          return (
            <Pressable
              key={dia}
              // Pulsar el dia ya elegido lo deselecciona y vuelve al mes completo.
              onPress={() => conDatos && onElegirDia(activo ? null : dia)}
              disabled={!conDatos}
              style={[
                styles.celda,
                styles.celdaDia,
                conDatos && styles.celdaConDatos,
                activo && styles.celdaActiva,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: activo, disabled: !conDatos }}
              accessibilityLabel={
                conDatos ? `Día ${dia}, ${n} atenciones` : `Día ${dia}, sin atenciones`
              }
            >
              <Text
                style={[
                  styles.numeroDia,
                  !conDatos && styles.numeroApagado,
                  activo && styles.textoActivo,
                ]}
              >
                {dia}
              </Text>
              {conDatos ? (
                <Text style={[styles.conteo, activo && styles.textoActivo]}>{n}</Text>
              ) : (
                <Text style={styles.conteoVacio}>·</Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {diaElegido !== null && (
        <Pressable onPress={() => onElegirDia(null)} style={styles.limpiar}>
          <Text style={styles.limpiarTexto}>Ver todo el mes</Text>
        </Pressable>
      )}
    </View>
  );
}

const crearEstilos = (c: Palette) =>
  StyleSheet.create({
    contenedor: {
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      padding: 10,
      gap: 6,
    },
    filaSemana: { flexDirection: "row" },
    cabeceraDia: {
      flex: 1,
      textAlign: "center",
      color: c.textMuted,
      fontSize: 11,
      fontWeight: "800",
    },
    rejilla: { flexDirection: "row", flexWrap: "wrap" },
    // 14.28% = 100/7. Con flexBasis exacto la rejilla no se desalinea al
    // cambiar el ancho de la ventana.
    celda: { flexBasis: "14.28%", aspectRatio: 1, padding: 2 },
    celdaDia: {
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
    },
    celdaConDatos: { backgroundColor: c.surface },
    celdaActiva: { backgroundColor: c.tabActive },
    numeroDia: { color: c.text, fontWeight: "700", fontSize: 13 },
    numeroApagado: { color: c.textMuted, opacity: 0.45, fontWeight: "400" },
    conteo: { color: c.tabActive, fontSize: 10, fontWeight: "800" },
    conteoVacio: { color: c.textMuted, fontSize: 10, opacity: 0.35 },
    textoActivo: { color: "#fff" },

    limpiar: {
      alignSelf: "center",
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      marginTop: 2,
    },
    limpiarTexto: { color: c.tabActive, fontWeight: "700", fontSize: 12 },
  });
