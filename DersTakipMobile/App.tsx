import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, FlatList, ActivityIndicator,
  TouchableOpacity, Modal, TextInput, Alert, SafeAreaView,KeyboardAvoidingView, ScrollView,Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { studentService, dashboardService, authService } from './src/services/api';
import StudentDetailModal from './src/components/StudentDetailModal';
import AuthScreen from './src/screens/AuthScreen';
import CalendarScreenImported from './src/screens/CalendarScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import { LinearGradient } from 'expo-linear-gradient';

const COLORS = {
  primary: '#6366F1',
  background: '#F3F4F6',
  cardBg: '#FFFFFF',
  textDark: '#1F2937',
  textLight: '#6B7280',
};

function AuthenticatedApp({ onLogout }: { onLogout: () => void }) {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  // --- GÜNCELLEME 1: Başlangıç state'ini null yaptık ---
  const [dashboardData, setDashboardData] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<'home' | 'calendar' | 'reports'>('home');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [rate, setRate] = useState('');

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [studentsRes, dashboardRes] = await Promise.all([
        studentService.getAll(),
        dashboardService.getSummary()
      ]);
      setStudents(studentsRes);
      setDashboardData(dashboardRes);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleAddStudent = async () => {
    if (!name || !rate) {
      Alert.alert("Eksik", "İsim ve ücret zorunlu.");
      return;
    }
    try {
      await studentService.create({
        fullName: name,
        phoneNumber: phone,
        hourlyRate: parseFloat(rate),
        guardianName: "",
        notes: ""
      });
      setModalVisible(false);
      setName('');
      setPhone('');
      setRate('');
      fetchAllData();
      Alert.alert("Başarılı", "Öğrenci eklendi! 🎉");
    } catch (error) {
      console.error('Add student error:', error);
      Alert.alert("Hata", "Kayıt başarısız.");
    }
  };

  const renderHome = () => (
    <>
      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}

        ListHeaderComponent={
          <View style={styles.dashboardContainer}>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.welcomeText}>Hoş Geldiniz,</Text>
                <Text style={styles.greetingText}>Planör 👋</Text>
              </View>
              <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
                <Text style={styles.logoutIcon}>🚪</Text>
              </TouchableOpacity>
            </View>

            <LinearGradient
              colors={['#818cf8', '#4f46e5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.summaryCard}
            >
              <View style={styles.summaryTopRow}>
                <View>
                  {/* --- GÜNCELLEME 2: İsim ve Değişken Güncellendi --- */}
                  <Text style={styles.summaryLabel}>Bu Ay Kazanılan</Text>
                  <Text style={styles.summaryValue}>
                    {/* monthlyRevenue kontrolü */}
                    ₺{(dashboardData?.monthlyRevenue || 0).toFixed(0)}
                  </Text>
                </View>
                <View style={styles.iconCircle}>
                  <Text style={styles.iconEmoji}>💰</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {/* todayLessonCount kontrolü */}
                    {dashboardData?.todayLessonCount || 0}
                  </Text>
                  <Text style={styles.statLabel}>Bugünkü Ders</Text>
                </View>
                <View style={styles.verticalLine} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {/* totalStudentCount kontrolü */}
                    {dashboardData?.totalStudentCount || 0}
                  </Text>
                  <Text style={styles.statLabel}>Öğrenci</Text>
                </View>
              </View>
            </LinearGradient>

            <Text style={styles.sectionTitle}>Öğrenci Listesi</Text>
          </View>
        }

        ListEmptyComponent={
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateEmoji}>🎓</Text>
            <Text style={styles.emptyStateTitle}>Henüz öğrenci yok</Text>
            <Text style={styles.emptyStateText}>
              Artı butonuna basarak ilk öğrencinizi ekleyin.
            </Text>
          </View>
        }

        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedStudent(item)}
            style={styles.studentCard}
          >
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {item.fullName.charAt(0)}
              </Text>
            </View>
            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>{item.fullName}</Text>
              <Text style={styles.studentRate}>
                {item.hourlyRate} ₺ / Saat
              </Text>
            </View>
            <View style={styles.arrowIcon}>
              <Text style={styles.arrowText}>❯</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.contentContainer}>
        {activeTab === 'home' ? (
          loading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (
            renderHome()
          )
        ) : activeTab === 'calendar' ? (
          <CalendarScreenImported />
        ) : (
          <ReportsScreen />
        )}
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => setActiveTab('home')}
          style={styles.tabItem}
        >
          <Text style={{ fontSize: 24, color: activeTab === 'home' ? COLORS.primary : '#9CA3AF' }}>
            🏠
          </Text>
          <Text style={[styles.tabLabel, { color: activeTab === 'home' ? COLORS.primary : '#9CA3AF' }]}>
            Ana Sayfa
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('calendar')}
          style={styles.tabItem}
        >
          <Text style={{ fontSize: 24, color: activeTab === 'calendar' ? COLORS.primary : '#9CA3AF' }}>
            📅
          </Text>
          <Text style={[styles.tabLabel, { color: activeTab === 'calendar' ? COLORS.primary : '#9CA3AF' }]}>
            Takvim
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('reports')}
          style={styles.tabItem}
        >
          <Text style={{ fontSize: 24, color: activeTab === 'reports' ? COLORS.primary : '#9CA3AF' }}>
            📊
          </Text>
          <Text style={[styles.tabLabel, { color: activeTab === 'reports' ? COLORS.primary : '#9CA3AF' }]}>
            Raporlar
          </Text>
        </TouchableOpacity>
      </View>

      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        {/* KeyboardAvoidingView EN DIŞA */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay} // Overlay stili buraya taşındı
        >
          {/* ScrollView EKLENDİ */}
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Yeni Öğrenci</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ad Soyad"
                  value={name}
                  onChangeText={setName}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Telefon"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Ücret (TL)"
                  keyboardType="numeric"
                  value={rate}
                  onChangeText={setRate}
                />
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnOutline]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.btnOutlineText}>Vazgeç</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnPrimary]}
                    onPress={handleAddStudent}
                  >
                    <Text style={styles.btnPrimaryText}>Kaydet</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <StudentDetailModal
        visible={selectedStudent !== null}
        student={selectedStudent}
        onClose={() => {
          setSelectedStudent(null);
          fetchAllData();
        }}
      />
    </SafeAreaView>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          setIsAuthenticated(true);
        }
      } catch (e) {
        console.error('Token check error:', e);
      } finally {
        setIsLoading(false);
      }
    };
    checkToken();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return isAuthenticated
    ? <AuthenticatedApp onLogout={() => {
      authService.logout();
      setIsAuthenticated(false);
    }} />
    : <AuthScreen onLoginSuccess={() => setIsAuthenticated(true)} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  contentContainer: { flex: 1 },

  dashboardContainer: { padding: 20, paddingTop: 10 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },

  welcomeText: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '600',
    marginBottom: 2
  },

  greetingText: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textDark,
    letterSpacing: -0.5
  },

  logoutButton: {
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },

  logoutIcon: { fontSize: 18 },

  summaryCard: {
    borderRadius: 24,
    padding: 24,
    shadowColor: "#4f46e5",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
    marginBottom: 25,
    marginTop: 15
  },

  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },

  summaryLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },

  summaryValue: {
    color: 'white',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1
  },

  iconCircle: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 12,
    borderRadius: 18
  },

  iconEmoji: { fontSize: 24 },

  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 20
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center'
  },

  verticalLine: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)'
  },

  statItem: { alignItems: 'center' },
  statNumber: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  statLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 15,
    marginLeft: 5
  },

  studentCard: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 20,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },

  avatarContainer: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#E0E7FF'
  },

  avatarText: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: '700'
  },

  studentInfo: { flex: 1 },
  studentName: { fontSize: 16, fontWeight: '700', color: '#334155' },
  studentRate: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    fontWeight: '500'
  },

  arrowIcon: { paddingLeft: 10 },
  arrowText: { color: '#C7C7CC' },

  emptyStateContainer: {
    alignItems: 'center',
    marginTop: 60,
    opacity: 0.7
  },

  emptyStateEmoji: { fontSize: 50, marginBottom: 15, opacity: 0.8 },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 8
  },

  emptyStateText: { fontSize: 14, color: COLORS.textLight },

  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8
  },

  fabIcon: { color: 'white', fontSize: 32, marginTop: -3 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end'
  },

  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 30,
    minHeight: 450
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 25,
    textAlign: 'center'
  },

  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontSize: 16
  },

  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15
  },

  btn: {
    flex: 1,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 6
  },

  btnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#CBD5E1'
  },

  btnPrimary: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 }
  },

  btnOutlineText: { fontWeight: '700', fontSize: 16, color: COLORS.textLight },
  btnPrimaryText: { fontWeight: '700', fontSize: 16, color: 'white' },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingVertical: 12,
    paddingBottom: 25,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.05,
    shadowRadius: 10
  },

  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  tabLabel: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600'
  }
});