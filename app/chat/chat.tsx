import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import colorsIkam from "@/assets/estilos";
import { getUserData } from "@/auth/authService";
import { User } from "@/models/User";
import {
  enviarMensaje,
  suscribirseAlChat,
  getReceptorToken,
  actualizarUnreadCount,
} from "@/services/services";
import { auth } from "@/firebase/config-ikam";

type Mensaje = {
  user: string;
  mensaje: string;
  timestamp: string;
};

// Función para enviar notificación push con manejo de errores
async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string
) {
  const message = {
    to: expoPushToken,
    sound: "default",
    title: title,
    body: body,
    data: { someData: "chat message" },
  };

  //console.log(message);

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    const data = await response.json();

    // Verificación de estado
    if (response.ok) {
      //console.log("Notificación enviada exitosamente:", data);
      return true; // Notificación enviada con éxito
    } else {
      //console.error("Error al enviar la notificación:", data);
      return false; // Error en el envío
    }
  } catch (error) {
    console.error("Error de red o al enviar la notificación:", error);
    return false; // Error de red o fallo en el envío
  }
}

const chatNuevo = () => {
  const item = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<User | null>();
  const [receiverToken, setReceiverToken] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [mensaje, setMensaje] = useState("");

  // Asegúrate de que esta propiedad exista
  const user = auth.currentUser; // Obtener usuario autenticado

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const data = await getUserData();
        setUserData(data);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    if (userData?.uid && item) {
      const chatId = item.id;
      const crearChatYEscucharMensajes = () => {
        const unsubscribe = suscribirseAlChat(chatId.toString(), (mensajes) => {
          setMensajes(mensajes);
        });
        return () => unsubscribe && unsubscribe();
      };
      crearChatYEscucharMensajes();
    }
  }, [userData]);

  // Obtener el token del receptor
  useEffect(() => {
    // Evita volver a ejecutar si ya tienes el token del receptor
    if (receiverToken) return;

    const fetchReceiverToken = async () => {
      try {
        // Determina el receptor en función de si el usuario actual es el cliente o la pyme
        const receptorId =
          item.idUser === user?.uid ? item.idPyme : item.idUser;
        if (receptorId) {
          const token = await getReceptorToken(receptorId);
          setReceiverToken(token);
        }
      } catch (error) {
        console.error("Error al obtener el token del receptor:", error);
      }
    };

    // Solo ejecuta si `user` está definido
    if (user) {
      fetchReceiverToken();
    }
  }, [user]); // Ejecutar solo cuando `user` cambie y evitar ciclos infinitos

  // Enviar mensaje y notificación push
  const enviarMesaje = async () => {
    if (mensaje.trim() === "") return; // Asegúrate de que hay un token

    const chatId = item.id;

    if (userData?.uid) {
      // Primero, actualiza el contador de mensajes no leídos
      await actualizarUnreadCount(chatId, 1); // Cambiar de 0 a 1 para incrementar

      // Enviar mensaje al chat
      await enviarMensaje(chatId.toString(), mensaje, userData.uid);

      if (receiverToken) {
        // Preparar notificación
        const tituloNotificacion = userData.display_name; // Usar el nombre del usuario como título
        const cuerpoNotificacion = mensaje; // Usar el mensaje como cuerpo

        // Enviar notificación
        const notificacionEnviada = await sendPushNotification(
          receiverToken, // Asegúrate de pasar un array de tokens
          tituloNotificacion,
          cuerpoNotificacion
        );

        if (notificacionEnviada) {
          console.log(
            "La notificación fue enviada correctamente al usuario con token: " +
              receiverToken
          );
        } else {
          console.log("Hubo un error al enviar la notificación");
        }
      }
    }
    setMensaje("");
  };

  const formatearHora = (timestamp: any) => {
    const date = timestamp.toDate(); // Convertir el Timestamp a objeto Date
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); // Formato de hora
  };

  return (
    <View style={estilos.container}>
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: colorsIkam.rojo.backgroundColor },
          headerTitle: item.nombre ? item.nombre.toString() : "Sin nombre",
          headerTintColor: "white",
          headerBackTitle: "Volver",
          headerShown: true,
          headerTitleAlign: "center",
        }}
      />
      <View style={estilos.chatContainer}>
        <ScrollView>
          <View style={estilos.messagesContainer}>
            <Text
              style={{ fontSize: 20, textAlign: "center", marginTop: 15 }}
            ></Text>
            {mensajes.length > 0 ? (
              <View>
                {mensajes.map((m, index) => (
                  <View key={index}>
                    {m.user == userData?.uid ? (
                      <View style={estilos.containerMensajeDerecha}>
                        <View style={estilos.messageContainerDer}>
                          <View>
                            <Text style={estilos.mensajeTexto}>
                              {m.mensaje}
                            </Text>
                            <Text style={estilos.mensajeHora}>
                              {formatearHora(m.timestamp)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ) : (
                      <View style={estilos.containerMensajeIzquierda}>
                        <View style={estilos.messageContainerIzq}>
                          <View>
                            <Text style={estilos.mensajeTexto}>
                              {m.mensaje}
                            </Text>
                            <Text style={estilos.mensajeHora}>
                              {formatearHora(m.timestamp)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <View>{/* <Text>No hay mensajes todavia</Text> */}</View>
            )}
          </View>
        </ScrollView>
        <View style={estilos.inputContainer}>
          <View style={estilos.inputRow}>
            <TextInput
              placeholder="Mensaje"
              style={estilos.textInput}
              value={mensaje}
              onChangeText={(mensaje) => setMensaje(mensaje)}
            />
            <TouchableOpacity style={estilos.sendButton} onPress={enviarMesaje}>
              <Feather name="send" size={25} color="#737373" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    backgroundColor: "#f5f5f5",
  },
  chatContainer: {
    flex: 1,
    justifyContent: "space-between",
    overflow: "visible",
  },
  messagesContainer: {
    flex: 1,
  },
  containerMensajeIzquierda: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 12,
    marginLeft: 12,
  },
  messageContainerIzq: {
    alignSelf: "flex-end",
    padding: 12,
    borderRadius: 24,
    backgroundColor: "#CEF8FF",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    maxWidth: 350,
  },
  containerMensajeDerecha: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 12,
    marginRight: 12,
  },
  messageContainerDer: {
    alignSelf: "flex-end",
    padding: 12,
    borderRadius: 24,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    maxWidth: 350,
  },
  mensajeTexto: {
    fontSize: 20,
  },
  mensajeHora: {
    fontSize: 10,
    textAlign: "right",
  },
  inputContainer: {
    padding: 8,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "white",
    padding: 2,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#ccc",
    paddingHorizontal: 2,
  },
  textInput: {
    flex: 1,
    marginRight: 8,
    fontSize: 20,
    marginLeft: 15,
  },
  sendButton: {
    position: "relative",
    backgroundColor: "#e5e5e5",
    padding: 5,
    marginRight: 2,
    borderRadius: 50, // rounded-full
  },
});

export default chatNuevo;
