import React, { useEffect, useMemo, useRef, useState } from "react"; 
import { View, SafeAreaView, Alert } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {Text, FlatList, StyleSheet, Button } from "react-native";

import PatientForm from "../components/PatientForm";
import PatientList from "../components/PatientList";
import { Patient } from "../models/Patient";
import PriorityQueue from "./lib/priorityQueue";
import LinkedList from "./lib/linkedList";
import HistoryScreen, { HistoryItem } from "./HistoryScreen";
import Stack from "./lib/stack";
import StatsScreen from "./StatsScreen";

type RootTabParamList = { Registrar: undefined; Lista: undefined; Historial: undefined;  Estadísticas: undefined}; // 'Historial'
const Tab = createBottomTabNavigator<RootTabParamList>();

const STORAGE_KEY = "patients:v1";
const STORAGE_HISTORY = "history:v1"; 
const STORAGE_STACK = "stack:v1";      

export default function HomeScreen() {

  const [patients, setPatients] = useState<Patient[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]); // historial para UI/persistencia
  const [undoStack, setUndoStack] = useState<HistoryItem[]>([]); // pila para UI/persistencia

  // Estructuras de datos
  const pqRef = useRef(new PriorityQueue());
  const historyRef = useRef(new LinkedList<HistoryItem>()); // lista enlazada real
  const stackRef = useRef(new Stack<HistoryItem>());        // pila real

  // carga pacientes y reconstruye heap
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed: Patient[] | null = raw ? JSON.parse(raw) : null;
        if (parsed && Array.isArray(parsed)) {
          setPatients(parsed);
          pqRef.current.rebuildFrom(parsed); // levanta el heap con lo guardado
        }
      } catch (e) {
        console.warn("No se pudo cargar pacientes:", e);
      }
    })();
  }, []);

  // carga historial y reconstruye lista enlazada
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

  // carga pila (undo) y reconstruye
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

  // Guardar cada cambio en pacientes
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
      } catch (e) {
        console.warn("No se pudo guardar pacientes:", e);
      }
    })();
  }, [patients]);

  // Guardar cada cambio en historial
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem(STORAGE_HISTORY, JSON.stringify(history));
      } catch (e) {
        console.warn("No se pudo guardar historial:", e);
      }
    })();
  }, [history]);

  // Guardar cada cambio en la pila 
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem(STORAGE_STACK, JSON.stringify(undoStack));
      } catch (e) {
        console.warn("No se pudo guardar pila (undo):", e);
      }
    })();
  }, [undoStack]);

  // Agregar un paciente
  const handleAddPatient = (p: Patient) => {
    setPatients((prev) => [...prev, p]); // persistimos así por ahora
    pqRef.current.insert(p, p.urgencia, Date.now());
  };

  // Lista ordenada desde el heap 
  const orderedPatients: Patient[] = useMemo(() => {
    return pqRef.current.toArrayOrdered().map((n: any) => n.value as Patient);
  }, [patients]);

  // Atender siguiente 
  // Atender siguiente (saca del heap y lo quita del arreglo) + lo pasa a historial y a la pila
const serveNext = () => {
  const next = pqRef.current.pop();
  if (!next) {
    Alert.alert("Información", "No hay pacientes en la lista de espera.");
    return;
  }
  setPatients((prev) => prev.filter((p) => p.id !== next.value.id));

  const now = Date.now();
  const queuedAt = next.value.queuedAt ?? now; // compat datos viejos
  const waitedMs = Math.max(0, now - queuedAt);

  const item: HistoryItem = { paciente: next.value, atendidoEn: now, waitedMs };
  historyRef.current.append(item);
  setHistory(historyRef.current.toArray());

  stackRef.current.push(item);
  setUndoStack(stackRef.current.toArray());

  Alert.alert("Atendido",

      `Se atendió a: ${next.value.nombre} (prioridad ${next.value.urgencia})`
    );
  };

  const undoLast = () => {
    const last = stackRef.current.pop();
    if (!last) {
      Alert.alert("Información", "No hay acciones para deshacer.");
      return;
    }

    // Quitar el último del historial 
    const newHistory = history.slice(0, -1);
    historyRef.current.rebuildFrom(newHistory);
    setHistory(newHistory);

    //  Regresar el paciente a la lista de espera 
    const p = last.paciente;
    setPatients((prev) => [...prev, p]);
    pqRef.current.insert(p, p.urgencia, Date.now());

    // Actualizar la pila en UI/persistencia
    setUndoStack(stackRef.current.toArray());

    Alert.alert("Deshecho", `Se regresó a ${p.nombre} a la lista de espera.`);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <SafeAreaView style={{ flex: 1 }}>
          <Tab.Navigator screenOptions={{ headerShown: true }}>
            <Tab.Screen name="Registrar" options={{ title: "Registrar Paciente" }}>
              {() => (
                <View style={{ flex: 1 }}>
                  <PatientForm onAddPatient={handleAddPatient} />
                </View>
              )}
            </Tab.Screen>

            <Tab.Screen name="Lista" options={{ title: "Lista de espera" }}>
              {() => (
                <View style={{ flex: 1 }}>
                  {/* pasamos la lista ORDENADA y el botón Atender */}
                  <PatientList
                    patients={orderedPatients}
                    onServeNext={serveNext}
                  />
                </View>
              )}
            </Tab.Screen>

            {/*Pestaña: Historial */}
            <Tab.Screen name="Historial" options={{ title: "Historial" }}>
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

             {/* Aquí agregas la nueva pestaña */}
  <Tab.Screen name="Estadísticas" options={{ title: "Estadísticas" }}>
    {() => (
      <View style={{ flex: 1 }}>
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
