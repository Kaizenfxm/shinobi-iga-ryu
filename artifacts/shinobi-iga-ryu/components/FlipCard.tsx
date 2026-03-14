import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Easing,
} from "react-native-reanimated";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = 180;

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

interface FlipCardProps {
  title: string;
  subtitle: string;
  icon: IconName;
  onKnowledgePress: () => void;
  onExercisesPress: () => void;
  index: number;
}

export default function FlipCard({
  title,
  subtitle,
  icon,
  onKnowledgePress,
  onExercisesPress,
  index,
}: FlipCardProps) {
  const rotation = useSharedValue(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const toValue = isFlipped ? 0 : 180;
    rotation.value = withTiming(toValue, {
      duration: 500,
      easing: Easing.inOut(Easing.cubic),
    });
    setIsFlipped(!isFlipped);
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
      <Animated.View style={[styles.card, styles.cardFront, frontAnimatedStyle]}>
        <View style={styles.frontOverlay}>
          <MaterialCommunityIcons
            name={icon}
            size={48}
            color="rgba(255, 255, 255, 0.08)"
            style={styles.bgIcon}
          />
          <View style={styles.frontContent}>
            <MaterialCommunityIcons name={icon} size={36} color="#FFFFFF" />
            <View style={styles.titleGroup}>
              <Text style={styles.cardTitle}>{title}</Text>
              <Text style={styles.cardSubtitle}>{subtitle}</Text>
            </View>
          </View>
          <View style={styles.tapHint}>
            <Ionicons name="hand-left-outline" size={14} color="#555" />
            <Text style={styles.tapHintText}>Toca para ver más</Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View style={[styles.card, styles.cardBack, backAnimatedStyle]}>
        <View style={styles.backContent}>
          <Text style={styles.backTitle}>{title}</Text>
          <View style={styles.backLine} />
          <View style={styles.buttonsRow}>
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
              <Ionicons name="book-outline" size={24} color="#FFFFFF" />
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
              <Ionicons name="fitness-outline" size={24} color="#FFFFFF" />
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
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    alignSelf: "center",
    marginVertical: 8,
  },
  card: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
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
  frontOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  bgIcon: {
    position: "absolute",
    right: 20,
    top: 20,
    transform: [{ scale: 2.5 }],
  },
  frontContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  titleGroup: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 22,
    color: "#FFFFFF",
    letterSpacing: 2,
  },
  cardSubtitle: {
    fontFamily: "NotoSerifJP_400Regular",
    fontSize: 13,
    color: "#666666",
    letterSpacing: 1,
    marginTop: 2,
  },
  tapHint: {
    position: "absolute",
    bottom: 12,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tapHintText: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 10,
    color: "#444444",
  },
  backContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  backTitle: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 18,
    color: "#FFFFFF",
    letterSpacing: 4,
    marginBottom: 12,
  },
  backLine: {
    width: 40,
    height: 1,
    backgroundColor: "#333333",
    marginBottom: 20,
  },
  buttonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  actionButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
  },
  actionButtonPressed: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 13,
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  buttonDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#222222",
  },
});
