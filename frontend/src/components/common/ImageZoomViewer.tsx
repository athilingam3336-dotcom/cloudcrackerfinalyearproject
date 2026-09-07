import React, { useCallback, useEffect } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Text,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;
const DISMISS_THRESHOLD = 150;

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 0.8,
};

const TIMING_CONFIG = {
  duration: 250,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
};

interface ImageZoomViewerProps {
  visible: boolean;
  imageSource: any;
  onClose: () => void;
  title?: string;
}

export const ImageZoomViewer: React.FC<ImageZoomViewerProps> = ({
  visible,
  imageSource,
  onClose,
  title,
}) => {
  // Animated values for transforms
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const overlayOpacity = useSharedValue(1);
  const imageOpacity = useSharedValue(0);

  // Reset all transforms
  const resetTransforms = useCallback(() => {
    'worklet';
    scale.value = withTiming(1, TIMING_CONFIG);
    savedScale.value = 1;
    translateX.value = withTiming(0, TIMING_CONFIG);
    translateY.value = withTiming(0, TIMING_CONFIG);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    overlayOpacity.value = withTiming(1, TIMING_CONFIG);
  }, []);

  // Animate in when visible
  useEffect(() => {
    if (visible) {
      imageOpacity.value = withTiming(1, { duration: 200 });
      overlayOpacity.value = 1;
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    } else {
      imageOpacity.value = 0;
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Clamp translation to keep image within bounds when zoomed
  const clampTranslation = useCallback(
    (tx: number, ty: number, currentScale: number) => {
      'worklet';
      if (currentScale <= 1) {
        return { x: 0, y: 0 };
      }
      const maxX = ((currentScale - 1) * SCREEN_WIDTH) / 2;
      const maxY = ((currentScale - 1) * SCREEN_HEIGHT) / 2;
      return {
        x: Math.max(-maxX, Math.min(maxX, tx)),
        y: Math.max(-maxY, Math.min(maxY, ty)),
      };
    },
    []
  );

  // Pinch gesture for zoom
  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      'worklet';
      const newScale = Math.max(
        MIN_SCALE * 0.5,
        Math.min(MAX_SCALE, savedScale.value * event.scale)
      );
      scale.value = newScale;
    })
    .onEnd(() => {
      'worklet';
      let finalScale = scale.value;
      if (finalScale < MIN_SCALE) {
        finalScale = MIN_SCALE;
        scale.value = withSpring(MIN_SCALE, SPRING_CONFIG);
      } else if (finalScale > MAX_SCALE) {
        finalScale = MAX_SCALE;
        scale.value = withSpring(MAX_SCALE, SPRING_CONFIG);
      }
      savedScale.value = finalScale;

      // Re-clamp translations after scale change
      if (finalScale <= 1) {
        translateX.value = withSpring(0, SPRING_CONFIG);
        translateY.value = withSpring(0, SPRING_CONFIG);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        const clamped = clampTranslation(
          translateX.value,
          translateY.value,
          finalScale
        );
        translateX.value = withSpring(clamped.x, SPRING_CONFIG);
        translateY.value = withSpring(clamped.y, SPRING_CONFIG);
        savedTranslateX.value = clamped.x;
        savedTranslateY.value = clamped.y;
      }
    });

  // Pan gesture for dragging
  const panGesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(2)
    .onUpdate((event) => {
      'worklet';
      if (scale.value > 1) {
        // When zoomed in, pan the image
        translateX.value = savedTranslateX.value + event.translationX;
        translateY.value = savedTranslateY.value + event.translationY;
      } else {
        // When not zoomed, use vertical drag for dismiss gesture
        translateY.value = event.translationY;
        translateX.value = 0;
        const progress = Math.abs(event.translationY) / DISMISS_THRESHOLD;
        overlayOpacity.value = Math.max(0.2, 1 - progress * 0.6);
      }
    })
    .onEnd((event) => {
      'worklet';
      if (scale.value > 1) {
        // Clamp to bounds with spring animation
        const clamped = clampTranslation(
          translateX.value,
          translateY.value,
          scale.value
        );
        translateX.value = withSpring(clamped.x, SPRING_CONFIG);
        translateY.value = withSpring(clamped.y, SPRING_CONFIG);
        savedTranslateX.value = clamped.x;
        savedTranslateY.value = clamped.y;
      } else {
        // Check if user swiped down enough to dismiss
        if (Math.abs(event.translationY) > DISMISS_THRESHOLD) {
          // Dismiss
          const direction = event.translationY > 0 ? 1 : -1;
          translateY.value = withTiming(
            direction * SCREEN_HEIGHT,
            { duration: 200 },
            () => {
              runOnJS(handleClose)();
            }
          );
          overlayOpacity.value = withTiming(0, { duration: 200 });
        } else {
          // Snap back
          translateX.value = withSpring(0, SPRING_CONFIG);
          translateY.value = withSpring(0, SPRING_CONFIG);
          overlayOpacity.value = withTiming(1, TIMING_CONFIG);
          savedTranslateX.value = 0;
          savedTranslateY.value = 0;
        }
      }
    });

  // Double-tap gesture for zoom toggle
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(300)
    .onEnd((event) => {
      'worklet';
      if (scale.value > 1.1) {
        // Zoom out to 1x
        scale.value = withSpring(1, SPRING_CONFIG);
        savedScale.value = 1;
        translateX.value = withSpring(0, SPRING_CONFIG);
        translateY.value = withSpring(0, SPRING_CONFIG);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        // Zoom in to DOUBLE_TAP_SCALE centered on tap point
        const targetScale = DOUBLE_TAP_SCALE;
        // Calculate offset to zoom towards the tapped point
        const focalX = event.x - SCREEN_WIDTH / 2;
        const focalY = event.y - SCREEN_HEIGHT / 2;
        const offsetX = focalX * (1 - targetScale);
        const offsetY = focalY * (1 - targetScale);

        const clamped = clampTranslation(offsetX, offsetY, targetScale);

        scale.value = withSpring(targetScale, SPRING_CONFIG);
        savedScale.value = targetScale;
        translateX.value = withSpring(clamped.x, SPRING_CONFIG);
        translateY.value = withSpring(clamped.y, SPRING_CONFIG);
        savedTranslateX.value = clamped.x;
        savedTranslateY.value = clamped.y;
      }
    });

  // Combine gestures: pinch + pan are simultaneous, double-tap is exclusive
  const composedGesture = Gesture.Simultaneous(
    pinchGesture,
    Gesture.Exclusive(doubleTapGesture, panGesture)
  );

  // Animated styles
  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: imageOpacity.value,
  }));

  const animatedOverlayStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(0, 0, 0, ${overlayOpacity.value * 0.95})`,
  }));

  const animatedHeaderStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
      supportedOrientations={['portrait', 'landscape']}
    >
      <StatusBar hidden={Platform.OS !== 'web'} />
      <GestureHandlerRootView style={styles.gestureRoot}>
        <Animated.View style={[styles.overlay, animatedOverlayStyle]}>
          {/* Header with close button and title */}
          <Animated.View style={[styles.header, animatedHeaderStyle]}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <MaterialIcons name="close" size={26} color="#ffffff" />
            </TouchableOpacity>
            {title ? (
              <Text style={styles.headerTitle} numberOfLines={1}>
                {title}
              </Text>
            ) : null}
            <View style={styles.headerSpacer} />
          </Animated.View>

          {/* Zoomable image */}
          <GestureDetector gesture={composedGesture}>
            <Animated.View style={[styles.imageContainer, animatedImageStyle]}>
              <Image
                source={imageSource}
                style={styles.fullImage}
                resizeMode="contain"
              />
            </Animated.View>
          </GestureDetector>

          {/* Bottom hint */}
          <Animated.View style={[styles.footer, animatedHeaderStyle]}>
            <Text style={styles.hintText}>
              Pinch to zoom • Double-tap to toggle • Swipe down to close
            </Text>
          </Animated.View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'web' ? 16 : 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
    marginHorizontal: 12,
  },
  headerSpacer: {
    width: 44,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'web' ? 20 : 40,
    paddingTop: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 10,
  },
  hintText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    letterSpacing: 0.3,
  },
});

export default ImageZoomViewer;
