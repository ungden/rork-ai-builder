/**
 * Expo Router Navigation Patterns (SDK 52)
 * Tabs, Link, Stacks, Modals
 */

export const NATIVE_TABS = `## Tabs Navigation (SDK 52)

Use Tabs from 'expo-router' for tab-based navigation:

### Basic Usage
\`\`\`tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarStyle: { backgroundColor: '#000' },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
\`\`\`

### Tab Layout Rules
- Each Tabs.Screen 'name' must match a file or folder in the same directory
- Use tabBarIcon to render icons for each tab
- Use Ionicons from @expo/vector-icons for icons
- Set headerShown: false on Tabs if using Stack inside each tab

### Common Ionicons Names
**Navigation:** home, home-outline, compass, compass-outline, search, search-outline
**Social:** heart, heart-outline, person, person-outline, people, chatbubble
**Media:** camera, image, play, musical-notes, mic
**Actions:** add, add-circle, close, checkmark, trash, pencil, share
**Status:** notifications, settings, star, bookmark, flag
**Misc:** cart, calendar, map, location, time, globe

### Tabs + Stacks (Nested Navigation)
\`\`\`tsx
// app/(tabs)/_layout.tsx - Tab navigator
<Tabs>
  <Tabs.Screen name="(home)" options={{ title: 'Home' }} />
</Tabs>

// app/(tabs)/(home)/_layout.tsx - Stack inside tab
import { Stack } from 'expo-router';

export default function HomeStack() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Home' }} />
      <Stack.Screen name="details" options={{ title: 'Details' }} />
    </Stack>
  );
}
\`\`\``;

export const LINK_PATTERNS = `## Link Component Patterns

### Basic Link
\`\`\`tsx
import { Link } from 'expo-router';

<Link href="/path">Go to path</Link>

// Wrapping custom components
<Link href="/path" asChild>
  <Pressable>
    <Text>Navigate</Text>
  </Pressable>
</Link>
\`\`\`

### Programmatic Navigation
\`\`\`tsx
import { useRouter } from 'expo-router';

const router = useRouter();
router.push('/details');       // Push new screen
router.replace('/home');       // Replace current screen  
router.back();                 // Go back
\`\`\``;

export const STACK_NAVIGATION = `## Stack Navigation

### Stack Setup
\`\`\`tsx
import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0a0a0a' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Home' }} />
      <Stack.Screen name="details" options={{ title: 'Details' }} />
    </Stack>
  );
}
\`\`\`

### Page Titles
ALWAYS use Stack.Screen options for titles - never custom text elements:
\`\`\`tsx
<Stack.Screen options={{ title: 'Home' }} />
\`\`\`

### Header Customization
\`\`\`tsx
<Stack.Screen
  options={{
    title: 'Profile',
    headerRight: () => (
      <Pressable onPress={handleEdit}>
        <Ionicons name="pencil" size={22} color="#fff" />
      </Pressable>
    ),
  }}
/>
\`\`\``;

export const MODALS_AND_SHEETS = `## Modals

### Modal Presentation
\`\`\`tsx
<Stack.Screen name="modal" options={{ presentation: 'modal' }} />
\`\`\`
Prefer this over building custom modal components.

### Transparent Modal
\`\`\`tsx
<Stack.Screen
  name="overlay"
  options={{
    presentation: 'transparentModal',
    headerShown: false,
  }}
/>
\`\`\`

### Full Screen Modal with Custom Header
\`\`\`tsx
<Stack.Screen
  name="create"
  options={{
    presentation: 'modal',
    title: 'Create New',
    headerLeft: () => (
      <Pressable onPress={() => router.back()}>
        <Text style={{ color: '#007AFF' }}>Cancel</Text>
      </Pressable>
    ),
  }}
/>
\`\`\``;

export const ROUTE_STRUCTURE = `## Route Structure Patterns

### Standard App with Tabs
\`\`\`
app/
  _layout.tsx        — Root Stack
  (tabs)/
    _layout.tsx      — <Tabs>
    index.tsx        — Home tab
    explore.tsx      — Explore tab
    profile.tsx      — Profile tab
  modal.tsx          — Modal screen
  [id].tsx           — Detail screen
\`\`\`

### Root Layout Pattern
\`\`\`tsx
// app/_layout.tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
\`\`\`

### Dynamic Routes
\`\`\`tsx
// app/[id].tsx
import { useLocalSearchParams } from 'expo-router';

export default function DetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // ...
}
\`\`\``;

export const NAVIGATION_HOOKS = `## Navigation Hooks

### useRouter
\`\`\`tsx
import { useRouter } from 'expo-router';

const router = useRouter();

router.push('/details');           // Push new screen
router.push({ pathname: '/user/[id]', params: { id: '123' } });
router.replace('/home');           // Replace current screen
router.back();                     // Go back
router.canGoBack();               // Check if can go back
\`\`\`

### useLocalSearchParams
\`\`\`tsx
import { useLocalSearchParams } from 'expo-router';

// For [id].tsx route
const { id } = useLocalSearchParams<{ id: string }>();

// For query params ?filter=active
const { filter } = useLocalSearchParams<{ filter?: string }>();
\`\`\`

### usePathname
\`\`\`tsx
import { usePathname } from 'expo-router';

const pathname = usePathname(); // e.g., '/users/123'
\`\`\`

### useSegments
\`\`\`tsx
import { useSegments } from 'expo-router';

const segments = useSegments(); // ['users', '123']
\`\`\``;
