import 'react-native-gesture-handler';
import React from "react";
import HomeScreen from "./screens/HomeScreen";

// La app abre directo en el registro de pacientes: no hay login.
export default function App() {
  return <HomeScreen />;
}
