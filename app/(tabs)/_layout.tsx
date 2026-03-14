import { Tabs } from "expo-router";
import { Text } from "react-native";
import { Colors } from "../../constants/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          height: 70,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          letterSpacing: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24, color }}>🏠</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="conversation"
        options={{
          title: "Talk",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24, color }}>💬</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="learning"
        options={{
          title: "My Words",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24, color }}>📖</Text>
          ),
        }}
      />
    </Tabs>
  );
}
