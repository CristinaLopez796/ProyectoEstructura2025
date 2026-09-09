import 'react-native-get-random-values';
import React, { useMemo, useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Alert,
  Text,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Pressable,
  Switch,
} from "react-native";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { Patient } from "../models/Patient";
import { v4 as uuidv4 } from "uuid";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../theme/colors";
import {
  predecirUrgencia,
  SINTOMAS_PRINCIPALES,
  SintomaPrincipal,
} from "../utils/priorityPrediction";

interface Props {
  onAddPatient: (patient: Patient) => void | Promise<void>;
}

const MAX_SINTOMAS = 240;

// Helpers
const isNonEmpty = (s: string) => s.trim().length > 0;
const onlyDigits = (s: string) => s.replace(/[^\d]/g, "");

// formatea progresivamente a DD/MM/AAAA
function maskDDMMYYYY(input: string) {
  const d = onlyDigits(input).slice(0, 8);
  const parts = [];
  if (d.length >= 2) parts.push(d.slice(0, 2));
  if (d.length >= 4) parts.push(d.slice(2, 4));
  if (d.length > 4) parts.push(d.slice(4));
  if (parts.length === 0) return d;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]}/${parts[1]}`;
  return `${parts[0]}/${parts[1]}/${parts[2]}`;
}

function edadDesdeFecha(ddmmyyyy: string): number | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(ddmmyyyy.trim());
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const nacimiento = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (Number.isNaN(nacimiento.getTime())) return null;
  const edadMs = Date.now() - nacimiento.getTime();
  return Math.floor(edadMs / (1000 * 60 * 60 * 24 * 365.25));
}

function prioridadColor(p: 1 | 2 | 3) {
  if (p === 1) return COLORS.priority.p1;
  if (p === 2) return COLORS.priority.p2;
  return COLORS.priority.p3;
}

export default function PatientForm({ onAddPatient }: Props) {
  const navigation = useNavigation();

  const [nombre, setNombre] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [sintomas, setSintomas] = useState("");
  const [urgencia, setUrgencia] = useState<1 | 2 | 3>(3);

  // --- Campos clínicos usados por el componente de Ciencia de Datos ---
  const [sintomaPrincipal, setSintomaPrincipal] = useState<SintomaPrincipal | null>(null);
  const [nivelDolor, setNivelDolor] = useState<1 | 2 | 3 | null>(null);
  const [dificultadRespiratoria, setDificultadRespiratoria] = useState(false);
  const [temperatura, setTemperatura] = useState("");
  const [frecuenciaCardiaca, setFrecuenciaCardiaca] = useState("");
  const [sugerenciaAplicada, setSugerenciaAplicada] = useState(false);

  // errores en vivo
  const nombreError = useMemo(
    () => (nombre.trim().length === 0 ? "El nombre es obligatorio." : ""),
    [nombre]
  );
  const sintomasError = useMemo(
    () => (sintomas.trim().length === 0 ? "Los síntomas son obligatorios." : ""),
    [sintomas]
  );
  const fechaError = useMemo(() => {
    if (!fechaNacimiento.trim()) return "";
    return /^\d{2}\/\d{2}\/\d{4}$/.test(fechaNacimiento) ? "" : "Usa DD/MM/AAAA.";
  }, [fechaNacimiento]);

  const sintomasCount = `${sintomas.length}/${MAX_SINTOMAS}`;

  // --- Predicción de prioridad (componente de Ciencia de Datos) ---
  const temperaturaNum = parseFloat(temperatura.replace(",", "."));
  const frecuenciaCardiacaNum = parseInt(onlyDigits(frecuenciaCardiaca), 10);
  const edadEstimada = edadDesdeFecha(fechaNacimiento) ?? 30;

  const datosSuficientes =
    !!sintomaPrincipal &&
    !!nivelDolor &&
    !Number.isNaN(temperaturaNum) &&
    !Number.isNaN(frecuenciaCardiacaNum);

  const prediccion = useMemo(() => {
    if (!datosSuficientes) return null;
    return predecirUrgencia({
      edad: edadEstimada,
      sintomaPrincipal: sintomaPrincipal as SintomaPrincipal,
      nivelDolor: nivelDolor as 1 | 2 | 3,
      dificultadRespiratoria,
      temperatura: temperaturaNum,
      frecuenciaCardiaca: frecuenciaCardiacaNum,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    datosSuficientes,
    edadEstimada,
    sintomaPrincipal,
    nivelDolor,
    dificultadRespiratoria,
    temperaturaNum,
    frecuenciaCardiacaNum,
  ]);

  const usarSugerencia = () => {
    if (!prediccion) return;
    setUrgencia(prediccion.urgencia);
    setSugerenciaAplicada(true);
  };

  const handleSubmit = async () => {
    // validaciones
    if (!isNonEmpty(nombre) || !isNonEmpty(sintomas)) {
      Alert.alert("Validación", "El nombre y los síntomas son obligatorios.");
      return;
    }
    if (![1, 2, 3].includes(urgencia)) {
      Alert.alert("Validación", "La urgencia debe ser 1, 2 o 3.");
      return;
    }
    if (fechaNacimiento && !/^\d{2}\/\d{2}\/\d{4}$/.test(fechaNacimiento)) {
      Alert.alert("Validación", "Usa formato de fecha DD/MM/AAAA.");
      return;
    }

    // construir paciente
    const id = uuidv4();
    const expediente = `EXP-${uuidv4().slice(0, 8).toUpperCase()}`;

    const nuevoPaciente: Patient = {
      id,
      nombre: nombre.trim(),
      fechaNacimiento: fechaNacimiento.trim(), // guardas como DD/MM/AAAA (tu preferencia)
      sintomas: sintomas.trim(),
      urgencia,
      expediente,
      queuedAt: Date.now(),
      sintomaPrincipal: sintomaPrincipal ?? undefined,
      nivelDolor: nivelDolor ?? undefined,
      dificultadRespiratoria,
      temperatura: Number.isNaN(temperaturaNum) ? undefined : temperaturaNum,
      frecuenciaCardiaca: Number.isNaN(frecuenciaCardiacaNum) ? undefined : frecuenciaCardiacaNum,
      prediccionUrgencia: prediccion?.urgencia,
      prediccionConfianza: prediccion?.confianza,
    };

    await onAddPatient(nuevoPaciente);

    // limpiar
    setNombre("");
    setFechaNacimiento("");
    setSintomas("");
    setUrgencia(3);
    setSintomaPrincipal(null);
    setNivelDolor(null);
    setDificultadRespiratoria(false);
    setTemperatura("");
    setFrecuenciaCardiaca("");
    setSugerenciaAplicada(false);

    // navegar
    Alert.alert("Éxito", "Paciente registrado en la lista de espera.", [
      {
        text: "OK",
        onPress: () => {
          navigation.dispatch(CommonActions.navigate({ name: "Lista" as never }));
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Encabezado bonito */}
        <View style={styles.headerCard} accessible accessibilityRole="summary">
          <Ionicons name="medkit-outline" size={26} color={COLORS.tabActive} />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.headerTitle}>Registro de Paciente</Text>
            <Text style={styles.headerSub}>Completa la información para encolar por prioridad</Text>
          </View>
        </View>

        {/* Campo: Nombre */}
        <View style={styles.field}>
          <Text style={styles.label}>Nombre completo*</Text>
          <TextInput
            placeholder="Ej. María Fernanda López"
            value={nombre}
            onChangeText={setNombre}
            style={[styles.input, nombreError ? styles.inputError : null]}
            returnKeyType="next"
            accessibilityLabel="Nombre completo"
          />
          <View style={styles.helpRow}>
            <Ionicons
              name={nombreError ? "alert-circle" : "information-circle-outline"}
              size={14}
              color={nombreError ? "#ef4444" : COLORS.textMuted}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.help, nombreError ? styles.helpError : null]}>
              {nombreError || "Nombre y apellidos del paciente."}
            </Text>
          </View>
        </View>

        {/* Campo: Fecha de nacimiento */}
        <View style={styles.field}>
          <Text style={styles.label}>Fecha de nacimiento (DD/MM/AAAA)</Text>
          <TextInput
            placeholder="DD/MM/AAAA"
            value={fechaNacimiento}
            onChangeText={(t) => setFechaNacimiento(maskDDMMYYYY(t))}
            style={[styles.input, fechaError ? styles.inputError : null]}
            returnKeyType="next"
            keyboardType="number-pad"
            accessibilityLabel="Fecha de nacimiento en formato día mes año"
          />
          {!!fechaError ? (
            <View style={styles.helpRow}>
              <Ionicons name="alert-circle" size={14} color="#ef4444" style={{ marginRight: 4 }} />
              <Text style={[styles.help, styles.helpError]}>{fechaError}</Text>
            </View>
          ) : (
            <View style={styles.helpRow}>
              <Ionicons name="calendar-outline" size={14} color={COLORS.textMuted} style={{ marginRight: 4 }} />
              <Text style={styles.help}>Ejemplo: 05/09/1994</Text>
            </View>
          )}
        </View>

        {/* Campo: Síntomas */}
        <View style={styles.field}>
          <Text style={styles.label}>Síntomas*</Text>
          <TextInput
            placeholder="Describe los síntomas principales…"
            value={sintomas}
            onChangeText={(t) => setSintomas(t.slice(0, MAX_SINTOMAS))}
            style={[styles.input, styles.textArea, sintomasError ? styles.inputError : null]}
            multiline
            accessibilityLabel="Síntomas del paciente"
          />
          <View style={styles.helpRowBetween}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name={sintomasError ? "alert-circle" : "create-outline"}
                size={14}
                color={sintomasError ? "#ef4444" : COLORS.textMuted}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.help, sintomasError ? styles.helpError : null]}>
                {sintomasError || "Máximo 240 caracteres."}
              </Text>
            </View>
            <Text style={styles.counter}>{sintomasCount}</Text>
          </View>
        </View>

        {/* --- Sección: signos clínicos para la predicción de IA --- */}
        <View style={styles.aiSectionHeader}>
          <Ionicons name="sparkles-outline" size={16} color={COLORS.tabActive} />
          <Text style={styles.aiSectionTitle}>Signos para la prioridad sugerida (opcional)</Text>
        </View>
        <Text style={styles.help}>
          Completa estos datos para que SmartTriage te sugiera una prioridad basada en el
          modelo de Ciencia de Datos. Es solo una recomendación: tú decides la urgencia final.
        </Text>

        {/* Síntoma principal */}
        <View style={styles.field}>
          <Text style={styles.label}>Síntoma principal</Text>
          <View style={styles.wrapChipsRow}>
            {SINTOMAS_PRINCIPALES.map((s) => {
              const active = sintomaPrincipal === s.value;
              return (
                <Pressable
                  key={s.value}
                  onPress={() => setSintomaPrincipal(s.value)}
                  style={[styles.chipSmall, active && styles.chipSmallActive]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.chipSmallText, active && styles.chipSmallTextActive]}>
                    {s.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Nivel de dolor */}
        <View style={styles.field}>
          <Text style={styles.label}>Nivel de dolor</Text>
          <View style={styles.chipsRow}>
            {[1, 2, 3].map((n) => {
              const active = nivelDolor === n;
              const texto = n === 1 ? "Bajo" : n === 2 ? "Medio" : "Alto";
              return (
                <Pressable
                  key={n}
                  onPress={() => setNivelDolor(n as 1 | 2 | 3)}
                  style={[styles.chip, active && { backgroundColor: COLORS.tabActive, borderColor: COLORS.tabActive }]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.chipText, active && { color: "#fff" }]}>{texto}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Dificultad respiratoria */}
        <View style={[styles.field, styles.switchRow]}>
          <Text style={styles.label}>¿Dificultad respiratoria?</Text>
          <Switch value={dificultadRespiratoria} onValueChange={setDificultadRespiratoria} />
        </View>

        {/* Temperatura y frecuencia cardiaca */}
        <View style={styles.rowFields}>
          <View style={[styles.field, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Temperatura (°C)</Text>
            <TextInput
              placeholder="Ej. 37.5"
              value={temperatura}
              onChangeText={setTemperatura}
              keyboardType="decimal-pad"
              style={styles.input}
            />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Frec. cardíaca (lpm)</Text>
            <TextInput
              placeholder="Ej. 90"
              value={frecuenciaCardiaca}
              onChangeText={setFrecuenciaCardiaca}
              keyboardType="number-pad"
              style={styles.input}
            />
          </View>
        </View>

        {/* Panel de sugerencia */}
        {prediccion && (
          <View style={[styles.aiCard, { borderColor: prioridadColor(prediccion.urgencia) }]}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
              <Ionicons name="sparkles" size={16} color={prioridadColor(prediccion.urgencia)} />
              <Text style={[styles.aiCardTitle, { color: prioridadColor(prediccion.urgencia) }]}>
                {" "}Prioridad sugerida: {prediccion.urgencia === 1 ? "Alta" : prediccion.urgencia === 2 ? "Media" : "Baja"}
              </Text>
            </View>
            <Text style={styles.help}>
              Confianza aproximada: {Math.round(prediccion.confianza * 100)}% ·{" "}
              {prediccion.explicacion.join(", ")}
            </Text>
            <Pressable onPress={usarSugerencia} style={styles.useSuggestionBtn}>
              <Text style={styles.useSuggestionText}>
                {sugerenciaAplicada && urgencia === prediccion.urgencia ? "Sugerencia aplicada ✓" : "Usar esta sugerencia"}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Urgencia (chips) */}
        <View style={styles.field}>
          <Text style={styles.label}>Nivel de urgencia (decisión final)</Text>
          <View style={styles.chipsRow} accessible accessibilityRole="radiogroup">
            {[1, 2, 3].map((p) => {
              const active = urgencia === p;
              return (
                <Pressable
                  key={p}
                  onPress={() => {
                    setUrgencia(p as 1 | 2 | 3);
                    setSugerenciaAplicada(false);
                  }}
                  style={[
                    styles.chip,
                    { borderColor: prioridadColor(p as 1 | 2 | 3) },
                    active && { backgroundColor: prioridadColor(p as 1 | 2 | 3) },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Prioridad ${p}`}
                >
                  <Ionicons
                    name={p === 1 ? "alert" : p === 2 ? "warning-outline" : "leaf-outline"}
                    size={14}
                    color={active ? "#fff" : prioridadColor(p as 1 | 2 | 3)}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.chipText, active && { color: "#fff" }]}>
                    {p === 1 ? "Alta (1)" : p === 2 ? "Media (2)" : "Baja (3)"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.helpRow}>
            <Ionicons name="speedometer-outline" size={14} color={COLORS.textMuted} style={{ marginRight: 4 }} />
            <Text style={styles.help}>La cola prioriza Alta &gt; Media &gt; Baja y, si empatan, el más antiguo.</Text>
          </View>
        </View>

        {/* Botón submit */}
        <Pressable onPress={handleSubmit} style={styles.primaryBtn} accessibilityRole="button">
          <Ionicons name="save-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.primaryBtnText}>Registrar paciente</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 14 },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  headerTitle: { fontSize: 16, fontWeight: "800", color: COLORS.text },
  headerSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },

  field: { marginBottom: 12 },
  label: { fontWeight: "700", marginBottom: 6, color: COLORS.text },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    color: COLORS.text,
  },
  textArea: { minHeight: 96, textAlignVertical: "top" },
  inputError: { borderColor: "#ef4444" },

  helpRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  helpRowBetween: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  help: { color: COLORS.textMuted, fontSize: 12 },
  helpError: { color: "#ef4444" },
  counter: { color: COLORS.textMuted, fontSize: 12, fontVariant: ["tabular-nums"] },

  chipsRow: { flexDirection: "row", gap: 8 },
  wrapChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    backgroundColor: "#fff",
    borderColor: COLORS.border,
  },
  chipText: { fontWeight: "700", color: COLORS.text },

  chipSmall: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: "#fff",
  },
  chipSmallActive: { backgroundColor: COLORS.tabActive, borderColor: COLORS.tabActive },
  chipSmallText: { fontSize: 12, fontWeight: "600", color: COLORS.text },
  chipSmallTextActive: { color: "#fff" },

  aiSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 4,
  },
  aiSectionTitle: { fontWeight: "800", color: COLORS.text, marginLeft: 6 },

  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowFields: { flexDirection: "row" },

  aiCard: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  aiCardTitle: { fontWeight: "800", fontSize: 14 },
  useSuggestionBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  useSuggestionText: { fontWeight: "700", color: COLORS.text, fontSize: 12 },

  primaryBtn: {
    marginTop: 6,
    backgroundColor: COLORS.tabActive,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
