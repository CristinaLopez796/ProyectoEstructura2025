// components/LoginScreen.tsx
// Login con usuario + PIN numerico de 5 digitos (ver utils/auth.ts). No es
// Supabase Auth: es una verificacion propia contra la funcion Postgres
// iniciar_sesion(), definida directamente en el proyecto de Supabase.

import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ResponsiveScreen from "./ResponsiveScreen";
import { ThemeProvider, useThemedStyles } from "../theme/ThemeContext";
import { useResponsive } from "../theme/responsive";
import { Palette } from "../theme/colors";
import { verificarLogin, LoginError, SesionStaff } from "../utils/auth";

const onlyDigits = (s: string) => s.replace(/[^\d]/g, "");

function LoginForm({ onLoginSuccess }: { onLoginSuccess: (sesion: SesionStaff) => void }) {
  const r = useResponsive();
  const styles = useThemedStyles(crearEstilos);

  const [usuario, setUsuario] = useState("");
  const [pin, setPin] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const pinCompleto = pin.length === 5;

  const handleSubmit = async () => {
    setError("");
    if (!usuario.trim()) {
      setError("Escribe tu usuario.");
      return;
    }
    if (!pinCompleto) {
      setError("El PIN debe tener 5 dígitos.");
      return;
    }

    setCargando(true);
    try {
      const sesion = await verificarLogin(usuario, pin);
      onLoginSuccess(sesion);
    } catch (e) {
      setError(e instanceof LoginError ? e.message : "No se pudo iniciar sesión.");
      setPin(""); // el usuario se queda escrito; el PIN se borra para reintentar
    } finally {
      setCargando(false);
    }
  };

  return (
    <ResponsiveScreen scroll center avoidKeyboard maxWidth={r.pick({ xs: 9999, md: 420 })}>
      <View style={styles.card}>
        <View style={styles.logoWrap}>
          <Ionicons name="medkit" size={30} color="#fff" />
        </View>
        <Text style={[styles.titulo, { fontSize: r.font.title + 4 }]}>SmartTriage</Text>
        <Text style={[styles.subtitulo, { fontSize: r.font.body }]}>
          Inicia sesión para continuar
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>Usuario</Text>
          <TextInput
            value={usuario}
            onChangeText={setUsuario}
            placeholder="Ej. recepcion"
            placeholderTextColor={styles.placeholder.color}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            returnKeyType="next"
            editable={!cargando}
            accessibilityLabel="Usuario"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>PIN (5 dígitos)</Text>
          <TextInput
            value={pin}
            onChangeText={(t) => setPin(onlyDigits(t).slice(0, 5))}
            placeholder="• • • • •"
            placeholderTextColor={styles.placeholder.color}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={5}
            style={[styles.input, styles.pinInput]}
            editable={!cargando}
            onSubmitEditing={handleSubmit}
            accessibilityLabel="PIN de 5 dígitos"
          />
        </View>

        {!!error && (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle" size={16} color={styles.errorText.color} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Pressable
          onPress={handleSubmit}
          disabled={cargando}
          style={[styles.btn, cargando && styles.btnDisabled]}
          accessibilityRole="button"
        >
          {cargando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="log-in-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.btnText}>Entrar</Text>
            </>
          )}
        </Pressable>
      </View>
    </ResponsiveScreen>
  );
}

/** Envuelve en su propio ThemeProvider: esta pantalla se muestra antes de que
 * la app cargue la preferencia de modo oscuro guardada en Supabase, así que
 * usa la del sistema mientras tanto. */
export default function LoginScreen(props: { onLoginSuccess: (sesion: SesionStaff) => void }) {
  const esquemaSistema = useColorScheme();
  return (
    <ThemeProvider isDark={esquemaSistema === "dark"}>
      <LoginForm {...props} />
    </ThemeProvider>
  );
}

const crearEstilos = (c: Palette) => ({
  card: {
    backgroundColor: c.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.border,
    padding: 24,
    alignItems: "center" as const,
    shadowColor: "#000",
    shadowOpacity: c.shadowOpacity,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 3,
  },
  logoWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: c.tabActive,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 12,
  },
  titulo: { fontWeight: "800" as const, color: c.text },
  subtitulo: { color: c.textMuted, marginTop: 4, marginBottom: 20 },

  field: { width: "100%" as const, marginBottom: 14 },
  label: { fontWeight: "700" as const, marginBottom: 6, color: c.text, fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: c.input,
    color: c.text,
    fontSize: 15,
  },
  pinInput: { letterSpacing: 6, fontSize: 20, textAlign: "center" as const },
  placeholder: { color: c.textMuted },

  errorRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    alignSelf: "flex-start" as const,
    marginBottom: 12,
    gap: 6,
  },
  errorText: { color: c.danger, fontSize: 13, flexShrink: 1 },

  btn: {
    width: "100%" as const,
    backgroundColor: c.tabActive,
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: "#fff", fontWeight: "800" as const, fontSize: 15 },
});
