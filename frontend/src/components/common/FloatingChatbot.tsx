import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Platform,
  Image,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AiChatService, ChatMessage } from '@/services/aiChatService';
import { ProductItem } from '@/constants/mockData';
import { useCartStore } from '@/store/cartStore';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';

const aiService = AiChatService.getInstance();

export const FloatingChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'ai',
      text: '🔐 **Welcome, Admin!**\n\nI am **Meera Admin AI** — your store intelligence assistant with live access to:\n\n📊 Revenue & Sales Data\n📦 Live Stock & Inventory\n🚚 Order Status & Pipeline\n👥 User Analytics\n🎟️ Coupon Management\n\nAsk me in **English, Tamil, or Thanglish!** Try:\n• "Today revenue evlo?"\n• "Low stock sollu"\n• "Pending orders status"\n• "Top selling products"',
      timestamp: new Date(),
    },
  ]);

  const isDarkMode = useUiStore((state) => state.isDarkMode);
  const addToCart = useCartStore((state) => state.addToCart);
  const navigation = useNavigation<any>();
  const user = useAuthStore((state) => state.user);

  // Admin role மட்டும் chatbot காட்டு
  if (!user || user.role !== 'admin') return null;

  const scrollViewRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const minimizeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isOpen ? 1 : 0,
      useNativeDriver: Platform.OS !== 'web',
      friction: 8,
      tension: 60,
    }).start();
  }, [isOpen]);

  useEffect(() => {
    Animated.spring(minimizeAnim, {
      toValue: isMinimized ? 1 : 0,
      useNativeDriver: Platform.OS !== 'web',
      friction: 8,
      tension: 60,
    }).start();
  }, [isMinimized]);

  // Open chat fully
  const handleOpen = () => {
    setIsMinimized(false);
    setIsOpen(true);
  };

  // Minimize — keep history, hide drawer, show small bar
  const handleMinimize = () => {
    setIsOpen(false);
    setIsMinimized(true);
  };

  // Close fully — back to FAB only
  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  // FAB tap: if open → minimize; if minimized/closed → open
  const handleFabPress = () => {
    if (isOpen) {
      handleMinimize();
    } else {
      handleOpen();
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsLoading(true);
    scrollToBottom();

    try {
      const res = await aiService.sendMessage(query, messages);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: res.text,
        timestamp: new Date(),
        recommendedProducts: res.recommendedProducts,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          text: '🎆 Contact Meera Crackers support directly via **WhatsApp: +91 7339624431** or Email **Meeracrackers@gmail.com** for immediate help!',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'ai',
        text: '🔄 **Chat cleared!** Ready to assist you with live store data.\n\nAsk me anything about revenue, stock, orders, users, or coupons — in English, Tamil, or Thanglish!',
        timestamp: new Date(),
      },
    ]);
  };

  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, lIdx) => {
      // Split bold text formatted like **text**
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <Text key={`line-${lIdx}`} style={styles.messageLine}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <Text key={`p-${pIdx}`} style={styles.boldText}>
                  {part.slice(2, -2)}
                </Text>
              );
            }
            return part;
          })}
          {'\n'}
        </Text>
      );
    });
  };

  return (
    <>
      {/* ── FULL CHAT DRAWER ── */}
      {isOpen && (
        <View
          style={[
            styles.drawerWrapper,
            Platform.OS === 'web' && (styles.webFixedDrawer as any),
          ]}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.chatContainer,
              isDarkMode && styles.darkContainer,
            ]}
          >
            {/* Header — tap title area to minimize, X to close fully */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.headerLeft}
                onPress={handleMinimize}
                activeOpacity={0.8}
              >
                <View style={styles.avatarCircle}>
                  <MaterialIcons name="auto-awesome" size={20} color="#ffffff" />
                </View>
                <View>
                  <Text style={styles.headerTitle}>Meera Admin AI 🔐</Text>
                  <View style={styles.statusRow}>
                    <View style={styles.onlineDot} />
                    <Text style={styles.statusText}>Admin Panel • Live Data</Text>
                  </View>
                </View>
              </TouchableOpacity>
              <View style={styles.headerRight}>
                <TouchableOpacity
                  onPress={handleClearHistory}
                  style={styles.iconBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialIcons name="refresh" size={20} color="#ffffff" />
                </TouchableOpacity>
                {/* Minimize button */}
                <TouchableOpacity
                  onPress={handleMinimize}
                  style={styles.iconBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialIcons name="remove" size={22} color="#ffffff" />
                </TouchableOpacity>
                {/* Close fully button */}
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.iconBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialIcons name="close" size={22} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Messages Body */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.map((item) => {
                const isAi = item.sender === 'ai';
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.messageRow,
                      isAi ? styles.aiRow : styles.userRow,
                    ]}
                  >
                    {isAi && (
                      <View style={styles.smallAiAvatar}>
                        <MaterialIcons name="auto-awesome" size={12} color="#ffffff" />
                      </View>
                    )}
                    <View
                      style={[
                        styles.bubble,
                        isAi
                          ? isDarkMode
                            ? styles.aiBubbleDark
                            : styles.aiBubble
                          : styles.userBubble,
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          isAi
                            ? isDarkMode
                              ? styles.aiTextDark
                              : styles.aiText
                            : styles.userText,
                        ]}
                      >
                        {renderFormattedText(item.text)}
                      </Text>

                      {/* Product Recommendations horizontal list */}
                      {item.recommendedProducts && item.recommendedProducts.length > 0 && (
                        <View style={styles.recommendedContainer}>
                          <Text style={[styles.recTitle, isDarkMode && styles.textLight]}>
                            Recommended Fireworks:
                          </Text>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.recScrollView}
                          >
                            {item.recommendedProducts.map((prod) => (
                              <View
                                key={prod.id}
                                style={[
                                  styles.prodCard,
                                  isDarkMode && styles.prodCardDark,
                                ]}
                              >
                                {prod.imageUrl ? (
                                  <Image
                                    source={{ uri: prod.imageUrl }}
                                    style={styles.prodImg}
                                    resizeMode="cover"
                                  />
                                ) : (
                                  <View style={styles.prodImgPlaceholder}>
                                    <MaterialIcons name="local-fire-department" size={24} color="#d97706" />
                                  </View>
                                )}
                                <Text
                                  numberOfLines={1}
                                  style={[styles.prodName, isDarkMode && styles.textLight]}
                                >
                                  {prod.title}
                                </Text>
                                <Text style={styles.prodPrice}>₹{prod.price}</Text>
                                <TouchableOpacity
                                  style={styles.addCartBtn}
                                  onPress={async () => {
                                    await addToCart(prod);
                                    if (Platform.OS === 'web' && typeof window !== 'undefined') {
                                      window.alert(`Added "${prod.title}" to cart! 🎇`);
                                    }
                                  }}
                                >
                                  <MaterialIcons name="shopping-cart" size={14} color="#ffffff" />
                                  <Text style={styles.addCartText}>Add</Text>
                                </TouchableOpacity>
                              </View>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}

              {isLoading && (
                <View style={[styles.messageRow, styles.aiRow]}>
                  <View style={styles.smallAiAvatar}>
                    <MaterialIcons name="auto-awesome" size={12} color="#ffffff" />
                  </View>
                  <View style={[styles.bubble, styles.aiBubble, isDarkMode && styles.aiBubbleDark]}>
                    <View style={styles.typingRow}>
                      <ActivityIndicator size="small" color="#dc2626" />
                      <Text style={[styles.typingText, isDarkMode && styles.textLight]}>
                        Admin AI analyzing live data...
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Quick Admin Action Chips */}
            <View style={[styles.chipsWrapper, isDarkMode && styles.chipsWrapperDark]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[styles.chip, isDarkMode && styles.chipDark]}
                  onPress={() => handleSend('Give me the full dashboard summary with today revenue and pending orders')}
                >
                  <Text style={[styles.chipText, isDarkMode && styles.textLight]}>📊 Dashboard</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, isDarkMode && styles.chipDark]}
                  onPress={() => handleSend('Show me all low stock and out of stock products')}
                >
                  <Text style={[styles.chipText, isDarkMode && styles.textLight]}>⚠️ Stock Alerts</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, isDarkMode && styles.chipDark]}
                  onPress={() => handleSend('How many pending orders are there? Show me the recent orders status')}
                >
                  <Text style={[styles.chipText, isDarkMode && styles.textLight]}>🚚 Orders</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, isDarkMode && styles.chipDark]}
                  onPress={() => handleSend('What is today revenue and total all time revenue?')}
                >
                  <Text style={[styles.chipText, isDarkMode && styles.textLight]}>💰 Revenue</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, isDarkMode && styles.chipDark]}
                  onPress={() => handleSend('Show me the top selling products by revenue')}
                >
                  <Text style={[styles.chipText, isDarkMode && styles.textLight]}>🏆 Top Products</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, isDarkMode && styles.chipDark]}
                  onPress={() => handleSend('List all active coupons with their discount details')}
                >
                  <Text style={[styles.chipText, isDarkMode && styles.textLight]}>🎟️ Coupons</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, isDarkMode && styles.chipDark]}
                  onPress={() => handleSend('How many total registered users do we have?')}
                >
                  <Text style={[styles.chipText, isDarkMode && styles.textLight]}>👥 Users</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* Input Bar */}
            <View style={[styles.inputBar, isDarkMode && styles.inputBarDark]}>
              <TextInput
                style={[styles.input, isDarkMode && styles.inputDark]}
                placeholder="Ask in English, Tamil, or Thanglish..."
                placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => handleSend()}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  (!inputText.trim() || isLoading) && styles.sendBtnDisabled,
                ]}
                onPress={() => handleSend()}
                disabled={!inputText.trim() || isLoading}
              >
                <MaterialIcons name="send" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* ── MINIMIZED BAR — shown when chat is minimized ── */}
      {isMinimized && !isOpen && (
        <View
          style={[
            styles.minimizedBarWrapper,
            Platform.OS === 'web' && (styles.webFixedMinimizedBar as any),
          ]}
        >
          <TouchableOpacity
            style={styles.minimizedBar}
            onPress={handleOpen}
            activeOpacity={0.9}
          >
            <View style={styles.minimizedLeft}>
              <View style={styles.minimizedAvatar}>
                <MaterialIcons name="auto-awesome" size={14} color="#ffffff" />
              </View>
              <View>
                <Text style={styles.minimizedTitle}>Meera Admin AI 🔐</Text>
                <Text style={styles.minimizedSub}>
                  {messages.length > 1
                    ? messages[messages.length - 1].text.slice(0, 38) + '...'
                    : 'Tap to open chat'}
                </Text>
              </View>
            </View>
            <View style={styles.minimizedRight}>
              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.minimizedCloseBtn}
              >
                <MaterialIcons name="close" size={16} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* ── FAB BUTTON — only show when NOT minimized ── */}
      {!isMinimized && (
        <View
          style={[
            styles.fabWrapper,
            Platform.OS === 'web' && (styles.webFixedFab as any),
          ]}
        >
          <TouchableOpacity
            style={styles.fabButton}
            activeOpacity={0.85}
            onPress={handleFabPress}
          >
            <View style={styles.fabContent}>
              <MaterialIcons
                name={isOpen ? 'remove' : 'chat'}
                size={26}
                color="#ffffff"
              />
              <View style={styles.fabBadge}>
                <Text style={styles.fabBadgeText}>AI</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  // ── Minimized bar styles ──────────────────────────────────────────────────
  webFixedMinimizedBar: {
    position: 'fixed' as any,
    right: 24,
    bottom: 24,
    zIndex: 99999,
  },
  minimizedBarWrapper: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    zIndex: 99999,
  },
  minimizedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#b91c1c',
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 220,
    maxWidth: 320,
    shadowColor: '#b91c1c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  minimizedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  minimizedAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  minimizedTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  minimizedSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    maxWidth: 160,
  },
  minimizedRight: {
    marginLeft: 6,
  },
  minimizedCloseBtn: {
    padding: 4,
  },

  // ── FAB styles ─────────────────────────────────────────────────────────────
  webFixedFab: {
    position: 'fixed' as any,
    right: 24,
    bottom: 24,
    zIndex: 99999,
  },
  fabWrapper: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    zIndex: 99999,
  },
  fabButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 12,
  },
  fabContent: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabBadge: {
    position: 'absolute',
    top: -8,
    right: -10,
    backgroundColor: '#fbbf24',
    borderRadius: 9,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  fabBadgeText: {
    color: '#78350f',
    fontSize: 10,
    fontWeight: '800',
  },

  webFixedDrawer: {
    position: 'fixed' as any,
    right: 24,
    bottom: 95,
    zIndex: 99998,
  },
  drawerWrapper: {
    position: 'absolute',
    right: 16,
    bottom: 85,
    zIndex: 99998,
  },
  chatContainer: {
    width: 380,
    maxWidth: '92vw' as any,
    height: 540,
    maxHeight: '75vh' as any,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.8)',
    display: 'flex',
    flexDirection: 'column',
  },
  darkContainer: {
    backgroundColor: '#1e1f26',
    borderColor: '#33343d',
  },

  header: {
    backgroundColor: '#b91c1c',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#34d399',
  },
  statusText: {
    color: '#fecaca',
    fontSize: 11,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    padding: 4,
    borderRadius: 12,
  },

  messagesList: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  messagesContent: {
    padding: 14,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  aiRow: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    gap: 8,
  },
  smallAiAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  bubble: {
    maxWidth: '84%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: '#dc2626',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#f3f4f6',
    borderBottomLeftRadius: 4,
  },
  aiBubbleDark: {
    backgroundColor: '#2b2d38',
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  messageLine: {
    marginVertical: 1,
  },
  userText: {
    color: '#ffffff',
  },
  aiText: {
    color: '#1f2937',
  },
  aiTextDark: {
    color: '#e5e7eb',
  },
  boldText: {
    fontWeight: '700',
  },

  recommendedContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(209, 213, 219, 0.4)',
  },
  recTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  textLight: {
    color: '#f3f4f6',
  },
  recScrollView: {
    flexDirection: 'row',
  },
  prodCard: {
    width: 125,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  prodCardDark: {
    backgroundColor: '#1a1b22',
    borderColor: '#374151',
  },
  prodImg: {
    width: 90,
    height: 65,
    borderRadius: 8,
    marginBottom: 6,
  },
  prodImgPlaceholder: {
    width: 90,
    height: 65,
    borderRadius: 8,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  prodName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 2,
  },
  prodPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: '#dc2626',
    marginBottom: 6,
  },
  addCartBtn: {
    backgroundColor: '#dc2626',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addCartText: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '700',
  },

  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typingText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },

  chipsWrapper: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  chipsWrapperDark: {
    backgroundColor: '#16171d',
    borderTopColor: '#2d2e38',
  },
  chip: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  chipDark: {
    backgroundColor: '#272832',
    borderColor: '#374151',
  },
  chipText: {
    fontSize: 11.5,
    color: '#374151',
    fontWeight: '600',
  },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 8,
  },
  inputBarDark: {
    backgroundColor: '#1e1f26',
    borderTopColor: '#33343d',
  },
  input: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13.5,
    color: '#111827',
  },
  inputDark: {
    backgroundColor: '#2b2d38',
    color: '#f3f4f6',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#9ca3af',
  },
});
