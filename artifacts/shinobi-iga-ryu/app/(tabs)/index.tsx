import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  ImageSourcePropType,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import FlipCard from "@/components/FlipCard";
import Colors from "@/constants/colors";

interface MartialArt {
  id: string;
  title: string;
  subtitle: string;
  image: ImageSourcePropType;
}

const MARTIAL_ARTS: MartialArt[] = [
  {
    id: "ninjutsu",
    title: "NINJUTSU",
    subtitle: "忍術 · El arte del ninja",
    image: require("@/assets/images/arts/ninjutsu.jpg"),
  },
  {
    id: "mma",
    title: "MMA",
    subtitle: "総合格闘技 · Artes marciales mixtas",
    image: require("@/assets/images/arts/mma.jpg"),
  },
  {
    id: "box",
    title: "BOX",
    subtitle: "ボクシング · El arte del puño",
    image: require("@/assets/images/arts/box.jpg"),
  },
  {
    id: "jiujitsu",
    title: "JIUJITSU",
    subtitle: "柔術 · El arte suave",
    image: require("@/assets/images/arts/jiujitsu.jpg"),
  },
  {
    id: "muaythai",
    title: "MUAY THAI",
    subtitle: "ムエタイ · El arte de los ocho miembros",
    image: require("@/assets/images/arts/muaythai.jpg"),
  },
  {
    id: "funcional",
    title: "FUNCIONAL",
    subtitle: "機能訓練 · Entrenamiento funcional",
    image: require("@/assets/images/arts/funcional.jpg"),
  },
];

export default function MartialArtsScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const handleKnowledge = (artId: string) => {
    Alert.alert(
      "Conocimiento",
      `Próximamente: contenido de ${artId}`,
      [{ text: "OK" }]
    );
  };

  const handleExercises = (artId: string) => {
    Alert.alert(
      "Ejercicios",
      `Próximamente: ejercicios de ${artId}`,
      [{ text: "OK" }]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: (isWeb ? 67 : insets.top) + 16,
            paddingBottom: 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerLogoRow}>
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.headerSubtitle}>武道 · Artes Marciales</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.grid}>
          {MARTIAL_ARTS.map((art, index) => (
            <View key={art.id} style={styles.gridItem}>
              <FlipCard
                title={art.title}
                subtitle={art.subtitle}
                backgroundImage={art.image}
                index={index}
                onKnowledgePress={() => handleKnowledge(art.id)}
                onExercisesPress={() => handleExercises(art.id)}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridItem: {
    width: "48.5%",
  },
  header: {
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  headerLogoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerLogo: {
    width: 52,
    height: 52,
  },
  headerSubtitle: {
    fontFamily: "NotoSerifJP_400Regular",
    fontSize: 12,
    color: "#555555",
    letterSpacing: 2,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: "#1A1A1A",
    marginHorizontal: 12,
    marginVertical: 16,
  },
});
