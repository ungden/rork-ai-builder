/**
 * Expo Styling Rules (SDK 52 compatible)
 * StyleSheet.create, legacy shadows, safe areas
 */

export const STYLING_RULES = `## Styling Rules (SDK 52)

### General Rules
- Use **StyleSheet.create** for all styles (more reliable in Expo Snack)
- **CSS and Tailwind NOT supported** - use React Native styles only
- Prefer flex gap over margin/padding where supported
- Prefer padding over margin where possible
- ALWAYS use navigation stack title instead of custom text on page

### Safe Area Handling
- ALWAYS account for safe area (top AND bottom)
- Use Stack headers, tabs, or ScrollView with \`contentInsetAdjustmentBehavior="automatic"\`
- When padding a ScrollView, use \`contentContainerStyle\` padding instead of ScrollView padding

### Shadows
Use React Native shadow styles (NOT CSS boxShadow - not supported in Expo Snack SDK 52):

\`\`\`tsx
// CORRECT - React Native shadow styles
<View style={{
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3, // Android shadow
  backgroundColor: '#fff', // Required for shadow to show
}} />
\`\`\`

### Common Shadow Presets
\`\`\`tsx
const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
};
\`\`\`

### Border Radius
\`\`\`tsx
// Standard rounded corners
<View style={{ borderRadius: 16 }} />

// Pill/capsule shape
<View style={{ borderRadius: 9999 }} />
\`\`\``;

export const LAYOUT_PATTERNS = `## Layout Patterns

### ScrollView Pattern
\`\`\`tsx
<ScrollView
  contentInsetAdjustmentBehavior="automatic"
  contentContainerStyle={{
    padding: 16,
    gap: 16,
  }}
  style={{ backgroundColor: '#0a0a0a' }}
>
  {/* Content */}
</ScrollView>
\`\`\`

### FlatList Pattern
\`\`\`tsx
<FlatList
  data={items}
  renderItem={({ item }) => <ItemCard item={item} />}
  keyExtractor={(item) => item.id}
  contentInsetAdjustmentBehavior="automatic"
  contentContainerStyle={{
    padding: 16,
    gap: 12,
  }}
/>
\`\`\`

### Card Pattern
\`\`\`tsx
<View style={styles.card}>
  <Text style={styles.cardTitle}>Title</Text>
  <Text style={styles.cardDescription}>Description</Text>
</View>

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  cardDescription: {
    fontSize: 15,
    color: '#8e8e93',
  },
});
\`\`\`

### Row Pattern
\`\`\`tsx
<View style={styles.row}>
  <Ionicons name="star" size={24} color="#FFD60A" />
  <View style={{ flex: 1 }}>
    <Text style={styles.rowTitle}>Title</Text>
    <Text style={styles.rowSubtitle}>Subtitle</Text>
  </View>
  <Ionicons name="chevron-forward" size={20} color="#48484a" />
</View>
\`\`\``;

export const TEXT_STYLING = `## Text Styling

### Text Rules
- Add \`selectable\` prop to every <Text/> displaying important data or error messages
- Format large numbers: 1.4M, 38k instead of 1400000

### Typography Scale
\`\`\`tsx
const typography = {
  largeTitle: { fontSize: 34, fontWeight: '700' as const },
  title1: { fontSize: 28, fontWeight: '700' as const },
  title2: { fontSize: 22, fontWeight: '700' as const },
  title3: { fontSize: 20, fontWeight: '600' as const },
  headline: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 17, fontWeight: '400' as const },
  callout: { fontSize: 16, fontWeight: '400' as const },
  subhead: { fontSize: 15, fontWeight: '400' as const },
  footnote: { fontSize: 13, fontWeight: '400' as const },
  caption1: { fontSize: 12, fontWeight: '400' as const },
  caption2: { fontSize: 11, fontWeight: '400' as const },
};
\`\`\`

### Color System (Dark Theme)
Use a consistent color palette for dark theme:
\`\`\`tsx
const colors = {
  // Backgrounds
  background: '#0a0a0a',
  surface: '#1c1c1e',
  surfaceSecondary: '#2c2c2e',
  
  // Text
  textPrimary: '#ffffff',
  textSecondary: '#8e8e93',
  textTertiary: '#48484a',
  
  // Accent
  blue: '#007AFF',
  green: '#30D158',
  red: '#FF3B30',
  yellow: '#FFD60A',
  orange: '#FF9500',
  purple: '#BF5AF2',
  pink: '#FF2D55',
  teal: '#64D2FF',
  
  // Borders
  border: '#38383a',
  separator: '#2c2c2e',
};
\`\`\``;

export const RESPONSIVE_DESIGN = `## Responsive Design

### Screen Dimensions
ALWAYS use \`useWindowDimensions\` - never \`Dimensions.get()\`:

\`\`\`tsx
import { useWindowDimensions } from 'react-native';

function Component() {
  const { width, height } = useWindowDimensions();
  
  const isTablet = width >= 768;
  const columns = width >= 1024 ? 4 : width >= 768 ? 3 : 2;
  
  return (
    <View style={{ padding: isTablet ? 24 : 16 }}>
      {/* ... */}
    </View>
  );
}
\`\`\`

### Flexbox Layout
Use flexbox instead of absolute positioning:

\`\`\`tsx
// Responsive grid
<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
  {items.map(item => (
    <View key={item.id} style={{ width: (width - 48) / columns }}>
      <Card item={item} />
    </View>
  ))}
</View>
\`\`\`

### Safe Area
\`\`\`tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function Screen() {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {/* Content */}
    </View>
  );
}
\`\`\`

### Keyboard Avoiding
\`\`\`tsx
import { KeyboardAvoidingView, Platform } from 'react-native';

<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  style={{ flex: 1 }}
>
  {/* Form content */}
</KeyboardAvoidingView>
\`\`\``;

export const ANIMATION_STYLING = `## Animation Patterns

### Entering/Exiting Animations
Add animations for state changes using react-native-reanimated:

\`\`\`tsx
import Animated, { FadeIn, FadeOut, SlideInRight } from 'react-native-reanimated';

// Fade in/out
<Animated.View entering={FadeIn} exiting={FadeOut}>
  <Card />
</Animated.View>

// Slide in from right
<Animated.View entering={SlideInRight.duration(300)}>
  <ListItem />
</Animated.View>
\`\`\`

### Layout Animations
\`\`\`tsx
import Animated, { LinearTransition } from 'react-native-reanimated';

<Animated.View layout={LinearTransition.springify()}>
  {/* Content that changes size */}
</Animated.View>
\`\`\`

### Simple Animated API (no reanimated needed)
\`\`\`tsx
import { Animated } from 'react-native';

const opacity = useRef(new Animated.Value(0)).current;

useEffect(() => {
  Animated.timing(opacity, {
    toValue: 1,
    duration: 300,
    useNativeDriver: true,
  }).start();
}, []);

<Animated.View style={{ opacity }}>
  <Content />
</Animated.View>
\`\`\``;
