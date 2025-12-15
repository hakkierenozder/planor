import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { lessonService } from '../services/api';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale'; // Türkçe tarih formatı için

// Takvimi Türkçe yapalım
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
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [markedDates, setMarkedDates] = useState<any>({});

  const fetchLessons = useCallback(async () => {
    setLoading(true);
    try {
      const data = await lessonService.getAll();
      setLessons(data);
      
      // Ders olan günleri işaretle (Marked Dates)
      const marks: any = {};
      data.forEach((lesson: any) => {
        const dateKey = lesson.startTime.split('T')[0]; // "2023-10-25" kısmını al
        marks[dateKey] = { marked: true, dotColor: COLORS.primary };
      });
      
      // Seçili günü de özel işaretle
      marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: COLORS.primary };
      
      setMarkedDates(marks);
    } catch (error) {
      // Hata yönetimi
    } finally {
      setLoading(false);
    }
  }, [selectedDate]); // selectedDate değişince tekrar render etmek için

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]); // Sayfa açılınca dersleri çek

  // Seçilen güne ait dersleri filtrele
  const selectedDayLessons = lessons.filter(l => l.startTime.startsWith(selectedDate));

  return (
    <View style={styles.container}>
      <Calendar
        current={selectedDate}
        onDayPress={day => {
            setSelectedDate(day.dateString);
            // Seçimi güncelle
            setMarkedDates((prev: any) => {
                const newMarks = { ...prev };
                // Eski seçimi temizle (sadece marked kalsın)
                Object.keys(newMarks).forEach(key => {
                    if(newMarks[key].selected) delete newMarks[key].selected;
                });
                // Yeni seçimi ekle
                newMarks[day.dateString] = { 
                    ...newMarks[day.dateString], 
                    selected: true, 
                    selectedColor: COLORS.primary 
                };
                return newMarks;
            });
        }}
        markedDates={markedDates}
        theme={{
            todayTextColor: COLORS.primary,
            arrowColor: COLORS.primary,
            textDayFontWeight: '600',
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: 'bold'
        }}
      />

      <View style={styles.listContainer}>
        <Text style={styles.dateTitle}>
            {new Date(selectedDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </Text>
        
        {loading ? <ActivityIndicator color={COLORS.primary} style={{marginTop:20}}/> : (
            <FlatList
                data={selectedDayLessons}
                keyExtractor={item => item.id}
                ListEmptyComponent={<Text style={styles.emptyText}>Bugün için ders planı yok. ☕</Text>}
                contentContainerStyle={{paddingBottom: 20}}
                renderItem={({item}) => (
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
                )}
            />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  listContainer: { flex: 1, padding: 20 },
  dateTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 15 },
  emptyText: { textAlign: 'center', color: COLORS.textLight, marginTop: 20, fontStyle: 'italic' },
  
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