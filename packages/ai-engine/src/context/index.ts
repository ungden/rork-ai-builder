/**
 * AI Context Injection System
 * Dynamically loads relevant documentation based on user prompts
 * Updated for SDK 52 compatibility
 */

// Keywords mapped to documentation topics
const KEYWORD_TO_TOPIC: Record<string, string[]> = {
  // Navigation
  'tabs': ['navigation', 'tabs'],
  'tab': ['navigation', 'tabs'],
  'navigation': ['navigation'],
  'router': ['navigation'],
  'stack': ['navigation'],
  'modal': ['navigation'],
  'link': ['navigation'],
  'route': ['navigation'],
  
  // Styling
  'style': ['styling'],
  'shadow': ['styling'],
  'border': ['styling'],
  'animation': ['styling'],
  'layout': ['styling'],
  'responsive': ['styling'],
  'dark mode': ['styling'],
  'theme': ['styling'],
  
  // Components
  'icon': ['icons'],
  'ionicon': ['icons'],
  'image': ['components'],
  'camera': ['media'],
  'video': ['media'],
  'audio': ['media'],
  'blur': ['visual-effects'],
  'haptic': ['components'],
  'switch': ['components'],
  'input': ['components'],
  'text': ['styling'],
  
  // Media
  'photo': ['media'],
  'record': ['media'],
  'play': ['media'],
  'gallery': ['media'],
  
  // General
  'expo': ['expo-sdk'],
  'safe area': ['styling', 'expo-sdk'],
  'scrollview': ['styling'],
  'flatlist': ['styling'],
  'list': ['styling'],
};

// Topic to documentation content (SDK 52 compatible)
const TOPIC_DOCS: Record<string, string> = {
  'navigation': `## Navigation Context (SDK 52)

Use Tabs from 'expo-router' for tab navigation:
\`\`\`tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

<Tabs>
  <Tabs.Screen name="index" options={{
    title: 'Home',
    tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
  }} />
</Tabs>
\`\`\`

Use Stack from 'expo-router' for stack navigation:
\`\`\`tsx
import { Stack } from 'expo-router';
<Stack>
  <Stack.Screen name="index" options={{ title: 'Home' }} />
  <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
</Stack>
\`\`\`

Use Link for navigation:
\`\`\`tsx
import { Link } from 'expo-router';
<Link href="/details">Go to details</Link>
\`\`\``,

  'tabs': `## Tabs (SDK 52)

Use Tabs from 'expo-router':
\`\`\`tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#007AFF' }}>
      <Tabs.Screen name="index" options={{
        title: 'Home',
        tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
      }} />
      <Tabs.Screen name="explore" options={{
        title: 'Explore',
        tabBarIcon: ({ color, size }) => <Ionicons name="compass" size={size} color={color} />,
      }} />
    </Tabs>
  );
}
\`\`\`

Key rules:
- Each Tabs.Screen 'name' must match a route file/folder
- Use tabBarIcon for tab icons with Ionicons
- Set headerShown: false if nesting Stack inside tabs`,

  'styling': `## Styling Rules (SDK 52)

Use StyleSheet.create and React Native shadow styles (NOT CSS boxShadow):
\`\`\`tsx
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
\`\`\`

Use hex colors for theming (NOT PlatformColor):
\`\`\`tsx
const colors = {
  background: '#0a0a0a',
  surface: '#1c1c1e',
  textPrimary: '#ffffff',
  textSecondary: '#8e8e93',
  accent: '#007AFF',
};
\`\`\`

Use contentInsetAdjustmentBehavior="automatic" on ScrollView/FlatList for safe areas.`,

  'icons': `## Icons (SDK 52)

Use Ionicons from @expo/vector-icons (NOT expo-symbols):
\`\`\`tsx
import { Ionicons } from '@expo/vector-icons';

<Ionicons name="home" size={24} color="#fff" />
<Ionicons name="heart-outline" size={24} color="#8e8e93" />
\`\`\`

Common icons:
- Navigation: home, settings, search, add, close, chevron-back/forward, menu
- Media: play, pause, camera, image, mic, musical-notes
- Social: heart, star, person, people, chatbubble
- Actions: share, download, trash, pencil, bookmark`,

  'media': `## Media (expo-av for SDK 52)

Audio playback (use expo-av, NOT expo-audio):
\`\`\`tsx
import { Audio } from 'expo-av';
const { sound } = await Audio.Sound.createAsync({ uri: audioUrl });
await sound.playAsync();
\`\`\`

Video playback (use expo-av, NOT expo-video):
\`\`\`tsx
import { Video, ResizeMode } from 'expo-av';
<Video source={{ uri: videoUrl }} useNativeControls resizeMode={ResizeMode.CONTAIN} />
\`\`\`

Camera:
\`\`\`tsx
import { CameraView, useCameraPermissions } from 'expo-camera';
<CameraView ref={cameraRef} facing={facing} style={{ flex: 1 }} />
\`\`\``,

  'visual-effects': `## Visual Effects (SDK 52)

BlurView (expo-blur) - the blur library available in SDK 52:
\`\`\`tsx
import { BlurView } from 'expo-blur';
<BlurView tint="dark" intensity={80} style={{ borderRadius: 16, overflow: 'hidden' }}>
  <Text style={{ color: '#fff' }}>Blurred content</Text>
</BlurView>
\`\`\`

NOTE: expo-glass-effect / GlassView is NOT available in SDK 52. Use BlurView instead.`,

  'components': `## Components (SDK 52)

Use expo-image for all images:
\`\`\`tsx
import { Image } from 'expo-image';
<Image source={{ uri }} style={{ width: 200, height: 200 }} contentFit="cover" />
\`\`\`

Native controls:
\`\`\`tsx
import { Switch, TextInput } from 'react-native';
<Switch value={enabled} onValueChange={setEnabled} trackColor={{ false: '#3a3a3c', true: '#30D158' }} />
\`\`\`

Conditional haptics:
\`\`\`tsx
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
if (Platform.OS === 'ios') {
  await Haptics.selectionAsync();
}
\`\`\``,

  'expo-sdk': `## Expo SDK 52 Rules

Library preferences for SDK 52:
- @expo/vector-icons Ionicons (NOT expo-symbols)
- expo-av for audio/video (NOT expo-audio/expo-video)
- Platform.OS (NOT process.env.EXPO_OS)
- useWindowDimensions (NOT Dimensions.get())
- React.useContext (NOT React.use)
- StyleSheet.create for styles
- React Native shadow styles (NOT CSS boxShadow)

Project structure:
- app/ for routes ONLY (never co-locate components)
- components/, hooks/, utils/ for code
- kebab-case file names

Safe areas:
- Use contentInsetAdjustmentBehavior="automatic" on ScrollView/FlatList
- NOT SafeAreaView from react-native`,
};

/**
 * Analyze prompt and return relevant context
 */
export function analyzePromptForContext(prompt: string): string[] {
  const promptLower = prompt.toLowerCase();
  const relevantTopics = new Set<string>();
  
  for (const [keyword, topics] of Object.entries(KEYWORD_TO_TOPIC)) {
    if (promptLower.includes(keyword)) {
      topics.forEach(topic => relevantTopics.add(topic));
    }
  }
  
  return Array.from(relevantTopics);
}

/**
 * Get documentation for specific topics
 */
export function getContextDocs(topics: string[]): string {
  const docs: string[] = [];
  
  for (const topic of topics) {
    if (TOPIC_DOCS[topic]) {
      docs.push(TOPIC_DOCS[topic]);
    }
  }
  
  if (docs.length === 0) {
    return '';
  }
  
  return `\n\n## Relevant Context for This Request\n\n${docs.join('\n\n---\n\n')}`;
}

/**
 * Enhance prompt with relevant context based on content analysis
 */
export function enhancePromptWithContext(prompt: string): string {
  const topics = analyzePromptForContext(prompt);
  const contextDocs = getContextDocs(topics);
  
  if (!contextDocs) {
    return prompt;
  }
  
  return `${prompt}\n\n${contextDocs}`;
}

/**
 * Get context summary for debugging
 */
export function getContextSummary(prompt: string): { topics: string[]; hasContext: boolean } {
  const topics = analyzePromptForContext(prompt);
  return {
    topics,
    hasContext: topics.length > 0,
  };
}
