import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform
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
  textLight: '#6B7280'
};

interface AuthScreenProps {
  onLoginSuccess: () => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    return () => {
      setMounted(false);
    };
  }, []);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert("Eksik Bilgi", "Lütfen e-posta ve şifrenizi girin.");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        console.log('Login attempt...');
        const data = await authService.login({ email, password });
        console.log('Login response:', data);
        
        // Yanıt kontrolü
        if (!data) {
          throw new Error("Sunucudan yanıt alınamadı");
        }

        // Token kontrolü ve kaydetme
        const token = data.token || data.accessToken || data.access_token;
        if (!token) {
          console.error('Response data:', data);
          throw new Error("Token bulunamadı");
        }

        await AsyncStorage.setItem('userToken', String(token));
        
        // Email varsa kaydet
        const userEmail = data.email || data.user?.email || email;
        if (userEmail) {
          await AsyncStorage.setItem('userEmail', String(userEmail));
        }

        console.log('Login successful, calling onLoginSuccess');
        
        // Component hala mount edilmişse callback'i çağır
        if (mounted) {
          onLoginSuccess();
        }
      } else {
        console.log('Register attempt...');
        const data = await authService.register({ email, password });
        console.log('Register response:', data);
        
        if (mounted) {
          Alert.alert(
            "Kayıt Başarılı", 
            "Hesabınız oluşturuldu. Şimdi giriş yapabilirsiniz.",
            [{ text: "Tamam", onPress: () => setIsLogin(true) }]
          );
        }
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      
      if (!mounted) return;

      let errorMessage = "Bir sorun oluştu.";
      
      try {
        if (error?.response?.data) {
          const errorData = error.response.data;
          
          if (typeof errorData === 'string') {
            errorMessage = errorData;
          } else if (typeof errorData === 'object') {
            errorMessage = errorData.message || errorData.error || errorData.msg || JSON.stringify(errorData);
          }
        } else if (error?.message) {
          errorMessage = error.message;
        }
      } catch (parseError) {
        console.error("Error parsing error message:", parseError);
        errorMessage = "Sunucuya bağlanılamadı";
      }
      
      Alert.alert("Hata", String(errorMessage));
    } finally {
      if (mounted) {
        setLoading(false);
      }
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
        <View style={styles.header}>
          <Text style={styles.title}>Planör</Text>
          <Text style={styles.subtitle}>
            {isLogin ? "Sisteme giriş yapın." : "Yeni bir hesap oluşturun."}
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.cardTitle}>
            {isLogin ? "Giriş Yap" : "Kayıt Ol"}
          </Text>

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
              activeOpacity={0.7}
              disabled={loading}
            >
              <Ionicons 
                name={showPassword ? "eye-off" : "eye"} 
                size={24} 
                color={COLORS.textLight} 
              />
            </TouchableOpacity>
          </View>

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

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {isLogin ? "Hesabınız yok mu?" : "Zaten hesabınız var mı?"}
            </Text>
            <TouchableOpacity 
              onPress={() => setIsLogin(!isLogin)}
              activeOpacity={0.7}
              disabled={loading}
            >
              <Text style={styles.linkText}>
                {isLogin ? " Kayıt Ol" : " Giriş Yap"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  keyboardView: { 
    flex: 1, 
    justifyContent: 'center', 
    padding: 25 
  },
  header: { 
    alignItems: 'center', 
    marginBottom: 50 
  },
  title: { 
    fontSize: 40, 
    fontWeight: '800', 
    color: COLORS.white, 
    letterSpacing: -1 
  },
  subtitle: { 
    fontSize: 16, 
    color: 'rgba(255,255,255,0.8)', 
    marginTop: 8 
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 25,
    padding: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15
  },
  cardTitle: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: COLORS.text, 
    marginBottom: 20, 
    textAlign: 'center' 
  },
  label: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: COLORS.text, 
    marginBottom: 8, 
    marginLeft: 4 
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 15,
    padding: 18,
    marginBottom: 15,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  passwordContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center'
  },
  passwordInput: {
    flex: 1,
    padding: 18,
    fontSize: 16,
    color: COLORS.text,
  },
  passwordToggle: {
    padding: 18,
    justifyContent: 'center',
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 10,
    elevation: 8
  },
  buttonDisabled: {
    opacity: 0.7
  },
  buttonText: { 
    color: 'white', 
    fontWeight: 'bold', 
    fontSize: 18 
  },
  footer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    marginTop: 25 
  },
  footerText: { 
    color: COLORS.textLight, 
    fontSize: 14 
  },
  linkText: { 
    color: COLORS.primary, 
    fontWeight: 'bold', 
    fontSize: 14 
  }
});