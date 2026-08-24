import { RequirePermission } from '@/components/RequirePermission';
import { BorderRadius, Colors, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';
import { useToast } from '@/contexts/ToastContext';
import { aiChatService } from '@/services/extended';
import type { AiChatRole, AiHistoryItem } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ChatMessage {
  id: string;
  role: AiChatRole;
  content: string;
  intent?: string;
  data?: any;
  time: string;
}

// Réplica de las 4 sugerencias de `ai-chat/index.jsx`, pero acá sí funcionan
// (el web las pone en un input deshabilitado).
const SUGGESTED_QUESTIONS = [
  '¿Cuáles fueron las ventas de hoy?',
  'Muéstrame los productos con bajo stock',
  '¿Cuál es el producto más vendido?',
  'Resumen del turno actual',
];

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `msg-${idCounter}`;
}

function timeLabel(): string {
  return new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function formatContent(text: string): string {
  // El backend devuelve markdown simple (**negrita**, saltos de línea) — sin
  // una librería de markdown en el proyecto, se limpian los `**` para no
  // mostrarlos literales en pantalla.
  return text.replace(/\*\*(.*?)\*\*/g, '$1');
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      <View style={[styles.avatar, isUser ? styles.avatarUser : styles.avatarAssistant]}>
        <Text style={styles.avatarText}>{isUser ? 'U' : 'IA'}</Text>
      </View>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{formatContent(message.content)}</Text>
        <Text style={[styles.bubbleTime, isUser && styles.bubbleTimeUser]}>{message.time}</Text>
      </View>
    </View>
  );
}

function AiChatScreenContent() {
  const toast = useToast();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: nextId(),
      role: 'assistant',
      content:
        '¡Hola! Soy tu asistente IA de myPOS. Puedo ayudarte a consultar ventas, inventario, compras, clientes, proveedores, categorías y turnos. ¿En qué puedo ayudarte hoy?',
      time: timeLabel(),
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const scrollToEnd = () => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    if (trimmed.length < 3) {
      toast.error('Escribe al menos 3 caracteres');
      return;
    }

    const userMessage: ChatMessage = { id: nextId(), role: 'user', content: trimmed, time: timeLabel() };
    const historyPayload: AiHistoryItem[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
      intent: m.intent,
      data: m.data,
    }));

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);
    scrollToEnd();

    try {
      const result = await aiChatService.query(trimmed, historyPayload);
      const assistantMessage: ChatMessage = {
        id: nextId(),
        role: 'assistant',
        content: result.summary,
        intent: result.intent?.intent,
        data: result.data,
        time: timeLabel(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'No se pudo contactar al asistente IA');
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: 'assistant',
          content: 'No pude procesar tu consulta en este momento. Intenta de nuevo en unos segundos.',
          time: timeLabel(),
        },
      ]);
    } finally {
      setSending(false);
      scrollToEnd();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>IA</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Asistente IA</Text>
          <Text style={styles.headerSubtitle}>myPOS</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          style={styles.messagesArea}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={scrollToEnd}
        >
          {messages.map((m) => (
            <ChatBubble key={m.id} message={m} />
          ))}
          {sending && (
            <View style={styles.bubbleRow}>
              <View style={[styles.avatar, styles.avatarAssistant]}>
                <Text style={styles.avatarText}>IA</Text>
              </View>
              <View style={[styles.bubble, styles.bubbleAssistant, styles.typingBubble]}>
                <ActivityIndicator size="small" color={Colors.textLight} />
              </View>
            </View>
          )}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.suggestionsRow}
          contentContainerStyle={styles.suggestionsContent}
        >
          {SUGGESTED_QUESTIONS.map((q) => (
            <TouchableOpacity key={q} style={styles.suggestionChip} onPress={() => send(q)} disabled={sending}>
              <Text style={styles.suggestionChipText}>{q}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            style={styles.composerInput}
            value={input}
            onChangeText={setInput}
            placeholder="Escribe tu consulta al asistente IA…"
            placeholderTextColor={Colors.textLight}
            multiline
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || sending) && styles.sendButtonDisabled]}
            onPress={() => send(input)}
            disabled={!input.trim() || sending}
          >
            <Ionicons name="send" size={16} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function AiChatScreen() {
  // El propio web solo concede acceso a IA cuando el usuario tiene
  // `view_settings` — sus otras dos condiciones (`manage_roles`/`edit_roles`)
  // nunca se cumplen porque `/api/hub` (de donde vienen los permisos del
  // usuario) filtra la consulta a `permission_name LIKE 'view_%'`, así que
  // esos permisos jamás llegan al cliente. Se replica el único chequeo que
  // realmente puede pasar.
  return (
    <RequirePermission perm="view_settings">
      <AiChatScreenContent />
    </RequirePermission>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    ...Shadow.sm,
  },
  backButton: {
    marginRight: 2,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
  },
  messagesArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  messagesContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  bubbleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-end',
  },
  bubbleRowUser: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarUser: {
    backgroundColor: Colors.primaryDark,
  },
  avatarAssistant: {
    backgroundColor: '#7C3AED',
  },
  avatarText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: FontWeight.bold,
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Shadow.sm,
  },
  bubbleUser: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typingBubble: {
    paddingVertical: Spacing.md,
  },
  bubbleText: {
    fontSize: FontSize.sm,
    color: Colors.text,
    lineHeight: 20,
  },
  bubbleTextUser: {
    color: Colors.white,
  },
  bubbleTime: {
    fontSize: 10,
    color: Colors.textLight,
    marginTop: 4,
    textAlign: 'right',
  },
  bubbleTimeUser: {
    color: '#E0E7FF',
  },
  suggestionsRow: {
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  suggestionsContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  suggestionChip: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  suggestionChipText: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: '600',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  composerInput: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.textLight,
  },
});
