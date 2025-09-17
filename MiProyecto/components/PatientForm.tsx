import React, { useState } from "react";
import { View, TextInput, Button, StyleSheet, Alert } from "react-native";
import { Patient } from "../models/Patient";
import { v4 as uuidv4 } from "uuid";

interface Props {
  onAddPatient: (patient: Patient) => void;
}

export default function PatientForm({ onAddPatient }: Props) {
  //Estados de los campos
  const [nombre, setNombre] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [sintomas, setSintomas] = useState("");
  const [urgencia, setUrgencia] = useState<1 | 2 | 3>(3);

  //validaciones
  const isNonEmpty = (s: string) => s.trim().length > 0;
  const isDataLike = (s: string) =>  /^\d{4}-\d{2}-\d{2}$/.test(s.trim()) || /^\d{2}\/\d{2}\/\d{4}$/.test(s.trim());

  const handleSubmit = () => {
    //validacion de campos obligatorios
    if (!isNonEmpty (nombre) || !isNonEmpty (sintomas)) {
      Alert.alert("Validación", "El nombre y sintomas son obligatorios.");
      return;
    }
    if (!sintomas.trim()) {
      Alert.alert("Validación", "Los síntomas son requeridos.");
      return;
    }
    //validacion de fecha
    if (![1, 2, 3].includes(urgencia)) {
      Alert.alert("Validación", "La urgencia debe ser 1, 2 o 3.");
      return;
    }
    if (fechaNacimiento && !/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento)) {
      Alert.alert("Validación", "Usa formato de fecha YYYY-MM-DD.");
      return;
    }
    
 // 3) Validar urgencia
    if (![1, 2, 3].includes(urgencia)) {
      Alert.alert("Urgencia inválida", "Debe ser 1 (alta), 2 (media) o 3 (baja).");
      return;
    }

    // 4) Construir el paciente con IDs
    const id = uuidv4(); // id único del registro
    const expediente = `EXP-${uuidv4().slice(0, 8).toUpperCase()}`; // corto y legible

    const nuevoPaciente: Patient = {
      id,
      nombre: nombre.trim(),
      fechaNacimiento: fechaNacimiento.trim(),
      sintomas: sintomas.trim(),
      urgencia,
      expediente,
    };

    // 5) Enviar al padre y limpiar
    onAddPatient(nuevoPaciente);
    setNombre("");
    setFechaNacimiento("");
    setSintomas("");
    setUrgencia(3);

    Alert.alert("Éxito", "Paciente registrado en la lista de espera.");
  };

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Nombre completo*"
        value={nombre}
        onChangeText={setNombre}
        style={styles.input}
      />
      <TextInput
        placeholder="Fecha de nacimiento (AAAA-MM-DD o DD/MM/AAAA)"
        value={fechaNacimiento}
        onChangeText={setFechaNacimiento}
        style={styles.input}
      />
      <TextInput
        placeholder="Síntomas*"
        value={sintomas}
        onChangeText={setSintomas}
        style={[styles.input, { minHeight: 80 }]}
        multiline
      />
      <TextInput
        placeholder="Urgencia (1=alta, 2=media, 3=baja)"
        value={String(urgencia)}
        onChangeText={(txt) => {
          const n = Number(txt);
          if ([1, 2, 3].includes(n)) setUrgencia(n as 1 | 2 | 3);
          else if (txt.trim() === "") setUrgencia(3);
        }}
        style={styles.input}
        keyboardType="numeric"
        maxLength={1}
      />
      <Button title="Registrar Paciente" onPress={handleSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { margin: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
});
