import 'react-native-gesture-handler';
import React, { useState } from "react";
import HomeScreen from "./screens/HomeScreen";
import LoginScreen from "./components/LoginScreen";

export default function App() {
  const [authed, setAuthed] = useState(false);

  if (!authed) {
    return <LoginScreen onSuccess={() => setAuthed(true)} />;
  }

  return <HomeScreen onLogout={() => setAuthed(false)} />;
}
