/**
 * Expo Official Skills Knowledge Base
 * Extracted from https://github.com/expo/skills
 * Filtered for SDK 52 compatibility (Expo Snack)
 */

// From expo-app-design/skills/building-native-ui/SKILL.md
// Filtered: removed NativeTabs, expo-symbols, formSheet detents, Link.Preview, gradients
export const EXPO_UI_GUIDELINES = `## Expo UI Guidelines (from Expo Official Skills)

### Code Style
- Always use TypeScript
- Use functional components with hooks  
- Keep components focused and small
- Use StyleSheet.create for all styles at the bottom of the file
- Use Expo Router for all navigation
- Use expo-image for images (not React Native Image)

### Library Preferences
- Navigation: expo-router (Tabs, Stack, Link)
- Icons: @expo/vector-icons (Ionicons)
- Images: expo-image
- Audio/Video: expo-av
- Blur effects: expo-blur (BlurView)
- Haptics: expo-haptics
- Safe areas: react-native-safe-area-context
- Storage: @react-native-async-storage/async-storage
- Animations: react-native-reanimated

### Responsive Design
- Use Dimensions or useWindowDimensions for screen-aware layouts
- Use flex layouts (flex: 1, flexDirection, gap)
- Use SafeAreaView or useSafeAreaInsets
- Test on both small (iPhone SE) and large (iPhone Pro Max) screens

### Navigation Patterns

#### Tab Navigation
\`\`\`typescript
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#007AFF',
      tabBarStyle: { backgroundColor: '#000' },
    }}>
      <Tabs.Screen name="index" options={{
        title: 'Home',
        tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
      }} />
      <Tabs.Screen name="explore" options={{
        title: 'Explore',
        tabBarIcon: ({ color, size }) => <Ionicons name="compass" size={size} color={color} />,
      }} />
      <Tabs.Screen name="profile" options={{
        title: 'Profile',
        tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
      }} />
    </Tabs>
  );
}
\`\`\`

#### Stack Navigation
\`\`\`typescript
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: '#000' },
      headerTintColor: '#fff',
    }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
\`\`\`

#### Modals
\`\`\`typescript
// In _layout.tsx
<Stack.Screen name="modal" options={{ presentation: 'modal' }} />

// Navigate to modal
import { useRouter } from 'expo-router';
const router = useRouter();
router.push('/modal');
\`\`\`

### Common Route Structure
\`\`\`
app/
  _layout.tsx          -- Root Stack layout
  (tabs)/
    _layout.tsx        -- Tab layout
    index.tsx          -- Home tab
    explore.tsx        -- Explore tab  
    profile.tsx        -- Profile tab
  [id].tsx             -- Dynamic route
  modal.tsx            -- Modal screen
components/
  ui/                  -- Reusable UI components
  features/            -- Feature-specific components
hooks/                 -- Custom hooks
utils/                 -- Utility functions
constants/             -- App constants (colors, etc.)
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

// From expo-app-design/references/animations.md (SDK 52 compatible parts)
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

// From expo-app-design/references/controls.md (SDK 52 compatible)
export const EXPO_CONTROLS = `## Native Controls (from Expo Official Skills)

### Switch
\`\`\`typescript
import { Switch } from 'react-native';

<Switch
  value={isEnabled}
  onValueChange={setIsEnabled}
  trackColor={{ false: '#3e3e3e', true: '#4CD964' }}
  thumbColor="#fff"
/>
\`\`\`

### TextInput
\`\`\`typescript
import { TextInput, StyleSheet } from 'react-native';

<TextInput
  style={styles.input}
  value={text}
  onChangeText={setText}
  placeholder="Enter text..."
  placeholderTextColor="#666"
  autoCapitalize="none"
  autoCorrect={false}
/>

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#1c1c1e',
    color: '#fff',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
});
\`\`\`

### Pressable with Feedback
\`\`\`typescript
import { Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

<Pressable
  onPress={() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handlePress();
  }}
  style={({ pressed }) => [
    styles.button,
    pressed && { opacity: 0.7 },
  ]}
>
  <Text style={styles.buttonText}>Press me</Text>
</Pressable>
\`\`\``;
