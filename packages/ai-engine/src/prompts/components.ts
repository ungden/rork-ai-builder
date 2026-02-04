/**
 * Expo Component Patterns (SDK 52)
 * Ionicons, expo-image, expo-av, BlurView, Native Controls
 */

export const SF_SYMBOLS = `## Icons (@expo/vector-icons - Ionicons)

Use Ionicons from @expo/vector-icons for app icons. This is the standard icon library for Expo SDK 52.

### Basic Usage
\`\`\`tsx
import { Ionicons } from '@expo/vector-icons';

<Ionicons name="home" size={24} color="#fff" />
<Ionicons name="home-outline" size={24} color="#8e8e93" />
\`\`\`

### Icon in Pressable
\`\`\`tsx
<Pressable onPress={handlePress} style={{ padding: 8 }}>
  <Ionicons name="heart" size={24} color="#FF3B30" />
</Pressable>
\`\`\`

### Common Ionicons Names

**Navigation & Actions:**
- \`home\` / \`home-outline\`
- \`settings\` / \`settings-outline\`
- \`search\` / \`search-outline\`
- \`add\` / \`add-circle\` / \`add-circle-outline\`
- \`close\` / \`close-circle\`
- \`chevron-back\` / \`chevron-forward\`
- \`arrow-back\` / \`arrow-forward\`
- \`menu\` / \`ellipsis-horizontal\` / \`ellipsis-vertical\`

**Media:**
- \`play\` / \`pause\` / \`stop\`
- \`volume-high\` / \`volume-mute\`
- \`camera\` / \`camera-outline\`
- \`image\` / \`image-outline\`
- \`mic\` / \`mic-outline\`
- \`musical-notes\`

**Social:**
- \`heart\` / \`heart-outline\`
- \`star\` / \`star-outline\`
- \`thumbs-up\` / \`thumbs-down\`
- \`person\` / \`person-outline\`
- \`people\` / \`people-outline\`
- \`chatbubble\` / \`chatbubble-outline\`

**Content Actions:**
- \`share\` / \`share-outline\`
- \`download\` / \`download-outline\`
- \`copy\` / \`copy-outline\`
- \`trash\` / \`trash-outline\`
- \`pencil\` / \`create-outline\`
- \`bookmark\` / \`bookmark-outline\`

**Status:**
- \`checkmark\` / \`checkmark-circle\`
- \`close-circle\` / \`alert-circle\`
- \`warning\` / \`information-circle\`
- \`notifications\` / \`notifications-outline\`
- \`eye\` / \`eye-off\`

**Misc:**
- \`refresh\` / \`reload\`
- \`location\` / \`location-outline\`
- \`map\` / \`map-outline\`
- \`time\` / \`time-outline\`
- \`calendar\` / \`calendar-outline\`
- \`cart\` / \`cart-outline\`
- \`globe\` / \`globe-outline\`
- \`filter\` / \`options\`
- \`flash\` / \`flash-off\`
- \`moon\` / \`sunny\`
- \`log-out\` / \`log-in\`

### Other Icon Families Available
\`\`\`tsx
import { MaterialIcons } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';
import { Feather } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
\`\`\``;

export const EXPO_IMAGE = `## expo-image

Use expo-image for ALL images. Never use intrinsic <img> or RN Image.

### Basic Usage
\`\`\`tsx
import { Image } from 'expo-image';

<Image
  source={{ uri: 'https://example.com/image.jpg' }}
  style={{ width: 200, height: 200 }}
  contentFit="cover"
/>
\`\`\`

### Image Props
\`\`\`tsx
<Image
  source={{ uri: imageUrl }}
  style={{ width: '100%', aspectRatio: 16 / 9 }}
  contentFit="cover"        // cover|contain|fill|none|scale-down
  placeholder={blurhash}     // Blurhash placeholder
  transition={200}           // Fade-in duration (ms)
  cachePolicy="memory-disk"  // Caching strategy
/>
\`\`\`

### Local Images
\`\`\`tsx
<Image
  source={require('./assets/logo.png')}
  style={{ width: 100, height: 100 }}
/>
\`\`\`

### Avatar Pattern
\`\`\`tsx
<Image
  source={{ uri: avatarUrl }}
  style={{
    width: 48,
    height: 48,
    borderRadius: 24,
  }}
  contentFit="cover"
/>
\`\`\``;

export const MEDIA_COMPONENTS = `## Media Components (expo-av)

### Audio Playback
\`\`\`tsx
import { Audio } from 'expo-av';
import { useState, useEffect } from 'react';

function AudioPlayer({ uri }: { uri: string }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const playSound = async () => {
    if (sound) {
      await sound.playAsync();
      setIsPlaying(true);
    } else {
      const { sound: newSound } = await Audio.Sound.createAsync({ uri });
      setSound(newSound);
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setIsPlaying(status.isPlaying);
        }
      });
      await newSound.playAsync();
      setIsPlaying(true);
    }
  };

  const pauseSound = async () => {
    if (sound) {
      await sound.pauseAsync();
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    return () => { sound?.unloadAsync(); };
  }, [sound]);

  return (
    <Pressable onPress={isPlaying ? pauseSound : playSound}>
      <Ionicons name={isPlaying ? 'pause' : 'play'} size={32} color="#fff" />
    </Pressable>
  );
}
\`\`\`

### Video Playback
\`\`\`tsx
import { Video, ResizeMode } from 'expo-av';

function VideoPlayer({ uri }: { uri: string }) {
  return (
    <Video
      source={{ uri }}
      style={{ width: '100%', aspectRatio: 16 / 9 }}
      useNativeControls
      resizeMode={ResizeMode.CONTAIN}
      isLooping
    />
  );
}
\`\`\`

### Camera
\`\`\`tsx
import { CameraView, useCameraPermissions } from 'expo-camera';

function Camera({ onCapture }: { onCapture: (uri: string) => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<'front' | 'back'>('back');

  if (!permission?.granted) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#fff' }}>Camera access required</Text>
        <Pressable onPress={requestPermission}>
          <Text style={{ color: '#007AFF', marginTop: 12 }}>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing={facing} />
      <View style={{ position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' }}>
        <Pressable
          onPress={async () => {
            const photo = await cameraRef.current?.takePictureAsync();
            if (photo) onCapture(photo.uri);
          }}
          style={{
            width: 72, height: 72, borderRadius: 36,
            backgroundColor: '#fff', borderWidth: 4, borderColor: '#ccc',
          }}
        />
      </View>
    </View>
  );
}
\`\`\``;

export const GLASS_AND_BLUR = `## Blur Effects

### BlurView (expo-blur)
\`\`\`tsx
import { BlurView } from 'expo-blur';

<BlurView tint="dark" intensity={80} style={styles.blurContainer}>
  <Text style={{ color: '#fff' }}>Blurred content</Text>
</BlurView>
\`\`\`

#### Tint Options
- Basic: \`light\`, \`dark\`, \`default\`
- System materials (iOS): \`systemMaterial\`, \`systemThinMaterial\`, \`systemUltraThinMaterial\`, \`systemThickMaterial\`
- Extra: \`extraLight\`, \`prominent\`

#### Rounded BlurView
\`\`\`tsx
<BlurView
  tint="dark"
  intensity={80}
  style={{
    borderRadius: 16,
    overflow: 'hidden',  // REQUIRED for rounded corners on BlurView
    padding: 16,
  }}
>
  <Text style={{ color: '#fff' }}>Card content</Text>
</BlurView>
\`\`\`

### Overlay with Blur
\`\`\`tsx
<View style={StyleSheet.absoluteFillObject}>
  <BlurView tint="dark" intensity={60} style={StyleSheet.absoluteFillObject} />
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ color: '#fff', fontSize: 24 }}>Modal Content</Text>
  </View>
</View>
\`\`\``;

export const NATIVE_CONTROLS = `## Native Controls

### Switch
\`\`\`tsx
import { Switch } from 'react-native';

const [enabled, setEnabled] = useState(false);

<Switch
  value={enabled}
  onValueChange={setEnabled}
  trackColor={{ false: '#3a3a3c', true: '#30D158' }}
  thumbColor="#fff"
/>
\`\`\`

### TextInput
\`\`\`tsx
<TextInput
  placeholder="Enter text..."
  placeholderTextColor="#8e8e93"
  style={{
    padding: 12,
    fontSize: 17,
    borderRadius: 8,
    backgroundColor: '#2c2c2e',
    color: '#fff',
  }}
/>
\`\`\`

### Keyboard Types
\`\`\`tsx
// Email
<TextInput keyboardType="email-address" autoCapitalize="none" />

// Phone
<TextInput keyboardType="phone-pad" />

// Number
<TextInput keyboardType="numeric" />

// Password
<TextInput secureTextEntry />

// Search
<TextInput returnKeyType="search" enablesReturnKeyAutomatically />
\`\`\`

### Settings Row Pattern
\`\`\`tsx
function SettingsRow({ icon, title, value, onToggle }: {
  icon: string; title: string; value: boolean; onToggle: (v: boolean) => void;
}) {
  return (
    <View style={styles.settingsRow}>
      <View style={styles.settingsRowLeft}>
        <Ionicons name={icon as any} size={22} color="#8e8e93" />
        <Text style={styles.settingsRowTitle}>{title}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#3a3a3c', true: '#30D158' }}
      />
    </View>
  );
}
\`\`\``;

export const HAPTICS = `## Haptics

Use expo-haptics conditionally on iOS for delightful experiences:

\`\`\`tsx
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Selection feedback (light)
await Haptics.selectionAsync();

// Impact feedback
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

// Notification feedback
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
\`\`\`

### Conditional Haptics
\`\`\`tsx
const handlePress = async () => {
  if (Platform.OS === 'ios') {
    await Haptics.selectionAsync();
  }
  // ... rest of handler
};
\`\`\`

### Don't Double Haptic
Native controls like Switch have built-in haptics - don't add extra!`;
