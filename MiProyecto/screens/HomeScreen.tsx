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

type RootTabParamList = { Registrar: undefined; Lista: undefined };
const Tab = createBottomTabNavigator<RootTabParamList>();
const STORAGE_KEY = "patients:v1";

export default function HomeScreen() {
  // Estado que ya usas (y que persistimos)
  const [patients, setPatients] = useState<Patient[]>([]);

  // Heap de prioridad (vive fuera del estado React, no se re-crea)
  const pqRef = useRef(new PriorityQueue());

  // Al iniciar: carga del storage y reconstruye el heap
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

  // Agregar un paciente (se agrega al arreglo y al heap)
  const handleAddPatient = (p: Patient) => {
    setPatients((prev) => [...prev, p]); // persistimos así por ahora
    pqRef.current.insert(p, p.urgencia, Date.now());
  };

  // Lista ordenada desde el heap (así ves la prioridad real)
  const orderedPatients: Patient[] = useMemo(() => {
    return pqRef.current.toArrayOrdered().map((n: any) => n.value as Patient);
  }, [patients]); // se re-mapea cuando cambia el arreglo base

  // Atender siguiente (saca del heap y lo quita del arreglo)
  const serveNext = () => {
    const next = pqRef.current.pop();
    if (!next) {
      Alert.alert("Información", "No hay pacientes en la lista de espera.");
      return;
    }
    // quitarlo del arreglo base (lo que persistimos)
    setPatients((prev) => prev.filter((p) => p.id !== next.value.id));
    // TODO (siguiente fase): pasarlo al historial (lista enlazada) y a pila
    Alert.alert(
      "Atendido",
      `Se atendió a: ${next.value.nombre} (prioridad ${next.value.urgencia})`
    );
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
          </Tab.Navigator>
        </SafeAreaView>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
