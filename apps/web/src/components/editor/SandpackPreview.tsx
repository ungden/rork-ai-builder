'use client';

import { useEffect, useMemo } from 'react';
import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview as SandpackPreviewComponent,
  SandpackThemeProvider,
} from '@codesandbox/sandpack-react';
import { useProjectStore } from '@/stores/projectStore';

// Dark theme matching our editor
const darkTheme = {
  colors: {
    surface1: '#0a0a0a',
    surface2: '#18181b',
    surface3: '#27272a',
    clickable: '#999999',
    base: '#808080',
    disabled: '#4D4D4D',
    hover: '#C5C5C5',
    accent: '#22c55e',
    error: '#ef4444',
    errorSurface: '#451a1a',
  },
  syntax: {
    plain: '#FFFFFF',
    comment: { color: '#757575', fontStyle: 'italic' as const },
    keyword: '#c792ea',
    tag: '#f07178',
    punctuation: '#89DDFF',
    definition: '#82AAFF',
    property: '#FFCB6B',
    static: '#f78c6c',
    string: '#C3E88D',
  },
  font: {
    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    mono: '"Fira Code", "Fira Mono", Menlo, Consolas, monospace',
    size: '13px',
    lineHeight: '20px',
  },
};

// Transform our file structure to Sandpack format
function transformFilesToSandpack(files: Record<string, { path: string; content: string }>) {
  const sandpackFiles: Record<string, { code: string }> = {};
  
  Object.values(files).forEach((file) => {
    // Sandpack expects paths starting with /
    const path = file.path.startsWith('/') ? file.path : `/${file.path}`;
    sandpackFiles[path] = { code: file.content };
  });
  
  return sandpackFiles;
}

// Base template files for React Native Web compatibility
const baseTemplateFiles: Record<string, { code: string }> = {
  '/package.json': {
    code: JSON.stringify({
      name: 'rork-app',
      version: '1.0.0',
      main: 'index.js',
      dependencies: {
        'react': '^18.2.0',
        'react-dom': '^18.2.0',
        'react-native-web': '^0.19.12',
        'expo': '^52.0.0',
        'expo-router': '^4.0.0',
      },
    }, null, 2),
  },
  '/index.js': {
    code: `import { AppRegistry } from 'react-native';
import App from './App';

AppRegistry.registerComponent('main', () => App);

if (typeof document !== 'undefined') {
  const rootTag = document.getElementById('root');
  AppRegistry.runApplication('main', { rootTag });
}`,
  },
  '/App.js': {
    code: `import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function App() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to Rork</Text>
        <Text style={styles.subtitle}>Your app will appear here</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
  },
});`,
  },
};

interface SandpackPreviewProps {
  className?: string;
  showNavigator?: boolean;
}

export function SandpackPreview({ className = '', showNavigator = false }: SandpackPreviewProps) {
  const { files } = useProjectStore();
  
  // Transform project files to Sandpack format
  const sandpackFiles = useMemo(() => {
    const projectFiles = transformFilesToSandpack(files);
    
    // Merge with base template, project files take precedence
    return {
      ...baseTemplateFiles,
      ...projectFiles,
    };
  }, [files]);
  
  // Create App.js from app/index.tsx if it exists
  const finalFiles = useMemo(() => {
    const result: Record<string, { code: string }> = { ...sandpackFiles };
    
    // If we have app/index.tsx or app/(tabs)/index.tsx, use it as App.js
    const indexFile = result['/app/index.tsx'] || result['/app/(tabs)/index.tsx'];
    if (indexFile) {
      // Transform the Expo Router component to work standalone
      result['/App.js'] = {
        code: transformExpoRouterToStandalone(indexFile.code),
      };
    }
    
    return result;
  }, [sandpackFiles]);
  
  return (
    <div className={`h-full w-full ${className}`}>
      <SandpackProvider
        template="react"
        theme={darkTheme}
        files={finalFiles}
        options={{
          bundlerURL: 'https://sandpack-bundler.codesandbox.io',
          externalResources: [
            'https://unpkg.com/react-native-web@0.19.12/dist/react-native-web.umd.min.js',
          ],
          classes: {
            'sp-wrapper': 'h-full',
            'sp-layout': 'h-full',
          },
          recompileMode: 'delayed',
          recompileDelay: 1000,
        }}
        customSetup={{
          dependencies: {
            'react-native-web': '^0.19.12',
            'react': '^18.2.0',
            'react-dom': '^18.2.0',
          },
        }}
      >
        <SandpackPreviewComponent
          showNavigator={showNavigator}
          showRefreshButton={true}
          showOpenInCodeSandbox={false}
          style={{ height: '100%' }}
        />
      </SandpackProvider>
    </div>
  );
}

// Transform Expo Router component to standalone React Native Web
function transformExpoRouterToStandalone(code: string): string {
  // Remove Expo Router specific imports
  let transformed = code
    .replace(/import\s*{[^}]*}\s*from\s*['"]expo-router['"]/g, '')
    .replace(/import\s*{[^}]*}\s*from\s*['"]expo-router\/[^'"]*['"]/g, '')
    .replace(/import\s*\*\s*as\s*\w+\s*from\s*['"]expo-router['"]/g, '');
  
  // Replace expo-symbols with placeholder
  transformed = transformed.replace(
    /import\s*{[^}]*SymbolView[^}]*}\s*from\s*['"]expo-symbols['"]/g,
    `const SymbolView = ({ name, size = 24, tintColor = '#fff' }) => {
      const React = require('react');
      const { Text } = require('react-native');
      return React.createElement(Text, { style: { fontSize: size, color: tintColor } }, '●');
    };`
  );
  
  // Replace expo-image with react-native Image
  transformed = transformed.replace(
    /import\s*{[^}]*Image[^}]*}\s*from\s*['"]expo-image['"]/g,
    `import { Image } from 'react-native';`
  );
  
  // Replace glass effect with View
  transformed = transformed.replace(
    /import\s*{[^}]*GlassView[^}]*}\s*from\s*['"]expo-glass-effect['"]/g,
    `const GlassView = ({ children, style, ...props }) => {
      const React = require('react');
      const { View } = require('react-native');
      return React.createElement(View, { style: [{ backgroundColor: 'rgba(255,255,255,0.1)' }, style], ...props }, children);
    };`
  );
  
  // Replace blur with View
  transformed = transformed.replace(
    /import\s*{[^}]*BlurView[^}]*}\s*from\s*['"]expo-blur['"]/g,
    `const BlurView = ({ children, style, ...props }) => {
      const React = require('react');
      const { View } = require('react-native');
      return React.createElement(View, { style: [{ backgroundColor: 'rgba(0,0,0,0.5)' }, style], ...props }, children);
    };`
  );
  
  // Replace PlatformColor with string fallback
  transformed = transformed.replace(/PlatformColor\(['"]([^'"]+)['"]\)/g, (_, colorName) => {
    const colorMap: Record<string, string> = {
      'label': '#fff',
      'secondaryLabel': '#8e8e93',
      'tertiaryLabel': '#5e5e5e',
      'systemBackground': '#000',
      'secondarySystemBackground': '#1c1c1e',
      'tertiarySystemBackground': '#2c2c2e',
      'systemBlue': '#007aff',
      'systemGreen': '#34c759',
      'systemRed': '#ff3b30',
      'systemYellow': '#ffcc00',
    };
    return `'${colorMap[colorName] || '#fff'}'`;
  });
  
  // Replace process.env.EXPO_OS with 'web'
  transformed = transformed.replace(/process\.env\.EXPO_OS/g, "'web'");
  
  // Ensure we have a default export
  if (!transformed.includes('export default')) {
    transformed += '\nexport default function App() { return null; }';
  }
  
  return transformed;
}

export default SandpackPreview;
