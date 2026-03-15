import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { trainingApi, type TrainingSystemDetail, type ExerciseCategoryData, type KnowledgeCategoryData } from "@/lib/api";

type SubTab = "conocimiento" | "ejercicios";

const SISTEMA_KANJI: Record<string, string> = {
  ninjutsu: "忍術",
  mma: "総合",
  box: "拳闘",
  jiujitsu: "柔術",
  muaythai: "拳法",
  kickboxing: "蹴拳",
  funcional: "機能",
};

const LEVEL_COLORS: Record<string, string> = {
  basico: "#22C55E",
  intermedio: "#F59E0B",
  avanzado: "#EF4444",
  elite: "#D4AF37",
};

const LEVEL_LABELS: Record<string, string> = {
  basico: "Básico",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
  elite: "Élite",
};

export default function EntrenamientoScreen() {
  const params = useLocalSearchParams<{ sistema: string; tab?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const sistemaKey = params.sistema ?? "ninjutsu";
  const [activeTab, setActiveTab] = useState<SubTab>(
    params.tab === "ejercicios" ? "ejercicios" : "conocimiento"
  );

  const [data, setData] = useState<TrainingSystemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await trainingApi.getSystem(sistemaKey);
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sistemaKey]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const kanji = SISTEMA_KANJI[sistemaKey] ?? "武術";
  const name = data?.system.name ?? sistemaKey.toUpperCase();

  return (
    <View style={[styles.root, { paddingTop: isWeb ? 0 : 0 }]}>
      <View style={[styles.header, { paddingTop: isWeb ? 20 : insets.top + 8 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#888" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerKanji}>{kanji}</Text>
          <Text style={styles.headerName}>{name}</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.subTabBar}>
        <Pressable
          style={[styles.subTab, activeTab === "conocimiento" && styles.subTabActive]}
          onPress={() => setActiveTab("conocimiento")}
        >
          <Ionicons
            name="book-outline"
            size={14}
            color={activeTab === "conocimiento" ? "#D4AF37" : "#555"}
          />
          <Text style={[styles.subTabText, activeTab === "conocimiento" && styles.subTabTextActive]}>
            CONOCIMIENTO
          </Text>
        </Pressable>

        <View style={styles.subTabSep} />

        <Pressable
          style={[styles.subTab, activeTab === "ejercicios" && styles.subTabActive]}
          onPress={() => setActiveTab("ejercicios")}
        >
          <MaterialCommunityIcons
            name="dumbbell"
            size={14}
            color={activeTab === "ejercicios" ? "#D4AF37" : "#555"}
          />
          <Text style={[styles.subTabText, activeTab === "ejercicios" && styles.subTabTextActive]}>
            EJERCICIOS
          </Text>
        </Pressable>
      </View>

      <View style={styles.subTabUnderline} />

      {loading ? (
        <ActivityIndicator color="#D4AF37" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: isWeb ? 40 : insets.bottom + 80 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#D4AF37"
              colors={["#D4AF37"]}
            />
          }
        >
          {activeTab === "conocimiento" ? (
            <ConocimientoTab
              items={data?.knowledge ?? []}
              categories={data?.knowledgeCategories ?? []}
            />
          ) : (
            <EjerciciosTab
              items={data?.exercises ?? []}
              categories={data?.exerciseCategories ?? []}
            />
          )}
        </ScrollView>
      )}
    </View>
  );
}

type KnowledgeItem = {
  id: number;
  title: string;
  content: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
  orderIndex: number;
  categoryId: number | null;
};

type ExerciseItem = {
  id: number;
  title: string;
  description: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
  durationMinutes: number | null;
  level: string | null;
  orderIndex: number;
  categoryId: number | null;
};

function ConocimientoTab({ items, categories }: { items: KnowledgeItem[]; categories: KnowledgeCategoryData[] }) {
  const grouped = useMemo(() => {
    if (categories.length === 0) return [{ category: null, items }];
    const groups: { category: KnowledgeCategoryData | null; items: KnowledgeItem[] }[] = [];
    for (const cat of categories) {
      const catItems = items.filter((i) => i.categoryId === cat.id);
      if (catItems.length > 0) groups.push({ category: cat, items: catItems });
    }
    const uncategorized = items.filter((i) => !i.categoryId);
    if (uncategorized.length > 0) groups.push({ category: null, items: uncategorized });
    return groups;
  }, [items, categories]);

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyKanji}>知</Text>
        <Text style={styles.emptyTitle}>Sin contenido aún</Text>
        <Text style={styles.emptySubtitle}>El conocimiento de este arte llegará pronto</Text>
      </View>
    );
  }

  return (
    <View style={styles.listContainer}>
      {grouped.map((group, gi) => (
        <View key={group.category?.id ?? "uncategorized"} style={gi > 0 ? { marginTop: 12 } : undefined}>
          {group.category ? (
            <View style={styles.categoryHeader}>
              <View style={styles.categoryBar} />
              <Text style={styles.categoryName}>{group.category.name}</Text>
              {group.category.description ? (
                <Text style={styles.categoryDesc}>{group.category.description}</Text>
              ) : null}
            </View>
          ) : categories.length > 0 ? (
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryNameGeneral}>General</Text>
            </View>
          ) : null}
          {group.items.map((item) => (
            <View key={item.id} style={styles.knowledgeCard}>
              <View style={styles.cardGoldBar} />
              <Text style={styles.knowledgeTitle}>{item.title}</Text>
              {item.content ? (
                <Text style={styles.knowledgeContent}>{item.content}</Text>
              ) : null}
              {item.videoUrl ? (
                <View style={styles.videoTag}>
                  <Ionicons name="play-circle-outline" size={12} color="#D4AF37" />
                  <Text style={styles.videoTagText}>Video disponible</Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function EjerciciosTab({ items, categories }: { items: ExerciseItem[]; categories: ExerciseCategoryData[] }) {
  const grouped = useMemo(() => {
    if (categories.length === 0) return [{ category: null, items }];
    const groups: { category: ExerciseCategoryData | null; items: ExerciseItem[] }[] = [];
    for (const cat of categories) {
      const catItems = items.filter((i) => i.categoryId === cat.id);
      if (catItems.length > 0) groups.push({ category: cat, items: catItems });
    }
    const uncategorized = items.filter((i) => !i.categoryId);
    if (uncategorized.length > 0) groups.push({ category: null, items: uncategorized });
    return groups;
  }, [items, categories]);

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyKanji}>練</Text>
        <Text style={styles.emptyTitle}>Sin ejercicios aún</Text>
        <Text style={styles.emptySubtitle}>Los ejercicios de este arte llegarán pronto</Text>
      </View>
    );
  }

  return (
    <View style={styles.listContainer}>
      {grouped.map((group, gi) => (
        <View key={group.category?.id ?? "uncategorized"} style={gi > 0 ? { marginTop: 12 } : undefined}>
          {group.category ? (
            <View style={styles.categoryHeader}>
              <View style={styles.categoryBar} />
              <Text style={styles.categoryName}>{group.category.name}</Text>
              {group.category.description ? (
                <Text style={styles.categoryDesc}>{group.category.description}</Text>
              ) : null}
            </View>
          ) : categories.length > 0 ? (
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryNameGeneral}>General</Text>
            </View>
          ) : null}
          {group.items.map((item) => (
            <View key={item.id} style={styles.exerciseCard}>
              <View style={styles.exerciseCardTop}>
                <Text style={styles.exerciseTitle}>{item.title}</Text>
                <View style={styles.exerciseMeta}>
                  {item.level ? (
                    <View
                      style={[
                        styles.levelBadge,
                        { borderColor: LEVEL_COLORS[item.level] ?? "#D4AF37" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.levelBadgeText,
                          { color: LEVEL_COLORS[item.level] ?? "#D4AF37" },
                        ]}
                      >
                        {LEVEL_LABELS[item.level] ?? item.level}
                      </Text>
                    </View>
                  ) : null}
                  {item.durationMinutes ? (
                    <View style={styles.durationTag}>
                      <Ionicons name="time-outline" size={11} color="#555" />
                      <Text style={styles.durationText}>{item.durationMinutes} min</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              {item.description ? (
                <Text style={styles.exerciseDesc}>{item.description}</Text>
              ) : null}
              {item.videoUrl ? (
                <View style={styles.videoTag}>
                  <Ionicons name="play-circle-outline" size={12} color="#D4AF37" />
                  <Text style={styles.videoTagText}>Video disponible</Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    alignItems: "center",
    gap: 2,
  },
  headerKanji: {
    fontFamily: "NotoSerifJP_700Bold",
    fontSize: 20,
    color: "#D4AF37",
    letterSpacing: 4,
  },
  headerName: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 12,
    color: "#555",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  subTabBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 0,
  },
  subTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 6,
  },
  subTabActive: {},
  subTabText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 11,
    color: "#555",
    letterSpacing: 1.5,
  },
  subTabTextActive: {
    color: "#D4AF37",
  },
  subTabSep: {
    width: 1,
    backgroundColor: "#1A1A1A",
    marginVertical: 8,
  },
  subTabUnderline: {
    height: 1,
    backgroundColor: "#1A1A1A",
    marginHorizontal: 16,
    marginBottom: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
    gap: 10,
  },
  emptyKanji: {
    fontFamily: "NotoSerifJP_900Black",
    fontSize: 64,
    color: "#1A1A1A",
    lineHeight: 80,
  },
  emptyTitle: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 14,
    color: "#444",
    letterSpacing: 1,
  },
  emptySubtitle: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 12,
    color: "#333",
    letterSpacing: 0.5,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  listContainer: {
    gap: 10,
  },
  categoryHeader: {
    marginBottom: 8,
    gap: 2,
    overflow: "hidden",
  },
  categoryBar: {
    height: 2,
    backgroundColor: "#D4AF37",
    width: 40,
    marginBottom: 6,
  },
  categoryName: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 13,
    color: "#D4AF37",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  categoryNameGeneral: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 12,
    color: "#555",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  categoryDesc: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 11,
    color: "#444",
  },
  knowledgeCard: {
    backgroundColor: "#080808",
    borderWidth: 1,
    borderColor: "#1A1A1A",
    borderRadius: 2,
    padding: 14,
    gap: 8,
    overflow: "hidden",
  },
  cardGoldBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#D4AF37",
  },
  knowledgeTitle: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 14,
    color: "#FFFFFF",
    letterSpacing: 0.5,
    marginTop: 4,
  },
  knowledgeContent: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 13,
    color: "#777",
    lineHeight: 20,
  },
  exerciseCard: {
    backgroundColor: "#080808",
    borderWidth: 1,
    borderColor: "#1A1A1A",
    borderRadius: 2,
    padding: 14,
    gap: 8,
  },
  exerciseCardTop: {
    gap: 6,
  },
  exerciseTitle: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 14,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  exerciseMeta: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  levelBadge: {
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  levelBadgeText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  durationTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  durationText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "#555",
  },
  exerciseDesc: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 13,
    color: "#777",
    lineHeight: 20,
  },
  videoTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  videoTagText: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 11,
    color: "#D4AF37",
  },
});
