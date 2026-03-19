import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Animated,
  Linking,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError, settingsApi } from "@/lib/api";

type Mode = "welcome" | "login" | "register";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("welcome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [sedes, setSedes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState("");
  const mottoOpacity = useRef(new Animated.Value(1)).current;
  const [mottoText, setMottoText] = useState("忍者は永遠に");

  useEffect(() => {
    settingsApi.getPublic().then((s) => {
      if (s.privacyPolicyUrl) setPrivacyPolicyUrl(s.privacyPolicyUrl);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (mode === "welcome") {
      setMottoText("忍者は永遠に");
      mottoOpacity.setValue(1);
      
      const timer = setTimeout(() => {
        Animated.sequence([
          Animated.timing(mottoOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(mottoOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
            delay: 200,
          }),
        ]).start();
        setMottoText("Ninjas por siempre");
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [mode, mottoOpacity]);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("Completa todos los campos");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(email.trim(), password);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("Error de conexión");
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleSede = (sede: string) => {
    setSedes((prev) =>
      prev.includes(sede) ? prev.filter((s) => s !== sede) : [...prev, sede]
    );
  };

  const handleRegister = async () => {
    if (!email.trim() || !password || !displayName.trim()) {
      setError("Completa todos los campos");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (sedes.length === 0) {
      setError("Selecciona al menos una sede");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await register(email.trim(), password, displayName.trim(), phone.trim() || undefined, sedes);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("Error de conexión");
      }
    } finally {
      setLoading(false);
    }
  };

  if (mode === "welcome") {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.welcomeContent}>
          <View style={styles.logoCircle}>
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Animated.Text style={[styles.welcomeMotto, { opacity: mottoOpacity }]}>
            {mottoText}
          </Animated.Text>

          <View style={styles.buttonGroup}>
            <Pressable
              style={styles.primaryButton}
              onPress={() => setMode("login")}
            >
              <Text style={styles.primaryButtonText}>Iniciar Sesión</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => setMode("register")}
            >
              <Text style={styles.secondaryButtonText}>Crear Cuenta</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.formContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => { setMode("welcome"); setError(""); }}>
          <Text style={styles.backButton}>← Volver</Text>
        </Pressable>

        <View style={styles.formHeader}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.formLogo}
            resizeMode="contain"
          />
          <Text style={styles.formTitle}>
            {mode === "login" ? "Iniciar Sesión" : "Crear Cuenta"}
          </Text>
          <Text style={styles.formSubtitle}>
            {mode === "login"
              ? "Bienvenido de vuelta, ninja"
              : "Únete a la academia"}
          </Text>
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#FF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {mode === "register" && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nombre</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Tu nombre de ninja"
              placeholderTextColor="#444"
              autoCapitalize="words"
              autoComplete="name"
            />
          </View>
        )}
        {mode === "register" && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Teléfono (opcional)</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+57 300 000 0000"
              placeholderTextColor="#444"
              keyboardType="phone-pad"
              autoComplete="tel"
            />
          </View>
        )}
        {mode === "register" && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Sede *</Text>
            <View style={styles.sedeRow}>
              {(["bogota", "chia"] as const).map((s) => (
                <Pressable
                  key={s}
                  style={[styles.sedeChip, sedes.includes(s) && styles.sedeChipSelected]}
                  onPress={() => toggleSede(s)}
                >
                  <Text style={[styles.sedeChipText, sedes.includes(s) && styles.sedeChipTextSelected]}>
                    {s === "bogota" ? "Bogotá" : "Chía"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="ninja@shinobi.com"
            placeholderTextColor="#444"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Contraseña</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#444"
            secureTextEntry
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </View>

        <Pressable
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={mode === "login" ? handleLogin : handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {mode === "login" ? "Entrar" : "Registrarse"}
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}
        >
          <Text style={styles.switchText}>
            {mode === "login"
              ? "¿No tienes cuenta? Regístrate"
              : "¿Ya tienes cuenta? Inicia sesión"}
          </Text>
        </Pressable>

        {!!privacyPolicyUrl && (
          <Pressable onPress={() => Linking.openURL(privacyPolicyUrl)}>
            <Text style={styles.privacyLink}>Política de Privacidad</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  welcomeContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  logoCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    overflow: "hidden",
  },
  logoImage: {
    width: 160,
    height: 160,
  },
  formLogo: {
    width: 50,
    height: 50,
  },
  welcomeTitle: {
    fontFamily: "NotoSansJP_900Black",
    fontSize: 36,
    color: "#FFFFFF",
    letterSpacing: 10,
  },
  welcomeSubtitle: {
    fontFamily: "NotoSerifJP_700Bold",
    fontSize: 18,
    color: "#FFFFFF",
    letterSpacing: 6,
  },
  welcomeMotto: {
    fontFamily: "NotoSerifJP_400Regular",
    fontSize: 14,
    color: "#666666",
    letterSpacing: 4,
    marginBottom: 40,
  },
  buttonGroup: {
    width: "100%",
    gap: 12,
  },
  primaryButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  primaryButtonText: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 16,
    color: "#000000",
    letterSpacing: 2,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333333",
  },
  secondaryButtonText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 16,
    color: "#FFFFFF",
    letterSpacing: 2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  formContainer: {
    padding: 24,
    paddingTop: 16,
    gap: 20,
  },
  backButton: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 14,
    color: "#888888",
    marginBottom: 8,
  },
  formHeader: {
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  formTitle: {
    fontFamily: "NotoSansJP_700Bold",
    fontSize: 24,
    color: "#FFFFFF",
    letterSpacing: 4,
  },
  formSubtitle: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 13,
    color: "#666666",
    letterSpacing: 2,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1A0000",
    borderWidth: 1,
    borderColor: "#330000",
    borderRadius: 8,
    padding: 12,
  },
  errorText: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 13,
    color: "#FF4444",
    flex: 1,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 12,
    color: "#888888",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#111111",
    borderWidth: 1,
    borderColor: "#222222",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "#FFFFFF",
  },
  switchText: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 13,
    color: "#666666",
    textAlign: "center",
    marginTop: 8,
  },
  sedeRow: {
    flexDirection: "row",
    gap: 12,
  },
  sedeChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#333333",
    borderRadius: 2,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#111111",
  },
  sedeChipSelected: {
    borderColor: "#D4AF37",
    backgroundColor: "#1A1500",
  },
  sedeChipText: {
    fontFamily: "NotoSansJP_500Medium",
    fontSize: 14,
    color: "#666666",
    letterSpacing: 1,
  },
  sedeChipTextSelected: {
    color: "#D4AF37",
  },
  privacyLink: {
    fontFamily: "NotoSansJP_400Regular",
    fontSize: 11,
    color: "#444",
    textAlign: "center",
    marginTop: 16,
    textDecorationLine: "underline",
  },
});
