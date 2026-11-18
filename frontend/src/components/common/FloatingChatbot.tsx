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
  PanResponder,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { AiChatService, ChatMessage } from '@/services/aiChatService';
import { ProductItem } from '@/constants/mockData';
import { useCartStore } from '@/store/cartStore';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';

const aiService = AiChatService.getInstance();

const FAB_SIZE = 70;
const STORAGE_KEY = 'MEERA_CHATBOT_POSITION_V2';

const getViewportDimensions = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }
  const dims = Dimensions.get('window');
  return { width: dims.width, height: dims.height };
};

const getDefaultPosition = () => {
  const { width, height } = getViewportDimensions();
  return {
    x: Math.max(12, width - FAB_SIZE - 24),
    y: Math.max(12, height - FAB_SIZE - 24),
  };
};

const savePosition = async (pos: { x: number; y: number }) => {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
    } else {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
    }
  } catch {
    // ignore
  }
};

const loadSavedPosition = async (): Promise<{ x: number; y: number } | null> => {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } else {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    }
  } catch {
    return null;
  }
};

export const FloatingChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ uri: string; base64: string } | null>(null);
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

  const scrollViewRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const minimizeAnim = useRef(new Animated.Value(0)).current;

  // ── Draggable Position State ─────────────────────────────────────────────
  const [position, setPosition] = useState<{ x: number; y: number }>(() => getDefaultPosition());
  const positionRef = useRef(position);
  positionRef.current = position;

  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const dragOrigin = useRef<{ startX: number; startY: number }>({ startX: 0, startY: 0 });

  // Load saved position and watch window resize
  useEffect(() => {
    loadSavedPosition().then((saved) => {
      if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
        const { width, height } = getViewportDimensions();
        const clampedX = Math.max(12, Math.min(width - FAB_SIZE - 12, saved.x));
        const clampedY = Math.max(12, Math.min(height - FAB_SIZE - 12, saved.y));
        setPosition({ x: clampedX, y: clampedY });
      }
    });

    const handleResize = () => {
      const { width, height } = getViewportDimensions();
      setPosition((prev) => ({
        x: Math.max(12, Math.min(width - FAB_SIZE - 12, prev.x)),
        y: Math.max(12, Math.min(height - FAB_SIZE - 12, prev.y)),
      }));
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    } else {
      const sub = Dimensions.addEventListener('change', handleResize);
      return () => sub.remove();
    }
  }, []);

  // Web Mouse Drag Handler
  const handleMouseDown = (e: any) => {
    if (Platform.OS !== 'web') return;
    if (e.button !== undefined && e.button !== 0) return;

    const target = e.target as HTMLElement | null;
    if (
      target?.closest?.('button') ||
      target?.closest?.('[role="button"]') ||
      target?.tagName === 'INPUT' ||
      target?.tagName === 'TEXTAREA'
    ) {
      return;
    }

    e.preventDefault?.();

    const startMouseX = e.clientX ?? e.pageX ?? 0;
    const startMouseY = e.clientY ?? e.pageY ?? 0;
    const startX = positionRef.current.x;
    const startY = positionRef.current.y;
    let hasMoved = false;

    const onMouseMove = (moveEvt: MouseEvent) => {
      const dx = moveEvt.clientX - startMouseX;
      const dy = moveEvt.clientY - startMouseY;

      if (!hasMoved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        hasMoved = true;
        isDraggingRef.current = true;
        setIsDragging(true);
        if (typeof document !== 'undefined') {
          document.body.style.userSelect = 'none';
        }
      }

      if (hasMoved) {
        const { width, height } = getViewportDimensions();
        const newX = Math.max(8, Math.min(width - FAB_SIZE - 8, startX + dx));
        const newY = Math.max(8, Math.min(height - FAB_SIZE - 8, startY + dy));
        setPosition({ x: newX, y: newY });
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      if (typeof document !== 'undefined') {
        document.body.style.userSelect = '';
      }

      if (hasMoved) {
        savePosition(positionRef.current);
        setTimeout(() => {
          isDraggingRef.current = false;
          setIsDragging(false);
        }, 120);
      } else {
        isDraggingRef.current = false;
        setIsDragging(false);
      }
    };

    window.addEventListener('mousemove', onMouseMove, { passive: false });
    window.addEventListener('mouseup', onMouseUp);
  };

  // Web Mobile Touch Drag Handler
  const handleTouchStart = (e: any) => {
    if (Platform.OS !== 'web') return;
    const touch = e.touches?.[0];
    if (!touch) return;

    const target = e.target as HTMLElement | null;
    if (
      target?.closest?.('button') ||
      target?.closest?.('[role="button"]') ||
      target?.tagName === 'INPUT' ||
      target?.tagName === 'TEXTAREA'
    ) {
      return;
    }

    const startTouchX = touch.clientX;
    const startTouchY = touch.clientY;
    const startX = positionRef.current.x;
    const startY = positionRef.current.y;
    let hasMoved = false;

    const onTouchMove = (moveEvt: TouchEvent) => {
      const moveTouch = moveEvt.touches?.[0];
      if (!moveTouch) return;
      const dx = moveTouch.clientX - startTouchX;
      const dy = moveTouch.clientY - startTouchY;

      if (!hasMoved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
        hasMoved = true;
        isDraggingRef.current = true;
        setIsDragging(true);
      }

      if (hasMoved) {
        if (moveEvt.cancelable) moveEvt.preventDefault();
        const { width, height } = getViewportDimensions();
        const newX = Math.max(8, Math.min(width - FAB_SIZE - 8, startX + dx));
        const newY = Math.max(8, Math.min(height - FAB_SIZE - 8, startY + dy));
        setPosition({ x: newX, y: newY });
      }
    };

    const onTouchEnd = () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);

      if (hasMoved) {
        savePosition(positionRef.current);
        setTimeout(() => {
          isDraggingRef.current = false;
          setIsDragging(false);
        }, 120);
      } else {
        isDraggingRef.current = false;
        setIsDragging(false);
      }
    };

    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);
  };

  // Native Mobile PanResponder (Android / iOS)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => {
        return Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5;
      },
      onPanResponderGrant: () => {
        isDraggingRef.current = true;
        setIsDragging(true);
        dragOrigin.current = {
          startX: positionRef.current.x,
          startY: positionRef.current.y,
        };
      },
      onPanResponderMove: (_, gesture) => {
        const { width, height } = getViewportDimensions();
        const newX = Math.max(8, Math.min(width - FAB_SIZE - 8, dragOrigin.current.startX + gesture.dx));
        const newY = Math.max(8, Math.min(height - FAB_SIZE - 8, dragOrigin.current.startY + gesture.dy));
        setPosition({ x: newX, y: newY });
      },
      onPanResponderRelease: () => {
        savePosition(positionRef.current);
        setTimeout(() => {
          isDraggingRef.current = false;
          setIsDragging(false);
        }, 120);
      },
      onPanResponderTerminate: () => {
        setTimeout(() => {
          isDraggingRef.current = false;
          setIsDragging(false);
        }, 120);
      },
    })
  ).current;

  const dragHandlers =
    Platform.OS === 'web'
      ? {
          onMouseDown: handleMouseDown,
          onTouchStart: handleTouchStart,
        }
      : panResponder.panHandlers;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isOpen ? 1 : 0,
      useNativeDriver: Platform.OS !== 'web',
      friction: 8,
      tension: 60,
    }).start();
  }, [isOpen, slideAnim]);

  useEffect(() => {
    Animated.spring(minimizeAnim, {
      toValue: isMinimized ? 1 : 0,
      useNativeDriver: Platform.OS !== 'web',
      friction: 8,
      tension: 60,
    }).start();
  }, [isMinimized, minimizeAnim]);

  // Admin role mattum chatbot kaatu
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  if (!user || !isAdmin) return null;

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
    if (isDraggingRef.current) return;
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

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage({
          uri: result.assets[0].uri,
          base64: result.assets[0].base64 || '',
        });
      }
    } catch (error) {
      console.warn('Error picking image:', error);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if ((!query && !selectedImage) || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date(),
      imageUrl: selectedImage?.uri,
      imageBase64: selectedImage?.base64,
    };

    const imageBase64ToSend = selectedImage?.base64;

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setSelectedImage(null);
    setIsLoading(true);
    scrollToBottom();

    try {
      const res = await aiService.sendMessage(query, messages, imageBase64ToSend);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: res.text,
        timestamp: new Date(),
        recommendedProducts: res.recommendedProducts,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const liveSettings = useSettingsStore.getState();
      const currentWa = liveSettings.whatsappNumber || '7339624431';
      const currentEmail = liveSettings.contactEmail || 'Meeracrackers@gmail.com';
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          text: `🎆 Contact Meera Crackers support directly via **WhatsApp: +91 ${currentWa}** or Email **${currentEmail}** for immediate help!`,
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

  const { width: vpWidth, height: vpHeight } = getViewportDimensions();
  const drawerW = Math.min(380, vpWidth - 24);
  const drawerH = Math.min(540, vpHeight - 90);

  // Drawer horizontal positioning:
  let drawerX: number;
  if (position.x < vpWidth / 2) {
    drawerX = Math.max(12, Math.min(position.x, vpWidth - drawerW - 12));
  } else {
    drawerX = Math.max(12, Math.min(position.x + FAB_SIZE - drawerW, vpWidth - drawerW - 12));
  }

  // Drawer vertical positioning:
  let drawerY: number;
  if (position.y - drawerH - 12 >= 12) {
    drawerY = position.y - drawerH - 12;
  } else if (position.y + FAB_SIZE + drawerH + 12 <= vpHeight - 12) {
    drawerY = position.y + FAB_SIZE + 12;
  } else {
    drawerY = Math.max(12, Math.min(position.y - drawerH / 2, vpHeight - drawerH - 12));
  }

  // Minimized bar positioning:
  const minBarW = Math.min(300, vpWidth - 24);
  let minBarX: number;
  if (position.x < vpWidth / 2) {
    minBarX = Math.max(12, Math.min(position.x, vpWidth - minBarW - 12));
  } else {
    minBarX = Math.max(12, Math.min(position.x + FAB_SIZE - minBarW, vpWidth - minBarW - 12));
  }
  const minBarY = Math.max(12, Math.min(position.y, vpHeight - 56 - 12));

  return (
    <>
      {/* ── FULL CHAT DRAWER ── */}
      {isOpen && (
        <View
          style={[
            styles.drawerWrapper,
            {
              left: drawerX,
              top: drawerY,
            },
            Platform.OS === 'web' && ({
              position: 'fixed',
              userSelect: 'none',
            } as any),
          ]}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.chatContainer,
              isDarkMode && styles.darkContainer,
              { width: drawerW, height: drawerH },
            ]}
          >
            {/* Header — drag handle to move, buttons to minimize / close */}
            <View
              style={[
                styles.header,
                Platform.OS === 'web' && ({
                  cursor: isDragging ? 'grabbing' : 'grab',
                  userSelect: 'none',
                } as any),
              ]}
              {...dragHandlers}
            >
              <View style={styles.headerLeft}>
                <View style={styles.dragHandleIcon}>
                  <MaterialIcons name="drag-indicator" size={18} color="rgba(255, 255, 255, 0.75)" />
                </View>
                <View style={styles.avatarCircle}>
                  <MaterialIcons name="auto-awesome" size={20} color="#ffffff" />
                </View>
                <View>
                  <Text style={styles.headerTitle}>Meera Admin AI 🔐</Text>
                  <View style={styles.statusRow}>
                    <View style={styles.onlineDot} />
                    <Text style={styles.statusText}>Drag to move • Live Data</Text>
                  </View>
                </View>
              </View>
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

                      {/* Display User Attached Image */}
                      {item.imageUrl && (
                        <Image
                          source={{ uri: item.imageUrl }}
                          style={{ width: 150, height: 150, borderRadius: 8, marginTop: 8 }}
                          resizeMode="cover"
                        />
                      )}

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

            {/* Image Preview if selected */}
            {selectedImage && (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => setSelectedImage(null)}
                >
                  <MaterialIcons name="close" size={12} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            {/* Input Bar */}
            <View style={[styles.inputBar, isDarkMode && styles.inputBarDark]}>
              <TouchableOpacity
                style={styles.attachBtn}
                onPress={pickImage}
                disabled={isLoading}
              >
                <MaterialIcons name="image" size={20} color={isDarkMode ? '#9ca3af' : '#6b7280'} />
              </TouchableOpacity>
              
              <TextInput
                style={[styles.input, isDarkMode && styles.inputDark]}
                placeholder="Ask or attach image..."
                placeholderTextColor={isDarkMode ? '#9ca3af' : '#6b7280'}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => handleSend()}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  (!inputText.trim() && !selectedImage || isLoading) && styles.sendBtnDisabled,
                ]}
                onPress={() => handleSend()}
                disabled={(!inputText.trim() && !selectedImage) || isLoading}
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
            {
              left: minBarX,
              top: minBarY,
            },
            Platform.OS === 'web' && ({
              position: 'fixed',
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none',
              touchAction: 'none',
            } as any),
          ]}
          {...dragHandlers}
        >
          <TouchableOpacity
            style={styles.minimizedBar}
            onPress={() => {
              if (!isDraggingRef.current) handleOpen();
            }}
            activeOpacity={0.9}
          >
            <View style={styles.minimizedLeft}>
              <MaterialIcons name="drag-indicator" size={16} color="rgba(255,255,255,0.7)" />
              <View style={styles.minimizedAvatar}>
                <MaterialIcons name="auto-awesome" size={14} color="#ffffff" />
              </View>
              <View>
                <Text style={styles.minimizedTitle}>Meera Admin AI 🔐</Text>
                <Text style={styles.minimizedSub}>
                  {messages.length > 1
                    ? messages[messages.length - 1].text.slice(0, 36) + '...'
                    : 'Tap to open • Drag to move'}
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
            {
              left: position.x,
              top: position.y,
              transform: [{ scale: isDragging ? 1.08 : 1 }],
            },
            Platform.OS === 'web' && ({
              position: 'fixed',
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none',
              touchAction: 'none',
              transition: isDragging ? 'none' : 'transform 0.15s ease',
            } as any),
          ]}
          {...dragHandlers}
        >
          <TouchableOpacity
            style={[
              styles.fabButton,
              isDragging && styles.fabButtonDragging,
            ]}
            activeOpacity={0.88}
            onPress={handleFabPress}
          >
            {isOpen ? (
              <View style={styles.fabCloseContainer}>
                <MaterialIcons name="keyboard-arrow-down" size={28} color="#ffffff" />
              </View>
            ) : (
              <View style={styles.fabRobotWrapper}>
                <Image
                  source={require('../../../assets/ai_bot.png')}
                  style={styles.fabRobotImage}
                  resizeMode="cover"
                  // @ts-ignore
                  draggable={false}
                />
                <View style={styles.dragPillBadge}>
                  <MaterialIcons name="drag-indicator" size={10} color="#78350f" />
                  <Text style={styles.dragPillText}>AI</Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  // ── Additional Input Styles ───────────────────────────────────────────────
  imagePreviewContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    flexDirection: 'row',
  },
  imagePreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 4,
    left: 66,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachBtn: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.8)',
    backgroundColor: '#ffffff',
  },
  inputBarDark: {
    borderColor: '#374151',
    backgroundColor: '#1e1f26',
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 14,
    marginRight: 10,
  },
  inputDark: {
    backgroundColor: '#2b2d38',
    color: '#e5e7eb',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#9ca3af',
  },
  // ── Minimized bar styles ──────────────────────────────────────────────────
  webFixedMinimizedBar: {
    position: 'fixed' as any,
    zIndex: 99999,
  },
  minimizedBarWrapper: {
    position: 'absolute',
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
    gap: 8,
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
    zIndex: 99999,
  },
  fabWrapper: {
    position: 'absolute',
    zIndex: 99999,
  },
  fabButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'transparent',
    overflow: 'visible',
    shadowColor: '#b91c1c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 14,
  },
  fabButtonDragging: {
    shadowOpacity: 0.85,
    shadowRadius: 20,
    elevation: 24,
  },
  fabRobotWrapper: {
    width: 70,
    height: 70,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabCloseContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#b91c1c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabContent: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabRobotImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    // @ts-ignore
    userSelect: 'none',
    pointerEvents: 'none',
  },
  dragPillBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#fbbf24',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  dragPillText: {
    color: '#78350f',
    fontSize: 9.5,
    fontWeight: '800',
  },
  dragHandleIcon: {
    marginRight: 4,
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
    zIndex: 99998,
  },
  drawerWrapper: {
    position: 'absolute',
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
});
