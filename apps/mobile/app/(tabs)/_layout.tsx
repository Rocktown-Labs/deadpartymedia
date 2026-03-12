import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: "#050505" },
        tabBarStyle: {
          display: "none",
        },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="music" />
      <Tabs.Screen name="events" />
      <Tabs.Screen name="merch" />
      <Tabs.Screen name="artists" />
    </Tabs>
  );
}
