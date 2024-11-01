import React, { type ComponentProps, useState, useEffect } from "react";
import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { TabBarIcon } from "@/components/navigation/TabBarIcon";
import colorsIkam from "@/assets/estilos";
import { obtenerTodosLosChats } from "@/services/services"; // Nueva función de servicio
import { auth } from "@/firebase/config-ikam";

// Extraemos el tipo para el nombre de los íconos válidos
type IoniconsName = ComponentProps<typeof TabBarIcon>["name"];

const createTabBarIcon =
  (focusedName: IoniconsName, unfocusedName: IoniconsName) =>
  ({ color, focused }: { color: string; focused: boolean }) =>
    <TabBarIcon name={focused ? focusedName : unfocusedName} color={color} />;

const createTabBarIconWithBadge =
  (
    focusedName: IoniconsName,
    unfocusedName: IoniconsName,
    unreadCount: number
  ) =>
  ({ color, focused }: { color: string; focused: boolean }) =>
    (
      <View style={{ position: "relative" }}>
        <TabBarIcon
          name={focused ? focusedName : unfocusedName}
          color={color}
        />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>
    );

export default function TabLayout() {
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Función para obtener y sumar los mensajes no leídos de todos los chats
  useEffect(() => {
    const obtenerMensajesNoLeidos = async () => {
      try {
        const user = auth.currentUser; // Obtener usuario autenticado
        if (user) {
          const userId = user.uid; // Obtener ID del usuario

          const chats = await obtenerTodosLosChats(userId);
          //console.log(chats)
          const totalMensajesNoLeidos = chats.reduce((total, chat) => {
            return total + (chat.unreadCount || 0);
          }, 0);

          setUnreadMessages(totalMensajesNoLeidos);
        }
      } catch (error) {
        console.error("Error al obtener los mensajes no leídos:", error);
      }
    };

    obtenerMensajesNoLeidos();
  }, []); // Aquí puedes agregar dependencias, como el ID del usuario

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: "#222C57",
          height: 65,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: "#FFFFFF",
        headerShown: true,
        headerStyle: { backgroundColor: colorsIkam.rojo.backgroundColor },
        headerTitleAlign: "center",
        headerTintColor: "white",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: createTabBarIcon("home", "home-outline"),
        }}
      />
      <Tabs.Screen
        name="favoritos"
        options={{
          title: "Favoritos",
          tabBarIcon: createTabBarIcon("heart", "heart-outline"),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: createTabBarIconWithBadge(
            "chatbubble-ellipses",
            "chatbubble-outline",
            unreadMessages
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
          tabBarIcon: createTabBarIcon("person", "person-outline"),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    right: -6,
    top: -3,
    backgroundColor: "red",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
});
