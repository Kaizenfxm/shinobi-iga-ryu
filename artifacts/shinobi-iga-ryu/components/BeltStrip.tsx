import React from "react";
import { View, ViewStyle } from "react-native";

export function getDanNumber(name: string): number {
  const m = name.match(/^(\d+)\s*[Dd]an/);
  return m ? parseInt(m[1], 10) : 0;
}

export function getStripeCount(name: string): number {
  const match = name.match(/(\d+)\s+franja/i);
  return match ? parseInt(match[1], 10) : 0;
}

export function getNinjutsuRankTitle(beltName: string): string | null {
  const lower = beltName.toLowerCase();
  const danMatch = lower.match(/^(\d+)\s*dan/);
  if (!danMatch) {
    if (lower.includes("negro")) return "Sensei";
    return null;
  }
  const dan = parseInt(danMatch[1], 10);
  if (dan <= 2) return "Sensei";
  if (dan <= 6) return "Shidoshi";
  if (dan === 7) return "Shidoshi-Ho";
  if (dan === 8) return "Shihan";
  if (dan === 9) return "Menkyo";
  return "Soke";
}

interface BeltStripProps {
  color: string;
  name: string;
  width?: number;
  height?: number;
  style?: ViewStyle;
}

export function BeltStrip({ color, name, width, height, style }: BeltStripProps) {
  const nameLower = name.toLowerCase();
  const colorLower = color.toLowerCase();

  const isPuntaNegra = nameLower.includes("punta negra");
  const isFranjaRoja = nameLower.includes("franja roja");
  const isVeryDark = colorLower === "#000000" || colorLower === "#1c1c1c" || colorLower === "#212121";
  const isWhite = colorLower === "#ffffff";

  const borderColor = isVeryDark ? "#3a3a3a" : isWhite ? "#bbb" : color;

  const danNum = getDanNumber(name);
  const isDan = danNum > 0;
  const stripes = getStripeCount(name);

  const showKnot = !isWhite && !isVeryDark && !isPuntaNegra && !isFranjaRoja && !isDan;
  const showEnd = !isWhite && !isVeryDark && !isPuntaNegra && !isFranjaRoja && !isDan;

  return (
    <View
      style={[
        {
          backgroundColor: color,
          borderColor,
          borderWidth: 1,
          borderRadius: 2,
          overflow: "hidden",
          position: "relative",
          justifyContent: "center",
        },
        width != null ? { width } : undefined,
        height != null ? { height } : undefined,
        style,
      ]}
    >
      {showKnot && (
        <View
          style={{
            position: "absolute",
            left: "44%",
            top: "15%",
            bottom: "15%",
            width: 2,
            borderRadius: 1,
            backgroundColor: borderColor,
          }}
        />
      )}
      {showEnd && (
        <View
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: "20%",
            backgroundColor: borderColor + "40",
          }}
        />
      )}
      {isFranjaRoja && (
        <View
          style={{
            position: "absolute",
            left: "38%",
            width: "20%",
            top: 0,
            bottom: 0,
            backgroundColor: "#CC0000",
          }}
        />
      )}
      {isPuntaNegra && (
        <View
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: "30%",
            backgroundColor: "#000000",
          }}
        />
      )}
      {stripes > 0 &&
        Array.from({ length: stripes }, (_, i) => {
          const pct = 56 + (36 / stripes) * i + (36 / stripes) * 0.35;
          return (
            <View
              key={`stripe-${i}`}
              style={{
                position: "absolute",
                left: `${pct}%` as unknown as number,
                top: "12%",
                bottom: "12%",
                width: 2,
                backgroundColor: isVeryDark ? "#D4AF37" : "#000000",
                borderRadius: 1,
              }}
            />
          );
        })}
      {isDan &&
        Array.from({ length: danNum }, (_, i) => (
          <View
            key={`dan-${i}`}
            style={{
              position: "absolute",
              right: 3 + i * 6,
              top: 1,
              bottom: 1,
              width: 3,
              borderRadius: 1,
              backgroundColor: "#D4AF37",
            }}
          />
        ))}
    </View>
  );
}
