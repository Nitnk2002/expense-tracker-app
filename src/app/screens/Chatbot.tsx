import React, { useState, useContext, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { X, Send, User } from 'lucide-react-native';
import { Typography } from '../components/Typography';
import { Input } from '../components/Input';
import { FadeInView } from '../components/FadeInView';
import { Logo } from '../components/Logo';
import { spacing, rounded } from '../theme/tokens';
import { useTheme } from '../context/ThemeContext';
import { ExpenseContext } from '../context/ExpenseContext';

type Message = {
  id: string;
  text: string;
  isUser: boolean;
};

const DS_API_BASE_URL = 'http://177.171.101.42:8010';

const Chatbot = ({ navigation }: any) => {
  const { colors } = useTheme();
  const { expenses } = useContext(ExpenseContext);
  
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', text: 'Hi! I am your AI Expense Assistant. Ask me anything about your finances.', isUser: false }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const storedData = await AsyncStorage.getItem('@chat_history');
        if (storedData) {
          const { history, timestamp } = JSON.parse(storedData);
          const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
          if (Date.now() - timestamp < ONE_WEEK_MS) {
            setMessages(history);
          } else {
            await AsyncStorage.removeItem('@chat_history');
          }
        }
      } catch (error) {
        console.error('Failed to load chat history', error);
      }
    };
    loadHistory();
  }, []);

  // Save chat history when it changes
  useEffect(() => {
    if (messages.length > 1) {
      AsyncStorage.setItem('@chat_history', JSON.stringify({
        history: messages,
        timestamp: Date.now()
      })).catch(console.error);
    }
  }, [messages]);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch(`${DS_API_BASE_URL}/v1/ds/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userMessage.text,
          expenses: expenses,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: data.reply,
          isUser: false,
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch response');
      }
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `Sorry, I encountered an error: ${error.message}`,
        isUser: false,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const dynamicStyles = {
    screen: {
      flex: 1,
      backgroundColor: colors.canvasSoft,
    },
    header: {
      backgroundColor: colors.canvas,
      borderBottomColor: colors.hairline,
    },
    userBubble: {
      backgroundColor: colors.primary,
    },
    aiBubble: {
      backgroundColor: colors.canvas,
      borderColor: colors.hairline,
      borderWidth: 1,
    },
    inputArea: {
      backgroundColor: colors.canvas,
      borderTopColor: colors.hairline,
    }
  };

  return (
    <SafeAreaView style={dynamicStyles.screen} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, dynamicStyles.header]}>
        <View style={styles.headerLeft}>
          <Logo showText={false} size={28} color={colors.primary} style={{ marginBottom: 0 }} />
          <View style={styles.headerTextContainer}>
            <Typography variant="bodyLgStrong">Expense AI Assistant</Typography>
            <Typography variant="caption" style={{ color: colors.mute }}>Powered by Mistral</Typography>
          </View>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <X color={colors.ink} size={24} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent} 
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg, index) => (
            <FadeInView key={msg.id} delay={100} style={[
              styles.messageRow,
              msg.isUser ? styles.messageRowUser : styles.messageRowAI
            ]}>
              {!msg.isUser && (
                <View style={[styles.avatar, { backgroundColor: colors.canvasSoft2 }]}>
                  <Logo showText={false} size={16} color={colors.primary} style={{ marginBottom: 0 }} />
                </View>
              )}
              
              <View style={[
                styles.bubble,
                msg.isUser ? dynamicStyles.userBubble : dynamicStyles.aiBubble,
                msg.isUser ? styles.userBubbleCorners : styles.aiBubbleCorners
              ]}>
                <Typography style={{ color: msg.isUser ? colors.onPrimary : colors.text }}>
                  {msg.text.replace(/\*\*/g, '').replace(/\*/g, '')}
                </Typography>
              </View>

              {msg.isUser && (
                <View style={[styles.avatar, { backgroundColor: colors.primary, marginLeft: spacing.sm }]}>
                  <User color={colors.onPrimary} size={16} />
                </View>
              )}
            </FadeInView>
          ))}
          
          {isLoading && (
            <View style={[styles.messageRow, styles.messageRowAI]}>
              <View style={[styles.avatar, { backgroundColor: colors.canvasSoft2 }]}>
                <Logo showText={false} size={16} color={colors.primary} style={{ marginBottom: 0 }} />
              </View>
              <View style={[styles.bubble, dynamicStyles.aiBubble, styles.aiBubbleCorners, styles.loadingBubble]}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            </View>
          )}
        </ScrollView>

        <View style={[styles.inputArea, dynamicStyles.inputArea]}>
          <View style={styles.inputContainer}>
            <Input
              placeholder="Ask a question..."
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSend}
              style={styles.textInput}
            />
            <TouchableOpacity 
              style={[styles.sendButton, { backgroundColor: inputText.trim() ? colors.primary : colors.mute }]} 
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading}
            >
              <Send color={colors.onPrimary} size={20} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTextContainer: {
    marginLeft: spacing.sm,
  },
  iconButton: {
    padding: spacing.xs,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAI: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  bubble: {
    maxWidth: '75%',
    flexShrink: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  userBubbleCorners: {
    borderTopLeftRadius: rounded.lg,
    borderTopRightRadius: rounded.lg,
    borderBottomLeftRadius: rounded.lg,
    borderBottomRightRadius: 4,
  },
  aiBubbleCorners: {
    borderTopLeftRadius: rounded.lg,
    borderTopRightRadius: rounded.lg,
    borderBottomRightRadius: rounded.lg,
    borderBottomLeftRadius: 4,
  },
  loadingBubble: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  inputArea: {
    padding: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.md,
    borderTopWidth: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    marginRight: spacing.sm,
    marginBottom: 0,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: rounded.full,
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default Chatbot;
