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
  Pressable
} from "react-native";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { Patient } from "../models/Patient";
import { v4 as uuidv4 } from "uuid";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../theme/colors";

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
    };

    await onAddPatient(nuevoPaciente);

    // limpiar
    setNombre("");
    setFechaNacimiento("");
    setSintomas("");
    setUrgencia(3);

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

        {/* Urgencia (chips) */}
        <View style={styles.field}>
          <Text style={styles.label}>Nivel de urgencia</Text>
          <View style={styles.chipsRow} accessible accessibilityRole="radiogroup">
            {[1, 2, 3].map((p) => {
              const active = urgencia === p;
              return (
                <Pressable
                  key={p}
                  onPress={() => setUrgencia(p as 1 | 2 | 3)}
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
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    backgroundColor: "#fff",
  },
  chipText: { fontWeight: "700", color: COLORS.text },

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
