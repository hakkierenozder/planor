import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { dashboardService } from '../services/api';

const screenWidth = Dimensions.get("window").width;

const COLORS = {
  primary: '#6366F1',
  bg: '#F3F4F6',
  white: '#FFF',
  text: '#1F2937'
};

export default function ReportsScreen() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashboardService.getReports();
      
      // --- DEBUG İÇİN LOG ---
      console.log("RAPOR VERİSİ:", JSON.stringify(res, null, 2));
      // ---------------------
      
      setData(res);
    } catch (error) {
      console.log("Rapor Hatası:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary}/></View>;

  // --- DÜZELTME BURADA: Küçük harf (camelCase) kullanıyoruz ---
  // data.income ve d.month / d.total şeklinde erişiyoruz
  
  const incomeData = data?.income || []; // "Income" yerine "income"
  const lessonStats = data?.lessons || {}; // "Lessons" yerine "lessons"

  const labels = incomeData.length > 0 ? incomeData.map((d: any) => d.month) : ["Veri Yok"];
  const datasets = incomeData.length > 0 ? incomeData.map((d: any) => d.total) : [0];

  // --- PASTA GRAFİK ---
  const pieData = [
    {
      name: "Tamamlanan",
      population: lessonStats.completed || 0, // Küçük harf
      color: "#10B981",
      legendFontColor: "#7F7F7F",
      legendFontSize: 12
    },
    {
      name: "Planlanan",
      population: lessonStats.scheduled || 0, // Küçük harf
      color: "#F59E0B",
      legendFontColor: "#7F7F7F",
      legendFontSize: 12
    },
    {
      name: "İptal",
      population: lessonStats.cancelled || 0, // Küçük harf
      color: "#EF4444",
      legendFontColor: "#7F7F7F",
      legendFontSize: 12
    }
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{paddingBottom: 50}}>
      <Text style={styles.headerTitle}>📊 Analizler</Text>

      {/* --- KAZANÇ GRAFİĞİ --- */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>💰 Aylık Gelir (TL)</Text>
        
        {incomeData.length > 0 && datasets.some((val: number) => val > 0) ? (
            <LineChart
            data={{
                labels: labels,
                datasets: [{ data: datasets }]
            }}
            width={screenWidth - 60}
            height={220}
            yAxisLabel="₺"
            yAxisInterval={1}
            chartConfig={{
                backgroundColor: "#ffffff",
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: { r: "6", strokeWidth: "2", stroke: "#6366F1" }
            }}
            bezier
            style={{ marginVertical: 8, borderRadius: 16 }}
            />
        ) : (
            <Text style={styles.noDataText}>Henüz ödeme kaydı yok.</Text>
        )}
      </View>

      {/* --- DERS DURUMU GRAFİĞİ --- */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📚 Ders Durumları</Text>
        <PieChart
          data={pieData}
          width={screenWidth - 60}
          height={200}
          chartConfig={{
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          }}
          accessor={"population"}
          backgroundColor={"transparent"}
          paddingLeft={"15"}
          absolute
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, marginBottom: 20 },
  
  card: {
    backgroundColor: COLORS.white, borderRadius: 20, padding: 15, marginBottom: 20,
    shadowColor: "#000", shadowOffset: {width:0, height:5}, shadowOpacity:0.1, elevation:5,
    alignItems: 'center'
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 15, alignSelf:'flex-start' },
  noDataText: { color: '#9CA3AF', fontStyle: 'italic', marginVertical: 20 }
});