import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
// İkon seti (Expo kullanıyorsan)
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface DashboardWidgetsProps {
    // earningsData'yı kaldırdık çünkü artık kullanmayacağız
    topStudent: {
        studentName: string;
        lessonCount: number;
        motivationMessage: string;
    } | null;
    loading: boolean;
}

export default function DashboardWidgets({ topStudent, loading }: DashboardWidgetsProps) {
    
    // Yükleniyorsa veya veri yoksa boş dön (yer kaplamasın)
    if (loading || !topStudent) {
        return null; 
    }

    return (
        <View style={styles.container}>
            {/* GAMIFICATION KARTI: AYIN ÖĞRENCİSİ */}
            <View style={styles.gamificationCard}>
                <View style={styles.trophyContainer}>
                    <MaterialCommunityIcons name="trophy-award" size={36} color="#F59E0B" />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.gamiTitle}>{topStudent.motivationMessage}</Text>
                    <Text style={styles.gamiName}>{topStudent.studentName}</Text>
                    <Text style={styles.gamiSub}>
                        Bu ay <Text style={styles.boldText}>{topStudent.lessonCount}</Text> ders tamamladı!
                    </Text>
                </View>
                {/* Sağ tarafa dekoratif bir yıldız veya emoji ekleyebiliriz */}
                <View style={styles.decoration}>
                     <Text style={{fontSize:24}}>✨</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 10,
        paddingHorizontal: 20,
        marginTop: 5
    },
    gamificationCard: {
        flexDirection: 'row',
        backgroundColor: '#4F46E5', // Koyu İndigo (Primary Dark)
        borderRadius: 20,
        padding: 15,
        alignItems: 'center',
        // Gölge efektleri
        shadowColor: "#4F46E5",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    trophyContainer: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        padding: 10,
        borderRadius: 50,
        marginRight: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    textContainer: {
        flex: 1,
    },
    gamiTitle: {
        color: '#FCD34D', // Altın Sarısı
        fontWeight: '800',
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    gamiName: {
        color: 'white',
        fontSize: 17,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    gamiSub: {
        color: '#E0E7FF', // Çok açık mavi
        fontSize: 13,
    },
    boldText: {
        fontWeight: 'bold',
        color: '#FFF',
    },
    decoration: {
        opacity: 0.8,
        transform: [{ rotate: '15deg' }]
    }
});