import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Keyboard
} from 'react-native';
import { authService } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#4f46e5',
  primaryLight: '#818cf8',
  background: '#F8FAFC',
  white: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  error: '#EF4444'
};

interface AuthScreenProps {
  onLoginSuccess: () => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // <--- YENİ: Şifre Tekrar
  const [fullName, setFullName] = useState('');

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    return () => {
      setMounted(false);
    };
  }, []);

  // --- VALIDASYON FONKSİYONLARI ---
  const isValidEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleForgotPassword = () => {
    Alert.alert("Şifre Sıfırlama", "Bu özellik yakında eklenecektir. Lütfen yöneticinizle iletişime geçin.");
  };

  const handleAuth = async () => {
    Keyboard.dismiss(); // Butona basınca klavyeyi kapat

    // 1. Boş Alan Kontrolü
    if (!email || !password) {
      Alert.alert("Eksik Bilgi", "Lütfen e-posta ve şifrenizi girin.");
      return;
    }

    // 2. Email Formatı Kontrolü
    if (!isValidEmail(email)) {
        Alert.alert("Geçersiz E-posta", "Lütfen geçerli bir e-posta adresi girin.");
        return;
    }

    // 3. Şifre Uzunluğu
    if (password.length < 6) {
        Alert.alert("Zayıf Şifre", "Şifreniz en az 6 karakter olmalıdır.");
        return;
    }

    if (!isLogin) {
        // --- KAYIT OL MODU KONTROLLERİ ---
        
        if (!fullName) {
            Alert.alert("Eksik Bilgi", "Lütfen Ad Soyad giriniz.");
            return;
        }

        // 4. Şifre Eşleşmesi Kontrolü
        if (password !== confirmPassword) {
            Alert.alert("Şifre Hatası", "Girdiğiniz şifreler birbiriyle uyuşmuyor.");
            return;
        }
    }

    setLoading(true);
    try {
      if (isLogin) {
        // --- GİRİŞ YAP ---
        const data = await authService.login({ email, password });
        
        if (!data || (!data.token && !data.accessToken && !data.access_token)) {
             throw new Error("Giriş yapılamadı, token alınamadı.");
        }

        const token = data.token || data.accessToken || data.access_token;
        await AsyncStorage.setItem('userToken', String(token));

        const userEmail = data.email || data.user?.email || email;
        if (userEmail) await AsyncStorage.setItem('userEmail', String(userEmail));

        if (mounted) onLoginSuccess();

      } else {
        // --- KAYIT OL ---
        await authService.register({ 
            email, 
            password, 
            fullName 
        });
        
        if (mounted) {
          Alert.alert(
            "Kayıt Başarılı 🎉",
            "Hesabınız oluşturuldu. Şimdi giriş yapabilirsiniz.",
            [{ text: "Giriş Yap", onPress: () => {
                setIsLogin(true);
                setPassword('');
                setConfirmPassword('');
            }}]
          );
        }
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      if (!mounted) return;

      let errorMessage = "Bir sorun oluştu.";
      if (error?.response?.data) {
          // Backend'den gelen hata mesajını yakala
          const errData = error.response.data;
          errorMessage = typeof errData === 'string' ? errData : (errData.message || JSON.stringify(errData));
      } else if (error.message) {
          errorMessage = error.message;
      }
      
      Alert.alert("İşlem Başarısız", errorMessage);
    } finally {
      if (mounted) setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[COLORS.primary, COLORS.primaryLight]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Planör</Text>
            <Text style={styles.subtitle}>
              {isLogin ? "Derslerinizi yönetmeye başlayın." : "Yeni bir hesap oluşturun."}
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>
              {isLogin ? "Giriş Yap" : "Kayıt Ol"}
            </Text>

            {/* --- AD SOYAD (Sadece Kayıt) --- */}
            {!isLogin && (
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Ad Soyad</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Adınız Soyadınız"
                        placeholderTextColor={COLORS.textLight}
                        autoCapitalize="words"
                        value={fullName}
                        onChangeText={setFullName}
                        editable={!loading}
                    />
                </View>
            )}

            {/* --- EMAIL --- */}
            <View style={styles.inputGroup}>
                <Text style={styles.label}>E-Posta</Text>
                <TextInput
                style={styles.input}
                placeholder="ornek@planor.com"
                placeholderTextColor={COLORS.textLight}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                editable={!loading}
                />
            </View>

            {/* --- ŞİFRE --- */}
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Şifre</Text>
                <View style={styles.passwordContainer}>
                <TextInput
                    style={styles.passwordInput}
                    placeholder="En az 6 karakter"
                    placeholderTextColor={COLORS.textLight}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    editable={!loading}
                />
                <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.passwordToggle}
                >
                    <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={COLORS.textLight} />
                </TouchableOpacity>
                </View>
            </View>

            {/* --- ŞİFRE TEKRAR (Sadece Kayıt) --- */}
            {!isLogin && (
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Şifre Tekrar</Text>
                    <View style={styles.passwordContainer}>
                        <TextInput
                            style={styles.passwordInput}
                            placeholder="Şifrenizi doğrulayın"
                            placeholderTextColor={COLORS.textLight}
                            secureTextEntry={!showPassword} // Yukarıdaki ile aynı toggle'ı kullanır
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            editable={!loading}
                        />
                    </View>
                </View>
            )}

            {/* --- ŞİFREMİ UNUTTUM (Sadece Giriş) --- */}
            {isLogin && (
                <TouchableOpacity 
                    style={styles.forgotPassBtn} 
                    onPress={handleForgotPassword}
                >
                    <Text style={styles.forgotPassText}>Şifremi Unuttum?</Text>
                </TouchableOpacity>
            )}

            {/* --- AKSİYON BUTONU --- */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleAuth}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>
                  {isLogin ? "Giriş Yap" : "Kayıt Ol"}
                </Text>
              )}
            </TouchableOpacity>

            {/* --- ALT GEÇİŞ --- */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {isLogin ? "Hesabınız yok mu?" : "Zaten hesabınız var mı?"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                    setIsLogin(!isLogin);
                    // Mod değişince form hatalarını temizlemek için şifreleri sıfırlayabiliriz
                    setPassword('');
                    setConfirmPassword('');
                }}
                activeOpacity={0.7}
                disabled={loading}
              >
                <Text style={styles.linkText}>
                  {isLogin ? " Kayıt Ol" : " Giriş Yap"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1, justifyContent: 'center', padding: 25 },
  
  header: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 40, fontWeight: '800', color: COLORS.white, letterSpacing: -1 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 8 },
  
  formCard: {
    backgroundColor: COLORS.white, borderRadius: 25, padding: 30,
    shadowColor: "#000", shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 15
  },
  cardTitle: {
    fontSize: 24, fontWeight: 'bold', color: COLORS.text,
    marginBottom: 20, textAlign: 'center'
  },
  
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 6, marginLeft: 4 },
  
  input: {
    backgroundColor: COLORS.background, borderRadius: 15, padding: 16,
    fontSize: 16, color: COLORS.text, borderWidth: 1, borderColor: '#E5E7EB'
  },
  
  passwordContainer: {
    flexDirection: 'row', backgroundColor: COLORS.background,
    borderRadius: 15, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center'
  },
  passwordInput: { flex: 1, padding: 16, fontSize: 16, color: COLORS.text },
  passwordToggle: { padding: 16 },

  forgotPassBtn: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotPassText: { color: COLORS.textLight, fontSize: 13, fontWeight: '600' },

  button: {
    backgroundColor: COLORS.primary, borderRadius: 15, padding: 18,
    alignItems: 'center', shadowColor: COLORS.primary,
    shadowOpacity: 0.5, shadowOffset: { width: 0, height: 8 },
    shadowRadius: 10, elevation: 8
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 18 },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 25 },
  footerText: { color: COLORS.textLight, fontSize: 14 },
  linkText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 14, marginLeft: 5 }
});