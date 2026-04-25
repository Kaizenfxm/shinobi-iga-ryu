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
} from "react-native";
import Svg, { Circle, Path, G, Text as SvgText, Image as SvgImage, Defs, LinearGradient, Stop } from "react-native-svg";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { rouletteApi, getAvatarServingUrl, type RoulettePunishment, type SpinResult } from "@/lib/api";

const GOLD = "#D4AF37";
const GOLD_DIM = "#8B7220";
const CREAM = "#F2EBDC";
const CREAM_ALT = "#E8DFC8";
const BLACK = "#0a0a0a";

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
  const outerR = size / 2 - 4;
  const innerR = outerR * 0.28;
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

  const labelMaxLen = n <= 6 ? 18 : n <= 10 ? 14 : n <= 14 ? 10 : 8;
  const fontSize = n <= 6 ? 11 : n <= 10 ? 9 : n <= 14 ? 8 : 7;
  const iconSize = n <= 8 ? 28 : n <= 14 ? 22 : 18;

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[{ width: size, height: size }, animatedStyle]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <LinearGradient id="border" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#1a1a1a" />
              <Stop offset="0.5" stopColor="#2a2a2a" />
              <Stop offset="1" stopColor="#0a0a0a" />
            </LinearGradient>
          </Defs>

          {/* Outer black border ring */}
          <Circle cx={cx} cy={cy} r={outerR + 2} fill="url(#border)" />
          <Circle cx={cx} cy={cy} r={outerR - 1} fill={CREAM} stroke={GOLD} strokeWidth={1.5} />

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

              const labelR = outerR * 0.62;
              const labelPos = polarToCartesian(cx, cy, labelR, midAngle);

              const iconR = outerR * 0.82;
              const iconPos = polarToCartesian(cx, cy, iconR, midAngle);

              const rot = midAngle;
              const iconUri = p.iconUrl ? getAvatarServingUrl(p.iconUrl) : null;

              return (
                <G key={p.id}>
                  <Path d={path} fill={fill} stroke={GOLD_DIM} strokeWidth={0.5} />
                  <G rotation={rot} origin={`${labelPos.x}, ${labelPos.y}`}>
                    <SvgText
                      x={labelPos.x}
                      y={labelPos.y}
                      fontSize={fontSize}
                      fontWeight="bold"
                      fill={BLACK}
                      textAnchor="middle"
                      alignmentBaseline="middle"
                    >
                      {truncate(p.label, labelMaxLen)}
                    </SvgText>
                  </G>
                  {iconUri ? (
                    <SvgImage
                      x={iconPos.x - iconSize / 2}
                      y={iconPos.y - iconSize / 2}
                      width={iconSize}
                      height={iconSize}
                      href={{ uri: iconUri }}
                      preserveAspectRatio="xMidYMid meet"
                    />
                  ) : null}
                </G>
              );
            })
          )}

          {/* Center hub */}
          <Circle cx={cx} cy={cy} r={innerR + 4} fill={GOLD} />
          <Circle cx={cx} cy={cy} r={innerR} fill={BLACK} stroke={GOLD} strokeWidth={2} />
          <SvgText
            x={cx}
            y={cy - 6}
            fontSize={innerR * 0.35}
            fontWeight="bold"
            fill={GOLD}
            textAnchor="middle"
          >
            SHINOBI
          </SvgText>
          <SvgText x={cx} y={cy + 4} fontSize={innerR * 0.5} fill={GOLD} textAnchor="middle">
            忍
          </SvgText>
          <SvgText
            x={cx}
            y={cy + innerR * 0.55}
            fontSize={innerR * 0.3}
            fontWeight="bold"
            fill={GOLD}
            textAnchor="middle"
          >
            IGA RYU
          </SvgText>
        </Svg>
      </Animated.View>

      {/* Pointer at top — outside the rotating wheel */}
      <View style={pointerStyles.pointerWrap} pointerEvents="none">
        <View style={pointerStyles.pointer} />
        <View style={pointerStyles.pointerKanji}>
          <Text style={{ color: GOLD, fontFamily: "NotoSansJP_700Bold", fontSize: 14 }}>忍</Text>
        </View>
      </View>
    </View>
  );
}

const pointerStyles = StyleSheet.create({
  pointerWrap: {
    position: "absolute",
    top: -2,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderTopWidth: 22,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: BLACK,
  },
  pointerKanji: {
    position: "absolute",
    top: 2,
    width: 28,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default function RouletteWheelButton() {
  const { isAuthenticated, hasRole } = useAuth();
  const [open, setOpen] = useState(false);
  const [punishments, setPunishments] = useState<RoulettePunishment[]>([]);
  const [loading, setLoading] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const rotation = useRef(new Animated.Value(0)).current;
  const currentRotationRef = useRef(0);

  const canUse = isAuthenticated && (hasRole("admin") || hasRole("profesor"));

  useEffect(() => {
    if (!open || !canUse) return;
    setLoading(true);
    setResult(null);
    rotation.setValue(0);
    currentRotationRef.current = 0;
    rouletteApi
      .list()
      .then((r) => setPunishments(r.punishments.filter((p) => p.isActive)))
      .catch(() => setPunishments([]))
      .finally(() => setLoading(false));
  }, [open, canUse, rotation]);

  if (!canUse) return null;

  const handleSpin = async () => {
    if (spinning || punishments.length === 0) return;
    setSpinning(true);
    setResult(null);
    try {
      const res = await rouletteApi.spin();
      const n = res.total;
      const sweep = 360 / n;
      // Sector i ocupa [i*sweep, (i+1)*sweep] medido desde la flecha (12 en punto), girando con la rueda.
      // Para que el sector ganador quede bajo la flecha, rotamos la rueda de modo que el centro del sector ganador
      // termine en 0°. Como rotamos en sentido horario, target = -(winnerIndex * sweep + sweep/2).
      const targetWithinTurn = -(res.winnerIndex * sweep + sweep / 2);
      const baseTurns = 5 * 360;
      const finalRotation =
        currentRotationRef.current + baseTurns + targetWithinTurn - (currentRotationRef.current % 360);
      Animated.timing(rotation, {
        toValue: finalRotation,
        duration: 4200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        currentRotationRef.current = finalRotation;
        setSpinning(false);
        setResult(res);
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
  const wheelSize = Math.min(screenWidth - 40, 360);
  const winnerIconUri = result?.iconUrl ? getAvatarServingUrl(result.iconUrl) : null;

  return (
    <>
      <Pressable style={fabStyles.fab} onPress={() => setOpen(true)}>
        <Text style={fabStyles.kanji}>忍</Text>
      </Pressable>

      <Modal visible={open} animationType="fade" transparent onRequestClose={close}>
        <View style={modalStyles.backdrop}>
          <View style={modalStyles.card}>
            <Pressable style={modalStyles.closeBtn} onPress={close} disabled={spinning}>
              <Ionicons name="close" size={20} color={spinning ? "#333" : "#888"} />
            </Pressable>

            <Text style={modalStyles.title}>RULETA DE CASTIGOS</Text>

            {loading ? (
              <View style={{ paddingVertical: 80, alignItems: "center" }}>
                <ActivityIndicator color={GOLD} />
              </View>
            ) : punishments.length === 0 ? (
              <View style={{ paddingVertical: 60, alignItems: "center", gap: 8 }}>
                <MaterialCommunityIcons name="alert-circle-outline" size={36} color="#555" />
                <Text style={modalStyles.emptyText}>No hay castigos configurados</Text>
                <Text style={modalStyles.emptySub}>
                  Agrega castigos desde el panel de admin → Clases → Ruleta
                </Text>
              </View>
            ) : (
              <>
                <View style={{ alignItems: "center", marginVertical: 8 }}>
                  <Wheel punishments={punishments} rotation={rotation} size={wheelSize} />
                </View>

                {result ? (
                  <View style={modalStyles.resultCard}>
                    <Text style={modalStyles.resultLabel}>RESULTADO</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 }}>
                      {winnerIconUri ? (
                        <Image source={{ uri: winnerIconUri }} style={modalStyles.resultIcon} />
                      ) : null}
                      <Text style={modalStyles.resultText}>{result.label}</Text>
                    </View>
                  </View>
                ) : null}

                <Pressable
                  style={[modalStyles.spinBtn, spinning && { opacity: 0.5 }]}
                  onPress={handleSpin}
                  disabled={spinning}
                >
                  {spinning ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <Text style={modalStyles.spinBtnText}>{result ? "GIRAR DE NUEVO" : "GIRAR"}</Text>
                  )}
                </Pressable>
              </>
            )}
          </View>
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
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(212, 175, 55, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    zIndex: 999,
  },
  kanji: {
    color: "#000",
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 20,
  },
});

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderTopWidth: 2,
    borderTopColor: GOLD,
    borderRadius: 6,
    width: "100%",
    maxWidth: 420,
    padding: 16,
  },
  closeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    padding: 6,
    zIndex: 10,
  },
  title: {
    color: GOLD,
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 14,
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 12,
  },
  emptyText: {
    color: "#888",
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 13,
  },
  emptySub: {
    color: "#555",
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 11,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  resultCard: {
    marginTop: 14,
    padding: 12,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1f1f1f",
    borderTopColor: GOLD,
    borderTopWidth: 2,
    borderRadius: 4,
  },
  resultLabel: {
    color: GOLD,
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 10,
    letterSpacing: 2,
  },
  resultText: {
    color: "#FFF",
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 18,
    flex: 1,
  },
  resultIcon: {
    width: 36,
    height: 36,
  },
  spinBtn: {
    marginTop: 14,
    backgroundColor: GOLD,
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: "center",
  },
  spinBtnText: {
    color: "#000",
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 13,
    letterSpacing: 2,
  },
});
