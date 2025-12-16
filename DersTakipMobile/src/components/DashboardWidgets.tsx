import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

interface DashboardProps {
    data: {
        monthlyRevenue: number;
        totalStudentCount: number;
        lowCreditCount: number;
        todayLessonCount: number;
        nextLessonInfo: string | null;
        nextLessonTime: string | null;
    } | null;
}

export default function DashboardWidgets({ data }: DashboardProps) {
    // Veri henüz gelmediyse veya null ise hiçbir şey gösterme (Çökmesini engeller)
    if (!data) return null;

    return (
        <View style={styles.container}>
            {/* Üst Satır: Ciro ve Öğrenci Sayısı */}
            <View style={styles.row}>
                {/* CİRO KARTI */}
                <View style={[styles.card, styles.greenCard]}>
                    <Text style={styles.cardIcon}>💰</Text>
                    <View>
                        <Text style={styles.cardLabel}>Bu Ay</Text>
                        {/* data.monthlyRevenue undefined ise 0 göster */}
                        <Text style={styles.cardValue}>
                            {(data.monthlyRevenue || 0).toFixed(0)} ₺
                        </Text>
                    </View>
                </View>

                {/* ÖĞRENCİ KARTI */}
                <View style={[styles.card, styles.blueCard]}>
                    <Text style={styles.cardIcon}>🎓</Text>
                    <View>
                        <Text style={styles.cardLabel}>Öğrenci</Text>
                        <Text style={styles.cardValue}>
                            {data.totalStudentCount || 0}
                            {(data.lowCreditCount || 0) > 0 && (
                                <Text style={{fontSize: 12, color: '#FECACA'}}> ({data.lowCreditCount} ⚠️)</Text>
                            )}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Alt Satır: Günün Özeti */}
            <View style={[styles.card, styles.orangeCard, styles.fullWidth]}>
                <View style={{flexDirection:'row', alignItems:'center', justifyContent:'space-between', width:'100%'}}>
                    <View style={{flexDirection:'row', alignItems:'center'}}>
                        <Text style={styles.cardIcon}>📅</Text>
                        <View style={{marginLeft: 10}}>
                            <Text style={[styles.cardLabel, {color:'rgba(255,255,255,0.9)'}]}>Bugünkü Dersler</Text>
                            <Text style={styles.cardValue}>{data.todayLessonCount || 0} Ders Var</Text>
                        </View>
                    </View>
                    
                    {data.nextLessonTime && (
                        <View style={styles.nextLessonBadge}>
                            <Text style={styles.nextLessonTime}>{data.nextLessonTime}</Text>
                            <Text style={styles.nextLessonName}>{data.nextLessonInfo}</Text>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingTop: 10,
        marginBottom: 10,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    card: {
        borderRadius: 16,
        padding: 15,
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3,
    },
    fullWidth: {
        width: '100%',
    },
    greenCard: { backgroundColor: '#10B981', width: '48%', flexDirection:'row', alignItems:'center', gap:10 },
    blueCard: { backgroundColor: '#6366F1', width: '48%', flexDirection:'row', alignItems:'center', gap:10 },
    orangeCard: { backgroundColor: '#F59E0B' },
    
    cardIcon: { fontSize: 24 },
    cardLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
    cardValue: { color: 'white', fontSize: 18, fontWeight: 'bold' },

    nextLessonBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        alignItems: 'flex-end'
    },
    nextLessonTime: { color: 'white', fontWeight: 'bold', fontSize: 14 },
    nextLessonName: { color: 'white', fontSize: 10 }
});