import React, { useMemo, useState } from "react";
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../theme/colors";
import { supabaseAuth } from "../utils/supabaseAuth";

type Props = {
  onSuccess: () => void;
};

export default function LoginScreen({ onSuccess }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const isFormValid = useMemo(() =>
    email.trim().length > 0 && password.trim().length >= 6,
    [email, password]
  );

  const doLogin = async () => {
    if (!isFormValid) return;

    setLoading(true);
    try {
      const { data, error } = await supabaseAuth.signIn(email, password);

      if (error) {
        Alert.alert("Error de inicio de sesión", error.message);
      } else if (data?.session) {
        onSuccess();
      }
    } catch (err) {
      Alert.alert("Error", "Ocurrió un error durante el inicio de sesión");
    } finally {
      setLoading(false);
    }
  };

  const doSignUp = async () => {
    if (!isFormValid) return;

    setLoading(true);
    try {
      const { data, error } = await supabaseAuth.signUp(email, password);

      if (error) {
        Alert.alert("Error de registro", error.message);
      } else {
        Alert.alert("Registro exitoso", "Verifica tu correo para confirmar tu cuenta");
      }
    } catch (err) {
      Alert.alert("Error", "Ocurrió un error durante el registro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <View style={styles.titleRow}>
          <Ionicons name="lock-closed-outline" size={26} color={COLORS.tabActive} />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.title}>Acceso Seguro</Text>
            <Text style={styles.sub}>Inicia sesión con tu cuenta Supabase</Text>
          </View>
        </View>

        <Text style={styles.label}>Correo Electrónico</Text>
        <View style={styles.inputRow}>
          <Ionicons name="mail-outline" size={16} color={COLORS.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="tu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
            style={styles.input}
            placeholderTextColor={COLORS.textMuted}
          />
        </View>

        <Text style={styles.label}>Contraseña</Text>
        <View style={styles.inputRow}>
          <Ionicons name="key-outline" size={16} color={COLORS.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry={!showPassword}
            editable={!loading}
            style={styles.input}
            placeholderTextColor={COLORS.textMuted}
          />
          <Pressable onPress={() => setShowPassword((v) => !v)} disabled={loading}>
            <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={18} color={COLORS.textMuted} />
          </Pressable>
        </View>

        <Pressable
          onPress={doLogin}
          disabled={!isFormValid || loading}
          style={[styles.primaryBtn, (!isFormValid || loading) && { opacity: 0.6 }]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="log-in-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.primaryBtnText}>Iniciar Sesión</Text>
            </>
          )}
        </Pressable>

        <View style={styles.divider} />

        <Pressable
          onPress={doSignUp}
          disabled={!isFormValid || loading}
          style={[styles.secondaryBtn, (!isFormValid || loading) && { opacity: 0.6 }]}
        >
          {loading ? null : (
            <>
              <Ionicons name="person-add-outline" size={18} color={COLORS.tabActive} style={{ marginRight: 6 }} />
              <Text style={styles.secondaryBtnText}>Crear Cuenta</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.note}>
          Usa Supabase para autenticación segura
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

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },

  secondaryBtn: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryBtnText: { color: COLORS.tabActive, fontWeight: "800", fontSize: 15 },

  note: { color: COLORS.textMuted, fontSize: 12, marginTop: 12, textAlign: "center" },
});
