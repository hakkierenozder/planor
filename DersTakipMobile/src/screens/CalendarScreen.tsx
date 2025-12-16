import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, RefreshControl } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { lessonService, dashboardService } from '../services/api';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale'; 
import DashboardWidgets from '../components/DashboardWidgets';

// --- TAKVİM TÜRKÇE AYARI ---
LocaleConfig.locales['tr'] = {
  monthNames: ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'],
  monthNamesShort: ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'],
  dayNames: ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'],
  dayNamesShort: ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'],
  today: 'Bugün'
};
LocaleConfig.defaultLocale = 'tr';

const COLORS = {
  primary: '#6366F1',
  bg: '#F3F4F6',
  white: '#FFF',
  text: '#1F2937',
  textLight: '#9CA3AF'
};

export default function CalendarScreen() {
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // Sayfayı aşağı çekince yenilemek için
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [markedDates, setMarkedDates] = useState<any>({});
  const [dashboardData, setDashboardData] = useState(null);

  // --- VERİ ÇEKME FONKSİYONU ---
  const fetchLessons = async () => {
        try {
            // İlk açılışta loading göster, yenilerken gösterme
            if (!refreshing) setLoading(true);

            const [lessonsRes, dashboardRes] = await Promise.all([
                lessonService.getAll(),
                dashboardService.getSummary()
            ]);
            
            setLessons(lessonsRes);
            setDashboardData(dashboardRes);

            // 1. Takvimdeki işaretleri (Noktaları) Hesapla
            const marked: any = {};
            lessonsRes.forEach((l: any) => {
                const dateKey = l.startTime.split('T')[0];
                marked[dateKey] = { marked: true, dotColor: COLORS.primary };
            });
            
            // 2. Seçili günü de bu işaretlerin içine ekle (Yoksa seçili yuvarlak kaybolur)
            // Eğer o gün ders varsa hem nokta hem yuvarlak olsun
            marked[selectedDate] = { 
                ...(marked[selectedDate] || {}), 
                selected: true, 
                selectedColor: COLORS.primary 
            };

            setMarkedDates(marked);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

  // --- AÇILIŞTA ÇALIŞTIR ---
  useEffect(() => {
    fetchLessons();
  }, []); // Sadece ilk render'da çalışır

  // --- SAYFA YENİLEME (PULL TO REFRESH) ---
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLessons();
  }, []);

  // --- GÜN SEÇME İŞLEMİ ---
  const handleDayPress = (day: any) => {
      const newSelectedDate = day.dateString;
      setSelectedDate(newSelectedDate);
      
      // State'i güncelle: Eskisinden seçimi kaldır, yenisine ekle
      setMarkedDates((prev: any) => {
          const newMarks = { ...prev };
          
          // 1. Eski seçili günü temizle (Sadece 'selected' özelliğini sil)
          // Eğer o gün ders varsa 'marked: true' kalmalı, yoksa key'i tamamen sil.
          if (newMarks[selectedDate]) {
              if (newMarks[selectedDate].marked) {
                  // Ders var, sadece seçimi kaldır
                  delete newMarks[selectedDate].selected;
                  delete newMarks[selectedDate].selectedColor;
              } else {
                  // Ders yok, direkt sil
                  delete newMarks[selectedDate];
              }
          }
          
          // 2. Yeni günü seçili yap
          newMarks[newSelectedDate] = { 
              ...(newMarks[newSelectedDate] || {}), 
              selected: true, 
              selectedColor: COLORS.primary 
          };
          
          return newMarks;
      });
  };

  // Seçilen güne ait dersleri filtrele
  const selectedDayLessons = lessons.filter(l => l.startTime.startsWith(selectedDate));

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={selectedDayLessons} // Listeyi FlatList'e verdik, Header olarak Takvimi kullanacağız
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} // Aşağı çekince yenile
        ListHeaderComponent={
            <>
                {/* --- 1. DASHBOARD WIDGETLARI --- */}
                <DashboardWidgets data={dashboardData} />

                {/* --- 2. TAKVİM --- */}
                <Calendar
                    current={selectedDate}
                    onDayPress={handleDayPress}
                    markedDates={markedDates}
                    theme={{
                        todayTextColor: COLORS.primary,
                        arrowColor: COLORS.primary,
                        textDayFontWeight: '600',
                        textMonthFontWeight: 'bold',
                        textDayHeaderFontWeight: 'bold'
                    }}
                    style={styles.calendar}
                />

                {/* --- 3. SEÇİLİ GÜN BAŞLIĞI --- */}
                <View style={styles.listHeader}>
                    <Text style={styles.dateTitle}>
                        {new Date(selectedDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>
                </View>
            </>
        }
        
        ListEmptyComponent={
            !loading ? <Text style={styles.emptyText}>Bugün için ders planı yok. ☕</Text> : null
        }
        
        contentContainerStyle={{ paddingBottom: 20 }}
        
        renderItem={({item}) => (
            <View style={styles.listItemWrapper}>
                <View style={styles.lessonCard}>
                    <View style={styles.timeBox}>
                        <Text style={styles.timeText}>
                            {new Date(item.startTime).toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'})}
                        </Text>
                    </View>
                    <View style={{flex:1}}>
                        <Text style={styles.studentName}>{item.student?.fullName || "Öğrenci"}</Text>
                        <Text style={styles.topic}>{item.topic}</Text>
                    </View>
                    <View style={[styles.statusBadge, {backgroundColor: item.status === 1 ? '#FFF7ED' : '#ECFDF5'}]}>
                        <Text style={{color: item.status === 1 ? '#C2410C' : '#047857', fontSize:12, fontWeight:'bold'}}>
                            {item.status === 1 ? '⏳' : '✅'}
                        </Text>
                    </View>
                </View>
            </View>
        )}
      />
      
      {loading && !refreshing && (
          <View style={{position:'absolute', top: '50%', left:0, right:0}}>
              <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  calendar: {
      marginBottom: 10,
      borderRadius: 15,
      marginHorizontal: 15,
      elevation: 2,
      shadowColor: '#000',
      shadowOpacity: 0.05
  },
  listHeader: { paddingHorizontal: 20, marginTop: 10 },
  dateTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 10 },
  emptyText: { textAlign: 'center', color: COLORS.textLight, marginTop: 40, fontStyle: 'italic' },
  
  listItemWrapper: { paddingHorizontal: 20 },
  lessonCard: {
    backgroundColor: COLORS.white, flexDirection: 'row', alignItems: 'center',
    padding: 15, borderRadius: 12, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2
  },
  timeBox: {
    backgroundColor: '#EEF2FF', padding: 8, borderRadius: 8, marginRight: 15
  },
  timeText: { color: COLORS.primary, fontWeight: 'bold' },
  studentName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  topic: { fontSize: 13, color: COLORS.textLight },
  statusBadge: { padding: 5, borderRadius: 6 }
});