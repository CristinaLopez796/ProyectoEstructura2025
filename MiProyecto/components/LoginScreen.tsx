import React, { useMemo, useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../theme/colors";

type Props = {
  onSuccess: () => void;
};

export default function LoginScreen({ onSuccess }: Props) {
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);

  
  const puedeEntrar = useMemo(() => pin.trim().length >= 4, [pin]);

  const doLogin = () => {
    if (puedeEntrar) onSuccess();
  };

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <View style={styles.titleRow}>
          <Ionicons name="lock-closed-outline" size={26} color={COLORS.tabActive} />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.title}>Acceso</Text>
            <Text style={styles.sub}>Ingresa un PIN de 4+ dígitos para continuar</Text>
          </View>
        </View>

        <Text style={styles.label}>PIN</Text>
        <View style={styles.inputRow}>
          <Ionicons name="key-outline" size={16} color={COLORS.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            value={pin}
            onChangeText={(t) => setPin(t.replace(/[^\d]/g, "").slice(0, 6))}
            placeholder="••••"
            keyboardType="number-pad"
            secureTextEntry={!showPin}
            style={styles.input}
            placeholderTextColor={COLORS.textMuted}
          />
          <Pressable onPress={() => setShowPin((v) => !v)}>
            <Ionicons name={showPin ? "eye-outline" : "eye-off-outline"} size={18} color={COLORS.textMuted} />
          </Pressable>
        </View>

        <Pressable
          onPress={doLogin}
          disabled={!puedeEntrar}
          style={[styles.primaryBtn, !puedeEntrar && { opacity: 0.6 }]}
        >
          <Ionicons name="log-in-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.primaryBtnText}>Ingresar</Text>
        </Pressable>

        <Text style={styles.note}>
          Este acceso es solo para fines de clase. No se almacena ninguna información.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg, justifyContent: "center", padding: 14 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  titleRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  title: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  sub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },

  label: { fontWeight: "700", marginTop: 10, marginBottom: 6, color: COLORS.text },
  inputRow: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
  },
  input: { flex: 1, color: COLORS.text },

  primaryBtn: {
    marginTop: 14,
    backgroundColor: COLORS.tabActive,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  note: { color: COLORS.textMuted, fontSize: 12, marginTop: 12, textAlign: "center" },
});
