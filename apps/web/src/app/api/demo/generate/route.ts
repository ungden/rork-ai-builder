import { NextRequest } from 'next/server';
import { createAIProvider } from '@ai-engine/core';

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const body = await request.json();
        const { 
          prompt, 
          model = 'claude',
          currentFiles = {},
          conversationHistory = []
        } = body;
        
        if (!prompt) {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'error', error: 'Prompt is required' })}\n\n`
          ));
          controller.close();
          return;
        }
        
        // Get API key
        const apiKey = model === 'claude' 
          ? process.env.ANTHROPIC_API_KEY 
          : process.env.GEMINI_API_KEY;
        
        if (!apiKey || apiKey.startsWith('your-')) {
          // Return mock response if no API key
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'text', content: 'API key not configured. ' })}\n\n`
          ));
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'text', content: 'Please add your ANTHROPIC_API_KEY or GEMINI_API_KEY to .env.local\n\n' })}\n\n`
          ));
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'text', content: 'Here\'s a sample response showing what would happen:\n\n' })}\n\n`
          ));
          
          // Generate mock file with modern Expo SDK 54+ patterns
          const mockFile = {
            path: 'app/(tabs)/index.tsx',
            content: `import { View, Text, FlatList, Pressable, TextInput, PlatformColor } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

export default function HomeScreen() {
  const [todos, setTodos] = useState<Todo[]>([
    { id: '1', text: 'Welcome to the todo app!', completed: false },
  ]);
  const [input, setInput] = useState('');

  const addTodo = async () => {
    if (!input.trim()) return;
    if (process.env.EXPO_OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setTodos([
      ...todos,
      { id: Date.now().toString(), text: input.trim(), completed: false },
    ]);
    setInput('');
  };

  const toggleTodo = async (id: string) => {
    if (process.env.EXPO_OS === 'ios') {
      await Haptics.selectionAsync();
    }
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = async (id: string) => {
    if (process.env.EXPO_OS === 'ios') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    setTodos(todos.filter(todo => todo.id !== id));
  };

  return (
    <FlatList
      data={todos}
      keyExtractor={(item) => item.id}
      contentInsetAdjustmentBehavior="automatic"
      ListHeaderComponent={
        <View style={{ gap: 16, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TextInput
              style={{
                flex: 1,
                backgroundColor: PlatformColor('secondarySystemBackground'),
                borderRadius: 12,
                borderCurve: 'continuous',
                padding: 14,
                color: PlatformColor('label'),
                fontSize: 17,
              }}
              placeholder="Add a new todo..."
              placeholderTextColor={PlatformColor('placeholderText')}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={addTodo}
            />
            <Pressable 
              onPress={addTodo}
              style={{
                backgroundColor: PlatformColor('systemBlue'),
                borderRadius: 12,
                borderCurve: 'continuous',
                width: 52,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SymbolView name="plus" tintColor="#fff" size={24} />
            </Pressable>
          </View>
        </View>
      }
      renderItem={({ item }) => (
        <View 
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: PlatformColor('secondarySystemBackground'),
            borderRadius: 12,
            borderCurve: 'continuous',
            padding: 14,
            gap: 12,
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          }}
        >
          <Pressable
            onPress={() => toggleTodo(item.id)}
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              borderCurve: 'continuous',
              borderWidth: 2,
              borderColor: item.completed ? PlatformColor('systemGreen') : PlatformColor('separator'),
              backgroundColor: item.completed ? PlatformColor('systemGreen') : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {item.completed && <SymbolView name="checkmark" tintColor="#fff" size={14} weight="bold" />}
          </Pressable>
          <Text 
            selectable
            style={{
              flex: 1,
              color: item.completed ? PlatformColor('secondaryLabel') : PlatformColor('label'),
              fontSize: 17,
              textDecorationLine: item.completed ? 'line-through' : 'none',
            }}
          >
            {item.text}
          </Text>
          <Pressable onPress={() => deleteTodo(item.id)}>
            <SymbolView name="trash" tintColor={PlatformColor('systemRed')} size={20} />
          </Pressable>
        </View>
      )}
      contentContainerStyle={{ padding: 16, gap: 12 }}
    />
  );
}
`,
            language: 'typescript',
          };
          
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'text', content: 'I\'ve created a modern todo list app using Expo SDK 54+ patterns!\n\nFeatures:\n- SF Symbols icons (expo-symbols)\n- Native haptic feedback\n- Modern boxShadow and borderCurve styling\n- PlatformColor for automatic dark mode\n- contentInsetAdjustmentBehavior for safe areas' })}\n\n`
          ));
          
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'file', file: mockFile })}\n\n`
          ));
          
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'done' })}\n\n`
          ));
          
          controller.close();
          return;
        }
        
        // Create provider and stream
        const provider = createAIProvider(model as 'claude' | 'gemini', apiKey);
        
        let fullText = '';
        const files: Array<{ path: string; content: string; language: string }> = [];
        
        for await (const chunk of provider.streamCode({
          prompt,
          currentFiles,
          conversationHistory,
        })) {
          if (chunk.type === 'text') {
            fullText += chunk.content;
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify(chunk)}\n\n`
            ));
          } else if (chunk.type === 'file') {
            if (chunk.file) {
              files.push(chunk.file);
            }
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify(chunk)}\n\n`
            ));
          } else if (chunk.type === 'done') {
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify(chunk)}\n\n`
            ));
          } else if (chunk.type === 'error') {
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify(chunk)}\n\n`
            ));
          }
        }
        
        controller.close();
        
      } catch (error) {
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ 
            type: 'error', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          })}\n\n`
        ));
        controller.close();
      }
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
