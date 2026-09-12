import 'react-native-get-random-values';
import React, { useMemo, useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  Pressable,
  Switch,
} from "react-native";
import { showAlert } from "../utils/alert";
import { edadDesdeFecha } from "../utils/datetime";
import { RANGO_TEMPERATURA, RANGO_FRECUENCIA } from "../utils/patientRepository";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { Patient } from "../models/Patient";
import { v4 as uuidv4 } from "uuid";
import { Ionicons } from "@expo/vector-icons";
import { Palette } from "../theme/colors";
import { useTheme } from "../theme/ThemeContext";
import { useResponsive } from "../theme/responsive";
import ResponsiveScreen from "./ResponsiveScreen";
import DateField from "./DateField";
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

/** Numero de identidad: 13 digitos con el formato 0000-0000-00000. */
const IDENTIDAD_DIGITOS = 13;

/** Va formateando mientras se escribe, sin estorbar al borrar. */
function maskIdentidad(input: string) {
  const d = onlyDigits(input).slice(0, IDENTIDAD_DIGITOS);
  if (d.length <= 4) return d;
  if (d.length <= 8) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 4)}-${d.slice(4, 8)}-${d.slice(8)}`;
}

function prioridadColor(p: 1 | 2 | 3, colors: Palette) {
  if (p === 1) return colors.priority.p1;
  if (p === 2) return colors.priority.p2;
  return colors.priority.p3;
}

type Estilos = ReturnType<typeof crearEstilos>;

/** Línea de ayuda / error debajo de un campo. */
function FieldHint({
  error,
  hint,
  ok,
  styles,
  colors,
}: {
  error?: string;
  hint: string;
  ok?: boolean;
  styles: Estilos;
  colors: Palette;
}) {
  return (
    <View style={styles.helpRow}>
      <Ionicons
        name={error ? "alert-circle" : ok ? "checkmark-circle" : "information-circle-outline"}
        size={14}
        color={error ? colors.danger : ok ? colors.priority.p3 : colors.textMuted}
        style={{ marginRight: 4 }}
      />
      <Text style={[styles.help, error ? styles.helpError : null]}>{error || hint}</Text>
    </View>
  );
}

/** Cabecera de sección con icono y título. */
function SectionHeader({
  icon,
  title,
  badge,
  styles,
  colors,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  badge?: string;
  styles: Estilos;
  colors: Palette;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={16} color={colors.tabActive} />
      <Text style={styles.sectionTitle}>{title}</Text>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function PatientForm({ onAddPatient }: Props) {
  const navigation = useNavigation();
  const r = useResponsive();
  const { colors } = useTheme();
  const styles = useMemo(() => crearEstilos(colors), [colors]);

  // A partir de tablet los campos cortos comparten fila; en móvil se apilan.
  // `flexBasis` deja que flex-wrap decida, así no hay saltos bruscos.
  const halfField = r.isWide
    ? { flexGrow: 1, flexShrink: 1, flexBasis: 260 }
    : { flexGrow: 1, flexShrink: 1, flexBasis: "100%" as const };

  const [nombre, setNombre] = useState("");
  const [numeroIdentidad, setNumeroIdentidad] = useState("");
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

  // Los mensajes de "campo obligatorio" solo se muestran una vez que la usuaria
  // intenta registrar: asi el formulario recien abierto no aparece lleno de rojo.
  const [intentoEnviar, setIntentoEnviar] = useState(false);

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
    if (!fechaNacimiento.trim()) return "La fecha de nacimiento es obligatoria.";
    return /^\d{2}\/\d{2}\/\d{4}$/.test(fechaNacimiento) ? "" : "Usa DD/MM/AAAA.";
  }, [fechaNacimiento]);

  // Los signos clinicos son obligatorios: son las variables que usa el modelo
  // de Ciencia de Datos, y si no se capturan aqui quedan NULL para siempre en
  // appointment_history (no hay forma de recuperarlos despues).
  const sintomaPrincipalError = sintomaPrincipal ? "" : "Elige el síntoma principal.";
  const nivelDolorError = nivelDolor ? "" : "Indica el nivel de dolor.";
  const temperaturaVacia = !temperatura.trim() ? "La temperatura es obligatoria." : "";
  const frecuenciaVacia = !frecuenciaCardiaca.trim() ? "La frecuencia cardíaca es obligatoria." : "";

  const identidadError = useMemo(() => {
    const d = onlyDigits(numeroIdentidad);
    if (d.length === 0) return "El número de identidad es obligatorio.";
    return d.length === IDENTIDAD_DIGITOS
      ? ""
      : `Debe tener ${IDENTIDAD_DIGITOS} dígitos (llevas ${d.length}).`;
  }, [numeroIdentidad]);

  // Version "visible" de cada error: se activa tras el primer intento de envio.
  const verIdentidadError = intentoEnviar && !!identidadError;
  const verNombreError = intentoEnviar && !!nombreError;
  const verSintomasError = intentoEnviar && !!sintomasError;
  const verFechaError = intentoEnviar && !!fechaError;
  const verSintomaPrincipalError = intentoEnviar && !!sintomaPrincipalError;
  const verNivelDolorError = intentoEnviar && !!nivelDolorError;

  const sintomasCount = `${sintomas.length}/${MAX_SINTOMAS}`;

  // Se muestra junto a la fecha elegida como confirmación de que es la correcta.
  const edadCalculada = edadDesdeFecha(fechaNacimiento);
  const edadEstimadaTexto =
    edadCalculada !== null && edadCalculada >= 0 ? ` · ${edadCalculada} años` : "";

  // --- Predicción de prioridad (componente de Ciencia de Datos) ---
  const temperaturaNum = parseFloat(temperatura.replace(",", "."));
  const frecuenciaCardiacaNum = parseInt(onlyDigits(frecuenciaCardiaca), 10);
  const edadEstimada = edadDesdeFecha(fechaNacimiento) ?? 30;

  // Estos rangos son los mismos que exigen los CHECK de appointment_history.
  // Se validan aqui, al registrar, porque si no el error aparecia mucho despues
  // —al pulsar "Atender"— y con un mensaje de PostgreSQL incomprensible.
  const temperaturaError = useMemo(() => {
    if (!temperatura.trim() || Number.isNaN(temperaturaNum)) return "";
    return temperaturaNum >= RANGO_TEMPERATURA.min && temperaturaNum <= RANGO_TEMPERATURA.max
      ? ""
      : `La temperatura debe estar entre ${RANGO_TEMPERATURA.min} y ${RANGO_TEMPERATURA.max} °C.`;
  }, [temperatura, temperaturaNum]);

  const frecuenciaError = useMemo(() => {
    if (!frecuenciaCardiaca.trim() || Number.isNaN(frecuenciaCardiacaNum)) return "";
    return frecuenciaCardiacaNum >= RANGO_FRECUENCIA.min &&
      frecuenciaCardiacaNum <= RANGO_FRECUENCIA.max
      ? ""
      : `La frecuencia debe estar entre ${RANGO_FRECUENCIA.min} y ${RANGO_FRECUENCIA.max} lpm.`;
  }, [frecuenciaCardiaca, frecuenciaCardiacaNum]);

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
    setIntentoEnviar(true);

    // validaciones
    if (identidadError) {
      showAlert("Validación", identidadError);
      return;
    }
    if (!isNonEmpty(nombre) || !isNonEmpty(sintomas)) {
      showAlert("Validación", "El nombre y los síntomas son obligatorios.");
      return;
    }
    if (![1, 2, 3].includes(urgencia)) {
      showAlert("Validación", "La urgencia debe ser 1, 2 o 3.");
      return;
    }
    if (!isNonEmpty(fechaNacimiento)) {
      showAlert("Validación", "La fecha de nacimiento es obligatoria.");
      return;
    }
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(fechaNacimiento)) {
      showAlert("Validación", "Usa formato de fecha DD/MM/AAAA.");
      return;
    }
    // Signos clinicos: obligatorios para que el historial sirva como dataset.
    const faltaClinico =
      sintomaPrincipalError || nivelDolorError || temperaturaVacia || frecuenciaVacia;
    if (faltaClinico) {
      showAlert(
        "Faltan signos clínicos",
        `${faltaClinico}\n\nEstos datos se guardan en el historial para el análisis de Ciencia de Datos.`
      );
      return;
    }
    if (temperaturaError || frecuenciaError) {
      showAlert("Validación", temperaturaError || frecuenciaError);
      return;
    }

    // construir paciente
    const id = uuidv4();
    const expediente = `EXP-${uuidv4().slice(0, 8).toUpperCase()}`;

    const nuevoPaciente: Patient = {
      id,
      nombre: nombre.trim(),
      numeroIdentidad: numeroIdentidad.trim(),
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

    // Si el guardado en Supabase falla, HomeScreen ya muestra el error y
    // relanza: aqui se corta para no limpiar el formulario ni navegar, y que
    // no se pierda lo que la usuaria escribio.
    try {
      await onAddPatient(nuevoPaciente);
    } catch {
      return;
    }

    // limpiar
    setNombre("");
    setNumeroIdentidad("");
    setFechaNacimiento("");
    setSintomas("");
    setUrgencia(3);
    setSintomaPrincipal(null);
    setNivelDolor(null);
    setDificultadRespiratoria(false);
    setTemperatura("");
    setFrecuenciaCardiaca("");
    setSugerenciaAplicada(false);
    setIntentoEnviar(false);

    // navegar
    showAlert("Éxito", "Paciente registrado en la lista de espera.", [
      {
        text: "OK",
        onPress: () => {
          navigation.dispatch(CommonActions.navigate({ name: "Lista" as never }));
        },
      },
    ]);
  };

  const sugAplicada = !!prediccion && sugerenciaAplicada && urgencia === prediccion.urgencia;

  return (
    <ResponsiveScreen scroll avoidKeyboard maxWidth={r.pick({ xs: 9999, md: 720, lg: 880 })}>
      {/* Encabezado */}
      <View style={styles.headerCard} accessible accessibilityRole="summary">
        <View style={styles.headerIcon}>
          <Ionicons name="medkit" size={r.isWide ? 24 : 20} color="#fff" />
        </View>
        <View style={{ marginLeft: 12, flexShrink: 1 }}>
          <Text style={[styles.headerTitle, { fontSize: r.font.title }]}>Registro de paciente</Text>
          <Text style={[styles.headerSub, { fontSize: r.font.small }]}>
            Completa la información para encolar por prioridad
          </Text>
        </View>
      </View>

      {/* --- Datos del paciente --- */}
      <View style={styles.card}>
        <SectionHeader icon="person-outline" title="Datos del paciente" styles={styles} colors={colors} />

        <View style={styles.rowFields}>
          {/* Nombre */}
          <View style={[styles.field, halfField]}>
            <Text style={styles.label}>Nombre completo *</Text>
            <TextInput
              placeholder="Ej. María Fernanda López"
              placeholderTextColor={colors.textMuted}
              value={nombre}
              onChangeText={setNombre}
              style={[styles.input, verNombreError && styles.inputError]}
              returnKeyType="next"
              accessibilityLabel="Nombre completo"
            />
            <FieldHint
              error={verNombreError ? nombreError : ""}
              hint="Nombre y apellidos del paciente."
              styles={styles}
              colors={colors}
            />
          </View>

          {/* Número de identidad */}
          <View style={[styles.field, halfField]}>
            <Text style={styles.label}>Número de identidad *</Text>
            <TextInput
              placeholder="0000-0000-00000"
              placeholderTextColor={colors.textMuted}
              value={numeroIdentidad}
              onChangeText={(t) => setNumeroIdentidad(maskIdentidad(t))}
              keyboardType="number-pad"
              style={[styles.input, verIdentidadError && styles.inputError]}
              returnKeyType="next"
              accessibilityLabel="Número de identidad del paciente"
            />
            <FieldHint
              error={verIdentidadError ? identidadError : ""}
              ok={!identidadError && !!numeroIdentidad}
              hint="13 dígitos. Sirve para buscar al paciente en el historial."
              styles={styles}
              colors={colors}
            />
          </View>
        </View>

        <View style={styles.rowFields}>
          {/* Fecha de nacimiento */}
          <View style={[styles.field, halfField]}>
            <Text style={styles.label}>Fecha de nacimiento *</Text>
            <DateField value={fechaNacimiento} onChange={setFechaNacimiento} />
            <FieldHint
              error={verFechaError ? fechaError : ""}
              ok={!!fechaNacimiento}
              hint={
                fechaNacimiento
                  ? `${fechaNacimiento}${edadEstimadaTexto}`
                  : "Elige día, mes y año."
              }
              styles={styles}
              colors={colors}
            />
          </View>
        </View>

        {/* Síntomas */}
        <View style={styles.field}>
          <Text style={styles.label}>Síntomas *</Text>
          <TextInput
            placeholder="Describe los síntomas principales…"
            placeholderTextColor={colors.textMuted}
            value={sintomas}
            onChangeText={(t) => setSintomas(t.slice(0, MAX_SINTOMAS))}
            style={[styles.input, styles.textArea, verSintomasError && styles.inputError]}
            multiline
            accessibilityLabel="Síntomas del paciente"
          />
          <View style={styles.helpRowBetween}>
            <FieldHint
              error={verSintomasError ? sintomasError : ""}
              hint={`Máximo ${MAX_SINTOMAS} caracteres.`}
              styles={styles}
              colors={colors}
            />
            <Text style={styles.counter}>{sintomasCount}</Text>
          </View>
        </View>
      </View>

      {/* --- Signos clínicos para la prioridad sugerida --- */}
      <View style={styles.card}>
        <SectionHeader
          icon="sparkles-outline"
          title="Signos clínicos"
          badge="Obligatorio"
          styles={styles}
          colors={colors}
        />
        <Text style={styles.sectionHint}>
          Estos datos alimentan el modelo de Ciencia de Datos y quedan guardados en el
          historial. Son obligatorios: sin ellos el registro del paciente queda incompleto
          para el análisis.
        </Text>

        {/* Síntoma principal */}
        <View style={styles.field}>
          <Text style={styles.label}>Síntoma principal*</Text>
          <View style={styles.wrapChipsRow}>
            {SINTOMAS_PRINCIPALES.map((s) => {
              const active = sintomaPrincipal === s.value;
              return (
                <Pressable
                  key={s.value}
                  onPress={() => setSintomaPrincipal(active ? null : s.value)}
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
          <FieldHint
            error={verSintomaPrincipalError ? sintomaPrincipalError : ""}
            hint="Elige el motivo principal de la consulta."
            ok={!!sintomaPrincipal}
            styles={styles}
            colors={colors}
          />
        </View>

        {/* Nivel de dolor */}
        <View style={styles.field}>
          <Text style={styles.label}>Nivel de dolor*</Text>
          <View style={styles.chipsRow}>
            {[1, 2, 3].map((n) => {
              const active = nivelDolor === n;
              const texto = n === 1 ? "Bajo" : n === 2 ? "Medio" : "Alto";
              return (
                <Pressable
                  key={n}
                  onPress={() => setNivelDolor(active ? null : (n as 1 | 2 | 3))}
                  style={[styles.chip, active && styles.chipActive]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{texto}</Text>
                </Pressable>
              );
            })}
          </View>
          <FieldHint
            error={verNivelDolorError ? nivelDolorError : ""}
            hint="Bajo, Medio o Alto."
            ok={!!nivelDolor}
            styles={styles}
            colors={colors}
          />
        </View>

        {/* Dificultad respiratoria */}
        <View style={[styles.field, styles.switchRow]}>
          <Text style={styles.label}>¿Dificultad respiratoria?</Text>
          <Switch
            value={dificultadRespiratoria}
            onValueChange={setDificultadRespiratoria}
            trackColor={{ true: colors.tabActive, false: colors.border }}
          />
        </View>

        {/* Temperatura y frecuencia cardiaca */}
        <View style={styles.rowFields}>
          <View style={[styles.field, styles.halfMin]}>
            <Text style={styles.label}>Temperatura (°C)*</Text>
            <TextInput
              placeholder="Ej. 37.5"
              placeholderTextColor={colors.textMuted}
              value={temperatura}
              onChangeText={setTemperatura}
              keyboardType="decimal-pad"
              style={[
                styles.input,
                temperaturaError || (intentoEnviar && temperaturaVacia) ? styles.inputError : null,
              ]}
            />
            <FieldHint
              error={temperaturaError || (intentoEnviar ? temperaturaVacia : "")}
              hint={`Entre ${RANGO_TEMPERATURA.min} y ${RANGO_TEMPERATURA.max} °C.`}
              ok={!!temperatura.trim() && !temperaturaError}
              styles={styles}
              colors={colors}
            />
          </View>
          <View style={[styles.field, styles.halfMin]}>
            <Text style={styles.label}>Frec. cardíaca (lpm)*</Text>
            <TextInput
              placeholder="Ej. 90"
              placeholderTextColor={colors.textMuted}
              value={frecuenciaCardiaca}
              onChangeText={setFrecuenciaCardiaca}
              keyboardType="number-pad"
              style={[
                styles.input,
                frecuenciaError || (intentoEnviar && frecuenciaVacia) ? styles.inputError : null,
              ]}
            />
            <FieldHint
              error={frecuenciaError || (intentoEnviar ? frecuenciaVacia : "")}
              hint={`Entre ${RANGO_FRECUENCIA.min} y ${RANGO_FRECUENCIA.max} lpm.`}
              ok={!!frecuenciaCardiaca.trim() && !frecuenciaError}
              styles={styles}
              colors={colors}
            />
          </View>
        </View>

        {/* Panel de sugerencia */}
        {prediccion && (
          <View style={[styles.aiCard, { borderColor: prioridadColor(prediccion.urgencia, colors) }]}>
            <View style={styles.aiCardHead}>
              <Ionicons name="sparkles" size={16} color={prioridadColor(prediccion.urgencia, colors)} />
              <Text style={[styles.aiCardTitle, { color: prioridadColor(prediccion.urgencia, colors) }]}>
                Prioridad sugerida:{" "}
                {prediccion.urgencia === 1 ? "Alta" : prediccion.urgencia === 2 ? "Media" : "Baja"}
              </Text>
            </View>
            <Text style={styles.help}>
              Confianza aproximada: {Math.round(prediccion.confianza * 100)}% ·{" "}
              {prediccion.explicacion.join(", ")}
            </Text>
            <Pressable
              onPress={usarSugerencia}
              style={[styles.useSuggestionBtn, sugAplicada && styles.useSuggestionBtnDone]}
            >
              <Ionicons
                name={sugAplicada ? "checkmark" : "arrow-down"}
                size={13}
                color={sugAplicada ? "#fff" : colors.text}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.useSuggestionText, sugAplicada && { color: "#fff" }]}>
                {sugAplicada ? "Sugerencia aplicada" : "Usar esta sugerencia"}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* --- Decisión final --- */}
      <View style={[styles.card, styles.cardFinal]}>
        <SectionHeader icon="flag-outline" title="Decisión final" styles={styles} colors={colors} />
        <Text style={styles.label}>Nivel de urgencia</Text>
        <View style={styles.chipsRow} accessible accessibilityRole="radiogroup">
          {[1, 2, 3].map((p) => {
            const active = urgencia === p;
            const color = prioridadColor(p as 1 | 2 | 3, colors);
            return (
              <Pressable
                key={p}
                onPress={() => {
                  setUrgencia(p as 1 | 2 | 3);
                  setSugerenciaAplicada(false);
                }}
                style={[
                  styles.chip,
                  { borderColor: color },
                  active && { backgroundColor: color, borderColor: color },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Prioridad ${p}`}
              >
                <Ionicons
                  name={p === 1 ? "alert" : p === 2 ? "warning-outline" : "leaf-outline"}
                  size={14}
                  color={active ? "#fff" : color}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {p === 1 ? "Alta (1)" : p === 2 ? "Media (2)" : "Baja (3)"}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.helpRow}>
          <Ionicons
            name="speedometer-outline"
            size={14}
            color={colors.textMuted}
            style={{ marginRight: 4 }}
          />
          <Text style={styles.help}>
            La cola prioriza Alta &gt; Media &gt; Baja y, si empatan, el más antiguo.
          </Text>
        </View>

        <Pressable
          onPress={handleSubmit}
          style={[styles.primaryBtn, r.isWide && styles.primaryBtnInline]}
          accessibilityRole="button"
        >
          <Ionicons name="save-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.primaryBtnText}>Registrar paciente</Text>
        </Pressable>
      </View>
    </ResponsiveScreen>
  );
}

const crearEstilos = (colors: Palette) =>
  StyleSheet.create({
    // ---- Encabezado ----
    headerCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 14,
    },
    headerIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.tabActive,
    },
    headerTitle: { fontWeight: "800", color: colors.text },
    headerSub: { color: colors.textMuted, marginTop: 2 },

    // ---- Tarjeta de sección ----
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 14,
    },
    cardFinal: { borderColor: colors.tabActive, borderWidth: 1.5 },

    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 12,
    },
    sectionTitle: { fontWeight: "800", color: colors.text, fontSize: 15 },
    sectionHint: {
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 17,
      marginTop: -4,
      marginBottom: 12,
    },
    badge: {
      marginLeft: "auto",
      backgroundColor: colors.surface,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: "800",
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },

    // ---- Campos ----
    field: { marginBottom: 12 },
    halfMin: { flexGrow: 1, flexShrink: 1, flexBasis: 150 },
    label: { fontWeight: "700", marginBottom: 6, color: colors.text, fontSize: 13 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.input,
      color: colors.text,
      fontSize: 14,
    },
    textArea: { minHeight: 96, textAlignVertical: "top" },
    inputError: { borderColor: colors.danger, borderWidth: 1.5 },

    helpRow: { flexDirection: "row", alignItems: "center", marginTop: 6, flexShrink: 1 },
    helpRowBetween: {
      marginTop: 6,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    help: { color: colors.textMuted, fontSize: 12, flexShrink: 1 },
    helpError: { color: colors.danger },
    counter: { color: colors.textMuted, fontSize: 12, fontVariant: ["tabular-nums"] },

    // ---- Chips ----
    chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    wrapChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 999,
      borderWidth: 1.5,
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    chipActive: { backgroundColor: colors.tabActive, borderColor: colors.tabActive },
    chipText: { fontWeight: "700", color: colors.text, fontSize: 13 },
    chipTextActive: { color: "#fff" },

    chipSmall: {
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    chipSmallActive: { backgroundColor: colors.tabActive, borderColor: colors.tabActive },
    chipSmallText: { fontSize: 12, fontWeight: "600", color: colors.text },
    chipSmallTextActive: { color: "#fff" },

    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    // Fila de campos que se convierte en columna cuando no hay ancho suficiente.
    rowFields: { flexDirection: "row", flexWrap: "wrap", columnGap: 12 },

    // ---- Tarjeta de sugerencia ----
    aiCard: {
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderRadius: 14,
      padding: 12,
      marginTop: 4,
    },
    aiCardHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
    aiCardTitle: { fontWeight: "800", fontSize: 14 },
    useSuggestionBtn: {
      marginTop: 10,
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    useSuggestionBtnDone: { backgroundColor: colors.priority.p3, borderColor: colors.priority.p3 },
    useSuggestionText: { fontWeight: "700", color: colors.text, fontSize: 12 },

    // ---- Botón principal ----
    primaryBtn: {
      marginTop: 14,
      backgroundColor: colors.tabActive,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      shadowColor: "#000",
      shadowOpacity: colors.shadowOpacity,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 8,
      elevation: 2,
    },
    primaryBtnInline: { alignSelf: "flex-start", paddingHorizontal: 28 },
    primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  });
