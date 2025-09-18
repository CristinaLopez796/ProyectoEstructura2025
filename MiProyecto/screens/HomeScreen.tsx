import React, { useEffect, useState } from "react";
import { View, SafeAreaView } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import AsyncStorage from "@react-native-async-storage/async-storage"; 

import PatientForm from "../components/PatientForm";
import PatientList from "../components/PatientList";
import { Patient } from "../models/Patient";

type RootTabParamList = {
  Registrar: undefined;
  Lista: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const STORAGE_KEY = "patients:v1"; // clave de almacenamiento

export default function HomeScreen() {
  const [patients, setPatients] = useState<Patient[]>([]);

  const handleAddPatient = (p: Patient) => {
    setPatients((prev) => [...prev, p]);
  };

  // Cargar al iniciar
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed: Patient[] = JSON.parse(raw);
          // validación ligera por si hay basura
          if (Array.isArray(parsed)) setPatients(parsed);
        }
      } catch (e) {
        console.warn("No se pudo cargar pacientes:", e);
      }
    })();
  }, []);

  //Guardar en cada cambio
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
      } catch (e) {
        console.warn("No se pudo guardar pacientes:", e);
      }
    })();
  }, [patients]);

  return (
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
                <PatientList patients={patients} />
              </View>
            )}
          </Tab.Screen>
        </Tab.Navigator>
      </SafeAreaView>
    </NavigationContainer>
  );
}
