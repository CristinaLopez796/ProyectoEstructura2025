import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import PatientForm from "../components/PatientForm";
import PatientList from "../components/PatientList";
import { Patient } from "../models/Patient";

export default function HomeScreen() {
  const [patients, setPatients] = useState<Patient[]>([]);

  const addPatient = (patient: Patient) => {
    setPatients([...patients, patient]);
  };

  return (
    <View style={styles.container}>
      <PatientForm onAddPatient={addPatient} />
      <PatientList patients={patients} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, marginTop: 40 }
});