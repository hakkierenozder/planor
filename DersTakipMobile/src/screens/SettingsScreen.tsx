import React, { useEffect, useState } from 'react';
import { 
    View, Text, StyleSheet, TextInput, TouchableOpacity, 
    ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform 
} from 'react-native';
import { settingsService, authService } from '../services/api';

const COLORS = {
    primary: '#6366F1',
    bg: '#F3F4F6',
    white: '#FFF',
    text: '#1F2937',
    danger: '#EF4444'
};

export default function SettingsScreen({ onLogout }: { onLogout: () => void }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Form State
    const [fullName, setFullName] = useState('');
    const [title, setTitle] = useState('');
    const [defaultRate, setDefaultRate] = useState('');
    const [defaultDuration, setDefaultDuration] = useState('');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const data = await settingsService.get();
            if (data) {
                setFullName(data.fullName || '');
                setTitle(data.title || '');
                setDefaultRate(data.defaultHourlyRate ? data.defaultHourlyRate.toString() : '');
                setDefaultDuration(data.defaultLessonDuration ? data.defaultLessonDuration.toString() : '60');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await settingsService.save({
                fullName,
                title,
                defaultHourlyRate: parseFloat(defaultRate) || 0,
                defaultLessonDuration: parseInt(defaultDuration) || 60
            });
            Alert.alert("Başarılı", "Ayarlarınız kaydedildi! ✅");
        } catch (error) {
            Alert.alert("Hata", "Kaydedilirken bir sorun oluştu.");
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            "Çıkış Yap",
            "Uygulamadan çıkmak istediğinize emin misiniz?",
            [
                { text: "Vazgeç", style: "cancel" },
                { 
                    text: "Çıkış Yap", 
                    style: "destructive", 
                    onPress: () => {
                        authService.logout();
                        onLogout();
                    } 
                }
            ]
        );
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary}/></View>;

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
        >
            <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
                <Text style={styles.headerTitle}>⚙️ Ayarlar</Text>

                {/* --- PROFİL BÖLÜMÜ --- */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Profil Bilgileri</Text>
                    <View style={styles.card}>
                        <Text style={styles.label}>Ad Soyad</Text>
                        <TextInput 
                            style={styles.input} 
                            value={fullName} 
                            onChangeText={setFullName}
                            placeholder="Örn: Ahmet Yılmaz" 
                        />

                        <Text style={styles.label}>Branş / Ünvan</Text>
                        <TextInput 
                            style={styles.input} 
                            value={title} 
                            onChangeText={setTitle}
                            placeholder="Örn: Matematik Öğretmeni" 
                        />
                    </View>
                </View>

                {/* --- VARSAYILANLAR BÖLÜMÜ --- */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Varsayılan Değerler</Text>
                    <Text style={styles.sectionSubtitle}>Yeni öğrenci veya ders eklerken otomatik gelir.</Text>
                    
                    <View style={styles.card}>
                        <Text style={styles.label}>Ders Ücreti (TL)</Text>
                        <TextInput 
                            style={styles.input} 
                            value={defaultRate} 
                            onChangeText={setDefaultRate}
                            keyboardType="numeric"
                            placeholder="0" 
                        />

                        <Text style={styles.label}>Ders Süresi (Dakika)</Text>
                        <TextInput 
                            style={styles.input} 
                            value={defaultDuration} 
                            onChangeText={setDefaultDuration}
                            keyboardType="numeric"
                            placeholder="60" 
                        />
                    </View>
                </View>

                {/* --- KAYDET BUTONU --- */}
                <TouchableOpacity 
                    style={styles.saveBtn} 
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Kaydet</Text>}
                </TouchableOpacity>

                {/* --- ÇIKIŞ YAP BUTONU --- */}
                <TouchableOpacity 
                    style={styles.logoutBtn} 
                    onPress={handleLogout}
                >
                    <Text style={styles.logoutBtnText}>Çıkış Yap 🚪</Text>
                </TouchableOpacity>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg, padding: 20 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, marginBottom: 20 },
    
    section: { marginBottom: 25 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 10, marginLeft: 5 },
    sectionSubtitle: { fontSize: 12, color: '#6B7280', marginBottom: 10, marginLeft: 5, marginTop: -5 },
    
    card: {
        backgroundColor: COLORS.white, borderRadius: 16, padding: 20,
        shadowColor: "#000", shadowOffset: {width:0, height:2}, shadowOpacity:0.05, elevation:3
    },
    
    label: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 8 },
    input: {
        backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
        padding: 14, fontSize: 16, color: COLORS.text, marginBottom: 15
    },

    saveBtn: {
        backgroundColor: COLORS.primary, borderRadius: 16, padding: 18, alignItems: 'center',
        shadowColor: COLORS.primary, shadowOffset: {width:0, height:4}, shadowOpacity:0.3, elevation:5,
        marginBottom: 15
    },
    saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

    logoutBtn: {
        backgroundColor: '#FEE2E2', borderRadius: 16, padding: 18, alignItems: 'center',
        borderWidth: 1, borderColor: '#FECACA'
    },
    logoutBtnText: { color: COLORS.danger, fontSize: 16, fontWeight: 'bold' }
});