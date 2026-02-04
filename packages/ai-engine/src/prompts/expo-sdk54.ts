/**
 * Expo SDK 54 Core Rules and Library Preferences
 * Compatible with Expo Snack SDK 54
 */

export const EXPO_SDK54_RULES = `## Expo SDK 54 Core Rules

### Library Preferences
| Use This | NOT This |
|----------|----------|
| \`expo-symbols\` (SymbolView) | Ionicons for iOS-specific icons |
| \`@expo/vector-icons\` (Ionicons) | For cross-platform icons |
| \`expo-image\` | intrinsic \`<img>\` or RN Image |
| \`expo-blur\` (BlurView) | Custom opacity overlays |
| \`Platform.OS\` | \`process.env.EXPO_OS\` |
| \`React.useContext\` | \`React.use\` (not yet stable in Snack) |
| \`react-native-safe-area-context\` | RN SafeAreaView |
| \`useWindowDimensions\` | \`Dimensions.get()\` |
| \`expo-av\` (Audio, Video) | \`expo-audio\` / \`expo-video\` (prefer expo-av for Snack stability) |
| \`import { Stack, Tabs } from 'expo-router'\` | \`import { Stack } from 'expo-router/stack'\` |
| Legacy shadow styles (shadowColor, elevation) | CSS \`boxShadow\` (use legacy for Snack compat) |

### SDK 54 Features Available
- formSheet presentation with detents: \`presentation: 'formSheet'\`, \`sheetAllowedDetents: [0.5, 1.0]\`
- Tabs from expo-router with full customization
- expo-symbols for SF Symbols on iOS (with Ionicons fallback for Android)
- expo-linear-gradient for gradient backgrounds

### Project Structure Rules
\`\`\`
app/                    # Routes ONLY - no components here!
  _layout.tsx           # Root layout (Stack)
  +not-found.tsx        # 404 handler
  (tabs)/               # Tab group
    _layout.tsx         # Tab layout with <Tabs>
    index.tsx           # Home screen
    explore.tsx         # Another tab screen
    profile.tsx         # Profile tab
components/             # Reusable components
hooks/                  # Custom hooks
utils/                  # Utility functions
constants/              # App constants (colors, spacing)
types/                  # TypeScript types
\`\`\`

### Route File Rules
- Routes belong ONLY in the \`app/\` directory
- NEVER co-locate components, types, or utilities in app directory
- Use \`[]\` for dynamic routes: \`[id].tsx\`, \`[slug].tsx\`
- Use \`(group)\` for route groups that don't affect URL
- Routes can NEVER be named \`(foo).tsx\` - use \`(foo)/index.tsx\`
- Ensure app ALWAYS has a route matching "/" (never blank)
- ALWAYS use \`_layout.tsx\` files to define navigation structure

### File Naming
- Use kebab-case for files: \`comment-card.tsx\`, \`use-search.ts\`
- Never use special characters in file names

### Code Style
- Always use import statements at top of file
- Be cautious of unterminated strings - escape nested backticks
- Prefer path aliases over deep relative imports
- TypeScript strict mode enabled

### IMPORTANT: Expo Snack Compatibility
This app runs in Expo Snack (SDK 54). Keep code simple and compatible:
- Do NOT use advanced native modules that require custom builds
- Stick to packages available in Expo Go / Expo Snack
- Use StyleSheet.create for styles (more reliable in Snack)
- Test-friendly: keep components self-contained`;

export const EXPO_PACKAGES = `## Essential Expo Packages (SDK 54)

### Navigation & Routing
\`\`\`typescript
import { Stack, Tabs, Link, useRouter, useLocalSearchParams, usePathname } from 'expo-router';
\`\`\`

### UI & Visuals
\`\`\`typescript
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
\`\`\`

### Media
\`\`\`typescript
import { Audio, Video, ResizeMode } from 'expo-av';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
\`\`\`

### Device & Platform
\`\`\`typescript
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWindowDimensions, Platform } from 'react-native';
\`\`\`

### Storage
\`\`\`typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
\`\`\`

### Native Controls
\`\`\`typescript
import { Switch, TextInput, ScrollView, FlatList } from 'react-native';
\`\`\``;

export const EXPO_BEST_PRACTICES = `## Expo Best Practices

### Responsiveness
- ALWAYS wrap root component in ScrollView for responsiveness
- Use \`<ScrollView contentInsetAdjustmentBehavior="automatic" />\` instead of SafeAreaView
- Apply same to FlatList and SectionList
- Use flexbox instead of Dimensions API
- ALWAYS prefer \`useWindowDimensions\` over \`Dimensions.get()\`

### Safe Area Handling
- Use \`contentInsetAdjustmentBehavior="automatic"\` on scroll views
- Or use \`useSafeAreaInsets()\` from react-native-safe-area-context
- This handles both top and bottom safe areas automatically

### Haptics
- Use \`expo-haptics\` conditionally on iOS for delightful experiences
- Native controls like Switch have built-in haptics
- Don't add extra haptics to components that already have them

### Text Content
- Use \`<Text selectable />\` for data that could be copied
- Format large numbers: 1.4M, 38k instead of 1400000

### Performance
- Use FlatList for lists (not ScrollView with map)
- Proper key props on list items
- Avoid inline functions in render when possible
- Use useCallback/useMemo appropriately`;
