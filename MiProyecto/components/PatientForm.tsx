// para que uuid funcione
import 'react-native-get-random-values';

import React, { useState } from "react";
import { View, TextInput, Button, StyleSheet, Alert, Text, KeyboardAvoidingView, ScrollView, Platform } from "react-native";
import { useNavigation, CommonActions } from "@react-navigation/native"; // CommonActions
import { Patient } from "../models/Patient";
import { v4 as uuidv4 } from "uuid";
import { Picker } from "@react-native-picker/picker";

interface Props {
  onAddPatient: (patient: Patient) => void;
}

export default function PatientForm({ onAddPatient }: Props) {
  const navigation = useNavigation();

  //Estados de los campos
  const [nombre, setNombre] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [sintomas, setSintomas] = useState("");
  const [urgencia, setUrgencia] = useState<1 | 2 | 3>(3);

  //validaciones
  const isNonEmpty = (s: string) => s.trim().length > 0;
  const isDataLike = (s: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(s.trim()) || /^\d{2}\/\d{2}\/\d{4}$/.test(s.trim());

  const handleSubmit = () => {
    //validacion de campos obligatorios
    if (!isNonEmpty(nombre) || !isNonEmpty(sintomas)) {
      Alert.alert("Validación", "El nombre y sintomas son obligatorios.");
      return;
    }
    if (!sintomas.trim()) {
      Alert.alert("Validación", "Los síntomas son requeridos.");
      return;
    }
    //validacion de urgencia
    if (![1, 2, 3].includes(urgencia)) {
      Alert.alert("Validación", "La urgencia debe ser 1, 2 o 3.");
      return;
    }
    //validacion de fecha 
    if (fechaNacimiento && !/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento)) {
      Alert.alert("Validación", "Usa formato de fecha YYYY-MM-DD.");
      return;
    }

    // Construir el paciente con IDs
    const id = uuidv4(); // id único del registro
    const expediente = `EXP-${uuidv4().slice(0, 8).toUpperCase()}`; 

    const nuevoPaciente: Patient = {
      id,
      nombre: nombre.trim(),
      fechaNacimiento: fechaNacimiento.trim(),
      sintomas: sintomas.trim(),
      urgencia,
      expediente,
       queuedAt: Date.now(),
    };

    // Enviar al padre y limpiar
    onAddPatient(nuevoPaciente);
    setNombre("");
    setFechaNacimiento("");
    setSintomas("");
    setUrgencia(3);

    // Mostrar alerta y luego redirigir a Lista
    Alert.alert("Éxito", "Paciente registrado en la lista de espera.", [
      {
        text: "OK",
        onPress: () => {
          // Forzamos cambio de tab
          navigation.dispatch(
            CommonActions.navigate({
              name: "Lista",
            })
          );
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"  
      >
        <TextInput
          placeholder="Nombre completo*"
          value={nombre}
          onChangeText={setNombre}
          style={styles.input}
          returnKeyType="next"
        />
        <TextInput
          placeholder="Fecha de nacimiento (AAAA-MM-DD o DD/MM/AAAA)"
          value={fechaNacimiento}
          onChangeText={setFechaNacimiento}
          style={styles.input}
          returnKeyType="next"
        />
        <TextInput
          placeholder="Síntomas*"
          value={sintomas}
          onChangeText={setSintomas}
          style={[styles.input, { minHeight: 80 }]}
          multiline
        />
        {/* cambiamos el TextInput por Picker */}
        <Text style={{ marginBottom: 4, fontWeight: "600" }}>Nivel de urgencia:</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={urgencia}
            onValueChange={(value) => setUrgencia(value as 1 | 2 | 3)}
            style={{ height: 50 }}
          >
            <Picker.Item label="Alta (1)" value={1} />
            <Picker.Item label="Media (2)" value={2} />
            <Picker.Item label="Baja (3)" value={3} />
          </Picker>
        </View>

        <Button title="Registrar Paciente" onPress={handleSubmit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
});