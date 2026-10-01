import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Platform } from 'react-native';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { COLORS } from './lib/theme';
import { UnitProvider } from './lib/unit';
import Home from './screens/Home';
import Measure from './screens/Measure';
import Pulse from './screens/Pulse';
import History from './screens/History';

const Tab = createBottomTabNavigator();

function BarIcon({ name, color, size }: { name: keyof typeof Ionicons.glyphMap; color: string; size: number }) {
  return <Ionicons name={name} size={size} color={color} />;
}

export default function App() {
  const [fontsLoaded] = useFonts({ ...Ionicons.font });
  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <UnitProvider>
        <View style={s.root}>
          <NavigationContainer>
            <Tab.Navigator
              screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: COLORS.teal,
                tabBarInactiveTintColor: COLORS.faint,
                tabBarStyle: {
                  backgroundColor: COLORS.bg2,
                  borderTopColor: COLORS.line,
                  borderTopWidth: 1,
                  height: Platform.OS === 'ios' ? 88 : 68,
                  paddingTop: 8,
                  paddingBottom: Platform.OS === 'ios' ? 26 : 10,
                },
                tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
              }}
            >
              <Tab.Screen
                name="Home"
                component={Home}
                options={{
                  tabBarIcon: (p) => <BarIcon name="home" {...p} />,
                  tabBarLabel: ({ color }) => <Text style={{ color, fontSize: 11, fontWeight: '700' }}>Home</Text>,
                }}
              />
              <Tab.Screen
                name="Measure"
                component={Measure}
                options={{
                  tabBarIcon: (p) => <BarIcon name="resize" {...p} />,
                  tabBarLabel: ({ color }) => <Text style={{ color, fontSize: 11, fontWeight: '700' }}>Height</Text>,
                }}
              />
              <Tab.Screen
                name="Pulse"
                component={Pulse}
                options={{
                  tabBarIcon: (p) => <BarIcon name="heart" {...p} />,
                  tabBarLabel: ({ color }) => <Text style={{ color, fontSize: 11, fontWeight: '700' }}>Pulse</Text>,
                }}
              />
              <Tab.Screen
                name="History"
                component={History}
                options={{
                  tabBarIcon: (p) => <BarIcon name="time" {...p} />,
                  tabBarLabel: ({ color }) => <Text style={{ color, fontSize: 11, fontWeight: '700' }}>History</Text>,
                }}
              />
            </Tab.Navigator>
          </NavigationContainer>
          <StatusBar style="light" />
        </View>
      </UnitProvider>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
});
