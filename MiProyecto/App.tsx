import 'react-native-gesture-handler';
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, useColorScheme } from "react-native";
import HomeScreen from "./screens/HomeScreen";
import LoginScreen from "./components/LoginScreen";
import { leerSesion, cerrarSesion, SesionStaff } from "./utils/auth";
import { LIGHT, DARK } from "./theme/colors";

// La app pide login (usuario + PIN de 5 digitos, ver utils/auth.ts) antes de
// mostrar el registro de pacientes. La sesion se recuerda en AsyncStorage,
// asi que no hay que iniciar sesion cada vez que se abre la app.
export default function App() {
  const esquemaSistema = useColorScheme();
  const paleta = esquemaSistema === "dark" ? DARK : LIGHT;

  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [sesion, setSesion] = useState<SesionStaff | null>(null);

  useEffect(() => {
    leerSesion().then((s) => {
      setSesion(s);
      setCargandoSesion(false);
    });
  }, []);

  if (cargandoSesion) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: paleta.bg }}>
        <ActivityIndicator size="large" color={paleta.tabActive} />
      </View>
    );
  }

  if (!sesion) {
    return <LoginScreen onLoginSuccess={setSesion} />;
  }

  return (
    <HomeScreen
      sesion={sesion}
      onLogout={async () => {
        await cerrarSesion();
        setSesion(null);
      }}
    />
  );
}
