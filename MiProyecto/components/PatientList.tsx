import React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { Patient } from "../models/Patient";

interface Props {
  patients: Patient[];
}

export default function PatientList({ patients }: Props) {

  const sortedPatients = [...patients].sort((a, b) => a.urgencia - b.urgencia);

  return (
    <FlatList<Patient>
      data={sortedPatients}
      keyExtractor={(item) => item.id}
      renderItem={({ item }: {item: Patient}) => (
        <View style={styles.card}>
          <Text style={styles.name}>{item.nombre}</Text>
          <Text>Expediente: {item.expediente}</Text>
          <Text>Urgencia: {item.urgencia}</Text>
          <Text>Síntomas: {item.sintomas}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  card: { padding: 10, margin: 5, borderWidth: 1, borderRadius: 5 },
  name: { fontWeight: "bold", fontSize: 16 },
});