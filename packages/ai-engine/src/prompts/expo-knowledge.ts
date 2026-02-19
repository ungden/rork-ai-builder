/**
 * Expo Official Skills Knowledge Base
 * Extracted from https://github.com/expo/skills
 * For SDK 54 (Expo Snack)
 */

// Consolidated UI guidelines (navigation details are in navigation.ts to avoid duplication)
export const EXPO_UI_GUIDELINES = `## Common UI Patterns (Frequently Needed)

### ActivityIndicator (Loading Spinner)
\`\`\`typescript
import { ActivityIndicator, View, StyleSheet } from 'react-native';

function LoadingScreen() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a' },
});
\`\`\`

### Alert Dialogs
\`\`\`typescript
import { Alert } from 'react-native';

// Simple alert
Alert.alert('Title', 'Message');

// Confirmation dialog
Alert.alert(
  'Delete Item',
  'Are you sure you want to delete this?',
  [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => handleDelete() },
  ]
);
\`\`\`

### StatusBar
\`\`\`typescript
import { StatusBar } from 'expo-status-bar';

// In your root layout or screen
<StatusBar style="light" />  // light text for dark backgrounds
\`\`\`

### LinearGradient
\`\`\`typescript
import { LinearGradient } from 'expo-linear-gradient';

<LinearGradient
  colors={['#4c669f', '#3b5998', '#192f6a']}
  style={{ flex: 1, padding: 16 }}
>
  <Text style={{ color: '#fff' }}>Content on gradient</Text>
</LinearGradient>
\`\`\`

### Pull-to-Refresh
\`\`\`typescript
import { FlatList, RefreshControl } from 'react-native';

function RefreshableList() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  return (
    <FlatList
      data={items}
      renderItem={({ item }) => <ItemCard item={item} />}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
      }
    />
  );
}
\`\`\`

### Opening URLs / Links
\`\`\`typescript
import { Linking } from 'react-native';

// Open URL in browser
Linking.openURL('https://example.com');

// Open email
Linking.openURL('mailto:support@example.com');

// Open phone
Linking.openURL('tel:+1234567890');
\`\`\`

### +not-found.tsx (404 Handler)
\`\`\`typescript
// app/+not-found.tsx
import { View, Text, StyleSheet } from 'react-native';
import { Link, Stack } from 'expo-router';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Page not found</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to home</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a', padding: 20 },
  title: { fontSize: 20, fontWeight: '600', color: '#fff', marginBottom: 16 },
  link: { marginTop: 16 },
  linkText: { fontSize: 16, color: '#007AFF' },
});
\`\`\`

### ImagePicker
\`\`\`typescript
import * as ImagePicker from 'expo-image-picker';

async function pickImage() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 1,
  });

  if (!result.canceled) {
    return result.assets[0].uri;
  }
  return null;
}
\`\`\`

### Simple State Management (React Context)
\`\`\`typescript
// context/AppContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AppState { theme: 'dark' | 'light'; }
interface AppContextType { state: AppState; setTheme: (theme: 'dark' | 'light') => void; }

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({ theme: 'dark' });
  const setTheme = (theme: 'dark' | 'light') => setState(prev => ({ ...prev, theme }));
  return <AppContext.Provider value={{ state, setTheme }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
\`\`\``;

// From expo-app-design/skills/native-data-fetching/SKILL.md
export const EXPO_DATA_FETCHING = `## Data Fetching Patterns (from Expo Official Skills)

### Basic Fetch
\`\`\`typescript
async function fetchData<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
  }
  return response.json();
}
\`\`\`

### With Loading & Error States
\`\`\`typescript
import { useState, useEffect } from 'react';

function useApi<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(url);
        if (!response.ok) throw new Error(\`HTTP \${response.status}\`);
        const json = await response.json();
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    
    load();
    return () => { cancelled = true; };
  }, [url]);

  return { data, loading, error };
}
\`\`\`

### Error Handling Best Practices
- Always check response.ok before parsing
- Use try/catch around all network calls
- Show user-friendly error messages
- Implement retry logic for transient failures
- Handle offline state gracefully

### Request Cancellation
Use AbortController to cancel requests when component unmounts:
\`\`\`typescript
useEffect(() => {
  const controller = new AbortController();
  
  fetch(url, { signal: controller.signal })
    .then(res => res.json())
    .then(setData)
    .catch(err => {
      if (err.name !== 'AbortError') setError(err.message);
    });
  
  return () => controller.abort();
}, [url]);
\`\`\``;

// From expo-app-design/references/animations.md (SDK 54 compatible parts)
export const EXPO_ANIMATIONS = `## Animations with Reanimated (from Expo Official Skills)

### Entering/Exiting Animations
\`\`\`typescript
import Animated, { FadeIn, FadeOut, SlideInRight } from 'react-native-reanimated';

// Fade in on mount
<Animated.View entering={FadeIn.duration(300)}>
  <Text>Hello</Text>
</Animated.View>

// Slide in from right
<Animated.View entering={SlideInRight.duration(400)}>
  <Text>Sliding in</Text>
</Animated.View>

// Staggered list animation
{items.map((item, index) => (
  <Animated.View 
    key={item.id}
    entering={FadeIn.delay(index * 100).duration(300)}
  >
    <ItemCard item={item} />
  </Animated.View>
))}
\`\`\`

### Gesture-driven Animations
\`\`\`typescript
import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

function DraggableCard() {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd(() => {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.card, animatedStyle]} />
    </GestureDetector>
  );
}
\`\`\``;

// From expo-app-design/references/storage.md
export const EXPO_STORAGE = `## Storage Patterns (from Expo Official Skills)

### AsyncStorage (Key-Value)
\`\`\`typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Save
await AsyncStorage.setItem('user_preferences', JSON.stringify({ theme: 'dark' }));

// Load
const prefs = await AsyncStorage.getItem('user_preferences');
const parsed = prefs ? JSON.parse(prefs) : null;

// Remove
await AsyncStorage.removeItem('user_preferences');
\`\`\`

### Custom Hook for Persistent State
\`\`\`typescript
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

function useStoredState<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(key).then(stored => {
      if (stored) setValue(JSON.parse(stored));
      setLoaded(true);
    });
  }, [key]);

  const setAndStore = (newValue: T) => {
    setValue(newValue);
    AsyncStorage.setItem(key, JSON.stringify(newValue));
  };

  return [value, setAndStore, loaded] as const;
}
\`\`\``;

// Native controls (Switch, TextInput, Haptics) are covered in components.ts — no duplication needed
export const EXPO_CONTROLS = `## Snack Package Allowlist (STRICT — SDK 54)

ONLY use packages from this exact list. Using any other package will cause a 500 error or CORS failure in the Snack web player.

### Allowed packages
| Package | Import example |
|---------|---------------|
| react, react-native | core — always available |
| expo, expo-router, expo-status-bar | \`import { Stack } from 'expo-router'\` |
| expo-image | \`import { Image } from 'expo-image'\` — use version **~1.13** (NOT 3.x) |
| expo-blur | \`import { BlurView } from 'expo-blur'\` |
| expo-linear-gradient | \`import { LinearGradient } from 'expo-linear-gradient'\` |
| expo-av | \`import { Audio, Video } from 'expo-av'\` |
| expo-camera | \`import { CameraView } from 'expo-camera'\` |
| expo-image-picker | \`import * as ImagePicker from 'expo-image-picker'\` |
| expo-haptics | \`import * as Haptics from 'expo-haptics'\` |
| expo-font | \`import * as Font from 'expo-font'\` |
| @expo/vector-icons | \`import { Ionicons } from '@expo/vector-icons'\` |
| react-native-safe-area-context | \`import { useSafeAreaInsets } from 'react-native-safe-area-context'\` |
| react-native-reanimated | \`import Animated from 'react-native-reanimated'\` |
| react-native-gesture-handler | \`import { GestureDetector } from 'react-native-gesture-handler'\` |
| @react-native-async-storage/async-storage | \`import AsyncStorage from '@react-native-async-storage/async-storage'\` |

### BANNED packages — DO NOT USE (causes CORS/500 errors in Snack)
- **lucide-react-native** — use \`@expo/vector-icons\` Ionicons instead
- **lucide-react** — web only, not React Native
- **@tamagui/core** or any tamagui package
- **nativewind** or **tailwind** — use StyleSheet.create
- **expo-image@3.x** — only ~1.13 is in SDK 54 Snack
- **expo-symbols** or **SymbolView**
- **expo-audio** or **expo-video** (standalone) — use **expo-av**
- **react-native-svg** — not bundled in Snack SDK 54
- **react-native-maps** — requires native build
- **@shopify/flash-list** — not in Snack
- Any icon library except **@expo/vector-icons**

### Icons: ALWAYS use Ionicons from @expo/vector-icons
\`\`\`typescript
import { Ionicons } from '@expo/vector-icons';
// Use: heart, heart-outline, star, star-outline, person, person-outline,
//      home, home-outline, search, settings, camera, image, etc.
<Ionicons name="heart" size={24} color="#FF6B6B" />
\`\`\`

Do NOT import packages outside the allowed list above.`;
