import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, Dimensions
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://hopefusion-api.onrender.com/api';

const COLORS = {
  green: '#2DB562',
  gold: '#E8A020',
  red: '#E02020',
  black: '#1A1A1A',
  white: '#fff',
  bg: '#121212',
  cardBg: '#1E1E1E',
  userBubble: '#2DB562',
  assistantBubble: '#222222',
  txt2: '#a0a0a0',
  border: 'rgba(255,255,255,0.08)'
};

const PERSONAS = [
  { id: 'general', name: 'Guide Agent', icon: 'sparkles', color: COLORS.green, greeting: 'Hello! I am your general guide for HopeFusion Africa. How can I assist you with the platform today?' },
  { id: 'mentor', name: 'Scale Mentor', icon: 'business', color: COLORS.gold, greeting: 'Welcome back. As your scaling mentor, let\'s review your product-market fit, sales traction, and growth plan.' },
  { id: 'investor', name: 'VC Advisor', icon: 'cash', color: '#7c3aed', greeting: 'Hi there. Ready to fundraise? Ask me about investor expectations, deal terms, or pitching to African VCs.' },
  { id: 'compliance', name: 'Legal Expert', icon: 'shield-checkmark', color: '#2563eb', greeting: 'Compliance is the base of scale. Let\'s evaluate regional incorporation, regulatory acts, or startup tax rules.' },
];

export default function AssistantScreen({ navigation }) {
  const { token, user } = useAuth();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef(null);

  const [activePersona, setActivePersona] = useState('general');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [threadId, setThreadId] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Dynamic persona details
  const currentPersonaObj = PERSONAS.find(p => p.id === activePersona);

  useEffect(() => {
    loadThreadAndHistory();
  }, [activePersona]);

  // Load existing thread ID and its history if present
  const loadThreadAndHistory = async () => {
    setLoadingHistory(true);
    try {
      const storedId = await SecureStore.getItemAsync(`hfa_chat_thread_${activePersona}`);
      if (storedId) {
        setThreadId(storedId);
        // Fetch history from API
        const response = await api.get(`/ai/chat/thread/${storedId}`);
        if (response?.success && response.history?.length > 0) {
          setMessages(response.history);
          setLoadingHistory(false);
          return;
        }
      }
      // Fallback: Default Greeting if no history
      setThreadId('');
      setMessages([
        { role: 'assistant', content: currentPersonaObj.greeting }
      ]);
    } catch (err) {
      console.warn('Failed to load chat history:', err);
      setMessages([
        { role: 'assistant', content: currentPersonaObj.greeting }
      ]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleClearThread = async () => {
    if (!threadId) {
      setMessages([{ role: 'assistant', content: currentPersonaObj.greeting }]);
      return;
    }

    Alert.alert(
      'Reset Chat',
      'Are you sure you want to clear this conversation? History will be deleted from the database.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear History',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/ai/chat/thread/${threadId}`);
              await SecureStore.deleteItemAsync(`hfa_chat_thread_${activePersona}`);
              setThreadId('');
              setMessages([{ role: 'assistant', content: currentPersonaObj.greeting }]);
            } catch (err) {
              Alert.alert('Error', 'Could not clear thread. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Polyfill decoder for Hermes engine
  const decodeUint8Array = (array) => {
    try {
      return String.fromCharCode.apply(null, new Uint8Array(array));
    } catch (e) {
      return '';
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const userText = input.trim();
    setInput('');

    // Append user message
    const userMsg = { role: 'user', content: userText };
    const updatedMsgs = [...messages, userMsg];
    setMessages(updatedMsgs);
    setIsStreaming(true);

    // Scroll to bottom
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    // Placeholder for stream response
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const response = await fetch(`${BASE_URL}/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messages: updatedMsgs,
          context: activePersona,
          thread_id: threadId || undefined,
          user: user
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      // Read SSE stream
      if (response.body && typeof response.body.getReader === 'function') {
        const reader = response.body.getReader();
        const decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8') : null;
        let done = false;
        let assistantContent = '';

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            const chunk = decoder ? decoder.decode(value, { stream: !done }) : decodeUint8Array(value);
            
            // SSE chunks are separated by newlines and prepended with 'data: '
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const dataStr = line.slice(6).trim();
                if (dataStr) {
                  try {
                    const parsed = JSON.parse(dataStr);
                    if (parsed.text) {
                      assistantContent += parsed.text;
                      setMessages(prev => {
                        const next = [...prev];
                        next[next.length - 1] = { role: 'assistant', content: assistantContent };
                        return next;
                      });
                    }
                    if (parsed.thread_id && !threadId) {
                      setThreadId(parsed.thread_id);
                      await SecureStore.setItemAsync(`hfa_chat_thread_${activePersona}`, parsed.thread_id);
                    }
                  } catch (e) {
                    // Ignore parse errors on partial chunks
                  }
                }
              }
            }
          }
        }
      } else {
        // Fallback reading standard response text
        const text = await response.text();
        const lines = text.split('\n');
        let assistantContent = '';
        let newId = '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr) {
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.text) {
                  assistantContent += parsed.text;
                }
                if (parsed.thread_id) {
                  newId = parsed.thread_id;
                }
              } catch (e) {}
            }
          }
        }

        if (newId && !threadId) {
          setThreadId(newId);
          await SecureStore.setItemAsync(`hfa_chat_thread_${activePersona}`, newId);
        }

        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', content: assistantContent || 'Sorry, I could not generate a response.' };
          return next;
        });
      }
    } catch (err) {
      console.error('Streaming Chat Error:', err);
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: 'assistant', content: `Error: ${err.message || 'Unable to establish streaming connection.'}` };
        return next;
      });
    } finally {
      setIsStreaming(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderMessageBubble = ({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.bubbleContainer, isUser ? styles.bubbleUserAlign : styles.bubbleAssistantAlign]}>
        {!isUser && (
          <View style={[styles.personaIconMini, { backgroundColor: currentPersonaObj.color + '20' }]}>
            <Ionicons name={currentPersonaObj.icon} size={14} color={currentPersonaObj.color} />
          </View>
        )}
        <View style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
          !isUser && { borderColor: COLORS.border }
        ]}>
          <Text style={isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>AI Assistant Hub</Text>
          <Text style={styles.headerStatus}>
            {isStreaming ? 'Streaming response...' : 'Online'}
          </Text>
        </View>
        <TouchableOpacity onPress={handleClearThread}>
          <Ionicons name="trash-outline" size={22} color={COLORS.red} />
        </TouchableOpacity>
      </View>

      {/* Persona Selectors */}
      <View style={styles.personaBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.personaScroll}>
          {PERSONAS.map(p => {
            const isSelected = activePersona === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.personaTab, isSelected && { borderColor: p.color, backgroundColor: p.color + '12' }]}
                onPress={() => !isStreaming && setActivePersona(p.id)}
                disabled={isStreaming}
              >
                <Ionicons name={p.icon} size={15} color={isSelected ? p.color : COLORS.txt2} style={{ marginRight: 6 }} />
                <Text style={[styles.personaText, isSelected && { color: COLORS.white, fontFamily: 'SpaceGrotesk-Bold' }]}>
                  {p.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Chat Messages */}
      {loadingHistory ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={COLORS.green} />
          <Text style={styles.historyText}>Loading memory thread...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderMessageBubble}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {/* Typing/Streaming Indicator */}
      {isStreaming && messages[messages.length - 1]?.content === '' && (
        <View style={styles.typingContainer}>
          <ActivityIndicator size="small" color={currentPersonaObj.color} />
          <Text style={[styles.typingText, { color: currentPersonaObj.color }]}>
            {currentPersonaObj.name} is compiling vectors...
          </Text>
        </View>
      )}

      {/* Message Input Bar */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TextInput
          style={styles.textInput}
          value={input}
          onChangeText={setInput}
          placeholder={`Message ${currentPersonaObj.name}...`}
          placeholderTextColor="rgba(255,255,255,0.3)"
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: input.trim() ? currentPersonaObj.color : 'rgba(255,255,255,0.06)' }]}
          onPress={handleSend}
          disabled={!input.trim() || isStreaming}
        >
          <Ionicons name="send" size={16} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  historyText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 8, fontFamily: 'SpaceGrotesk-Regular' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 16, fontFamily: 'Sora-Bold', color: COLORS.white },
  headerStatus: { fontSize: 10, fontFamily: 'SpaceGrotesk-Medium', color: COLORS.green, marginTop: 2, textTransform: 'uppercase' },
  personaBar: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  personaScroll: { paddingHorizontal: 16, gap: 8 },
  personaTab: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: 'rgba(255,255,255,0.02)' },
  personaText: { fontSize: 12, fontFamily: 'SpaceGrotesk-Medium', color: COLORS.txt2 },
  chatContent: { padding: 16, paddingBottom: 32 },
  bubbleContainer: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16, maxWidth: '82%' },
  bubbleUserAlign: { alignSelf: 'flex-end' },
  bubbleAssistantAlign: { alignSelf: 'flex-start' },
  personaIconMini: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 6, marginBottom: 2 },
  bubble: { borderRadius: 16, padding: 12, borderWidth: 1, borderColor: 'transparent' },
  bubbleUser: { backgroundColor: COLORS.userBubble, borderBottomRightRadius: 2 },
  bubbleAssistant: { backgroundColor: COLORS.assistantBubble, borderBottomLeftRadius: 2, borderColor: COLORS.border },
  bubbleTextUser: { fontSize: 14, fontFamily: 'SpaceGrotesk-Regular', color: COLORS.white, lineHeight: 20 },
  bubbleTextAssistant: { fontSize: 14, fontFamily: 'SpaceGrotesk-Regular', color: 'rgba(255,255,255,0.9)', lineHeight: 20 },
  typingContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  typingText: { fontSize: 12, fontFamily: 'SpaceGrotesk-Medium' },
  inputBar: { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.black },
  textInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, maxHeight: 100, color: COLORS.white, fontSize: 14, marginRight: 10, fontFamily: 'SpaceGrotesk-Regular' },
  sendBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }
});
