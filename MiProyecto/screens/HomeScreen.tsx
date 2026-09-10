import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ActivityIndicator, Pressable, StyleSheet } from "react-native";
import {
  NavigationContainer,
  DarkTheme as NavDarkTheme,
  DefaultTheme as NavDefaultTheme,
} from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import PatientForm from "../components/PatientForm";
import PatientList from "../components/PatientList";
import { Patient } from "../models/Patient";
import PriorityQueue from "./lib/priorityQueue";
import LinkedList from "./lib/linkedList";
import HistoryScreen, { HistoryItem } from "./HistoryScreen";
import Stack from "./lib/stack";
import StatsScreen from "./StatsScreen";
import SettingsScreen from "./SettingsScreen";
import { useResponsive } from "../theme/responsive";
import { showAlert } from "../utils/alert";
import { DARK, LIGHT } from "../theme/colors";
import { ThemeProvider } from "../theme/ThemeContext";
import { patientsRepo, historyRepo, settingsRepo } from "../utils/patientRepository";

type RootTabParamList = {
  Registrar: undefined;
  Lista: undefined;
  Historial: undefined;
  Estadísticas: undefined;
  Ajustes: undefined;
};
const Tab = createBottomTabNavigator<RootTabParamList>();

export default function HomeScreen({ onLogout }: { onLogout?: () => void }) {
  // -------- Layout responsive --------
  // En pantallas anchas la barra de pestañas pasa de abajo a un riel lateral.
  const r = useResponsive();
  const sideTabs = r.isDesktop;

  // -------- Estado de carga --------
  // Con Supabase los datos ya no están disponibles al instante como con
  // AsyncStorage: hay una petición de red de por medio.
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [isDark, setIsDark] = useState<boolean>(false);
  const paleta = isDark ? DARK : LIGHT;

  // El tema de React Navigation pinta la barra superior y la de pestañas.
  // Se le pasan los mismos colores que al resto de la app para que el modo
  // oscuro sea uniforme y no queden barras claras sobre fondo oscuro.
  const navTheme = useMemo(() => {
    const base = isDark ? NavDarkTheme : NavDefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: paleta.tabActive,
        background: paleta.bg,
        card: paleta.card,
        text: paleta.text,
        border: paleta.border,
      },
    };
  }, [isDark, paleta]);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [undoStack, setUndoStack] = useState<HistoryItem[]>([]);

  // Estructuras de datos: siguen siendo el motor de la app. Supabase solo
  // sustituye a AsyncStorage como lugar donde persisten los datos; el orden
  // de atención lo sigue decidiendo el heap, no la base.
  const pqRef = useRef(new PriorityQueue());
  const historyRef = useRef(new LinkedList<HistoryItem>());
  const stackRef = useRef(new Stack<HistoryItem>());

  // -------- Carga inicial desde Supabase --------
  const cargarTodo = useCallback(async () => {
    setCargando(true);
    setErrorCarga(null);
    try {
      // El modo oscuro es una preferencia, no datos: si falla, la app debe
      // abrir igual en claro. Solo la cola y el historial son bloqueantes.
      const [cola, hist] = await Promise.all([
        patientsRepo.list(),
        historyRepo.list(),
      ]);
      const dark = await settingsRepo.getDarkMode().catch(() => false);

      setPatients(cola);
      pqRef.current.rebuildFrom(cola);

      setHistory(hist);
      historyRef.current.rebuildFrom(hist);

      // La pila de deshacer es de la sesión actual: solo tiene sentido
      // deshacer lo que se atendió en este rato, no algo de la semana pasada.
      stackRef.current.rebuildFrom([]);
      setUndoStack([]);

      setIsDark(dark);
    } catch (e: any) {
      setErrorCarga(e?.message ?? "No se pudo conectar con Supabase.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarTodo();
  }, [cargarTodo]);

  // -------- Modo oscuro (tabla user_settings) --------
  const cambiarModoOscuro = async (v: boolean) => {
    setIsDark(v); // respuesta inmediata en pantalla
    try {
      await settingsRepo.setDarkMode(v);
    } catch (e: any) {
      setIsDark(!v); // se revierte si la base lo rechazó
      showAlert("Error", e?.message ?? "No se pudo guardar la preferencia.");
    }
  };

  // -------- Agregar paciente --------
  const handleAddPatient = async (p: Patient) => {
    try {
      const guardado = await patientsRepo.add(p);
      setPatients((prev) => [...prev, guardado]);
      pqRef.current.insert(guardado, guardado.urgencia, Date.now());
    } catch (e: any) {
      showAlert("Error al registrar", e?.message ?? "No se pudo guardar el paciente.");
      throw e; // el formulario no se limpia si falló
    }
  };

  const orderedPatients: Patient[] = useMemo(() => {
    return pqRef.current.toArrayOrdered().map((n: any) => n.value as Patient);
  }, [patients]);

  // -------- Atender siguiente (heap -> historial + pila) --------
  const serveNext = async () => {
    const next = pqRef.current.pop();
    if (!next) {
      showAlert("Información", "No hay pacientes en la lista de espera.");
      return;
    }

    const paciente: Patient = next.value;
    const now = Date.now();
    const queuedAt = paciente.queuedAt ?? now;
    const waitedMs = Math.max(0, now - queuedAt);
    const item: HistoryItem = { paciente, atendidoEn: now, waitedMs };

    try {
      // Primero el historial: si esto falla, el paciente sigue en la cola.
      const guardado = await historyRepo.add(item);
      await patientsRepo.remove(paciente.id);

      setPatients((prev) => prev.filter((p) => p.id !== paciente.id));

      historyRef.current.append(guardado);
      setHistory(historyRef.current.toArray());

      stackRef.current.push(guardado);
      setUndoStack(stackRef.current.toArray());

      showAlert(
        "Atendido",
        `Se atendió a: ${paciente.nombre} (prioridad ${paciente.urgencia})`
      );
    } catch (e: any) {
      // Se devuelve al heap para que la pantalla no mienta sobre el estado real.
      pqRef.current.insert(paciente, paciente.urgencia, queuedAt);
      setPatients((prev) => [...prev]);
      showAlert("Error al atender", e?.message ?? "No se pudo completar la atención.");
    }
  };

  // -------- Deshacer --------
  const undoLast = async () => {
    const last = stackRef.current.pop();
    if (!last) {
      showAlert("Información", "No hay acciones para deshacer.");
      return;
    }

    try {
      const paciente = last.paciente;

      // Vuelve a la cola y se borra del historial.
      const devuelto = await patientsRepo.add({ ...paciente, queuedAt: Date.now() });
      if (last.id) await historyRepo.remove(last.id);

      const newHistory = history.filter((h) => h.id !== last.id);
      historyRef.current.rebuildFrom(newHistory);
      setHistory(newHistory);

      setPatients((prev) => [...prev, devuelto]);
      pqRef.current.insert(devuelto, devuelto.urgencia, Date.now());

      setUndoStack(stackRef.current.toArray());

      showAlert("Deshecho", `Se regresó a ${paciente.nombre} a la lista de espera.`);
    } catch (e: any) {
      stackRef.current.push(last); // la acción sigue pendiente de deshacer
      setUndoStack(stackRef.current.toArray());
      showAlert("Error al deshacer", e?.message ?? "No se pudo deshacer la acción.");
    }
  };

  const tabIconByRoute: Record<keyof RootTabParamList, string> = {
    Registrar: "➕",
    Lista: "📋",
    Historial: "🕒",
    Estadísticas: "📊",
    Ajustes: "⚙️",
  };

  // -------- Pantallas de carga y error --------
  if (cargando) {
    return (
      <View style={[styles.centro, { backgroundColor: paleta.bg }]}>
        <ActivityIndicator size="large" color={paleta.tabActive} />
        <Text style={[styles.centroTexto, { color: paleta.textMuted }]}>
          Cargando datos desde Supabase…
        </Text>
      </View>
    );
  }

  if (errorCarga) {
    return (
      <View style={[styles.centro, { backgroundColor: paleta.bg }]}>
        <Text style={[styles.errorTitulo, { color: paleta.text }]}>No se pudo cargar</Text>
        <Text style={[styles.centroTexto, { color: paleta.textMuted }]}>{errorCarga}</Text>
        <Pressable onPress={cargarTodo} style={[styles.btn, { backgroundColor: paleta.tabActive }]}>
          <Text style={styles.btnText}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ThemeProvider isDark={isDark}>
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: paleta.bg }}>
      <SafeAreaProvider>
        <NavigationContainer theme={navTheme}>
          <SafeAreaView style={{ flex: 1, backgroundColor: paleta.bg }} edges={["top", "left", "right"]}>
            <Tab.Navigator
              screenOptions={({ route }) => ({
                headerShown: true,
                tabBarPosition: sideTabs ? "left" : "bottom",
                tabBarVariant: sideTabs ? "material" : "uikit",
                tabBarLabelPosition: "below-icon",
                tabBarIcon: ({ focused }) => (
                  <Text style={{ fontSize: r.isWide ? 18 : 16, opacity: focused ? 1 : 0.7 }}>
                    {tabIconByRoute[route.name as keyof RootTabParamList] || "•"}
                  </Text>
                ),
              })}
            >
              <Tab.Screen name="Registrar" options={{ title: "Registrar Paciente" }}>
                {() => (
                  <View style={{ flex: 1 }}>
                    <PatientForm onAddPatient={handleAddPatient} />
                  </View>
                )}
              </Tab.Screen>

              <Tab.Screen
                name="Lista"
                options={{
                  title: "Lista de espera",
                  tabBarBadge:
                    orderedPatients.length > 0 ? orderedPatients.length : undefined,
                }}
              >
                {() => (
                  <View style={{ flex: 1 }}>
                    <PatientList patients={orderedPatients} onServeNext={serveNext} />
                  </View>
                )}
              </Tab.Screen>

              <Tab.Screen
                name="Historial"
                options={{
                  title: "Historial",
                  tabBarBadge: history.length > 0 ? history.length : undefined,
                }}
              >
                {() => (
                  <View style={{ flex: 1 }}>
                    <HistoryScreen
                      items={history}
                      onUndo={undoLast}
                      canUndo={undoStack.length > 0}
                    />
                  </View>
                )}
              </Tab.Screen>

              <Tab.Screen name="Estadísticas" options={{ title: "Estadísticas" }}>
                {() => (
                  <View style={{ flex: 1 }}>
                    <StatsScreen queue={orderedPatients} history={history} />
                  </View>
                )}
              </Tab.Screen>

              <Tab.Screen name="Ajustes" options={{ title: "Ajustes" }}>
                {() => (
                  <View style={{ flex: 1 }}>
                    <SettingsScreen
                      isDark={isDark}
                      onToggleDark={cambiarModoOscuro}
                      onLogout={onLogout}
                    />
                  </View>
                )}
              </Tab.Screen>
            </Tab.Navigator>
          </SafeAreaView>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 10,
  },
  centroTexto: { textAlign: "center" },
  errorTitulo: { fontSize: 18, fontWeight: "800" },
  btn: {
    marginTop: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  btnText: { color: "#fff", fontWeight: "800" },
});
