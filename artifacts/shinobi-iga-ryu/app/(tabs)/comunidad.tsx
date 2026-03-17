import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Pressable,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  ImageBackground,
  Image,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { eventsApi, challengesApi, trainingApi, getAvatarServingUrl, EventItem, EventAttendee, ChallengeItem, ChallengeUser, TrainingSystem } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useChallenges } from "@/contexts/ChallengesContext";

type ComunidadTab = "eventos" | "retos" | "ranking" | "clases";
const TABS: { key: ComunidadTab; label: string }[] = [
  { key: "eventos", label: "EVENTOS" },
  { key: "retos", label: "RETOS" },
  { key: "ranking", label: "RANKING" },
  { key: "clases", label: "CLASES" },
];

function formatEventDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}
function formatEventTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

function AttendeesModal({ eventId, eventTitle, visible, onClose }: {
  eventId: number;
  eventTitle: string;
  visible: boolean;
  onClose: () => void;
}) {
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    eventsApi.getAttendees(eventId)
      .then((res) => setAttendees(res.attendees))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible, eventId]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={aStyles.backdrop} onPress={onClose}>
        <Pressable onPress={() => {}} style={aStyles.sheet}>
          <View style={aStyles.handle} />
          <Text style={aStyles.title}>{eventTitle}</Text>
          <Text style={aStyles.subtitle}>
            {loading ? "" : `${attendees.length} asistente${attendees.length !== 1 ? "s" : ""}`}
          </Text>
          {loading ? (
            <ActivityIndicator color="#D4AF37" style={{ marginTop: 24 }} />
          ) : attendees.length === 0 ? (
            <Text style={aStyles.empty}>Nadie ha confirmado asistencia aún</Text>
          ) : (
            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {attendees.map((a) => (
                <View key={a.id} style={aStyles.row}>
                  {a.avatarUrl ? (
                    <Image
                      source={{ uri: getAvatarServingUrl(a.avatarUrl) ?? undefined }}
                      style={aStyles.avatar}
                    />
                  ) : (
                    <View style={[aStyles.avatar, aStyles.avatarFallback]}>
                      <Text style={aStyles.avatarLetter}>{(a.displayName?.[0] ?? "?").toUpperCase()}</Text>
                    </View>
                  )}
                  <Text style={aStyles.name}>{a.displayName}</Text>
                </View>
              ))}
            </ScrollView>
          )}
          <Pressable style={aStyles.closeBtn} onPress={onClose}>
            <Text style={aStyles.closeBtnText}>CERRAR</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const aStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#111", borderTopLeftRadius: 12, borderTopRightRadius: 12,
    padding: 24, paddingBottom: 40, borderTopWidth: 2, borderTopColor: "#D4AF37",
  },
  handle: { width: 40, height: 3, backgroundColor: "#333", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title: { color: "#FFF", fontFamily: "NotoSansJP_700Bold", fontSize: 15, textAlign: "center" },
  subtitle: { color: "#555", fontFamily: "NotoSansJP_400Regular", fontSize: 11, textAlign: "center", marginTop: 2, marginBottom: 16 },
  empty: { color: "#444", fontFamily: "NotoSansJP_400Regular", fontSize: 12, textAlign: "center", marginTop: 24, marginBottom: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#1a1a1a" },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#222" },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarLetter: { color: "#D4AF37", fontFamily: "NotoSansJP_700Bold", fontSize: 14 },
  name: { color: "#CCC", fontFamily: "NotoSansJP_400Regular", fontSize: 13, flex: 1 },
  closeBtn: { marginTop: 20, backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#2a2a2a", borderRadius: 4, paddingVertical: 10, alignItems: "center" },
  closeBtnText: { color: "#FFF", fontFamily: "NotoSansJP_700Bold", fontSize: 12, letterSpacing: 1 },
});

function formatDateDisplay(d: Date) {
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) +
    "  " + d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

function CreateEventModal({ visible, onClose, onCreated }: {
  visible: boolean;
  onClose: () => void;
  onCreated: (ev: EventItem) => void;
}) {
  const [title, setTitle] = useState("");
  const [datetime, setDatetime] = useState<Date | null>(null);
  const [location, setLocation] = useState("");
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [coverPath, setCoverPath] = useState<string | null>(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showNativePicker, setShowNativePicker] = useState<"date" | "time" | null>(null);
  const [tempDate, setTempDate] = useState<Date>(new Date());

  const reset = () => {
    setTitle(""); setDatetime(null); setLocation("");
    setCoverUri(null); setCoverPath(null); setFormError(null);
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setFormError("Se necesita acceso a la galería"); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", quality: 0.85 });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    const mimeType = asset.mimeType ?? "image/jpeg";
    setUploadingImg(true);
    setFormError(null);
    let uploadURL = "";
    let objectPath = "";
    try {
      const urlRes = await eventsApi.getCoverUploadUrl(mimeType);
      uploadURL = urlRes.uploadURL;
      objectPath = urlRes.objectPath;
    } catch {
      setFormError("Error obteniendo URL de subida. Verifica tu sesión.");
      setUploadingImg(false);
      return;
    }
    try {
      const blob = await fetch(asset.uri).then((r) => r.blob());
      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        body: blob,
        headers: { "Content-Type": mimeType },
      });
      if (!uploadRes.ok) {
        setFormError(`Error subiendo imagen al storage (${uploadRes.status}). Intenta de nuevo.`);
        setUploadingImg(false);
        return;
      }
      setCoverUri(asset.uri);
      setCoverPath(objectPath);
    } catch {
      setFormError("Error de red al subir la imagen. Verifica tu conexión.");
    } finally {
      setUploadingImg(false);
    }
  };

  const handleSave = async () => {
    setFormError(null);
    if (!title.trim()) { setFormError("El nombre del evento es requerido"); return; }
    if (!datetime) { setFormError("Selecciona la fecha y hora del evento"); return; }
    if (!location.trim()) { setFormError("El lugar del evento es requerido"); return; }
    setSaving(true);
    try {
      const res = await eventsApi.create({
        title: title.trim(),
        coverImageUrl: coverPath,
        eventDate: datetime.toISOString(),
        location: location.trim(),
      });
      onCreated(res.event);
      reset();
      onClose();
    } catch {
      setFormError("No se pudo crear el evento. Verifica tu conexión.");
    } finally {
      setSaving(false);
    }
  };

  const isWeb = Platform.OS === "web";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={cStyles.backdrop} onPress={onClose}>
        <Pressable onPress={() => {}} style={cStyles.sheet}>
          <View style={aStyles.handle} />
          <Text style={cStyles.heading}>NUEVO EVENTO</Text>

          <Pressable style={cStyles.imagePicker} onPress={pickImage} disabled={uploadingImg}>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={cStyles.imagePreview} resizeMode="cover" />
            ) : uploadingImg ? (
              <ActivityIndicator color="#D4AF37" />
            ) : (
              <>
                <MaterialCommunityIcons name="image-plus" size={28} color="#555" />
                <Text style={cStyles.imagePickerText}>Imagen de portada (opcional)</Text>
              </>
            )}
          </Pressable>

          <TextInput
            style={cStyles.input} placeholder="Nombre del evento" placeholderTextColor="#444"
            value={title} onChangeText={(t) => { setTitle(t); setFormError(null); }}
          />

          {isWeb ? (
            <View style={cStyles.webDateWrapper}>
              <Ionicons name="calendar-outline" size={14} color="#D4AF37" style={{ marginRight: 6 }} />
              {React.createElement("input", {
                type: "datetime-local",
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onChange: (e: any) => {
                  if (e.target?.value) {
                    setDatetime(new Date(e.target.value));
                    setFormError(null);
                  }
                },
                style: {
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#D4AF37",
                  fontSize: "13px",
                  colorScheme: "dark",
                  cursor: "pointer",
                  width: "100%",
                  padding: 0,
                },
              })}
            </View>
          ) : (
            <>
              <Pressable
                style={cStyles.dateBtn}
                onPress={() => { setTempDate(datetime ?? new Date()); setShowNativePicker("date"); }}
              >
                <Ionicons name="calendar-outline" size={14} color="#D4AF37" />
                <Text style={datetime ? cStyles.dateBtnText : cStyles.dateBtnPlaceholder}>
                  {datetime
                    ? datetime.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })
                    : "Seleccionar fecha..."}
                </Text>
              </Pressable>
              <Pressable
                style={[cStyles.dateBtn, { marginTop: 8 }]}
                onPress={() => { setTempDate(datetime ?? new Date()); setShowNativePicker("time"); }}
              >
                <Ionicons name="time-outline" size={14} color="#D4AF37" />
                <Text style={datetime ? cStyles.dateBtnText : cStyles.dateBtnPlaceholder}>
                  {datetime
                    ? datetime.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
                    : "Seleccionar hora..."}
                </Text>
              </Pressable>
              {showNativePicker !== null && (
                <Modal visible transparent animationType="slide">
                  <Pressable style={cStyles.pickerBackdrop} onPress={() => setShowNativePicker(null)}>
                    <Pressable onPress={() => {}} style={cStyles.pickerSheet}>
                      <View style={cStyles.pickerHeader}>
                        <Pressable onPress={() => setShowNativePicker(null)}>
                          <Text style={cStyles.pickerCancel}>CANCELAR</Text>
                        </Pressable>
                        <Text style={cStyles.pickerTitle}>
                          {showNativePicker === "date" ? "SELECCIONAR FECHA" : "SELECCIONAR HORA"}
                        </Text>
                        <Pressable onPress={() => {
                          const mode = showNativePicker;
                          setDatetime((prev) => {
                            const base = prev ?? new Date();
                            if (mode === "date") {
                              return new Date(tempDate.getFullYear(), tempDate.getMonth(), tempDate.getDate(),
                                base.getHours(), base.getMinutes());
                            } else {
                              return new Date(base.getFullYear(), base.getMonth(), base.getDate(),
                                tempDate.getHours(), tempDate.getMinutes());
                            }
                          });
                          setFormError(null);
                          setShowNativePicker(null);
                        }}>
                          <Text style={cStyles.pickerConfirm}>CONFIRMAR</Text>
                        </Pressable>
                      </View>
                      <DateTimePicker
                        value={tempDate}
                        mode={showNativePicker}
                        display="spinner"
                        onChange={(_, selected) => { if (selected) setTempDate(selected); }}
                        textColor="#FFFFFF"
                        themeVariant="dark"
                        style={{ width: "100%" }}
                      />
                    </Pressable>
                  </Pressable>
                </Modal>
              )}
            </>
          )}

          <TextInput
            style={[cStyles.input, { marginTop: 10 }]} placeholder="Lugar" placeholderTextColor="#444"
            value={location} onChangeText={(t) => { setLocation(t); setFormError(null); }}
          />

          {formError && (
            <View style={cStyles.errorBox}>
              <Ionicons name="alert-circle-outline" size={13} color="#ff4444" />
              <Text style={cStyles.errorText}>{formError}</Text>
            </View>
          )}

          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <Pressable style={[cStyles.btn, { flex: 1, backgroundColor: "#1a1a1a" }]} onPress={() => { reset(); onClose(); }}>
              <Text style={[cStyles.btnText, { color: "#555" }]}>CANCELAR</Text>
            </Pressable>
            <Pressable
              style={[cStyles.btn, { flex: 1, backgroundColor: "#D4AF37", opacity: saving ? 0.6 : 1 }]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={[cStyles.btnText, { color: "#000" }]}>{saving ? "CREANDO..." : "CREAR"}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const cStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#111", borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: 24, paddingBottom: 40, borderTopWidth: 2, borderTopColor: "#D4AF37" },
  heading: { color: "#D4AF37", fontFamily: "NotoSansJP_700Bold", fontSize: 13, letterSpacing: 2, textAlign: "center", marginBottom: 16 },
  imagePicker: { height: 110, backgroundColor: "#0a0a0a", borderRadius: 4, borderWidth: 1, borderColor: "#2a2a2a", borderStyle: "dashed", alignItems: "center", justifyContent: "center", marginBottom: 12, overflow: "hidden" },
  imagePreview: { width: "100%", height: "100%" },
  imagePickerText: { color: "#444", fontFamily: "NotoSansJP_400Regular", fontSize: 11, marginTop: 6 },
  input: { backgroundColor: "#0a0a0a", borderWidth: 1, borderColor: "#2a2a2a", borderRadius: 4, color: "#FFF", fontFamily: "NotoSansJP_400Regular", fontSize: 13, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 0 },
  webDateWrapper: {
    position: "relative", flexDirection: "row", alignItems: "center",
    backgroundColor: "#0a0a0a", borderWidth: 1, borderColor: "#2a2a2a", borderRadius: 4,
    paddingHorizontal: 12, paddingVertical: 11, overflow: "hidden",
  },
  webDateText: { color: "#D4AF37", fontFamily: "NotoSansJP_400Regular", fontSize: 13, flex: 1 },
  webDatePlaceholder: { color: "#444", fontFamily: "NotoSansJP_400Regular", fontSize: 13, flex: 1 },
  dateBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#0a0a0a", borderWidth: 1, borderColor: "#2a2a2a", borderRadius: 4,
    paddingHorizontal: 12, paddingVertical: 11,
  },
  dateBtnText: { color: "#D4AF37", fontFamily: "NotoSansJP_400Regular", fontSize: 13 },
  dateBtnPlaceholder: { color: "#444", fontFamily: "NotoSansJP_400Regular", fontSize: 13 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, padding: 10, backgroundColor: "rgba(255,68,68,0.08)", borderRadius: 4, borderWidth: 1, borderColor: "rgba(255,68,68,0.2)" },
  errorText: { color: "#ff4444", fontFamily: "NotoSansJP_400Regular", fontSize: 11, flex: 1 },
  btn: { borderRadius: 4, paddingVertical: 12, alignItems: "center" },
  btnText: { fontFamily: "NotoSansJP_700Bold", fontSize: 12, letterSpacing: 1 },
  pickerBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  pickerSheet: { backgroundColor: "#111", borderTopWidth: 2, borderTopColor: "#D4AF37", paddingBottom: 40 },
  pickerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#1a1a1a" },
  pickerTitle: { color: "#888", fontFamily: "NotoSansJP_400Regular", fontSize: 11, letterSpacing: 1 },
  pickerCancel: { color: "#555", fontFamily: "NotoSansJP_700Bold", fontSize: 12, letterSpacing: 1 },
  pickerConfirm: { color: "#D4AF37", fontFamily: "NotoSansJP_700Bold", fontSize: 12, letterSpacing: 1 },
});

function EventCard({ event, canManage, onAttendToggle, onDelete, onViewAttendees }: {
  event: EventItem;
  canManage: boolean;
  onAttendToggle: (id: number, current: boolean | null) => void;
  onDelete: (id: number) => void;
  onViewAttendees: (ev: EventItem) => void;
}) {
  const coverUrl = getAvatarServingUrl(event.coverImageUrl);
  const attending = event.userWillAttend === true;

  return (
    <View style={eStyles.card}>
      {coverUrl ? (
        <ImageBackground source={{ uri: coverUrl }} style={eStyles.cardBg} resizeMode="cover">
          <View style={eStyles.overlay} />
          <CardContent event={event} attending={attending} canManage={canManage} onAttendToggle={onAttendToggle} onDelete={onDelete} onViewAttendees={onViewAttendees} />
        </ImageBackground>
      ) : (
        <View style={[eStyles.cardBg, { backgroundColor: "#0d0d0d" }]}>
          <CardContent event={event} attending={attending} canManage={canManage} onAttendToggle={onAttendToggle} onDelete={onDelete} onViewAttendees={onViewAttendees} />
        </View>
      )}
    </View>
  );
}

function CardContent({ event, attending, canManage, onAttendToggle, onDelete, onViewAttendees }: {
  event: EventItem;
  attending: boolean;
  canManage: boolean;
  onAttendToggle: (id: number, current: boolean | null) => void;
  onDelete: (id: number) => void;
  onViewAttendees: (ev: EventItem) => void;
}) {
  return (
    <View style={eStyles.cardInner}>
      <View style={{ flex: 1 }}>
        <Text style={eStyles.cardTitle} numberOfLines={2}>{event.title}</Text>
        <View style={eStyles.metaRow}>
          <Ionicons name="calendar-outline" size={11} color="#D4AF37" />
          <Text style={eStyles.metaGold}>{formatEventDate(event.eventDate)}</Text>
          <Text style={eStyles.metaSep}>·</Text>
          <Ionicons name="time-outline" size={11} color="#D4AF37" />
          <Text style={eStyles.metaGold}>{formatEventTime(event.eventDate)}</Text>
        </View>
        <View style={eStyles.metaRow}>
          <Ionicons name="location-outline" size={11} color="#888" />
          <Text style={eStyles.metaGrey} numberOfLines={1}>{event.location}</Text>
        </View>
      </View>

      <View style={eStyles.actions}>
        {canManage && (
          <Pressable style={eStyles.deleteBtn} onPress={() => onDelete(event.id)}>
            <MaterialCommunityIcons name="trash-can-outline" size={14} color="#555" />
          </Pressable>
        )}
        <Pressable style={eStyles.attendeesBtn} onPress={() => onViewAttendees(event)}>
          <MaterialCommunityIcons name="account-group" size={14} color="#D4AF37" />
          <Text style={eStyles.attendeeCount}>{event.attendeeCount}</Text>
        </Pressable>
        <Pressable
          style={[eStyles.attendBtn, attending && eStyles.attendBtnActive]}
          onPress={() => onAttendToggle(event.id, event.userWillAttend)}
        >
          <Text style={[eStyles.attendBtnText, attending && eStyles.attendBtnTextActive]}>
            {attending ? "ASISTIRÉ ✓" : "ASISTIRÉ"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const eStyles = StyleSheet.create({
  card: { borderTopWidth: 2, borderTopColor: "#D4AF37", marginBottom: 1, overflow: "hidden" },
  cardBg: { width: "100%", minHeight: 160 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.65)" },
  cardInner: { flex: 1, padding: 16, flexDirection: "row", alignItems: "flex-end", gap: 12, minHeight: 160, justifyContent: "space-between" },
  cardTitle: { color: "#FFF", fontFamily: "NotoSansJP_700Bold", fontSize: 16, marginBottom: 6, lineHeight: 22 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  metaGold: { color: "#D4AF37", fontFamily: "NotoSansJP_400Regular", fontSize: 11 },
  metaSep: { color: "#555", fontSize: 10, marginHorizontal: 2 },
  metaGrey: { color: "#888", fontFamily: "NotoSansJP_400Regular", fontSize: 11, flex: 1 },
  actions: { alignItems: "flex-end", gap: 6, justifyContent: "flex-end" },
  deleteBtn: { padding: 4 },
  attendeesBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 2, borderWidth: 1, borderColor: "#2a2a2a" },
  attendeeCount: { color: "#D4AF37", fontFamily: "NotoSansJP_700Bold", fontSize: 11 },
  attendBtn: { backgroundColor: "rgba(0,0,0,0.6)", borderWidth: 1, borderColor: "#555", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 2 },
  attendBtnActive: { backgroundColor: "#D4AF37", borderColor: "#D4AF37" },
  attendBtnText: { color: "#999", fontFamily: "NotoSansJP_700Bold", fontSize: 10, letterSpacing: 0.5 },
  attendBtnTextActive: { color: "#000" },
});

function EventosTab({ canManage, extraEvents }: {
  canManage: boolean;
  extraEvents?: EventItem[];
}) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attendeesEvent, setAttendeesEvent] = useState<EventItem | null>(null);

  useEffect(() => {
    if (extraEvents && extraEvents.length > 0) {
      setEvents((prev) => {
        const ids = new Set(prev.map((e) => e.id));
        const newOnes = extraEvents.filter((e) => !ids.has(e.id));
        return newOnes.length > 0 ? [...newOnes, ...prev] : prev;
      });
    }
  }, [extraEvents]);

  const load = useCallback(async () => {
    try {
      const res = await eventsApi.getAll();
      setEvents(res.events);
    } catch {
      Alert.alert("Error", "No se pudieron cargar los eventos");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAttendToggle = async (id: number, current: boolean | null) => {
    const willAttend = current !== true;
    try {
      const res = await eventsApi.attend(id, willAttend);
      setEvents((prev) => prev.map((e) => e.id === id ? { ...e, userWillAttend: res.willAttend, attendeeCount: res.attendeeCount } : e));
    } catch {
      Alert.alert("Error", "No se pudo actualizar tu asistencia");
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert("Eliminar evento", "¿Seguro que deseas eliminar este evento?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar", style: "destructive",
        onPress: async () => {
          try {
            await eventsApi.delete(id);
            setEvents((prev) => prev.filter((e) => e.id !== id));
          } catch {
            Alert.alert("Error", "No se pudo eliminar el evento");
          }
        },
      },
    ]);
  };

  if (loading) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color="#D4AF37" /></View>;
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#D4AF37" />}
      >
        {events.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 }}>
            <MaterialCommunityIcons name="calendar-blank-outline" size={40} color="#222" />
            <Text style={{ color: "#333", fontFamily: "NotoSansJP_400Regular", fontSize: 12, letterSpacing: 2, marginTop: 12 }}>SIN EVENTOS</Text>
          </View>
        ) : (
          events.map((ev) => (
            <EventCard
              key={ev.id}
              event={ev}
              canManage={canManage}
              onAttendToggle={handleAttendToggle}
              onDelete={handleDelete}
              onViewAttendees={setAttendeesEvent}
            />
          ))
        )}
      </ScrollView>

      {attendeesEvent && (
        <AttendeesModal
          eventId={attendeesEvent.id}
          eventTitle={attendeesEvent.title}
          visible={!!attendeesEvent}
          onClose={() => setAttendeesEvent(null)}
        />
      )}
    </View>
  );
}

function formatChallengeDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) +
    "  " + d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

function UndoTimer({ respondedAt, onUndo, onExpire }: { respondedAt: string; onUndo: () => void; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(120);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const calc = () => Math.max(0, Math.floor(120 - (Date.now() - new Date(respondedAt).getTime()) / 1000));
    setRemaining(calc());
    ref.current = setInterval(() => {
      const r = calc();
      setRemaining(r);
      if (r <= 0) {
        if (ref.current) clearInterval(ref.current);
        onExpire();
      }
    }, 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [respondedAt, onExpire]);

  if (remaining <= 0) return null;
  return (
    <Pressable style={rStyles.undoBtn} onPress={onUndo}>
      <Ionicons name="arrow-undo-outline" size={12} color="#D4AF37" />
      <Text style={rStyles.undoBtnText}>DESHACER ({remaining}s)</Text>
    </Pressable>
  );
}

function PendingChallengeCard({ item, onRespond, currentUserId, canManage }: {
  item: ChallengeItem;
  onRespond: (id: number, decision: "accepted" | "declined") => void;
  currentUserId: number;
  canManage: boolean;
}) {
  void canManage;
  const [decided, setDecided] = useState<"accepted" | "declined" | null>(null);
  const [respondedAt, setRespondedAt] = useState<string | null>(null);

  const handleDecision = (decision: "accepted" | "declined") => {
    setDecided(decision);
    setRespondedAt(new Date().toISOString());
    onRespond(item.id, decision);
  };

  const handleUndo = () => {
    setDecided(null);
    setRespondedAt(null);
    onRespond(item.id, "pending" as "accepted");
  };

  void currentUserId;

  return (
    <View style={rStyles.pendingCard}>
      <View style={rStyles.pendingCardHeader}>
        <MaterialCommunityIcons name="boxing-glove" size={16} color="#D4AF37" />
        <Text style={rStyles.pendingTitle} numberOfLines={1}>
          <Text style={rStyles.pendingChallenger}>{item.challengerName}</Text>
          <Text style={{ color: "#888" }}> te reta en </Text>
          <Text style={rStyles.pendingSystem}>{item.trainingSystemName}</Text>
        </Text>
      </View>
      <View style={rStyles.pendingMeta}>
        <Ionicons name="calendar-outline" size={11} color="#888" />
        <Text style={rStyles.pendingDate}>{formatChallengeDate(item.scheduledAt)}</Text>
      </View>
      {item.notes ? <Text style={rStyles.pendingNotes}>{item.notes}</Text> : null}

      {decided ? (
        <View style={{ marginTop: 8 }}>
          <Text style={[rStyles.decidedText, decided === "accepted" ? { color: "#22C55E" } : { color: "#EF4444" }]}>
            {decided === "accepted" ? "✓ Aceptado" : "✕ Declinado"}
          </Text>
          {respondedAt && (
            <UndoTimer
              respondedAt={respondedAt}
              onUndo={handleUndo}
              onExpire={() => {}}
            />
          )}
        </View>
      ) : (
        <View style={rStyles.pendingActions}>
          <Pressable style={rStyles.declineBtn} onPress={() => handleDecision("declined")}>
            <Ionicons name="close" size={18} color="#EF4444" />
          </Pressable>
          <Pressable style={rStyles.acceptBtn} onPress={() => handleDecision("accepted")}>
            <Ionicons name="checkmark" size={18} color="#22C55E" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

function ChallengeRow({ item, currentUserId, canManage, onSetResult }: {
  item: ChallengeItem;
  currentUserId: number;
  canManage: boolean;
  onSetResult: (challenge: ChallengeItem) => void;
}) {
  const isPast = ["completed", "declined", "cancelled"].includes(item.status);
  const isCompleted = item.status === "completed";

  const p1Color = isCompleted
    ? item.winnerId === item.challengerId ? "#22C55E" : "#EF4444"
    : "#CCC";
  const p2Color = isCompleted
    ? item.winnerId === item.challengedId ? "#22C55E" : "#EF4444"
    : "#CCC";

  return (
    <View style={rStyles.challengeRow}>
      <View style={rStyles.challengeRowMain}>
        <Text style={[rStyles.challengePlayer, { color: p1Color }]} numberOfLines={1}>{item.challengerName}</Text>
        <Text style={rStyles.challengeVs}>VS</Text>
        <Text style={[rStyles.challengePlayer, { color: p2Color }]} numberOfLines={1}>{item.challengedName}</Text>
        <Text style={rStyles.challengeSep}>|</Text>
        <Text style={rStyles.challengeSystem} numberOfLines={1}>{item.trainingSystemName}</Text>
        <Text style={rStyles.challengeSep}>|</Text>
        <Text style={rStyles.challengeDate}>{formatChallengeDate(item.scheduledAt).split("  ")[0]}</Text>
      </View>
      {item.status === "declined" && <Text style={rStyles.statusBadgeDec}>DECLINADO</Text>}
      {item.status === "cancelled" && <Text style={rStyles.statusBadgeCan}>CANCELADO</Text>}
      {canManage && !isPast && item.status === "accepted" && (
        <Pressable style={rStyles.resultBtn} onPress={() => onSetResult(item)}>
          <Text style={rStyles.resultBtnText}>RESULTADO</Text>
        </Pressable>
      )}
    </View>
  );
}

function SetResultModal({ challenge, visible, onClose, onSet }: {
  challenge: ChallengeItem | null;
  visible: boolean;
  onClose: () => void;
  onSet: (challengeId: number, winnerId: number) => void;
}) {
  if (!challenge) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={cStyles.backdrop} onPress={onClose}>
        <Pressable onPress={() => {}} style={cStyles.sheet}>
          <View style={aStyles.handle} />
          <Text style={cStyles.heading}>DECLARAR GANADOR</Text>
          <Text style={{ color: "#888", fontFamily: "NotoSansJP_400Regular", fontSize: 12, textAlign: "center", marginBottom: 16 }}>
            {challenge.trainingSystemName} · {formatChallengeDate(challenge.scheduledAt).split("  ")[0]}
          </Text>
          <Pressable
            style={[cStyles.btn, { backgroundColor: "#111", borderWidth: 1, borderColor: "#22C55E", marginBottom: 10 }]}
            onPress={() => { onSet(challenge.id, challenge.challengerId); onClose(); }}
          >
            <Text style={[cStyles.btnText, { color: "#22C55E" }]}>{challenge.challengerName}</Text>
          </Pressable>
          <Pressable
            style={[cStyles.btn, { backgroundColor: "#111", borderWidth: 1, borderColor: "#22C55E", marginBottom: 10 }]}
            onPress={() => { onSet(challenge.id, challenge.challengedId); onClose(); }}
          >
            <Text style={[cStyles.btnText, { color: "#22C55E" }]}>{challenge.challengedName}</Text>
          </Pressable>
          <Pressable style={[cStyles.btn, { backgroundColor: "#1a1a1a", marginTop: 4 }]} onPress={onClose}>
            <Text style={[cStyles.btnText, { color: "#555" }]}>CANCELAR</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function CreateChallengeModal({ visible, onClose, targetUser, systems, onCreated }: {
  visible: boolean;
  onClose: () => void;
  targetUser: ChallengeUser | null;
  systems: TrainingSystem[];
  onCreated: () => void;
}) {
  const [selectedSystem, setSelectedSystem] = useState<TrainingSystem | null>(null);
  const [datetime, setDatetime] = useState<Date | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showNativePicker, setShowNativePicker] = useState<"date" | "time" | null>(null);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const isWeb = Platform.OS === "web";

  const reset = () => {
    setSelectedSystem(null); setDatetime(null); setNotes(""); setFormError(null);
  };

  const handleSend = async () => {
    setFormError(null);
    if (!selectedSystem) { setFormError("Selecciona un sistema de entrenamiento"); return; }
    if (!datetime) { setFormError("Selecciona fecha y hora"); return; }
    if (!targetUser) return;
    setSaving(true);
    try {
      await challengesApi.create({
        challengedId: targetUser.id,
        trainingSystemId: selectedSystem.id,
        scheduledAt: datetime.toISOString(),
        notes: notes.trim() || undefined,
      });
      onCreated();
      reset();
      onClose();
    } catch {
      setFormError("No se pudo enviar el reto. Verifica tu conexión.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={cStyles.backdrop} onPress={onClose}>
        <Pressable onPress={() => {}} style={cStyles.sheet}>
          <View style={aStyles.handle} />
          <Text style={cStyles.heading}>RETAR A {(targetUser?.displayName ?? "").toUpperCase()}</Text>

          <Text style={rStyles.sectionLabel}>SISTEMA</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: "row", gap: 8, paddingVertical: 4 }}>
              {systems.map((s) => (
                <Pressable
                  key={s.id}
                  style={[rStyles.systemChip, selectedSystem?.id === s.id && rStyles.systemChipActive]}
                  onPress={() => { setSelectedSystem(s); setFormError(null); }}
                >
                  <Text style={[rStyles.systemChipText, selectedSystem?.id === s.id && rStyles.systemChipTextActive]}>
                    {s.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <Text style={rStyles.sectionLabel}>FECHA Y HORA</Text>
          {isWeb ? (
            <View style={cStyles.webDateWrapper}>
              <Ionicons name="calendar-outline" size={14} color="#D4AF37" style={{ marginRight: 6 }} />
              {React.createElement("input", {
                type: "datetime-local",
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                  if (e.target?.value) { setDatetime(new Date(e.target.value)); setFormError(null); }
                },
                style: { flex: 1, background: "transparent", border: "none", outline: "none", color: "#D4AF37", fontSize: "13px", colorScheme: "dark", cursor: "pointer", width: "100%", padding: 0 },
              })}
            </View>
          ) : (
            <>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
                <Pressable style={[cStyles.dateBtn, { flex: 1 }]} onPress={() => { setTempDate(datetime ?? new Date()); setShowNativePicker("date"); }}>
                  <Ionicons name="calendar-outline" size={13} color="#D4AF37" />
                  <Text style={datetime ? cStyles.dateBtnText : cStyles.dateBtnPlaceholder}>
                    {datetime ? datetime.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : "Fecha..."}
                  </Text>
                </Pressable>
                <Pressable style={[cStyles.dateBtn, { flex: 1 }]} onPress={() => { setTempDate(datetime ?? new Date()); setShowNativePicker("time"); }}>
                  <Ionicons name="time-outline" size={13} color="#D4AF37" />
                  <Text style={datetime ? cStyles.dateBtnText : cStyles.dateBtnPlaceholder}>
                    {datetime ? datetime.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }) : "Hora..."}
                  </Text>
                </Pressable>
              </View>
              {showNativePicker !== null && (
                <Modal visible transparent animationType="slide">
                  <Pressable style={cStyles.pickerBackdrop} onPress={() => setShowNativePicker(null)}>
                    <Pressable onPress={() => {}} style={cStyles.pickerSheet}>
                      <View style={cStyles.pickerHeader}>
                        <Pressable onPress={() => setShowNativePicker(null)}>
                          <Text style={cStyles.pickerCancel}>CANCELAR</Text>
                        </Pressable>
                        <Text style={cStyles.pickerTitle}>
                          {showNativePicker === "date" ? "SELECCIONAR FECHA" : "SELECCIONAR HORA"}
                        </Text>
                        <Pressable onPress={() => {
                          const mode = showNativePicker;
                          setDatetime((prev) => {
                            const base = prev ?? new Date();
                            if (mode === "date") return new Date(tempDate.getFullYear(), tempDate.getMonth(), tempDate.getDate(), base.getHours(), base.getMinutes());
                            return new Date(base.getFullYear(), base.getMonth(), base.getDate(), tempDate.getHours(), tempDate.getMinutes());
                          });
                          setFormError(null);
                          setShowNativePicker(null);
                        }}>
                          <Text style={cStyles.pickerConfirm}>CONFIRMAR</Text>
                        </Pressable>
                      </View>
                      <DateTimePicker value={tempDate} mode={showNativePicker} display="spinner" onChange={(_, s) => { if (s) setTempDate(s); }} textColor="#FFFFFF" themeVariant="dark" style={{ width: "100%" }} />
                    </Pressable>
                  </Pressable>
                </Modal>
              )}
            </>
          )}

          <TextInput
            style={[cStyles.input, { marginTop: 10 }]}
            placeholder="Notas (opcional)" placeholderTextColor="#444"
            value={notes} onChangeText={setNotes} multiline numberOfLines={2}
          />

          {formError && (
            <View style={cStyles.errorBox}>
              <Ionicons name="alert-circle-outline" size={13} color="#ff4444" />
              <Text style={cStyles.errorText}>{formError}</Text>
            </View>
          )}

          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <Pressable style={[cStyles.btn, { flex: 1, backgroundColor: "#1a1a1a" }]} onPress={() => { reset(); onClose(); }}>
              <Text style={[cStyles.btnText, { color: "#555" }]}>CANCELAR</Text>
            </Pressable>
            <Pressable
              style={[cStyles.btn, { flex: 1, backgroundColor: "#D4AF37", opacity: saving ? 0.6 : 1 }]}
              onPress={handleSend} disabled={saving}
            >
              <Text style={[cStyles.btnText, { color: "#000" }]}>{saving ? "ENVIANDO..." : "RETAR"}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ComingSoon() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#333", fontFamily: "NotoSansJP_400Regular", fontSize: 13, letterSpacing: 2 }}>PRÓXIMAMENTE</Text>
    </View>
  );
}

function RetosTab({ canManage, currentUserId }: { canManage: boolean; currentUserId: number }) {
  const { refresh: refreshBadge } = useChallenges();
  const [users, setUsers] = useState<ChallengeUser[]>([]);
  const [search, setSearch] = useState("");
  const [systems, setSystems] = useState<TrainingSystem[]>([]);
  const [challenges, setChallenges] = useState<{ pending: ChallengeItem[]; active: ChallengeItem[]; past: ChallengeItem[] }>({ pending: [], active: [], past: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [targetUser, setTargetUser] = useState<ChallengeUser | null>(null);
  const [createVisible, setCreateVisible] = useState(false);
  const [resultChallenge, setResultChallenge] = useState<ChallengeItem | null>(null);
  const [activeExpanded, setActiveExpanded] = useState(true);
  const [pastExpanded, setPastExpanded] = useState(false);

  const load = useCallback(async () => {
    try {
      const [usersRes, systemsRes, challengesRes] = await Promise.all([
        challengesApi.getUsers(),
        trainingApi.getSystems(),
        challengesApi.getAll(),
      ]);
      setUsers(usersRes.users);
      setSystems(systemsRes.systems);
      setChallenges(challengesRes);
      await refreshBadge();
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshBadge]);

  useEffect(() => { load(); }, [load]);

  const handleRespond = useCallback(async (id: number, decision: "accepted" | "declined" | "pending") => {
    if (decision === "pending") {
      try { await challengesApi.undoResponse(id); await load(); } catch {}
      return;
    }
    try {
      await challengesApi.respond(id, decision as "accepted" | "declined");
      await load();
    } catch {}
  }, [load]);

  const handleSetResult = useCallback(async (challengeId: number, winnerId: number) => {
    try { await challengesApi.setResult(challengeId, winnerId); await load(); } catch {}
  }, [load]);

  const filteredUsers = users.filter((u) =>
    u.displayName.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color="#D4AF37" /></View>;
  }

  const hasPending = challenges.pending.length > 0;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#D4AF37" />}
      >
        <View style={rStyles.searchWrapper}>
          <Ionicons name="search-outline" size={14} color="#555" />
          <TextInput
            style={rStyles.searchInput}
            placeholder="Buscar miembro..." placeholderTextColor="#333"
            value={search} onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={14} color="#555" />
            </Pressable>
          )}
        </View>

        {hasPending && (
          <View style={rStyles.pendingSection}>
            <Text style={rStyles.pendingSectionTitle}>RETOS RECIBIDOS</Text>
            {challenges.pending.map((ch) => (
              <PendingChallengeCard
                key={ch.id}
                item={ch}
                onRespond={handleRespond}
                currentUserId={currentUserId}
                canManage={canManage}
              />
            ))}
          </View>
        )}

        {challenges.active.length > 0 && (
          <View style={rStyles.section}>
            <Pressable style={rStyles.sectionHeader} onPress={() => setActiveExpanded((p) => !p)}>
              <Text style={rStyles.sectionTitle}>RETOS ACTIVOS</Text>
              <View style={rStyles.sectionBadge}><Text style={rStyles.sectionBadgeText}>{challenges.active.length}</Text></View>
              <Ionicons name={activeExpanded ? "chevron-up" : "chevron-down"} size={14} color="#555" style={{ marginLeft: "auto" }} />
            </Pressable>
            {activeExpanded && challenges.active.map((ch) => (
              <ChallengeRow key={ch.id} item={ch} currentUserId={currentUserId} canManage={canManage} onSetResult={setResultChallenge} />
            ))}
          </View>
        )}

        {challenges.past.length > 0 && (
          <View style={rStyles.section}>
            <Pressable style={rStyles.sectionHeader} onPress={() => setPastExpanded((p) => !p)}>
              <Text style={rStyles.sectionTitle}>RETOS PASADOS</Text>
              <View style={rStyles.sectionBadge}><Text style={rStyles.sectionBadgeText}>{challenges.past.length}</Text></View>
              <Ionicons name={pastExpanded ? "chevron-up" : "chevron-down"} size={14} color="#555" style={{ marginLeft: "auto" }} />
            </Pressable>
            {pastExpanded && challenges.past.map((ch) => (
              <ChallengeRow key={ch.id} item={ch} currentUserId={currentUserId} canManage={canManage} onSetResult={setResultChallenge} />
            ))}
          </View>
        )}

        <View style={rStyles.userListSection}>
          {filteredUsers.length === 0 ? (
            <Text style={rStyles.emptyText}>
              {search ? "Sin resultados para la búsqueda" : "Sin miembros activos"}
            </Text>
          ) : (
            filteredUsers.map((u) => (
              <View key={u.id} style={rStyles.userRow}>
                {u.avatarUrl ? (
                  <Image source={{ uri: getAvatarServingUrl(u.avatarUrl) ?? undefined }} style={rStyles.userAvatar} />
                ) : (
                  <View style={[rStyles.userAvatar, rStyles.userAvatarFallback]}>
                    <Text style={rStyles.userAvatarLetter}>{(u.displayName[0] ?? "?").toUpperCase()}</Text>
                  </View>
                )}
                <Text style={rStyles.userName} numberOfLines={1}>{u.displayName}</Text>
                <Pressable style={rStyles.gloveBtn} onPress={() => { setTargetUser(u); setCreateVisible(true); }}>
                  <MaterialCommunityIcons name="boxing-glove" size={20} color="#D4AF37" />
                </Pressable>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <CreateChallengeModal
        visible={createVisible && !!targetUser}
        onClose={() => { setCreateVisible(false); setTargetUser(null); }}
        targetUser={targetUser}
        systems={systems}
        onCreated={load}
      />

      <SetResultModal
        challenge={resultChallenge}
        visible={!!resultChallenge}
        onClose={() => setResultChallenge(null)}
        onSet={handleSetResult}
      />
    </View>
  );
}

const rStyles = StyleSheet.create({
  searchWrapper: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#0a0a0a", borderWidth: 1, borderColor: "#1a1a1a",
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 4,
  },
  searchInput: { flex: 1, color: "#FFF", fontFamily: "NotoSansJP_400Regular", fontSize: 13 },
  pendingSection: { marginTop: 8, marginHorizontal: 0, borderTopWidth: 2, borderTopColor: "#D4AF37" },
  pendingSectionTitle: { color: "#D4AF37", fontFamily: "NotoSansJP_700Bold", fontSize: 10, letterSpacing: 2, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  pendingCard: {
    backgroundColor: "#090909", borderBottomWidth: 1, borderBottomColor: "#1a1a1a",
    paddingHorizontal: 16, paddingVertical: 12,
  },
  pendingCardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  pendingTitle: { flex: 1, fontFamily: "NotoSansJP_400Regular", fontSize: 13, color: "#CCC" },
  pendingChallenger: { color: "#FFF", fontFamily: "NotoSansJP_700Bold" },
  pendingSystem: { color: "#D4AF37", fontFamily: "NotoSansJP_700Bold" },
  pendingMeta: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 2 },
  pendingDate: { color: "#555", fontFamily: "NotoSansJP_400Regular", fontSize: 11 },
  pendingNotes: { color: "#444", fontFamily: "NotoSansJP_400Regular", fontSize: 11, fontStyle: "italic", marginTop: 2 },
  pendingActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 10 },
  declineBtn: { width: 36, height: 36, borderRadius: 4, borderWidth: 1, borderColor: "#EF4444", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(239,68,68,0.08)" },
  acceptBtn: { width: 36, height: 36, borderRadius: 4, borderWidth: 1, borderColor: "#22C55E", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(34,197,94,0.08)" },
  decidedText: { fontFamily: "NotoSansJP_700Bold", fontSize: 12, letterSpacing: 1 },
  undoBtn: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 2, borderWidth: 1, borderColor: "#D4AF37" },
  undoBtnText: { color: "#D4AF37", fontFamily: "NotoSansJP_700Bold", fontSize: 10, letterSpacing: 0.5 },
  section: { marginTop: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#1a1a1a", borderBottomWidth: 1, borderBottomColor: "#1a1a1a", backgroundColor: "#050505" },
  sectionTitle: { color: "#888", fontFamily: "NotoSansJP_700Bold", fontSize: 10, letterSpacing: 2 },
  sectionBadge: { backgroundColor: "#1a1a1a", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 },
  sectionBadgeText: { color: "#D4AF37", fontFamily: "NotoSansJP_700Bold", fontSize: 10 },
  challengeRow: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#111", backgroundColor: "#000" },
  challengeRowMain: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 4 },
  challengePlayer: { fontFamily: "NotoSansJP_700Bold", fontSize: 12, maxWidth: 100 },
  challengeVs: { color: "#555", fontFamily: "NotoSansJP_700Bold", fontSize: 9, letterSpacing: 1, marginHorizontal: 2 },
  challengeSep: { color: "#333", fontSize: 12, marginHorizontal: 2 },
  challengeSystem: { color: "#888", fontFamily: "NotoSansJP_400Regular", fontSize: 11, maxWidth: 90 },
  challengeDate: { color: "#555", fontFamily: "NotoSansJP_400Regular", fontSize: 11 },
  statusBadgeDec: { color: "#EF4444", fontFamily: "NotoSansJP_700Bold", fontSize: 9, letterSpacing: 1, marginTop: 2 },
  statusBadgeCan: { color: "#555", fontFamily: "NotoSansJP_700Bold", fontSize: 9, letterSpacing: 1, marginTop: 2 },
  resultBtn: { marginTop: 6, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 2, borderWidth: 1, borderColor: "#D4AF37" },
  resultBtnText: { color: "#D4AF37", fontFamily: "NotoSansJP_700Bold", fontSize: 9, letterSpacing: 1 },
  userListSection: { marginTop: 8 },
  userRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#0d0d0d", gap: 12 },
  userAvatar: { width: 38, height: 38, borderRadius: 19 },
  userAvatarFallback: { backgroundColor: "#111", alignItems: "center", justifyContent: "center" },
  userAvatarLetter: { color: "#D4AF37", fontFamily: "NotoSansJP_700Bold", fontSize: 14 },
  userName: { flex: 1, color: "#CCC", fontFamily: "NotoSansJP_400Regular", fontSize: 13 },
  gloveBtn: { padding: 8, backgroundColor: "#0a0a0a", borderWidth: 1, borderColor: "#1a1a1a", borderRadius: 4 },
  emptyText: { color: "#333", fontFamily: "NotoSansJP_400Regular", fontSize: 12, textAlign: "center", paddingTop: 40, letterSpacing: 1 },
  sectionLabel: { color: "#888", fontFamily: "NotoSansJP_700Bold", fontSize: 9, letterSpacing: 2, marginBottom: 6, marginTop: 4 },
  systemChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 2, borderWidth: 1, borderColor: "#2a2a2a", backgroundColor: "#0a0a0a" },
  systemChipActive: { borderColor: "#D4AF37", backgroundColor: "rgba(212,175,55,0.1)" },
  systemChipText: { color: "#555", fontFamily: "NotoSansJP_400Regular", fontSize: 12 },
  systemChipTextActive: { color: "#D4AF37", fontFamily: "NotoSansJP_700Bold" },
});

export default function ComunidadScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { hasRole, isAuthenticated, isLoading, user } = useAuth();
  const { pendingCount } = useChallenges();
  const [activeTab, setActiveTab] = useState<ComunidadTab>("eventos");
  const [createVisible, setCreateVisible] = useState(false);
  const [createdEvents, setCreatedEvents] = useState<EventItem[]>([]);

  const canManage = !isLoading && isAuthenticated && (hasRole("admin") || hasRole("profesor"));

  const renderTab = () => {
    if (activeTab === "eventos") return <EventosTab canManage={canManage} extraEvents={createdEvents} />;
    if (activeTab === "retos") return <RetosTab canManage={canManage} currentUserId={user?.id ?? 0} />;
    return <ComingSoon />;
  };

  return (
    <View style={styles.root}>
      <View style={[styles.headerContainer, { paddingTop: isWeb ? 16 : insets.top + 8 }]}>
        <View style={styles.logoRow}>
          <Image source={require("@/assets/images/logo.png")} style={styles.logoImage} resizeMode="contain" />
        </View>
        <View style={styles.subTabBar}>
          {TABS.map((tab, i) => (
            <React.Fragment key={tab.key}>
              {i > 0 && <View style={styles.subTabSep} />}
              <Pressable
                style={[styles.subTab, activeTab === tab.key && styles.subTabActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <View style={{ alignItems: "center" }}>
                  <Text style={[styles.subTabText, activeTab === tab.key && styles.subTabTextActive]}>
                    {tab.label}
                  </Text>
                  {tab.key === "retos" && pendingCount > 0 && (
                    <View style={styles.subTabBadge}>
                      <Text style={styles.subTabBadgeText}>{pendingCount}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            </React.Fragment>
          ))}
        </View>
      </View>

      {canManage && activeTab === "eventos" && (
        <Pressable style={styles.createBar} onPress={() => setCreateVisible(true)}>
          <MaterialCommunityIcons name="plus" size={18} color="#D4AF37" />
        </Pressable>
      )}

      {renderTab()}

      <CreateEventModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onCreated={(ev) => setCreatedEvents((prev) => [ev, ...prev])}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  headerContainer: { backgroundColor: "#000", borderBottomWidth: 1, borderBottomColor: "#1a1a1a" },
  logoRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8, gap: 10 },
  logoImage: { width: 34, height: 34 },
  subTabBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12 },
  subTab: { flex: 1, alignItems: "center", paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: "transparent" },
  subTabActive: { borderBottomColor: "#D4AF37" },
  subTabSep: { width: 1, height: 14, backgroundColor: "#1a1a1a" },
  subTabText: { color: "#555", fontFamily: "NotoSansJP_400Regular", fontSize: 10, letterSpacing: 1 },
  subTabTextActive: { color: "#D4AF37", fontFamily: "NotoSansJP_700Bold" },
  subTabBadge: { position: "absolute", top: -6, right: -10, backgroundColor: "#D4AF37", borderRadius: 6, minWidth: 14, height: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  subTabBadgeText: { color: "#000", fontFamily: "NotoSansJP_700Bold", fontSize: 8 },
  createBar: {
    width: "100%",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
    backgroundColor: "#050505",
  },
});
