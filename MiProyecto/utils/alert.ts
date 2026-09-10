// utils/alert.ts
// `Alert.alert()` de react-native-web es una función vacía: en el navegador no
// muestra nada y, sobre todo, nunca ejecuta los callbacks `onPress`. Como el
// formulario navega a la lista desde ese callback, en web el flujo se quedaba a
// medias. Este helper usa los diálogos nativos del navegador en web y el Alert
// de React Native en móvil, con la misma API en ambos casos.

import { Alert, Platform } from "react-native";

export type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
};

export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== "web") {
    Alert.alert(title, message, buttons);
    return;
  }

  const texto = [title, message].filter(Boolean).join("\n\n");

  // Sin botones o con uno solo: aviso simple.
  if (!buttons || buttons.length <= 1) {
    if (typeof window !== "undefined") window.alert(texto);
    buttons?.[0]?.onPress?.();
    return;
  }

  // Con varios botones: confirmación. Aceptar ejecuta el botón de acción,
  // cancelar ejecuta el que esté marcado como "cancel" (si existe).
  const cancelar = buttons.find((b) => b.style === "cancel");
  const confirmar = buttons.find((b) => b.style !== "cancel") ?? buttons[0];

  const aceptado = typeof window !== "undefined" ? window.confirm(texto) : true;
  if (aceptado) confirmar?.onPress?.();
  else cancelar?.onPress?.();
}
