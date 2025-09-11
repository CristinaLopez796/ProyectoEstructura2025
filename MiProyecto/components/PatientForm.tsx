import React, { useState } from "react";
import { View, TextInput, Button, StyleSheet, Alert } from "react-native";
import { Patient } from "../models/Patient";
import { v4 as uuidv4 } from "uuid";

interface Props {
  onAddPatient: (patient: Patient) => void;
}

export default function PatientForm({ onAddPatient }: Props) {
  const [nombre, setNombre] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [sintomas, setSintomas] = useState("");
  const [urgencia, setUrgencia] = useState<1 | 2 | 3>(3);

  const handleSubmit = () => {
    if (!nombre.trim()) {
      Alert.alert("Validación", "El nombre es requerido.");
      return;
    }
    if (!sintomas.trim()) {
      Alert.alert("Validación", "Los síntomas son requeridos.");
      return;
    }
    if (![1, 2, 3].includes(urgencia)) {
      Alert.alert("Validación", "La urgencia debe ser 1, 2 o 3.");
      return;
    }
    if (fechaNacimiento && !/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento)) {
      Alert.alert("Validación", "Usa formato de fecha YYYY-MM-DD.");
      return;
    }

    const newPatient: Patient = {
      id: uuidv4(),
      nombre: nombre.trim(),
      fechaNacimiento: fechaNacimiento.trim(),
      sintomas: sintomas.trim(),
      urgencia,
      expediente: `EXPO-${Math.floor(Math.random() * 90000) + 10000}`,
    };

    onAddPatient(newPatient);

    setNombre("");
    setFechaNacimiento("");
    setSintomas("");
    setUrgencia(3);
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Nombre completo"
        value={nombre}
        onChangeText={setNombre}
        style={styles.input}
      />
      <TextInput
        placeholder="Fecha de nacimiento (YYYY-MM-DD)"
        value={fechaNacimiento}
        onChangeText={setFechaNacimiento}
        style={styles.input}
      />
      <TextInput
        placeholder="Síntomas"
        value={sintomas}
        onChangeText={setSintomas}
        style={styles.input}
      />
      <TextInput
        placeholder="Nivel de urgencia (1, 2, 3)"
        value={String(urgencia)}
        onChangeText={(val) => {
          const n = Number(val);
          if ([1, 2, 3].includes(n)) setUrgencia(n as 1 | 2 | 3);
        }}
        style={styles.input}
        keyboardType="numeric"
      />
      <Button title="Registrar Paciente" onPress={handleSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { margin: 10 },
  input: { borderWidth: 1, marginBottom: 10, padding: 8, borderRadius: 5 },
});
