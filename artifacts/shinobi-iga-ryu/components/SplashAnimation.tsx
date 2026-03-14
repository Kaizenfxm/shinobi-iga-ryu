import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Dimensions, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

interface SplashAnimationProps {
  onFinish: () => void;
}

function SplashContent() {
  return (
    <>
      <View style={styles.logoCircle}>
        <MaterialCommunityIcons name="ninja" size={80} color="#FFFFFF" />
      </View>
    </>
  );
}

function WebSplash({ onFinish }: SplashAnimationProps) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    requestAnimationFrame(() => setPhase(1));
    const t1 = setTimeout(() => setPhase(2), 600);
    const t2 = setTimeout(() => setPhase(3), 1200);
    const t3 = setTimeout(() => setPhase(4), 3200);
    const t4 = setTimeout(() => onFinish(), 3700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  return (
    <View
      style={[
        styles.container,
        {
          opacity: phase >= 4 ? 0 : 1,
          transition: "opacity 0.5s ease-in" as any,
        },
      ]}
    >
      <View style={styles.content}>
        <View
          style={[
            styles.logoContainer,
            {
              opacity: phase >= 1 ? 1 : 0,
              transform: [{ scale: phase >= 1 ? 1 : 0.3 }],
              transition: "opacity 0.8s ease-out, transform 1s ease-out" as any,
            },
          ]}
        >
          <View style={styles.logoCircle}>
            <MaterialCommunityIcons name="ninja" size={80} color="#FFFFFF" />
          </View>
        </View>

        <View
          style={[
            styles.line,
            {
              width: phase >= 2 ? width * 0.4 : 0,
              opacity: phase >= 2 ? 1 : 0,
              transition: "width 0.6s ease-out, opacity 0.6s ease-out" as any,
            },
          ]}
        />

        <View
          style={{
            opacity: phase >= 2 ? 1 : 0,
            transform: [{ translateY: phase >= 2 ? 0 : 20 }],
            transition: "opacity 0.6s ease-out, transform 0.6s ease-out" as any,
          }}
        >
          <Text style={styles.academyName}>SHINOBI</Text>
          <Text style={styles.academySubname}>伊賀流</Text>
          <Text style={styles.academySubnameRomaji}>IGA RYU</Text>
        </View>

        <View
          style={[
            styles.line,
            {
              width: phase >= 2 ? width * 0.4 : 0,
              opacity: phase >= 2 ? 1 : 0,
              transition: "width 0.6s ease-out, opacity 0.6s ease-out" as any,
            },
          ]}
        />

        <View
          style={{
            opacity: phase >= 3 ? 1 : 0,
            transition: "opacity 0.6s ease-out" as any,
          }}
        >
          <Text style={styles.motto}>忍者は永遠に</Text>
          <Text style={styles.mottoLatin}>NINJAS POR SIEMPRE</Text>
        </View>
      </View>
    </View>
  );
}

function NativeSplash({ onFinish }: SplashAnimationProps) {
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.3);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);
  const subtitleOpacity = useSharedValue(0);
  const lineWidth = useSharedValue(0);
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    logoOpacity.value = withTiming(1, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
    logoScale.value = withTiming(1, {
      duration: 1000,
      easing: Easing.out(Easing.back(1.2)),
    });
    lineWidth.value = withDelay(
      600,
      withTiming(width * 0.4, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      })
    );
    textOpacity.value = withDelay(800, withTiming(1, { duration: 600 }));
    textTranslateY.value = withDelay(
      800,
      withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
    subtitleOpacity.value = withDelay(1200, withTiming(1, { duration: 600 }));
    containerOpacity.value = withDelay(
      3200,
      withTiming(0, { duration: 500, easing: Easing.in(Easing.cubic) })
    );

    const timer = setTimeout(() => onFinish(), 3700);
    return () => clearTimeout(timer);
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const lineAnimatedStyle = useAnimatedStyle(() => ({
    width: lineWidth.value,
    opacity: textOpacity.value,
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const subtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      <View style={styles.content}>
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
          <View style={styles.logoCircle}>
            <MaterialCommunityIcons name="ninja" size={80} color="#FFFFFF" />
          </View>
        </Animated.View>

        <Animated.View style={[styles.line, lineAnimatedStyle]} />

        <Animated.View style={textAnimatedStyle}>
          <Text style={styles.academyName}>SHINOBI</Text>
          <Text style={styles.academySubname}>伊賀流</Text>
          <Text style={styles.academySubnameRomaji}>IGA RYU</Text>
        </Animated.View>

        <Animated.View style={[styles.line, lineAnimatedStyle]} />

        <Animated.View style={subtitleAnimatedStyle}>
          <Text style={styles.motto}>忍者は永遠に</Text>
          <Text style={styles.mottoLatin}>NINJAS POR SIEMPRE</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

export default function SplashAnimation({ onFinish }: SplashAnimationProps) {
  if (Platform.OS === "web") {
    return <WebSplash onFinish={onFinish} />;
  }
  return <NativeSplash onFinish={onFinish} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    gap: 16,
  },
  logoContainer: {
    marginBottom: 8,
  },
  logoCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  line: {
    height: 1,
    backgroundColor: "#FFFFFF",
    marginVertical: 4,
  },
  academyName: {
    fontFamily: "NotoSansJP_900Black",
    fontSize: 42,
    color: "#FFFFFF",
    letterSpacing: 12,
    textAlign: "center",
  },
  academySubname: {
    fontFamily: "NotoSerifJP_700Bold",
    fontSize: 28,
    color: "#FFFFFF",
    letterSpacing: 16,
    textAlign: "center",
    marginTop: -2,
  },
  academySubnameRomaji: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 14,
    color: "#A0A0A0",
    letterSpacing: 8,
    textAlign: "center",
    marginTop: 2,
  },
  motto: {
    fontFamily: "NotoSerifJP_400Regular",
    fontSize: 18,
    color: "#A0A0A0",
    letterSpacing: 6,
    textAlign: "center",
  },
  mottoLatin: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 12,
    color: "#666666",
    letterSpacing: 6,
    textAlign: "center",
    marginTop: 4,
  },
});
