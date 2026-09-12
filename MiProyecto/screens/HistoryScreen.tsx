import React, { useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet, TextInput, Pressable, ScrollView } from "react-native";
import { Patient } from "../models/Patient";
import { Palette } from "../theme/colors";
import { useTheme } from "../theme/ThemeContext";
import { useResponsive } from "../theme/responsive";
import { formatDateTime } from "../utils/datetime";
import { Ionicons } from "@expo/vector-icons";
import MonthCalendar from "../components/MonthCalendar";

export type HistoryItem = {
  /** id de la fila en appointment_history. Necesario para poder deshacer. */
  id?: string;
  paciente: Patient;
  atendidoEn: number;
  waitedMs?: number;
};

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** Clave ordenable del mes: "2026-09". Ordenar texto equivale a ordenar fecha. */
function claveMes(ts: number): string {
  const f = new Date(ts);
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}`;
}

/** "2026-09" -> "Septiembre 2026" */
function tituloMes(clave: string): string {
  const [anio, mes] = clave.split("-");
  return `${MESES[Number(mes) - 1]} ${anio}`;
}

/** "2026-09" -> "Sep 26", para los chips del filtro. */
function tituloMesCorto(clave: string): string {
  const [anio, mes] = clave.split("-");
  return `${MESES[Number(mes) - 1].slice(0, 3)} ${anio.slice(2)}`;
}


/** Quita tildes para que "martinez" encuentre "Martínez". */
function sinTildes(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function fmtMs(ms?: number) {
  if (!ms || !isFinite(ms) || ms <= 0) return "0m";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function prioridadColor(p: 1 | 2 | 3, colors: Palette) {
  if (p === 1) return colors.priority.p1;
  if (p === 2) return colors.priority.p2;
  return colors.priority.p3;
}
function prioridadLabel(p: 1 | 2 | 3) {
  return p === 1 ? "Alta (1)" : p === 2 ? "Media (2)" : "Baja (3)";
}

// El FlatList recibe una mezcla de encabezados de mes y filas de tarjetas.
// Se usa FlatList y no SectionList porque SectionList no admite numColumns, y
// se perderia la rejilla de varias columnas en pantallas anchas. Aqui las
// tarjetas se agrupan de antemano en filas de `columns` elementos.
type Fila =
  | { tipo: "mes"; clave: string; titulo: string; total: number; esperaMedia: number }
  | { tipo: "tarjetas"; clave: string; items: HistoryItem[] };

export default function HistoryScreen({
  items, onSelect,
}: {
  items: HistoryItem[];
  onSelect?: (p: Patient, index: number) => void;
}) {
  const r = useResponsive();
  const { colors } = useTheme();
  const styles = useMemo(() => crearEstilos(colors), [colors]);
  const [query, setQuery] = useState("");
  /** null = todos los meses. */
  const [mesElegido, setMesElegido] = useState<string | null>(null);
  /** Dia dentro del mes elegido. null = el mes completo. */
  const [diaElegido, setDiaElegido] = useState<number | null>(null);
  const columns = r.columns;

  // Atendidos hoy. Se compara año/mes/dia y no el timestamp, porque lo que
  // importa es la fecha del calendario, no las ultimas 24 horas.
  // Depende de `items`, asi que se recalcula sola cuando entra una atencion
  // nueva y, al pasar de dia, la primera atencion del dia la pone en 1.
  const { atendidosHoy, atendidosEsteAnio, fechaHoyTexto } = useMemo(() => {
    const hoy = new Date();
    const mismoDia = (ts: number) => {
      const f = new Date(ts);
      return (
        f.getFullYear() === hoy.getFullYear() &&
        f.getMonth() === hoy.getMonth() &&
        f.getDate() === hoy.getDate()
      );
    };
    // El total se limita al año en curso porque asi lo dice la etiqueta
    // ("lo que va del año"). Si algun dia hay datos de años anteriores, la
    // cifra seguira siendo correcta en vez de mezclarlos.
    const delAnio = items.filter(
      (it) => new Date(it.atendidoEn).getFullYear() === hoy.getFullYear()
    ).length;

    return {
      atendidosHoy: items.filter((it) => mismoDia(it.atendidoEn)).length,
      atendidosEsteAnio: delAnio,
      fechaHoyTexto: `${String(hoy.getDate()).padStart(2, "0")}/${String(
        hoy.getMonth() + 1
      ).padStart(2, "0")}/${hoy.getFullYear()}`,
    };
  }, [items]);

  // Cuantas atenciones hay en cada mes. Se calcula una vez y sirve tanto para
  // los chips como para saber que meses estan vacios.
  const conteoPorMes = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const it of items) {
      const k = claveMes(it.atendidoEn);
      acc[k] = (acc[k] ?? 0) + 1;
    }
    return acc;
  }, [items]);

  // Los 12 meses del año en curso, haya o no atenciones: se pidio verlos todos.
  // Si el historial tiene datos de otros años, esos meses se añaden tambien
  // para no esconderlos.
  const mesesDelAnio = useMemo(() => {
    const anioActual = new Date().getFullYear();
    const claves = new Set<string>();
    for (let m = 1; m <= 12; m++) claves.add(`${anioActual}-${String(m).padStart(2, "0")}`);
    for (const k of Object.keys(conteoPorMes)) claves.add(k);
    return [...claves].sort().reverse();
  }, [conteoPorMes]);

  // Atenciones por dia dentro del mes elegido, para pintar el calendario.
  const conteoPorDia = useMemo(() => {
    if (!mesElegido) return {};
    const acc: Record<number, number> = {};
    for (const it of items) {
      if (claveMes(it.atendidoEn) !== mesElegido) continue;
      const d = new Date(it.atendidoEn).getDate();
      acc[d] = (acc[d] ?? 0) + 1;
    }
    return acc;
  }, [items, mesElegido]);

  // Cambiar de mes descarta el dia: el 15 de marzo no significa nada en abril.
  const elegirMes = (clave: string | null) => {
    setMesElegido(clave);
    setDiaElegido(null);
  };

  const filtrados = useMemo(() => {
    const q = sinTildes(query.trim());
    // Si lo escrito son solo digitos, se busca por identidad ignorando los
    // guiones: asi "08011990" encuentra a quien tenga "0801-1990-12345".
    const soloDigitos = q.replace(/\D/g, "");
    const buscaPorIdentidad = soloDigitos.length > 0 && /^[\d\s-]+$/.test(q);

    return items.filter((it) => {
      if (mesElegido && claveMes(it.atendidoEn) !== mesElegido) return false;
      if (diaElegido !== null && new Date(it.atendidoEn).getDate() !== diaElegido) return false;
      if (!q) return true;

      const p = it.paciente;
      if (buscaPorIdentidad) {
        return (p.numeroIdentidad ?? "").replace(/\D/g, "").includes(soloDigitos);
      }
      // Busqueda de texto: nombre o expediente.
      return (
        sinTildes(p.nombre).includes(q) ||
        sinTildes(p.expediente ?? "").includes(q)
      );
    });
  }, [items, query, mesElegido, diaElegido]);

  // Agrupacion por mes + division en filas para la rejilla.
  const filas = useMemo<Fila[]>(() => {
    const grupos = new Map<string, HistoryItem[]>();
    for (const it of filtrados) {
      const k = claveMes(it.atendidoEn);
      const lista = grupos.get(k);
      if (lista) lista.push(it);
      else grupos.set(k, [it]);
    }

    const salida: Fila[] = [];
    // Mes mas reciente primero, y dentro de cada mes la atencion mas reciente.
    for (const clave of [...grupos.keys()].sort().reverse()) {
      const delMes = grupos.get(clave)!.slice().sort((a, b) => b.atendidoEn - a.atendidoEn);

      const conEspera = delMes.filter((it) => typeof it.waitedMs === "number");
      const esperaMedia = conEspera.length
        ? conEspera.reduce((s, it) => s + (it.waitedMs ?? 0), 0) / conEspera.length
        : 0;

      salida.push({
        tipo: "mes",
        clave: `mes-${clave}`,
        titulo: tituloMes(clave),
        total: delMes.length,
        esperaMedia,
      });

      for (let i = 0; i < delMes.length; i += columns) {
        salida.push({
          tipo: "tarjetas",
          clave: `fila-${clave}-${i}`,
          items: delMes.slice(i, i + columns),
        });
      }
    }
    return salida;
  }, [filtrados, columns]);

  const renderTarjeta = (item: HistoryItem) => {
    const p = item.paciente;
    return (
      <Pressable
        key={`${p.id}-${item.atendidoEn}`}
        style={[styles.card, { flex: 1, maxWidth: `${100 / columns}%` }]}
        onPress={() => onSelect?.(p, items.indexOf(item))}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.name, { fontSize: r.font.subtitle }]} numberOfLines={2}>
            {p.nombre}
          </Text>
          <View style={[styles.badge, { backgroundColor: prioridadColor(p.urgencia, colors) }]}>
            <Ionicons
              name={p.urgencia === 1 ? "alert" : p.urgencia === 2 ? "warning-outline" : "leaf-outline"}
              size={12}
              color="#fff"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.badgeText}>{prioridadLabel(p.urgencia)}</Text>
          </View>
        </View>

        {!!p.numeroIdentidad && (
          <Text style={[styles.meta, { fontSize: r.font.small }]}>Identidad: {p.numeroIdentidad}</Text>
        )}
        <Text style={[styles.meta, { fontSize: r.font.small }]}>Expediente: {p.expediente}</Text>
        <Text style={[styles.meta, { fontSize: r.font.small }]}>
          Atendido: {formatDateTime(item.atendidoEn)}
        </Text>
        {typeof item.waitedMs === "number" && (
          <Text style={[styles.meta, { fontSize: r.font.small }]}>
            Espera aprox.: {fmtMs(item.waitedMs)}
          </Text>
        )}
        <Text style={{ marginTop: 6, color: colors.text, fontSize: r.font.body }}>
          Síntomas: {p.sintomas}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={filas}
        keyExtractor={(f) => f.clave}
        contentContainerStyle={{
          width: "100%",
          maxWidth: r.maxContentWidth,
          alignSelf: "center",
          paddingHorizontal: r.gutter,
          paddingBottom: 40,
          gap: r.gap,
        }}
        ListHeaderComponent={
          <View style={{ gap: r.gap, paddingTop: r.gutter }}>
            {/* Encabezado / métricas */}
            <View style={[styles.headerCard, r.isWide ? styles.headerCardWide : styles.headerCardNarrow]}>
              <View style={styles.headerTitleRow}>
                <Ionicons name="time-outline" size={24} color={colors.tabActive} />
                <View style={{ marginLeft: 10, flexShrink: 1 }}>
                  <Text style={[styles.headerTitle, { fontSize: r.font.title }]}>
                    Historial de atenciones
                  </Text>
                  <Text style={[styles.headerHoy, { fontSize: r.font.subtitle }]}>
                    Atendidos hoy {fechaHoyTexto} : {atendidosHoy}
                  </Text>
                  <Text style={[styles.headerSub, { fontSize: r.font.small }]}>
                    Lo que va del año · {atendidosEsteAnio} en total
                    {mesElegido || diaElegido !== null || query.trim()
                      ? ` · filtro: ${filtrados.length}`
                      : ""}
                  </Text>
                </View>
              </View>

            </View>

            {/* Filtro por mes: se muestran los 12 del año, con datos o sin ellos */}
            <View>
              <Text style={styles.filtroTitulo}>Filtrar por mes</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsFila}
              >
                <Pressable
                  onPress={() => elegirMes(null)}
                  style={[styles.chip, mesElegido === null && styles.chipActivo]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: mesElegido === null }}
                >
                  <Text style={[styles.chipTexto, mesElegido === null && styles.chipTextoActivo]}>
                    Todos ({items.length})
                  </Text>
                </Pressable>

                {mesesDelAnio.map((clave) => {
                  const activo = mesElegido === clave;
                  const n = conteoPorMes[clave] ?? 0;
                  return (
                    <Pressable
                      key={clave}
                      onPress={() => elegirMes(activo ? null : clave)}
                      style={[
                        styles.chip,
                        n === 0 && styles.chipVacio,
                        activo && styles.chipActivo,
                      ]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: activo }}
                      accessibilityLabel={`${tituloMes(clave)}, ${n} atenciones`}
                    >
                      <Text
                        style={[
                          styles.chipTexto,
                          n === 0 && styles.chipTextoVacio,
                          activo && styles.chipTextoActivo,
                        ]}
                      >
                        {tituloMesCorto(clave)} ({n})
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Calendario del mes elegido: filtra por día */}
            {mesElegido && (
              <View>
                <Text style={styles.filtroTitulo}>
                  {diaElegido !== null
                    ? `${diaElegido} de ${tituloMes(mesElegido)} · ${filtrados.length} atenciones`
                    : `${tituloMes(mesElegido)} · elige un día`}
                </Text>
                <MonthCalendar
                  mes={mesElegido}
                  conteoPorDia={conteoPorDia}
                  diaElegido={diaElegido}
                  onElegirDia={setDiaElegido}
                />
              </View>
            )}

            {/* Buscador */}
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                placeholder="Buscar por nombre o identidad..."
                value={query}
                onChangeText={setQuery}
                style={[styles.searchInput, { fontSize: r.font.body }]}
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="folder-open-outline" size={22} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, marginTop: 8, textAlign: "center" }}>
              {query || mesElegido
                ? "No hay atenciones que coincidan con el filtro."
                : "Aún no hay pacientes atendidos."}
            </Text>
          </View>
        }
        renderItem={({ item: fila }) => {
          if (fila.tipo === "mes") {
            return (
              <View style={styles.mesCabecera}>
                <Ionicons name="calendar-outline" size={16} color={colors.tabActive} />
                <Text style={[styles.mesTitulo, { fontSize: r.font.subtitle }]}>{fila.titulo}</Text>
                <View style={styles.mesContador}>
                  <Text style={styles.mesContadorTexto}>
                    {fila.total} {fila.total === 1 ? "paciente" : "pacientes"}
                  </Text>
                </View>
                {fila.esperaMedia > 0 && (
                  <Text style={[styles.mesEspera, { fontSize: r.font.small }]}>
                    espera media {fmtMs(fila.esperaMedia)}
                  </Text>
                )}
              </View>
            );
          }
          return (
            <View style={[styles.filaTarjetas, { gap: r.gap }]}>
              {fila.items.map(renderTarjeta)}
            </View>
          );
        }}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const crearEstilos = (colors: Palette) =>
  StyleSheet.create({
    headerCard: {
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
    },
    headerCardWide: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    headerCardNarrow: { flexDirection: "column", alignItems: "stretch" },
    headerTitleRow: { flexDirection: "row", alignItems: "center", flexShrink: 1 },
    headerTitle: { fontWeight: "800", color: colors.text },
    // La cifra del dia es el dato principal: se resalta sobre el resto.
    headerHoy: { fontWeight: "800", color: colors.tabActive, marginTop: 2 },
    headerSub: { color: colors.textMuted, marginTop: 1 },

    // --- Filtro de meses ---
    filtroTitulo: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: "700",
      marginBottom: 6,
    },
    chipsFila: { flexDirection: "row", gap: 8, paddingRight: 8 },
    chip: {
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    chipActivo: { backgroundColor: colors.tabActive, borderColor: colors.tabActive },
    // Meses sin atenciones: siguen visibles pero apagados.
    chipVacio: { backgroundColor: "transparent", borderStyle: "dashed" },
    chipTextoVacio: { color: colors.textMuted, fontWeight: "600" },
    chipTexto: { color: colors.text, fontWeight: "700", fontSize: 12 },
    chipTextoActivo: { color: "#fff" },

    searchBox: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
    },
    searchInput: { flex: 1, color: colors.text },

    empty: { padding: 28, alignItems: "center" },

    // --- Cabecera de cada mes ---
    mesCabecera: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 8,
      paddingTop: 6,
      paddingBottom: 2,
    },
    mesTitulo: { fontWeight: "800", color: colors.text },
    mesContador: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    mesContadorTexto: { color: colors.textMuted, fontSize: 11, fontWeight: "700" },
    mesEspera: { color: colors.textMuted, marginLeft: "auto" },

    filaTarjetas: { flexDirection: "row", alignItems: "flex-start" },

    card: {
      padding: 14,
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOpacity: colors.shadowOpacity,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 8,
      elevation: 2,
    },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
    name: { fontWeight: "700", color: colors.text, flexShrink: 1 },
    meta: { color: colors.textMuted, marginTop: 2 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, flexDirection: "row", alignItems: "center" },
    badgeText: { color: "#fff", fontWeight: "800" },
  });
