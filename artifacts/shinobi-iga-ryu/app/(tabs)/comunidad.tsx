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
  Keyboard,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { eventsApi, challengesApi, trainingApi, rankingApi, getAvatarServingUrl, EventItem, EventAttendee, ChallengeItem, ChallengeUser, TrainingSystem, RankingFighterEntry, RankingAttendanceEntry, RankingChallengeEntry, RankingWonChallenge } from "@/lib/api";
import { useRouter } from "expo-router";
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

function CreateEventModal({ visible, onClose, onCreated, editEvent }: {
  visible: boolean;
  onClose: () => void;
  onCreated: (ev: EventItem) => void;
  editEvent?: EventItem | null;
}) {
  const isEdit = !!editEvent;
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
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKbHeight(e.endCoordinates.height)
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKbHeight(0)
    );
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    if (visible && editEvent) {
      setTitle(editEvent.title);
      setDatetime(new Date(editEvent.eventDate));
      setLocation(editEvent.location);
      setCoverUri(editEvent.coverImageUrl ?? null);
      setCoverPath(editEvent.coverImageUrl ?? null);
      setFormError(null);
    }
    if (!visible) {
      setTitle(""); setDatetime(null); setLocation("");
      setCoverUri(null); setCoverPath(null); setFormError(null);
    }
  }, [visible, editEvent]);

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
    try {
      const blob = await fetch(asset.uri).then((r) => r.blob());
      const objectPath = await eventsApi.uploadCoverDirect(blob, mimeType);
      setCoverUri(asset.uri);
      setCoverPath(objectPath);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error subiendo imagen. Verifica tu conexión.");
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
      let res: { event: EventItem };
      if (isEdit && editEvent) {
        res = await eventsApi.update(editEvent.id, {
          title: title.trim(),
          coverImageUrl: coverPath !== editEvent.coverImageUrl ? coverPath : undefined,
          eventDate: datetime.toISOString(),
          location: location.trim(),
        });
      } else {
        res = await eventsApi.create({
          title: title.trim(),
          coverImageUrl: coverPath,
          eventDate: datetime.toISOString(),
          location: location.trim(),
        });
      }
      onCreated(res.event);
      reset();
      onClose();
    } catch {
      setFormError(isEdit ? "No se pudo actualizar el evento." : "No se pudo crear el evento. Verifica tu conexión.");
    } finally {
      setSaving(false);
    }
  };

  const isWeb = Platform.OS === "web";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { Keyboard.dismiss(); onClose(); }}>
      <Pressable style={[cStyles.backdrop, { paddingBottom: kbHeight }]} onPress={() => { Keyboard.dismiss(); onClose(); }}>
        <Pressable onPress={Keyboard.dismiss} style={cStyles.sheet}>
          <View style={aStyles.handle} />
          <Text style={cStyles.heading}>{isEdit ? "EDITAR EVENTO" : "NUEVO EVENTO"}</Text>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

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
              <Text style={[cStyles.btnText, { color: "#000" }]}>{saving ? (isEdit ? "GUARDANDO..." : "CREANDO...") : (isEdit ? "GUARDAR" : "CREAR")}</Text>
            </Pressable>
          </View>
          </ScrollView>
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

function EventCard({ event, canManage, onAttendToggle, onDelete, onEdit, onViewAttendees }: {
  event: EventItem;
  canManage: boolean;
  onAttendToggle: (id: number, current: boolean | null) => void;
  onDelete: (id: number) => void;
  onEdit: (ev: EventItem) => void;
  onViewAttendees: (ev: EventItem) => void;
}) {
  const coverUrl = getAvatarServingUrl(event.coverImageUrl);
  const attending = event.userWillAttend === true;

  return (
    <View style={eStyles.card}>
      {coverUrl ? (
        <ImageBackground source={{ uri: coverUrl }} style={eStyles.cardBg} resizeMode="cover">
          <View style={eStyles.overlay} />
          <CardContent event={event} attending={attending} canManage={canManage} onAttendToggle={onAttendToggle} onDelete={onDelete} onEdit={onEdit} onViewAttendees={onViewAttendees} />
        </ImageBackground>
      ) : (
        <View style={[eStyles.cardBg, { backgroundColor: "#0d0d0d" }]}>
          <CardContent event={event} attending={attending} canManage={canManage} onAttendToggle={onAttendToggle} onDelete={onDelete} onEdit={onEdit} onViewAttendees={onViewAttendees} />
        </View>
      )}
    </View>
  );
}

function CardContent({ event, attending, canManage, onAttendToggle, onDelete, onEdit, onViewAttendees }: {
  event: EventItem;
  attending: boolean;
  canManage: boolean;
  onAttendToggle: (id: number, current: boolean | null) => void;
  onDelete: (id: number) => void;
  onEdit: (ev: EventItem) => void;
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
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable style={eStyles.deleteBtn} onPress={() => onEdit(event)}>
              <Ionicons name="pencil-outline" size={14} color="#888" />
            </Pressable>
            <Pressable style={eStyles.deleteBtn} onPress={() => onDelete(event.id)}>
              <MaterialCommunityIcons name="trash-can-outline" size={14} color="#555" />
            </Pressable>
          </View>
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
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attendeesEvent, setAttendeesEvent] = useState<EventItem | null>(null);
  const [editEvent, setEditEvent] = useState<EventItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

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
    const doDelete = async () => {
      try {
        await eventsApi.delete(id);
        setEvents((prev) => prev.filter((e) => e.id !== id));
      } catch {
        Alert.alert("Error", "No se pudo eliminar el evento");
      }
    };
    if (Platform.OS === "web") {
      if (window.confirm("¿Seguro que deseas eliminar este evento?")) { doDelete(); }
    } else {
      Alert.alert("Eliminar evento", "¿Seguro que deseas eliminar este evento?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  const handleEdit = (ev: EventItem) => {
    setEditEvent(ev);
    setShowEditModal(true);
  };

  const handleEventUpdated = (updated: EventItem) => {
    setEvents((prev) => prev.map((e) => e.id === updated.id ? { ...e, ...updated } : e));
  };

  if (loading) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color="#D4AF37" /></View>;
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
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
              onEdit={handleEdit}
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

      <CreateEventModal
        visible={showEditModal}
        editEvent={editEvent}
        onClose={() => { setShowEditModal(false); setEditEvent(null); }}
        onCreated={handleEventUpdated}
      />
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

function PendingChallengeCard({ item, onRespond, onUndo, onExpire }: {
  item: ChallengeItem;
  onRespond: (id: number, decision: "accepted" | "declined") => void;
  onUndo: (id: number) => void;
  onExpire: (id: number) => void;
}) {
  const alreadyResponded = item.status === "accepted" || item.status === "declined";
  const [decided, setDecided] = useState<"accepted" | "declined" | null>(alreadyResponded ? (item.status as "accepted" | "declined") : null);
  const [respondedAt, setRespondedAt] = useState<string | null>(alreadyResponded && item.respondedAt ? item.respondedAt : null);

  const handleDecision = (decision: "accepted" | "declined") => {
    setDecided(decision);
    setRespondedAt(new Date().toISOString());
    onRespond(item.id, decision);
  };

  const handleUndo = () => {
    setDecided(null);
    setRespondedAt(null);
    onUndo(item.id);
  };

  return (
    <View style={rStyles.pendingCard}>
      <View style={rStyles.pendingBanner}>
        <View style={rStyles.pendingBannerLine} />
        <Text style={rStyles.pendingBannerText}>⚔ DESAFÍO RECIBIDO ⚔</Text>
        <View style={rStyles.pendingBannerLine} />
      </View>

      <View style={rStyles.pendingFightLayout}>
        <View style={rStyles.pendingFighterBlock}>
          <View style={[rStyles.pendingAvatarCircle, { borderColor: "#C41E3A" }]}>
            {item.challengerAvatar ? (
              <Image source={{ uri: getAvatarServingUrl(item.challengerAvatar) ?? undefined }} style={rStyles.pendingAvatarImg} />
            ) : (
              <Text style={rStyles.pendingAvatarLetter}>{(item.challengerName[0] ?? "?").toUpperCase()}</Text>
            )}
          </View>
          <Text style={rStyles.pendingFighterName} numberOfLines={2}>{item.challengerName.toUpperCase()}</Text>
          <Text style={rStyles.pendingFighterLabel}>RETADOR</Text>
        </View>

        <View style={rStyles.pendingVsBlock}>
          <Text style={rStyles.pendingVsText}>VS</Text>
          <View style={rStyles.pendingSystemTag}>
            <Text style={rStyles.pendingSystemName} numberOfLines={2}>{item.trainingSystemName}</Text>
          </View>
        </View>

        <View style={rStyles.pendingFighterBlock}>
          <View style={[rStyles.pendingAvatarCircle, { borderColor: "#D4AF37" }]}>
            {item.challengedAvatar ? (
              <Image source={{ uri: getAvatarServingUrl(item.challengedAvatar) ?? undefined }} style={rStyles.pendingAvatarImg} />
            ) : (
              <Text style={[rStyles.pendingAvatarLetter, { color: "#D4AF37" }]}>TÚ</Text>
            )}
          </View>
          <Text style={rStyles.pendingFighterName} numberOfLines={2}>TÚ</Text>
          <Text style={rStyles.pendingFighterLabel}>RETADO</Text>
        </View>
      </View>

      <View style={rStyles.pendingMetaRow}>
        <Ionicons name="calendar-outline" size={11} color="#C41E3A" />
        <Text style={rStyles.pendingDate}>{formatChallengeDate(item.scheduledAt)}</Text>
      </View>
      {item.notes ? (
        <Text style={rStyles.pendingNotes}>"{item.notes}"</Text>
      ) : null}

      {decided ? (
        <View style={{ marginTop: 12, alignItems: "center" }}>
          <Text style={[rStyles.decidedText, decided === "accepted" ? { color: "#22C55E" } : { color: "#C41E3A" }]}>
            {decided === "accepted" ? "✓ ACEPTADO — PREPÁRATE" : "✕ DESAFÍO RECHAZADO"}
          </Text>
          {respondedAt && (
            <UndoTimer
              respondedAt={respondedAt}
              onUndo={handleUndo}
              onExpire={() => onExpire(item.id)}
            />
          )}
        </View>
      ) : (
        <View style={rStyles.pendingActions}>
          <Pressable style={rStyles.declineBtn} onPress={() => handleDecision("declined")}>
            <Text style={rStyles.declineBtnText}>✕  DECLINAR</Text>
          </Pressable>
          <Pressable style={rStyles.acceptBtn} onPress={() => handleDecision("accepted")}>
            <Text style={rStyles.acceptBtnText}>✓  ACEPTAR</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function ChallengeRow({ item, currentUserId, canManage, onSetResult, onCancel, onEdit, onRequestCancel, onConfirmCancel, onDeclineCancel }: {
  item: ChallengeItem;
  currentUserId: number;
  canManage: boolean;
  onSetResult: (challenge: ChallengeItem) => void;
  onCancel?: (id: number) => void;
  onEdit?: (challenge: ChallengeItem) => void;
  onRequestCancel?: (id: number) => void;
  onConfirmCancel?: (id: number) => void;
  onDeclineCancel?: (id: number) => void;
}) {
  const isPast = ["completed", "declined", "cancelled"].includes(item.status);
  const isCompleted = item.status === "completed";
  const isActive = item.status === "accepted";
  const isParticipant = item.challengerId === currentUserId || item.challengedId === currentUserId;

  const p1Color = isCompleted
    ? item.winnerId === item.challengerId ? "#22C55E" : "#EF4444"
    : "#CCC";
  const p2Color = isCompleted
    ? item.winnerId === item.challengedId ? "#22C55E" : "#EF4444"
    : "#CCC";

  const cancelPending = isActive && item.cancelRequestedBy !== null;
  const iRequestedCancel = cancelPending && item.cancelRequestedBy === currentUserId;
  const otherRequestedCancel = cancelPending && item.cancelRequestedBy !== currentUserId;

  const borderColor = isCompleted
    ? (item.winnerId === currentUserId ? "#D4AF37" : "#333")
    : isActive ? "#C41E3A"
    : item.status === "pending" ? "#4a3000"
    : "#1a1a1a";

  return (
    <View style={[rStyles.fightCard, { borderLeftColor: borderColor }]}>
      <View style={rStyles.fightCardInner}>
        <View style={rStyles.fightCardFighters}>
          <View style={rStyles.fightCardFighterCol}>
            <View style={rStyles.fightCardAvatarWrap}>
              {item.challengerAvatar ? (
                <Image source={{ uri: getAvatarServingUrl(item.challengerAvatar) ?? undefined }} style={rStyles.fightCardAvatarImg} />
              ) : (
                <Text style={rStyles.fightCardAvatarLetter}>{(item.challengerName[0] ?? "?").toUpperCase()}</Text>
              )}
            </View>
            <Text style={[rStyles.fightCardName, { color: p1Color, textAlign: "left" }]} numberOfLines={2}>
              {item.challengerName.toUpperCase()}
            </Text>
          </View>

          <View style={rStyles.fightCardVsBlock}>
            <Text style={rStyles.fightCardVs}>VS</Text>
            <Text style={rStyles.fightCardSystem} numberOfLines={1}>{item.trainingSystemName}</Text>
            <Text style={rStyles.fightCardDate}>{formatChallengeDate(item.scheduledAt).split("  ")[0]}</Text>
          </View>

          <View style={[rStyles.fightCardFighterCol, { alignItems: "flex-end" }]}>
            <View style={rStyles.fightCardAvatarWrap}>
              {item.challengedAvatar ? (
                <Image source={{ uri: getAvatarServingUrl(item.challengedAvatar) ?? undefined }} style={rStyles.fightCardAvatarImg} />
              ) : (
                <Text style={rStyles.fightCardAvatarLetter}>{(item.challengedName[0] ?? "?").toUpperCase()}</Text>
              )}
            </View>
            <Text style={[rStyles.fightCardName, { color: p2Color, textAlign: "right" }]} numberOfLines={2}>
              {item.challengedName.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={rStyles.fightCardActions}>
          {item.status === "pending" && onEdit && (
            <Pressable onPress={() => onEdit(item)} hitSlop={8}>
              <Ionicons name="pencil-outline" size={13} color="#555" />
            </Pressable>
          )}
          {item.status === "pending" && onCancel && (
            <Pressable onPress={() => onCancel(item.id)} hitSlop={8}>
              <Ionicons name="close-circle-outline" size={15} color="#C41E3A" />
            </Pressable>
          )}
          {isActive && !cancelPending && isParticipant && onEdit && item.challengerId === currentUserId && (
            <Pressable onPress={() => onEdit(item)} hitSlop={8}>
              <Ionicons name="pencil-outline" size={13} color="#555" />
            </Pressable>
          )}
          {isActive && !cancelPending && isParticipant && onRequestCancel && (
            <Pressable onPress={() => onRequestCancel(item.id)} hitSlop={8}>
              <Ionicons name="close-circle-outline" size={15} color="#C41E3A" />
            </Pressable>
          )}
          {canManage && !isPast && isActive && !cancelPending && (
            <Pressable onPress={() => onSetResult(item)} hitSlop={8}>
              <Ionicons name="time-outline" size={15} color="#D4AF37" />
            </Pressable>
          )}
        </View>
      </View>

      {item.status === "declined" && (
        <Text style={[rStyles.fightCardStatus, { color: "#C41E3A" }]}>✕ DECLINADO</Text>
      )}
      {item.status === "cancelled" && (
        <Text style={[rStyles.fightCardStatus, { color: "#444" }]}>— CANCELADO</Text>
      )}
      {isCompleted && item.winnerId && (
        <Text style={[rStyles.fightCardStatus, { color: "#D4AF37" }]}>
          ★ GANADOR: {item.winnerId === item.challengerId ? item.challengerName : item.challengedName}
        </Text>
      )}

      {iRequestedCancel && (
        <Text style={[rStyles.fightCardStatus, { color: "#555" }]}>⏸ CANCELACIÓN SOLICITADA — ESPERANDO RESPUESTA</Text>
      )}

      {otherRequestedCancel && onConfirmCancel && onDeclineCancel && (
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8, alignItems: "center" }}>
          <Text style={[rStyles.fightCardStatus, { flex: 1, color: "#888", marginTop: 0 }]}>Tu oponente quiere cancelar</Text>
          <Pressable
            style={[rStyles.miniActionBtn, { borderColor: "#22C55E" }]}
            onPress={() => onConfirmCancel(item.id)}
          >
            <Text style={[rStyles.miniActionBtnText, { color: "#22C55E" }]}>ACEPTAR</Text>
          </Pressable>
          <Pressable
            style={[rStyles.miniActionBtn, { borderColor: "#C41E3A" }]}
            onPress={() => onDeclineCancel(item.id)}
          >
            <Text style={[rStyles.miniActionBtnText, { color: "#C41E3A" }]}>RECHAZAR</Text>
          </Pressable>
        </View>
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

function CreateChallengeModal({ visible, onClose, targetUser, systems, onCreated, editChallenge }: {
  visible: boolean;
  onClose: () => void;
  targetUser: ChallengeUser | null;
  systems: TrainingSystem[];
  onCreated: () => void;
  editChallenge?: ChallengeItem | null;
}) {
  const isEditMode = !!editChallenge;
  const [selectedSystem, setSelectedSystem] = useState<TrainingSystem | null>(null);
  const [datetime, setDatetime] = useState<Date | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showNativePicker, setShowNativePicker] = useState<"date" | "time" | null>(null);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [kbHeight, setKbHeight] = useState(0);
  const isWeb = Platform.OS === "web";

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKbHeight(e.endCoordinates.height)
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKbHeight(0)
    );
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    if (visible && editChallenge) {
      const sys = systems.find((s) => s.id === editChallenge.trainingSystemId) ?? null;
      setSelectedSystem(sys);
      setDatetime(new Date(editChallenge.scheduledAt));
      setNotes(editChallenge.notes ?? "");
      setFormError(null);
    }
    if (!visible) {
      setSelectedSystem(null); setDatetime(null); setNotes(""); setFormError(null);
    }
  }, [visible, editChallenge, systems]);

  const reset = () => {
    setSelectedSystem(null); setDatetime(null); setNotes(""); setFormError(null);
  };

  const handleSend = async () => {
    setFormError(null);
    if (!selectedSystem) { setFormError("Selecciona un sistema de entrenamiento"); return; }
    if (!datetime) { setFormError("Selecciona fecha y hora"); return; }
    setSaving(true);
    try {
      if (isEditMode && editChallenge) {
        await challengesApi.update(editChallenge.id, {
          trainingSystemId: selectedSystem.id,
          scheduledAt: datetime.toISOString(),
          notes: notes.trim() || null,
        });
      } else {
        if (!targetUser) return;
        await challengesApi.create({
          challengedId: targetUser.id,
          trainingSystemId: selectedSystem.id,
          scheduledAt: datetime.toISOString(),
          notes: notes.trim() || undefined,
        });
      }
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { Keyboard.dismiss(); onClose(); }}>
      <Pressable style={[cStyles.backdrop, { paddingBottom: kbHeight }]} onPress={() => { Keyboard.dismiss(); onClose(); }}>
        <Pressable onPress={Keyboard.dismiss} style={cStyles.sheet}>
          <View style={aStyles.handle} />
          <Text style={cStyles.heading}>{isEditMode ? "MODIFICAR RETO" : `RETAR A ${(targetUser?.displayName ?? "").toUpperCase()}`}</Text>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

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
              <Text style={[cStyles.btnText, { color: "#000" }]}>{saving ? (isEditMode ? "GUARDANDO..." : "ENVIANDO...") : (isEditMode ? "GUARDAR" : "RETAR")}</Text>
            </Pressable>
          </View>
          </ScrollView>
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
  const insets = useSafeAreaInsets();
  const { refresh: refreshBadge } = useChallenges();
  const [users, setUsers] = useState<ChallengeUser[]>([]);
  const [search, setSearch] = useState("");
  const [systems, setSystems] = useState<TrainingSystem[]>([]);
  const [challenges, setChallenges] = useState<{ pending: ChallengeItem[]; sent: ChallengeItem[]; active: ChallengeItem[]; past: ChallengeItem[] }>({ pending: [], sent: [], active: [], past: [] });
  const [communityPending, setCommunityPending] = useState<ChallengeItem[]>([]);
  const [communityActive, setCommunityActive] = useState<ChallengeItem[]>([]);
  const [communityExpanded, setCommunityExpanded] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [targetUser, setTargetUser] = useState<ChallengeUser | null>(null);
  const [createVisible, setCreateVisible] = useState(false);
  const [resultChallenge, setResultChallenge] = useState<ChallengeItem | null>(null);
  const [editChallengeItem, setEditChallengeItem] = useState<ChallengeItem | null>(null);
  const [editChallengeVisible, setEditChallengeVisible] = useState(false);
  const [sentExpanded, setSentExpanded] = useState(true);
  const [activeExpanded, setActiveExpanded] = useState(true);
  const [pastExpanded, setPastExpanded] = useState(false);

  const load = useCallback(async () => {
    try {
      const [usersRes, systemsRes, challengesRes, communityRes, communityActiveRes] = await Promise.all([
        challengesApi.getUsers(),
        trainingApi.getSystems(),
        challengesApi.getAll(),
        challengesApi.getCommunityPending(),
        challengesApi.getCommunityActive(),
      ]);
      setUsers(usersRes.users);
      setSystems(systemsRes.systems);
      setChallenges({
        pending: challengesRes.pending ?? [],
        sent: challengesRes.sent ?? [],
        active: challengesRes.active ?? [],
        past: challengesRes.past ?? [],
      });
      setCommunityPending(communityRes.challenges ?? []);
      setCommunityActive(communityActiveRes.challenges ?? []);
      await refreshBadge();
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshBadge]);

  useEffect(() => { load(); }, [load]);

  const handleRespond = useCallback(async (id: number, decision: "accepted" | "declined") => {
    try {
      await challengesApi.respond(id, decision);
      await refreshBadge();
    } catch {}
  }, [refreshBadge]);

  const handleUndo = useCallback(async (id: number) => {
    try {
      await challengesApi.undoResponse(id);
      await load();
    } catch {}
  }, [load]);

  const handleExpire = useCallback(async (_id: number) => {
    await load();
  }, [load]);

  const handleCancel = useCallback(async (id: number) => {
    try { await challengesApi.cancel(id); await load(); } catch {}
  }, [load]);

  const handleEditChallenge = useCallback((ch: ChallengeItem) => {
    setEditChallengeItem(ch);
    setEditChallengeVisible(true);
  }, []);

  const handleSetResult = useCallback(async (challengeId: number, winnerId: number) => {
    try { await challengesApi.setResult(challengeId, winnerId); await load(); } catch {}
  }, [load]);

  const handleRequestCancel = useCallback(async (id: number) => {
    try { await challengesApi.requestCancel(id); await load(); } catch {}
  }, [load]);

  const handleConfirmCancel = useCallback(async (id: number) => {
    try { await challengesApi.confirmCancel(id); await load(); } catch {}
  }, [load]);

  const handleDeclineCancel = useCallback(async (id: number) => {
    try { await challengesApi.declineCancel(id); await load(); } catch {}
  }, [load]);

  const filteredUsers = users.filter((u) =>
    u.displayName.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color="#D4AF37" /></View>;
  }

  const hasPending = challenges.pending.length > 0;
  const otherCommunityPending = communityPending.filter(
    (ch) => ch.challengerId !== currentUserId && ch.challengedId !== currentUserId
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
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
            {challenges.pending.map((ch) => (
              <PendingChallengeCard
                key={ch.id}
                item={ch}
                onRespond={handleRespond}
                onUndo={handleUndo}
                onExpire={handleExpire}
              />
            ))}
          </View>
        )}

        {otherCommunityPending.length > 0 && (
          <View style={rStyles.section}>
            <Pressable style={rStyles.sectionHeader} onPress={() => setCommunityExpanded((p) => !p)}>
              <View style={[rStyles.sectionDot, { backgroundColor: "#5a3a00" }]} />
              <Text style={[rStyles.sectionTitle, { color: "#D4AF37" }]}>⚔ DESAFÍOS EN LA COMUNIDAD</Text>
              <View style={[rStyles.sectionBadge, { borderColor: "#D4AF37" }]}>
                <Text style={[rStyles.sectionBadgeText, { color: "#D4AF37" }]}>{otherCommunityPending.length}</Text>
              </View>
              <Ionicons name={communityExpanded ? "chevron-up" : "chevron-down"} size={12} color="#D4AF37" style={{ marginLeft: "auto" }} />
            </Pressable>
            {communityExpanded && otherCommunityPending.map((ch) => (
              <View
                key={ch.id}
                style={{
                  backgroundColor: "#0a0800",
                  borderWidth: 1,
                  borderColor: "#2a2000",
                  borderRadius: 2,
                  marginBottom: 8,
                  overflow: "hidden",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 12, gap: 10 }}>
                  <View style={{ alignItems: "center", flex: 1 }}>
                    {ch.challengerAvatar ? (
                      <Image source={{ uri: getAvatarServingUrl(ch.challengerAvatar) ?? undefined }} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: "#C41E3A" }} />
                    ) : (
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#1a0808", borderWidth: 1, borderColor: "#C41E3A", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ color: "#C41E3A", fontFamily: "NotoSansJP_700Bold", fontSize: 14 }}>{(ch.challengerName[0] ?? "?").toUpperCase()}</Text>
                      </View>
                    )}
                    <Text style={{ color: "#ddd", fontFamily: "NotoSansJP_700Bold", fontSize: 9, marginTop: 4, textAlign: "center" }} numberOfLines={2}>{ch.challengerName.toUpperCase()}</Text>
                  </View>
                  <View style={{ alignItems: "center", gap: 4 }}>
                    <Text style={{ color: "#D4AF37", fontFamily: "NotoSerifJP_700Bold", fontSize: 16, letterSpacing: 2 }}>VS</Text>
                    <View style={{ backgroundColor: "#1a1000", borderWidth: 1, borderColor: "#2a2000", borderRadius: 2, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: "#888", fontFamily: "NotoSansJP_400Regular", fontSize: 8, letterSpacing: 1 }} numberOfLines={1}>{ch.trainingSystemName}</Text>
                    </View>
                    <Text style={{ color: "#555", fontFamily: "NotoSansJP_400Regular", fontSize: 8 }}>{formatChallengeDate(ch.scheduledAt)}</Text>
                  </View>
                  <View style={{ alignItems: "center", flex: 1 }}>
                    {ch.challengedAvatar ? (
                      <Image source={{ uri: getAvatarServingUrl(ch.challengedAvatar) ?? undefined }} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: "#D4AF37" }} />
                    ) : (
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#0d0a00", borderWidth: 1, borderColor: "#D4AF37", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ color: "#D4AF37", fontFamily: "NotoSansJP_700Bold", fontSize: 14 }}>{(ch.challengedName[0] ?? "?").toUpperCase()}</Text>
                      </View>
                    )}
                    <Text style={{ color: "#ddd", fontFamily: "NotoSansJP_700Bold", fontSize: 9, marginTop: 4, textAlign: "center" }} numberOfLines={2}>{ch.challengedName.toUpperCase()}</Text>
                  </View>
                </View>
                <View style={{ backgroundColor: "#120e00", paddingVertical: 4, paddingHorizontal: 12, alignItems: "center" }}>
                  <Text style={{ color: "#7a6010", fontFamily: "NotoSansJP_400Regular", fontSize: 9, letterSpacing: 2 }}>ESPERANDO RESPUESTA</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {challenges.sent.length > 0 && (
          <View style={rStyles.section}>
            <Pressable style={rStyles.sectionHeader} onPress={() => setSentExpanded((p) => !p)}>
              <View style={[rStyles.sectionDot, { backgroundColor: "#4a3000" }]} />
              <Text style={rStyles.sectionTitle}>RETOS ENVIADOS</Text>
              <View style={rStyles.sectionBadge}><Text style={rStyles.sectionBadgeText}>{challenges.sent.length}</Text></View>
              <Ionicons name={sentExpanded ? "chevron-up" : "chevron-down"} size={12} color="#333" style={{ marginLeft: "auto" }} />
            </Pressable>
            {sentExpanded && challenges.sent.map((ch) => (
              <ChallengeRow key={ch.id} item={ch} currentUserId={currentUserId} canManage={canManage} onSetResult={setResultChallenge} onCancel={handleCancel} onEdit={handleEditChallenge} />
            ))}
          </View>
        )}

        {(() => {
          const ownIds = new Set(challenges.active.map((c) => c.id));
          const allActive = [
            ...challenges.active,
            ...communityActive.filter((c) => !ownIds.has(c.id)),
          ];
          return allActive.length > 0 ? (
            <View style={rStyles.section}>
              <Pressable style={rStyles.sectionHeader} onPress={() => setActiveExpanded((p) => !p)}>
                <View style={[rStyles.sectionDot, { backgroundColor: "#C41E3A" }]} />
                <Text style={[rStyles.sectionTitle, { color: "#C41E3A" }]}>RETOS ACTIVOS</Text>
                <View style={[rStyles.sectionBadge, { borderColor: "#C41E3A" }]}><Text style={[rStyles.sectionBadgeText, { color: "#C41E3A" }]}>{allActive.length}</Text></View>
                <Ionicons name={activeExpanded ? "chevron-up" : "chevron-down"} size={12} color="#C41E3A" style={{ marginLeft: "auto" }} />
              </Pressable>
              {activeExpanded && allActive.map((ch) => (
                <ChallengeRow
                  key={ch.id}
                  item={ch}
                  currentUserId={currentUserId}
                  canManage={canManage}
                  onSetResult={setResultChallenge}
                  onEdit={handleEditChallenge}
                  onRequestCancel={handleRequestCancel}
                  onConfirmCancel={handleConfirmCancel}
                  onDeclineCancel={handleDeclineCancel}
                />
              ))}
            </View>
          ) : null;
        })()}

        {challenges.past.length > 0 && (
          <View style={rStyles.section}>
            <Pressable style={rStyles.sectionHeader} onPress={() => setPastExpanded((p) => !p)}>
              <View style={[rStyles.sectionDot, { backgroundColor: "#333" }]} />
              <Text style={rStyles.sectionTitle}>HISTORIAL</Text>
              <View style={rStyles.sectionBadge}><Text style={rStyles.sectionBadgeText}>{challenges.past.length}</Text></View>
              <Ionicons name={pastExpanded ? "chevron-up" : "chevron-down"} size={12} color="#333" style={{ marginLeft: "auto" }} />
            </Pressable>
            {pastExpanded && challenges.past.map((ch) => (
              <ChallengeRow key={ch.id} item={ch} currentUserId={currentUserId} canManage={canManage} onSetResult={setResultChallenge} />
            ))}
          </View>
        )}

        <View style={rStyles.rosterSection}>
          <View style={rStyles.rosterHeader}>
            <View style={rStyles.rosterHeaderLine} />
            <Text style={rStyles.rosterHeaderText}>SELECCIONA TU OPONENTE</Text>
            <View style={rStyles.rosterHeaderLine} />
          </View>
          {filteredUsers.length === 0 ? (
            <Text style={rStyles.emptyText}>
              {search ? "Sin resultados para la búsqueda" : "Sin miembros activos"}
            </Text>
          ) : (
            filteredUsers.map((u) => (
              <View key={u.id} style={rStyles.userRow}>
                <View style={rStyles.userAvatarWrap}>
                  {u.avatarUrl ? (
                    <Image source={{ uri: getAvatarServingUrl(u.avatarUrl) ?? undefined }} style={rStyles.userAvatar} />
                  ) : (
                    <View style={[rStyles.userAvatar, rStyles.userAvatarFallback]}>
                      <Text style={rStyles.userAvatarLetter}>{(u.displayName[0] ?? "?").toUpperCase()}</Text>
                    </View>
                  )}
                </View>
                <Text style={rStyles.userName} numberOfLines={1}>{u.displayName.toUpperCase()}</Text>
                <Pressable style={rStyles.gloveBtn} onPress={() => { setTargetUser(u); setCreateVisible(true); }}>
                  <Text style={rStyles.gloveBtnText}>⚔ RETAR</Text>
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

      <CreateChallengeModal
        visible={editChallengeVisible}
        onClose={() => { setEditChallengeVisible(false); setEditChallengeItem(null); }}
        targetUser={null}
        systems={systems}
        editChallenge={editChallengeItem}
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
    backgroundColor: "#080808", borderWidth: 1, borderColor: "#1c1c1c",
    marginHorizontal: 12, marginTop: 12, marginBottom: 8,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 2,
  },
  searchInput: { flex: 1, color: "#CCC", fontFamily: "NotoSansJP_400Regular", fontSize: 13 },

  pendingSection: { marginTop: 0 },
  pendingCard: {
    backgroundColor: "#070707",
    borderTopWidth: 2, borderTopColor: "#C41E3A",
    borderBottomWidth: 1, borderBottomColor: "#1a0000",
    marginHorizontal: 12, marginTop: 10,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16,
    borderRadius: 2,
  },
  pendingBanner: {
    flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14,
  },
  pendingBannerLine: { flex: 1, height: 1, backgroundColor: "#2a0000" },
  pendingBannerText: {
    color: "#C41E3A", fontFamily: "NotoSansJP_700Bold", fontSize: 9,
    letterSpacing: 3,
  },
  pendingFightLayout: {
    flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12,
  },
  pendingFighterBlock: {
    flex: 1, alignItems: "center", gap: 4,
  },
  pendingAvatarCircle: {
    width: 54, height: 54, borderRadius: 27,
    borderWidth: 2, borderColor: "#C41E3A",
    backgroundColor: "#0d0000", alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },
  pendingAvatarImg: { width: 54, height: 54, borderRadius: 27 },
  pendingAvatarLetter: {
    color: "#C41E3A", fontFamily: "NotoSansJP_700Bold", fontSize: 18,
  },
  pendingFighterName: {
    color: "#FFF", fontFamily: "NotoSansJP_700Bold", fontSize: 11,
    letterSpacing: 1, textAlign: "center", lineHeight: 14,
  },
  pendingFighterLabel: {
    color: "#444", fontFamily: "NotoSansJP_400Regular", fontSize: 8,
    letterSpacing: 2,
  },
  pendingVsBlock: { alignItems: "center", gap: 4 },
  pendingVsText: {
    color: "#C41E3A", fontFamily: "NotoSansJP_700Bold", fontSize: 26,
    letterSpacing: 2, lineHeight: 30,
  },
  pendingSystemTag: {
    backgroundColor: "#0d0d0d", borderWidth: 1, borderColor: "#2a2a2a",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 2,
  },
  pendingSystemName: {
    color: "#D4AF37", fontFamily: "NotoSansJP_700Bold", fontSize: 9,
    letterSpacing: 1, textAlign: "center",
  },
  pendingMetaRow: {
    flexDirection: "row", alignItems: "center", gap: 5, justifyContent: "center", marginBottom: 4,
  },
  pendingDate: { color: "#999", fontFamily: "NotoSansJP_400Regular", fontSize: 11 },
  pendingNotes: {
    color: "#3a3a3a", fontFamily: "NotoSansJP_400Regular", fontSize: 11,
    fontStyle: "italic", textAlign: "center", marginBottom: 4,
  },
  pendingActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  declineBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 2, borderWidth: 1,
    borderColor: "#C41E3A", backgroundColor: "rgba(196,30,58,0.07)",
    alignItems: "center", justifyContent: "center",
  },
  declineBtnText: {
    color: "#C41E3A", fontFamily: "NotoSansJP_700Bold", fontSize: 11, letterSpacing: 2,
  },
  acceptBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 2, borderWidth: 1,
    borderColor: "#D4AF37", backgroundColor: "rgba(212,175,55,0.08)",
    alignItems: "center", justifyContent: "center",
  },
  acceptBtnText: {
    color: "#D4AF37", fontFamily: "NotoSansJP_700Bold", fontSize: 11, letterSpacing: 2,
  },
  decidedText: { fontFamily: "NotoSansJP_700Bold", fontSize: 12, letterSpacing: 2 },
  undoBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    marginTop: 8, alignSelf: "center",
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 2,
    borderWidth: 1, borderColor: "#333",
  },
  undoBtnText: { color: "#555", fontFamily: "NotoSansJP_700Bold", fontSize: 10, letterSpacing: 1 },

  section: { marginTop: 10 },
  sectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 12, paddingVertical: 9,
    backgroundColor: "#050505",
    borderTopWidth: 1, borderTopColor: "#111",
    borderBottomWidth: 1, borderBottomColor: "#111",
  },
  sectionDot: { width: 4, height: 14, borderRadius: 1 },
  sectionTitle: {
    color: "#444", fontFamily: "NotoSansJP_700Bold", fontSize: 9, letterSpacing: 3,
  },
  sectionBadge: {
    borderWidth: 1, borderColor: "#2a2a2a",
    paddingHorizontal: 6, paddingVertical: 1, borderRadius: 1,
  },
  sectionBadgeText: { color: "#555", fontFamily: "NotoSansJP_700Bold", fontSize: 10 },

  fightCard: {
    marginHorizontal: 12, marginTop: 6,
    backgroundColor: "#060606", borderRadius: 2,
    borderLeftWidth: 3, borderLeftColor: "#C41E3A",
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10,
    borderTopWidth: 1, borderTopColor: "#111",
    borderBottomWidth: 1, borderBottomColor: "#111",
    borderRightWidth: 1, borderRightColor: "#111",
  },
  fightCardInner: {
    flexDirection: "row", alignItems: "center", gap: 8,
  },
  fightCardFighters: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 6,
  },
  fightCardName: {
    flex: 1, fontFamily: "NotoSansJP_700Bold", fontSize: 11,
    letterSpacing: 0.5, lineHeight: 14,
  },
  fightCardVsBlock: { alignItems: "center", paddingHorizontal: 2 },
  fightCardVs: {
    color: "#C41E3A", fontFamily: "NotoSansJP_700Bold", fontSize: 14,
    letterSpacing: 2, lineHeight: 18,
  },
  fightCardFighterCol: {
    flex: 1, alignItems: "flex-start", gap: 5,
  },
  fightCardAvatarWrap: {
    width: 38, height: 38, borderRadius: 19, overflow: "hidden",
    backgroundColor: "#0d0d0d", borderWidth: 1, borderColor: "#2a2a2a",
    alignItems: "center", justifyContent: "center",
  },
  fightCardAvatarImg: { width: 38, height: 38, borderRadius: 19 },
  fightCardAvatarLetter: {
    color: "#444", fontFamily: "NotoSansJP_700Bold", fontSize: 14,
  },
  fightCardSystem: {
    color: "#D4AF37", fontFamily: "NotoSansJP_400Regular", fontSize: 8,
    letterSpacing: 0.5, textAlign: "center", maxWidth: 72,
  },
  fightCardDate: {
    color: "#777", fontFamily: "NotoSansJP_400Regular", fontSize: 8,
    textAlign: "center",
  },
  fightCardActions: {
    flexDirection: "column", alignItems: "center", gap: 8, paddingLeft: 4,
  },
  fightCardStatus: {
    fontFamily: "NotoSansJP_700Bold", fontSize: 8, letterSpacing: 2, marginTop: 8,
  },
  miniActionBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 2, borderWidth: 1,
  },
  miniActionBtnText: { fontFamily: "NotoSansJP_700Bold", fontSize: 8, letterSpacing: 1 },

  rosterSection: { marginTop: 14 },
  rosterHeader: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, marginBottom: 4,
  },
  rosterHeaderLine: { flex: 1, height: 1, backgroundColor: "#1a1a1a" },
  rosterHeaderText: {
    color: "#2a2a2a", fontFamily: "NotoSansJP_700Bold", fontSize: 8,
    letterSpacing: 3,
  },
  userRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: "#0d0d0d",
    gap: 10,
  },
  userAvatarWrap: {
    width: 34, height: 34,
    borderWidth: 1, borderColor: "#1a1a1a", borderRadius: 2,
    overflow: "hidden",
  },
  userAvatar: { width: 34, height: 34, borderRadius: 0 },
  userAvatarFallback: { backgroundColor: "#0a0a0a", alignItems: "center", justifyContent: "center" },
  userAvatarLetter: { color: "#444", fontFamily: "NotoSansJP_700Bold", fontSize: 13 },
  userName: {
    flex: 1, color: "#666", fontFamily: "NotoSansJP_700Bold",
    fontSize: 11, letterSpacing: 1,
  },
  gloveBtn: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 2,
    borderWidth: 1, borderColor: "#C41E3A",
    backgroundColor: "rgba(196,30,58,0.06)",
  },
  gloveBtnText: {
    color: "#C41E3A", fontFamily: "NotoSansJP_700Bold", fontSize: 9, letterSpacing: 1,
  },
  emptyText: {
    color: "#222", fontFamily: "NotoSansJP_400Regular", fontSize: 11,
    textAlign: "center", paddingTop: 40, letterSpacing: 2,
  },
  sectionLabel: {
    color: "#888", fontFamily: "NotoSansJP_700Bold", fontSize: 9,
    letterSpacing: 2, marginBottom: 6, marginTop: 4,
  },
  systemChip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 2,
    borderWidth: 1, borderColor: "#2a2a2a", backgroundColor: "#080808",
  },
  systemChipActive: { borderColor: "#D4AF37", backgroundColor: "rgba(212,175,55,0.08)" },
  systemChipText: { color: "#444", fontFamily: "NotoSansJP_400Regular", fontSize: 12 },
  systemChipTextActive: { color: "#D4AF37", fontFamily: "NotoSansJP_700Bold" },
});

const MEDAL_COLORS = ["#D4AF37", "#B0B0B0", "#CD7F32"];

function RankingRow({
  rank,
  displayName,
  avatarUrl,
  stat,
  statLabel,
  ninjutsuBelt,
  jiujitsuBelt,
}: {
  rank: number;
  displayName: string;
  avatarUrl: string | null;
  stat: string;
  statLabel: string;
  ninjutsuBelt?: { name: string; color: string } | null;
  jiujitsuBelt?: { name: string; color: string } | null;
}) {
  const medalColor = rank <= 3 ? MEDAL_COLORS[rank - 1] : "#2a2a2a";
  const isTopThree = rank <= 3;
  const hasBelts = ninjutsuBelt || jiujitsuBelt;
  return (
    <View style={[rkStyles.row, hasBelts && { alignItems: "flex-start" }]}>
      <View style={[rkStyles.rankBadge, { borderColor: medalColor, backgroundColor: isTopThree ? medalColor + "15" : "transparent" }, hasBelts && { marginTop: 2 }]}>
        <Text style={[rkStyles.rankNum, { color: medalColor }]}>{rank}</Text>
      </View>
      <View style={[rkStyles.avatar, hasBelts && { marginTop: 2 }]}>
        {avatarUrl ? (
          <Image source={{ uri: getAvatarServingUrl(avatarUrl) }} style={rkStyles.avatarImg} />
        ) : (
          <View style={[rkStyles.avatarImg, rkStyles.avatarFallback]}>
            <Text style={rkStyles.avatarLetter}>{(displayName[0] ?? "?").toUpperCase()}</Text>
          </View>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={rkStyles.name} numberOfLines={1}>{displayName}</Text>
        {hasBelts && (
          <View style={rkStyles.beltInline}>
            {ninjutsuBelt && (
              <View style={rkStyles.beltChip}>
                <View style={[rkStyles.beltDot, { backgroundColor: ninjutsuBelt.color }]} />
                <Text style={rkStyles.beltDiscipline}>NIN</Text>
                <Text style={rkStyles.beltName}>{ninjutsuBelt.name}</Text>
              </View>
            )}
            {jiujitsuBelt && (
              <View style={rkStyles.beltChip}>
                <View style={[rkStyles.beltDot, { backgroundColor: jiujitsuBelt.color }]} />
                <Text style={rkStyles.beltDiscipline}>BJJ</Text>
                <Text style={rkStyles.beltName}>{jiujitsuBelt.name}</Text>
              </View>
            )}
          </View>
        )}
      </View>
      <View style={[rkStyles.statPill, hasBelts && { marginTop: 2 }]}>
        <Text style={[rkStyles.statNum, isTopThree && { color: medalColor }]}>{stat}</Text>
        <Text style={rkStyles.statLabel}>{statLabel}</Text>
      </View>
    </View>
  );
}

function FighterRankingRow({ rank, entry }: { rank: number; entry: RankingFighterEntry }) {
  const { displayName, avatarUrl, wins, losses, draws, ninjutsuBelt, jiujitsuBelt } = entry;
  const medalColor = rank <= 3 ? MEDAL_COLORS[rank - 1] : "#2a2a2a";
  const isTopThree = rank <= 3;
  const hasBelts = ninjutsuBelt || jiujitsuBelt;
  return (
    <View style={[rkStyles.row, hasBelts && { alignItems: "flex-start" }]}>
      <View style={[rkStyles.rankBadge, { borderColor: medalColor, backgroundColor: isTopThree ? medalColor + "15" : "transparent" }, hasBelts && { marginTop: 2 }]}>
        <Text style={[rkStyles.rankNum, { color: medalColor }]}>{rank}</Text>
      </View>
      <View style={[rkStyles.avatar, hasBelts && { marginTop: 2 }]}>
        {avatarUrl ? (
          <Image source={{ uri: getAvatarServingUrl(avatarUrl) }} style={rkStyles.avatarImg} />
        ) : (
          <View style={[rkStyles.avatarImg, rkStyles.avatarFallback]}>
            <Text style={rkStyles.avatarLetter}>{(displayName[0] ?? "?").toUpperCase()}</Text>
          </View>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={rkStyles.name} numberOfLines={1}>{displayName}</Text>
        {hasBelts && (
          <View style={rkStyles.beltInline}>
            {ninjutsuBelt && (
              <View style={rkStyles.beltChip}>
                <View style={[rkStyles.beltDot, { backgroundColor: ninjutsuBelt.color }]} />
                <Text style={rkStyles.beltDiscipline}>NIN</Text>
                <Text style={rkStyles.beltName}>{ninjutsuBelt.name}</Text>
              </View>
            )}
            {jiujitsuBelt && (
              <View style={rkStyles.beltChip}>
                <View style={[rkStyles.beltDot, { backgroundColor: jiujitsuBelt.color }]} />
                <Text style={rkStyles.beltDiscipline}>BJJ</Text>
                <Text style={rkStyles.beltName}>{jiujitsuBelt.name}</Text>
              </View>
            )}
          </View>
        )}
      </View>
      <View style={[rkStyles.fightRecord, hasBelts && { marginTop: 2 }]}>
        <Text style={rkStyles.fightWin}>{wins}V</Text>
        <Text style={rkStyles.fightSep}> · </Text>
        <Text style={rkStyles.fightLoss}>{losses}D</Text>
        <Text style={rkStyles.fightSep}> · </Text>
        <Text style={rkStyles.fightDraw}>{draws}E</Text>
      </View>
    </View>
  );
}

function ChallengeRankingRow({
  rank,
  entry,
  expanded,
  onPress,
}: {
  rank: number;
  entry: RankingChallengeEntry;
  expanded: boolean;
  onPress: () => void;
}) {
  const { displayName, avatarUrl, wins, wonChallenges, ninjutsuBelt, jiujitsuBelt } = entry;
  const medalColor = rank <= 3 ? MEDAL_COLORS[rank - 1] : "#2a2a2a";
  const isTopThree = rank <= 3;
  const hasBelts = ninjutsuBelt || jiujitsuBelt;
  return (
    <View>
      <Pressable style={[rkStyles.row, expanded && { backgroundColor: "#0a0a0a" }, hasBelts && { alignItems: "flex-start" }]} onPress={onPress}>
        <View style={[rkStyles.rankBadge, { borderColor: medalColor, backgroundColor: isTopThree ? medalColor + "15" : "transparent" }, hasBelts && { marginTop: 2 }]}>
          <Text style={[rkStyles.rankNum, { color: medalColor }]}>{rank}</Text>
        </View>
        <View style={[rkStyles.avatar, hasBelts && { marginTop: 2 }]}>
          {avatarUrl ? (
            <Image source={{ uri: getAvatarServingUrl(avatarUrl) }} style={rkStyles.avatarImg} />
          ) : (
            <View style={[rkStyles.avatarImg, rkStyles.avatarFallback]}>
              <Text style={rkStyles.avatarLetter}>{(displayName[0] ?? "?").toUpperCase()}</Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={rkStyles.name} numberOfLines={1}>{displayName}</Text>
          {hasBelts && (
            <View style={rkStyles.beltInline}>
              {ninjutsuBelt && (
                <View style={rkStyles.beltChip}>
                  <View style={[rkStyles.beltDot, { backgroundColor: ninjutsuBelt.color }]} />
                  <Text style={rkStyles.beltDiscipline}>NIN</Text>
                  <Text style={rkStyles.beltName}>{ninjutsuBelt.name}</Text>
                </View>
              )}
              {jiujitsuBelt && (
                <View style={rkStyles.beltChip}>
                  <View style={[rkStyles.beltDot, { backgroundColor: jiujitsuBelt.color }]} />
                  <Text style={rkStyles.beltDiscipline}>BJJ</Text>
                  <Text style={rkStyles.beltName}>{jiujitsuBelt.name}</Text>
                </View>
              )}
            </View>
          )}
        </View>
        <View style={[rkStyles.statPill, hasBelts && { marginTop: 2 }]}>
          <Text style={[rkStyles.statNum, isTopThree && { color: medalColor }]}>{wins}</Text>
          <Text style={rkStyles.statLabel}>victorias</Text>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={12} color="#444" style={[{ marginLeft: 4 }, hasBelts && { marginTop: 4 }]} />
      </Pressable>
      {expanded && (
        <View style={rkStyles.challengeList}>
          {wonChallenges.length === 0 ? (
            <Text style={rkStyles.emptyText}>Sin detalles</Text>
          ) : wonChallenges.map((c: RankingWonChallenge) => (
            <View key={c.id} style={rkStyles.challengeItem}>
              <View style={rkStyles.challengeLeft}>
                <Text style={rkStyles.challengeVs}>VS</Text>
                <Text style={rkStyles.challengeOpponent} numberOfLines={1}>{c.opponentName}</Text>
              </View>
              <View style={rkStyles.challengeRight}>
                <Text style={rkStyles.challengeArt}>{c.artName}</Text>
                <Text style={rkStyles.challengeDate}>
                  {new Date(c.scheduledAt).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function RankingSection({
  title,
  color,
  loading,
  empty,
  count,
  children,
}: {
  title: string;
  color: string;
  loading: boolean;
  empty: boolean;
  count: number;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={[rkStyles.section, { borderLeftWidth: 3, borderLeftColor: expanded ? color : "#1a1a1a" }]}>
      <Pressable
        style={[rkStyles.sectionHeader, { backgroundColor: expanded ? "#0a0a0a" : "#050505" }]}
        onPress={() => setExpanded((p) => !p)}
      >
        <View style={[rkStyles.sectionDot, { backgroundColor: color }]} />
        <Text style={[rkStyles.sectionTitle, { color }]}>{title}</Text>
        <View style={rkStyles.chevronWrap}>
          {!loading && !expanded && count > 0 && (
            <View style={[rkStyles.countBadge, { backgroundColor: color + "22", borderColor: color + "44" }]}>
              <Text style={[rkStyles.countBadgeText, { color }]}>{count}</Text>
            </View>
          )}
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={color} />
        </View>
      </Pressable>
      {expanded && (
        <View style={rkStyles.sectionBody}>
          {loading ? (
            <ActivityIndicator size="small" color="#D4AF37" style={{ marginVertical: 18 }} />
          ) : empty ? (
            <Text style={rkStyles.emptyText}>Sin datos aún</Text>
          ) : children}
        </View>
      )}
    </View>
  );
}

function RankingTab() {
  const insets = useSafeAreaInsets();
  const [fighters, setFighters] = useState<RankingFighterEntry[]>([]);
  const [attendance, setAttendance] = useState<RankingAttendanceEntry[]>([]);
  const [challenges, setChallenges] = useState<RankingChallengeEntry[]>([]);
  const [attendanceMonth, setAttendanceMonth] = useState("");
  const [loadingF, setLoadingF] = useState(true);
  const [loadingA, setLoadingA] = useState(true);
  const [loadingC, setLoadingC] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedChallenger, setExpandedChallenger] = useState<number | null>(null);

  const load = useCallback(async () => {
    await Promise.allSettled([
      rankingApi.getFighters().then((r) => { setFighters(r.ranking); setLoadingF(false); }).catch(() => setLoadingF(false)),
      rankingApi.getAttendance().then((r) => { setAttendance(r.ranking); setAttendanceMonth(r.month); setLoadingA(false); }).catch(() => setLoadingA(false)),
      rankingApi.getChallenges().then((r) => { setChallenges(r.ranking); setLoadingC(false); }).catch(() => setLoadingC(false)),
    ]);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  return (
    <ScrollView style={rkStyles.scroll} contentContainerStyle={[rkStyles.scrollContent, { paddingBottom: insets.bottom + 80 }]} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" colors={["#D4AF37"]} />}
    >
      <RankingSection title="⚔ LUCHADORES" color="#C41E3A" loading={loadingF} empty={fighters.length === 0} count={fighters.length}>
        {fighters.map((u, i) => (
          <FighterRankingRow key={u.userId} rank={i + 1} entry={u} />
        ))}
      </RankingSection>

      <RankingSection
        title={`🏯 ASISTENCIA${attendanceMonth ? ` · ${attendanceMonth.toUpperCase()}` : ""}`}
        color="#D4AF37"
        loading={loadingA}
        empty={attendance.length === 0}
        count={attendance.length}
      >
        {attendance.map((u, i) => (
          <RankingRow
            key={u.userId}
            rank={i + 1}
            displayName={u.displayName}
            avatarUrl={u.avatarUrl}
            stat={String(u.attendances)}
            statLabel="clases"
            ninjutsuBelt={u.ninjutsuBelt}
            jiujitsuBelt={u.jiujitsuBelt}
          />
        ))}
      </RankingSection>

      <RankingSection title="忍 RETOS" color="#6A5ACD" loading={loadingC} empty={challenges.length === 0} count={challenges.length}>
        {challenges.map((u, i) => (
          <ChallengeRankingRow
            key={u.userId}
            rank={i + 1}
            entry={u}
            expanded={expandedChallenger === u.userId}
            onPress={() => setExpandedChallenger(expandedChallenger === u.userId ? null : u.userId)}
          />
        ))}
      </RankingSection>
    </ScrollView>
  );
}

const rkStyles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  section: { marginBottom: 6, overflow: "hidden" },
  sectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: "#1a1a1a",
    borderBottomWidth: 1, borderBottomColor: "#1a1a1a",
  },
  sectionDot: { width: 4, height: 16, borderRadius: 1 },
  sectionTitle: { fontFamily: "NotoSansJP_700Bold", fontSize: 10, letterSpacing: 3 },
  countBadge: {
    marginLeft: "auto",
    borderWidth: 1, borderRadius: 2,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  countBadgeText: { fontFamily: "NotoSansJP_700Bold", fontSize: 10, letterSpacing: 1 },
  chevronWrap: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 8 },
  sectionBody: { backgroundColor: "#000" },
  emptyText: {
    color: "#333", fontFamily: "NotoSansJP_400Regular", fontSize: 12,
    textAlign: "center", paddingVertical: 20,
  },
  row: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "#0d0d0d",
  },
  rankBadge: {
    width: 26, height: 26, borderRadius: 2, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  rankNum: { fontFamily: "NotoSansJP_700Bold", fontSize: 12, color: "#333" },
  avatar: { width: 32, height: 32 },
  avatarImg: { width: 32, height: 32, borderRadius: 16 },
  avatarFallback: { backgroundColor: "#111", alignItems: "center", justifyContent: "center" },
  avatarLetter: { color: "#D4AF37", fontFamily: "NotoSansJP_700Bold", fontSize: 13 },
  name: {
    flex: 1, color: "#CCC", fontFamily: "NotoSansJP_500Medium",
    fontSize: 13, letterSpacing: 0.3,
  },
  statPill: { alignItems: "flex-end" },
  statNum: { color: "#888", fontFamily: "NotoSansJP_700Bold", fontSize: 14 },
  statLabel: { color: "#333", fontFamily: "NotoSansJP_400Regular", fontSize: 9, letterSpacing: 1 },
  fightRecord: { flexDirection: "row", alignItems: "center" },
  fightWin: { fontFamily: "NotoSansJP_700Bold", fontSize: 13, color: "#22C55E" },
  fightLoss: { fontFamily: "NotoSansJP_700Bold", fontSize: 13, color: "#EF4444" },
  fightDraw: { fontFamily: "NotoSansJP_700Bold", fontSize: 13, color: "#F97316" },
  fightSep: { fontFamily: "NotoSansJP_400Regular", fontSize: 11, color: "#333" },
  beltInline: { flexDirection: "row", gap: 10, marginTop: 4, flexWrap: "wrap" },
  beltChip: { flexDirection: "row", alignItems: "center", gap: 5 },
  beltDot: { width: 7, height: 7, borderRadius: 4 },
  beltDiscipline: { fontFamily: "NotoSerifJP_700Bold", fontSize: 11, color: "#666" },
  beltName: { fontFamily: "NotoSansJP_400Regular", fontSize: 10, color: "#555", letterSpacing: 0.3 },
  challengeList: { backgroundColor: "#030303", borderBottomWidth: 1, borderBottomColor: "#0d0d0d" },
  challengeItem: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: "#0a0a0a",
  },
  challengeLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  challengeVs: { fontFamily: "NotoSansJP_700Bold", fontSize: 9, color: "#6A5ACD", letterSpacing: 1 },
  challengeOpponent: { fontFamily: "NotoSansJP_500Medium", fontSize: 12, color: "#AAA", flex: 1 },
  challengeRight: { alignItems: "flex-end", gap: 2 },
  challengeArt: { fontFamily: "NotoSansJP_400Regular", fontSize: 10, color: "#6A5ACD" },
  challengeDate: { fontFamily: "NotoSansJP_400Regular", fontSize: 9, color: "#444" },
});

export default function ComunidadScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const router = useRouter();
  const { hasRole, isAuthenticated, isLoading, user } = useAuth();
  const { pendingCount } = useChallenges();
  const [activeTab, setActiveTab] = useState<ComunidadTab>("eventos");
  const [createVisible, setCreateVisible] = useState(false);
  const [createdEvents, setCreatedEvents] = useState<EventItem[]>([]);

  const canManage = !isLoading && isAuthenticated && (hasRole("admin") || hasRole("profesor"));

  const renderTab = () => {
    if (activeTab === "eventos") return <EventosTab canManage={canManage} extraEvents={createdEvents} />;
    if (activeTab === "retos") return <RetosTab canManage={canManage} currentUserId={user?.id ?? 0} />;
    if (activeTab === "ranking") return <RankingTab />;
    return <ComingSoon />;
  };

  return (
    <View style={styles.root}>
      <View style={[styles.headerContainer, { paddingTop: isWeb ? 16 : insets.top + 8 }]}>
        <View style={styles.logoRow}>
          <Pressable onPress={() => router.push("/conocenos")}>
            <Image source={require("@/assets/images/logo.png")} style={styles.logoImage} resizeMode="contain" />
          </Pressable>
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
