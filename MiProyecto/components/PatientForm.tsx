import React, { useState } from "react";
import { View, TextInput, Button, StyleSheet } from "react-native";
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
        const newPatient: Patient = { id: uuidv4(), nombre, fechaNacimiento, sintomas, urgencia, expediente: "EXPO-" + Math.floor(Math.random() + 10000),            
        };
        onAddPatient(newPatient);
        setNombre("");
        setFechaNacimiento("");
        setSintomas("");
        setUrgencia(3);
    };
    
return (
    <View style={styles.container}>
      <TextInput placeholder="Nombre completo" value={nombre} onChangeText={setNombre} style={styles.input} />
      <TextInput placeholder="Fecha de nacimiento" value={fechaNacimiento} onChangeText={setFechaNacimiento} style={styles.input} />
      <TextInput placeholder="Síntomas" value={sintomas} onChangeText={setSintomas} style={styles.input} />
      <TextInput placeholder="Nivel de urgencia (1, 2, 3)" value={urgencia.toString()} onChangeText={(val) => setUrgencia(Number(val) as 1 | 2 | 3)} style={styles.input} keyboardType="numeric" />
      <Button title="Registrar Paciente" onPress={handleSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { margin: 10 },
  input: { borderWidth: 1, marginBottom: 10, padding: 8, borderRadius: 5 }
});