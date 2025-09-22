import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, SafeAreaView, Alert } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import PatientForm from "../components/PatientForm";
import PatientList from "../components/PatientList";
import { Patient } from "../models/Patient";
import PriorityQueue from "./lib/priorityQueue";
import LinkedList from "./lib/linkedList";
import HistoryScreen, { HistoryItem } from "./HistoryScreen";
import Stack from "./lib/stack";
import StatsScreen from "./StatsScreen";
import { COLORS } from "../theme/colors";
import { Ionicons } from "@expo/vector-icons";

type RootTabParamList = {
  Registrar: undefined;
  Lista: undefined;
  Historial: undefined;
  "Estadísticas": undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const STORAGE_KEY = "patients:v1";
const STORAGE_HISTORY = "history:v1";
const STORAGE_STACK = "stack:v1";

export default function HomeScreen() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [undoStack, setUndoStack] = useState<HistoryItem[]>([]);

  // Estructuras de datos
  const pqRef = useRef(new PriorityQueue());
  const historyRef = useRef(new LinkedList<HistoryItem>());
  const stackRef = useRef(new Stack<HistoryItem>());

  // ---------- Carga inicial ----------
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed: Patient[] | null = raw ? JSON.parse(raw) : null;
        if (parsed && Array.isArray(parsed)) {
          setPatients(parsed);
          pqRef.current.rebuildFrom(parsed);
        }
      } catch (e) {
        console.warn("No se pudo cargar pacientes:", e);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const rawH = await AsyncStorage.getItem(STORAGE_HISTORY);
        const parsedH: HistoryItem[] | null = rawH ? JSON.parse(rawH) : null;
        if (parsedH && Array.isArray(parsedH)) {
          setHistory(parsedH);
          historyRef.current.rebuildFrom(parsedH);
        }
      } catch (e) {
        console.warn("No se pudo cargar historial:", e);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const rawS = await AsyncStorage.getItem(STORAGE_STACK);
        const parsedS: HistoryItem[] | null = rawS ? JSON.parse(rawS) : null;
        if (parsedS && Array.isArray(parsedS)) {
          setUndoStack(parsedS);
          stackRef.current.rebuildFrom(parsedS);
        }
      } catch (e) {
        console.warn("No se pudo cargar pila (undo):", e);
      }
    })();
  }, []);

  // ---------- Persistencia ----------
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
      } catch (e) {
        console.warn("No se pudo guardar pacientes:", e);
      }
    })();
  }, [patients]);

  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem(STORAGE_HISTORY, JSON.stringify(history));
      } catch (e) {
        console.warn("No se pudo guardar historial:", e);
      }
    })();
  }, [history]);

  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem(STORAGE_STACK, JSON.stringify(undoStack));
      } catch (e) {
        console.warn("No se pudo guardar pila (undo):", e);
      }
    })();
  }, [undoStack]);

  // ---------- Lógica de negocio ----------
  const handleAddPatient = (p: Patient) => {
    setPatients((prev) => [...prev, p]);
    pqRef.current.insert(p, p.urgencia, p.queuedAt ?? Date.now());
  };

  const orderedPatients: Patient[] = useMemo(() => {
    return pqRef.current.toArrayOrdered().map((n: any) => n.value as Patient);
  }, [patients]);

  const serveNext = () => {
    const next = pqRef.current.pop();
    if (!next) {
      Alert.alert("Información", "No hay pacientes en la lista de espera.");
      return;
    }
    setPatients((prev) => prev.filter((p) => p.id !== next.value.id));

    const now = Date.now();
    const queuedAt = next.value.queuedAt ?? now;
    const waitedMs = Math.max(0, now - queuedAt);

    const item: HistoryItem = { paciente: next.value, atendidoEn: now, waitedMs };
    historyRef.current.append(item);
    setHistory(historyRef.current.toArray());

    stackRef.current.push(item);
    setUndoStack(stackRef.current.toArray());

    Alert.alert("Atendido", `Se atendió a: ${next.value.nombre} (prioridad ${next.value.urgencia})`);
  };

  const undoLast = () => {
    const last = stackRef.current.pop();
    if (!last) {
      Alert.alert("Información", "No hay acciones para deshacer.");
      return;
    }

    const newHistory = history.slice(0, -1);
    historyRef.current.rebuildFrom(newHistory);
    setHistory(newHistory);

    const p = last.paciente;
    setPatients((prev) => [...prev, p]);
    pqRef.current.insert(p, p.urgencia, Date.now());

    setUndoStack(stackRef.current.toArray());

    Alert.alert("Deshecho", `Se regresó a ${p.nombre} a la lista de espera.`);
  };

  // ---------- UI ----------
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
          <Tab.Navigator
            initialRouteName="Registrar"
            screenOptions={({ route }) => ({
              headerShown: true,
              headerStyle: { backgroundColor: "#fff" },
              headerTitleStyle: { color: COLORS.text, fontWeight: "800" },
              headerTintColor: COLORS.text,
              tabBarActiveTintColor: COLORS.tabActive,
              tabBarInactiveTintColor: COLORS.tabInactive,
              tabBarStyle: {
                backgroundColor: "#fff",
                borderTopColor: COLORS.border,
                height: 58,
              },
              tabBarLabelStyle: { paddingBottom: 6, fontWeight: "600" },
              tabBarIcon: ({ color, size }) => {
                const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
                  Registrar: "person-add-outline",
                  Lista: "list-outline",
                  Historial: "time-outline",
                  "Estadísticas": "bar-chart-outline",
                };
                const name = icons[route.name] ?? "ellipse-outline";
                return <Ionicons name={name} size={size} color={color} />;
              },
            })}
          >
            <Tab.Screen
                name="Registrar"
                options={{ title: "Registrar Paciente" }}
              >
                {() => (
                  <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
                    <PatientForm onAddPatient={handleAddPatient} />
                  </View>
                )}
            </Tab.Screen>

            <Tab.Screen
              name="Lista"
              options={{
                title: "Lista de espera",
                tabBarBadge: orderedPatients.length > 0 ? orderedPatients.length : undefined,
              }}
            >
              {() => (
                <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
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
                <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
                  <HistoryScreen items={history} onUndo={undoLast} canUndo={undoStack.length > 0} />
                </View>
              )}
            </Tab.Screen>

            <Tab.Screen name="Estadísticas" options={{ title: "Estadísticas" }}>
                {() => (
                  <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
                    <StatsScreen queue={orderedPatients} history={history} />
                  </View>
                )}
            </Tab.Screen>
          </Tab.Navigator>
        </SafeAreaView>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
