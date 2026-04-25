import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
  Animated,
  Easing,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Path,
  G,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
  RadialGradient,
} from "react-native-svg";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { rouletteApi, getAvatarServingUrl, type RoulettePunishment, type SpinResult } from "@/lib/api";

const GOLD = "#D4AF37";
const GOLD_DIM = "#8B7220";
const GOLD_DARK = "#5A4A12";
const CREAM = "#F2EBDC";
const CREAM_ALT = "#E8DFC8";
const BLACK = "#0a0a0a";
const RED_DEEP = "#8B0A1A";

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function describeSector(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

function Wheel({
  punishments,
  rotation,
  size,
}: {
  punishments: RoulettePunishment[];
  rotation: Animated.Value;
  size: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 6;
  const innerR = outerR * 0.26;
  const n = Math.max(punishments.length, 1);
  const sweep = 360 / n;

  const animatedStyle = {
    transform: [
      {
        rotate: rotation.interpolate({
          inputRange: [0, 360],
          outputRange: ["0deg", "360deg"],
        }),
      },
    ],
  };

  // Texto radial: más caracteres permitidos porque ahora va en línea radial
  const labelMaxLen = n <= 6 ? 22 : n <= 10 ? 18 : n <= 14 ? 14 : 11;
  const fontSize = n <= 6 ? 13 : n <= 10 ? 11 : n <= 14 ? 9.5 : 8.5;
  const iconSize = n <= 8 ? size * 0.09 : n <= 14 ? size * 0.07 : size * 0.055;

  // Posiciones radiales para cada icono (en coordenadas relativas al wheel)
  const iconPositions = punishments.map((_, i) => {
    const startAngle = i * sweep;
    const midAngle = startAngle + sweep / 2;
    const iconR = outerR * 0.78;
    const pos = polarToCartesian(cx, cy, iconR, midAngle);
    return { ...pos, midAngle };
  });

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[{ width: size, height: size }, animatedStyle]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <LinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#1a1a1a" />
              <Stop offset="0.5" stopColor="#3a3a3a" />
              <Stop offset="1" stopColor="#0a0a0a" />
            </LinearGradient>
            <LinearGradient id="goldRing" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={GOLD} />
              <Stop offset="0.5" stopColor="#F1D77A" />
              <Stop offset="1" stopColor={GOLD_DARK} />
            </LinearGradient>
            <RadialGradient id="hubGrad" cx="0.5" cy="0.5" r="0.5">
              <Stop offset="0" stopColor="#1a1a1a" />
              <Stop offset="1" stopColor="#000000" />
            </RadialGradient>
          </Defs>

          {/* Outer black border */}
          <Circle cx={cx} cy={cy} r={outerR + 5} fill="url(#ringGrad)" />
          {/* Gold ring */}
          <Circle cx={cx} cy={cy} r={outerR + 1} fill="url(#goldRing)" />
          {/* Inner cream */}
          <Circle cx={cx} cy={cy} r={outerR - 1} fill={CREAM} stroke={GOLD_DIM} strokeWidth={0.5} />

          {/* Sectors */}
          {punishments.length === 0 ? (
            <Circle cx={cx} cy={cy} r={outerR - 2} fill={CREAM} />
          ) : (
            punishments.map((p, i) => {
              const startAngle = i * sweep;
              const endAngle = (i + 1) * sweep;
              const fill = i % 2 === 0 ? CREAM : CREAM_ALT;
              const path = describeSector(cx, cy, outerR - 2, startAngle, endAngle);
              const midAngle = startAngle + sweep / 2;

              // Texto radial — empieza cerca del centro y va hacia afuera
              const textInnerR = outerR * 0.36;
              const textOuterR = outerR * 0.66;
              const textStart = polarToCartesian(cx, cy, textInnerR, midAngle);
              const textEnd = polarToCartesian(cx, cy, textOuterR, midAngle);
              // Ángulo para que el texto quede legible (perpendicular al radio)
              // Usamos rotación tangencial y centramos a la mitad del span
              const textCenter = polarToCartesian(cx, cy, (textInnerR + textOuterR) / 2, midAngle);
              // Para que el texto se lea de izquierda (dentro) a derecha (afuera):
              // rotación = midAngle - 90 (alineado al radio)
              const textRot = midAngle - 90;
              // Si el texto queda boca abajo (parte inferior del círculo), girarlo 180
              const flip = midAngle > 90 && midAngle < 270;
              const finalTextRot = flip ? textRot + 180 : textRot;

              return (
                <G key={p.id}>
                  <Path d={path} fill={fill} stroke={GOLD_DIM} strokeWidth={0.6} />
                  <G rotation={finalTextRot} origin={`${textCenter.x}, ${textCenter.y}`}>
                    <SvgText
                      x={textCenter.x}
                      y={textCenter.y + fontSize * 0.35}
                      fontSize={fontSize}
                      fontWeight="700"
                      fill={BLACK}
                      textAnchor="middle"
                    >
                      {truncate(p.label, labelMaxLen)}
                    </SvgText>
                  </G>
                </G>
              );
            })
          )}

          {/* Center hub backdrop */}
          <Circle cx={cx} cy={cy} r={innerR + 6} fill={GOLD} />
          <Circle cx={cx} cy={cy} r={innerR + 2} fill="url(#hubGrad)" stroke={GOLD} strokeWidth={1.5} />
        </Svg>

        {/* PNG icons overlay — renderizados como Image RN para preservar transparencia */}
        {punishments.map((p, i) => {
          if (!p.iconUrl) return null;
          const uri = getAvatarServingUrl(p.iconUrl);
          if (!uri) return null;
          const { x, y, midAngle } = iconPositions[i];
          return (
            <View
              key={`icon-${p.id}`}
              pointerEvents="none"
              style={{
                position: "absolute",
                left: x - iconSize / 2,
                top: y - iconSize / 2,
                width: iconSize,
                height: iconSize,
                transform: [{ rotate: `${midAngle}deg` }],
              }}
            >
              <Image
                source={{ uri }}
                style={{ width: iconSize, height: iconSize, backgroundColor: "transparent" }}
                resizeMode="contain"
              />
            </View>
          );
        })}

        {/* Logo central — sobre todo */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: cx - innerR,
            top: cy - innerR,
            width: innerR * 2,
            height: innerR * 2,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Image
            source={require("@/assets/images/logo.png")}
            style={{ width: innerR * 1.7, height: innerR * 1.7 }}
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      {/* Pointer at top — fuera del Animated.View */}
      <View style={pointerStyles.pointerWrap} pointerEvents="none">
        <View style={pointerStyles.pointerOuter}>
          <View style={pointerStyles.pointer} />
          <View style={pointerStyles.pointerInner} />
        </View>
      </View>
    </View>
  );
}

const pointerStyles = StyleSheet.create({
  pointerWrap: {
    position: "absolute",
    top: -8,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  pointerOuter: {
    alignItems: "center",
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 16,
    borderRightWidth: 16,
    borderTopWidth: 28,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: GOLD,
  },
  pointerInner: {
    position: "absolute",
    top: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 11,
    borderRightWidth: 11,
    borderTopWidth: 20,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: BLACK,
  },
});

export default function RouletteWheelButton() {
  const { isAuthenticated, hasRole } = useAuth();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [punishments, setPunishments] = useState<RoulettePunishment[]>([]);
  const [loading, setLoading] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const rotation = useRef(new Animated.Value(0)).current;
  const currentRotationRef = useRef(0);
  const resultAnim = useRef(new Animated.Value(0)).current;

  const canUse = isAuthenticated && (hasRole("admin") || hasRole("profesor"));

  useEffect(() => {
    if (!open || !canUse) return;
    setLoading(true);
    setResult(null);
    rotation.setValue(0);
    currentRotationRef.current = 0;
    resultAnim.setValue(0);
    rouletteApi
      .list()
      .then((r) => setPunishments(r.punishments.filter((p) => p.isActive)))
      .catch(() => setPunishments([]))
      .finally(() => setLoading(false));
  }, [open, canUse, rotation, resultAnim]);

  if (!canUse) return null;

  const handleSpin = async () => {
    if (spinning || punishments.length === 0) return;
    setSpinning(true);
    setResult(null);
    resultAnim.setValue(0);
    try {
      const res = await rouletteApi.spin();
      const n = res.total;
      const sweep = 360 / n;
      const targetWithinTurn = -(res.winnerIndex * sweep + sweep / 2);
      const baseTurns = 6 * 360;
      const finalRotation =
        currentRotationRef.current + baseTurns + targetWithinTurn - (currentRotationRef.current % 360);
      Animated.timing(rotation, {
        toValue: finalRotation,
        duration: 4800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        currentRotationRef.current = finalRotation;
        setSpinning(false);
        setResult(res);
        Animated.timing(resultAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
      });
    } catch (e) {
      setSpinning(false);
      Alert.alert("Error", e instanceof Error ? e.message : "No se pudo girar");
    }
  };

  const close = () => {
    if (spinning) return;
    setOpen(false);
    setResult(null);
  };

  const screenWidth = Dimensions.get("window").width;
  const wheelSize = Math.min(screenWidth - 24, 460);
  const winnerIconUri = result?.iconUrl ? getAvatarServingUrl(result.iconUrl) : null;

  const resultTranslate = resultAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  return (
    <>
      <Pressable style={fabStyles.fab} onPress={() => setOpen(true)}>
        <MaterialCommunityIcons name="dharmachakra" size={26} color="#000" />
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={close} statusBarTranslucent>
        <View style={modalStyles.container}>
          {/* Header */}
          <View style={[modalStyles.header, { paddingTop: insets.top + 8 }]}>
            <Pressable style={modalStyles.closeBtn} onPress={close} disabled={spinning}>
              <Ionicons name="close" size={26} color={spinning ? "#333" : "#FFF"} />
            </Pressable>
            <View style={{ alignItems: "center" }}>
              <Text style={modalStyles.kanjiSmall}>忍 道</Text>
              <Text style={modalStyles.title}>RULETA DE CASTIGOS</Text>
              <View style={modalStyles.titleUnderline} />
            </View>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            contentContainerStyle={[
              modalStyles.scrollContent,
              { paddingBottom: insets.bottom + 24 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View style={{ paddingVertical: 120, alignItems: "center" }}>
                <ActivityIndicator color={GOLD} size="large" />
              </View>
            ) : punishments.length === 0 ? (
              <View style={modalStyles.empty}>
                <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#444" />
                <Text style={modalStyles.emptyText}>No hay castigos configurados</Text>
                <Text style={modalStyles.emptySub}>
                  Agrégalos desde Admin → Clases → Ruleta
                </Text>
              </View>
            ) : (
              <>
                <View style={modalStyles.wheelWrap}>
                  <Wheel punishments={punishments} rotation={rotation} size={wheelSize} />
                </View>

                {result ? (
                  <Animated.View
                    style={[
                      modalStyles.resultCard,
                      { opacity: resultAnim, transform: [{ translateY: resultTranslate }] },
                    ]}
                  >
                    {/* Top corners */}
                    <View style={modalStyles.cornerTL} />
                    <View style={modalStyles.cornerTR} />
                    <View style={modalStyles.cornerBL} />
                    <View style={modalStyles.cornerBR} />

                    <Text style={modalStyles.resultKanji}>結 果</Text>
                    <Text style={modalStyles.resultLabel}>EL DESTINO HA ELEGIDO</Text>
                    <View style={modalStyles.resultDivider} />
                    <View style={modalStyles.resultRow}>
                      {winnerIconUri ? (
                        <View style={modalStyles.resultIconWrap}>
                          <Image source={{ uri: winnerIconUri }} style={modalStyles.resultIcon} resizeMode="contain" />
                        </View>
                      ) : null}
                      <Text style={modalStyles.resultText}>{result.label}</Text>
                    </View>
                  </Animated.View>
                ) : (
                  <View style={modalStyles.hintWrap}>
                    <Text style={modalStyles.hintKanji}>運 命</Text>
                    <Text style={modalStyles.hintText}>Presiona GIRAR para conocer tu destino</Text>
                  </View>
                )}

                <Pressable
                  style={[modalStyles.spinBtn, spinning && { opacity: 0.6 }]}
                  onPress={handleSpin}
                  disabled={spinning}
                >
                  {spinning ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="dharmachakra" size={18} color="#000" />
                      <Text style={modalStyles.spinBtnText}>
                        {result ? "GIRAR DE NUEVO" : "GIRAR"}
                      </Text>
                    </>
                  )}
                </Pressable>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const fabStyles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: Platform.OS === "web" ? 104 : 96,
    left: 16,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: GOLD,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    zIndex: 999,
    borderWidth: 1,
    borderColor: GOLD_DARK,
  },
});

const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  kanjiSmall: {
    color: GOLD_DIM,
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 11,
    letterSpacing: 6,
    marginBottom: 2,
  },
  title: {
    color: GOLD,
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 16,
    letterSpacing: 3,
    textAlign: "center",
  },
  titleUnderline: {
    marginTop: 6,
    width: 60,
    height: 1,
    backgroundColor: GOLD,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 18,
    alignItems: "center",
  },
  wheelWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  empty: {
    paddingVertical: 100,
    alignItems: "center",
    gap: 10,
  },
  emptyText: {
    color: "#aaa",
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 14,
  },
  emptySub: {
    color: "#666",
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  hintWrap: {
    alignItems: "center",
    marginTop: 22,
    marginBottom: 8,
  },
  hintKanji: {
    color: GOLD_DIM,
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 18,
    letterSpacing: 8,
    marginBottom: 4,
  },
  hintText: {
    color: "#888",
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 12,
    letterSpacing: 1,
  },
  resultCard: {
    width: "100%",
    maxWidth: 480,
    marginTop: 24,
    paddingVertical: 22,
    paddingHorizontal: 20,
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: GOLD_DARK,
    alignItems: "center",
    position: "relative",
  },
  cornerTL: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 14,
    height: 14,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: GOLD,
  },
  cornerTR: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 14,
    height: 14,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: GOLD,
  },
  cornerBL: {
    position: "absolute",
    bottom: 6,
    left: 6,
    width: 14,
    height: 14,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: GOLD,
  },
  cornerBR: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 14,
    height: 14,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: GOLD,
  },
  resultKanji: {
    color: GOLD,
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 22,
    letterSpacing: 10,
    marginBottom: 4,
  },
  resultLabel: {
    color: "#888",
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 10,
    letterSpacing: 3,
    marginBottom: 10,
  },
  resultDivider: {
    width: 80,
    height: 1,
    backgroundColor: GOLD_DIM,
    marginBottom: 14,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
    justifyContent: "center",
  },
  resultIconWrap: {
    width: 48,
    height: 48,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  resultIcon: {
    width: 48,
    height: 48,
  },
  resultText: {
    color: "#FFF",
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 20,
    flexShrink: 1,
    textAlign: "center",
  },
  spinBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 22,
    width: "100%",
    maxWidth: 480,
    backgroundColor: GOLD,
    paddingVertical: 14,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: GOLD_DARK,
  },
  spinBtnText: {
    color: "#000",
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 14,
    letterSpacing: 3,
  },
});
