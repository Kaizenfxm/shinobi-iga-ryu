import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Image,
  ImageSourcePropType,
  GestureResponderEvent,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

interface FlipCardProps {
  title: string;
  subtitle: string;
  backgroundImage: ImageSourcePropType;
  onKnowledgePress: () => void;
  onExercisesPress: () => void;
  index: number;
  size?: number;
  isFlipped: boolean;
  onFlip: (flipped: boolean) => void;
}

export default function FlipCard({
  title,
  subtitle,
  backgroundImage,
  onKnowledgePress,
  onExercisesPress,
  isFlipped,
  onFlip,
}: FlipCardProps) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    const toValue = isFlipped ? 180 : 0;
    rotation.value = withTiming(toValue, {
      duration: 500,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [isFlipped]);

  const handleFlip = (e?: GestureResponderEvent) => {
    e?.stopPropagation?.();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onFlip(!isFlipped);
  };

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(rotation.value, [0, 180], [0, 180]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
      backfaceVisibility: "hidden" as const,
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(rotation.value, [0, 180], [180, 360]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
      backfaceVisibility: "hidden" as const,
    };
  });

  return (
    <Pressable onPress={handleFlip} style={styles.container}>
      <Animated.View
        style={[styles.card, styles.cardFront, frontAnimatedStyle]}
        pointerEvents={isFlipped ? "none" : "auto"}
      >
        <Image
          source={backgroundImage}
          style={styles.bgImage}
          resizeMode="cover"
        />
        <View style={styles.bgImageOverlay} />
        <View style={styles.frontOverlay}>
          <View style={styles.frontContent}>
            <View style={styles.titleGroup}>
              <Text style={styles.cardTitle}>{title}</Text>
              <Text style={styles.cardSubtitle}>{subtitle}</Text>
            </View>
          </View>
          <View style={styles.tapHint}>
            <Ionicons name="hand-left-outline" size={12} color="#555" />
          </View>
        </View>
      </Animated.View>

      <Animated.View
        style={[styles.card, styles.cardBack, backAnimatedStyle]}
        pointerEvents={isFlipped ? "auto" : "none"}
      >
        <View style={styles.backContent}>
          <Text style={styles.backTitle}>{title}</Text>
          <View style={styles.backLine} />
          <View style={styles.buttonsCol}>
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                onKnowledgePress();
              }}
              style={({ pressed }) => [
                styles.actionButton,
                pressed && styles.actionButtonPressed,
              ]}
            >
              <Ionicons name="book-outline" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Conocimiento</Text>
            </Pressable>
            <View style={styles.buttonDivider} />
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                onExercisesPress();
              }}
              style={({ pressed }) => [
                styles.actionButton,
                pressed && styles.actionButtonPressed,
              ]}
            >
              <Ionicons name="fitness-outline" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Ejercicios</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    aspectRatio: 1,
  },
  card: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
    position: "absolute",
    overflow: "hidden",
  },
  cardFront: {
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#222222",
  },
  cardBack: {
    backgroundColor: "#0A0A0A",
    borderWidth: 1,
    borderColor: "#222222",
  },
  bgImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
    opacity: 0.45,
  },
  bgImageOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  frontOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 14,
  },
  frontContent: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  titleGroup: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 16,
    color: "#FFFFFF",
    letterSpacing: 2,
  },
  cardSubtitle: {
    fontFamily: "NotoSerifJP_400Regular",
    fontSize: 10,
    color: "#888888",
    letterSpacing: 1,
    marginTop: 2,
  },
  tapHint: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  backContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 14,
  },
  backTitle: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 14,
    color: "#FFFFFF",
    letterSpacing: 3,
    marginBottom: 8,
  },
  backLine: {
    width: 30,
    height: 1,
    backgroundColor: "#333333",
    marginBottom: 12,
  },
  buttonsCol: {
    width: "100%",
    gap: 0,
  },
  actionButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 4,
  },
  actionButtonPressed: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 11,
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  buttonDivider: {
    height: 1,
    backgroundColor: "#222222",
    marginHorizontal: 16,
  },
});
