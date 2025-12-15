import React, { useEffect, useState } from 'react';
import {
    Modal, View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, FlatList, Alert, TextInput, Platform, SafeAreaView, Switch
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { studentService, lessonService, paymentService } from '../services/api';
import { whatsappService } from '../services/whatsapp';

const COLORS = {
    primary: '#6366F1',
    bg: '#F3F4F6',
    white: '#FFF',
    text: '#1F2937',
    textLight: '#9CA3AF',
    greenLight: '#D1FAE5',
    greenText: '#065F46',
    redLight: '#FEE2E2',
    redText: '#991B1B'
};

interface StudentDetailModalProps {
    visible: boolean;
    student: any;
    onClose: () => void;
}

export default function StudentDetailModal({ visible, student, onClose }: StudentDetailModalProps) {
    const [loading, setLoading] = useState(true);
    const [balanceInfo, setBalanceInfo] = useState<any>(null);
    const [lessons, setLessons] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'lessons' | 'payments'>('lessons');

    // Form Görünürlükleri
    const [showLessonForm, setShowLessonForm] = useState(false);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false); // <--- Overlay olarak kullanılacak

    // Düzenleme Formu Verileri
    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editRate, setEditRate] = useState('');

    const [isRecurring, setIsRecurring] = useState(false); // Tekrar modu açık mı?
    const [recurringCount, setRecurringCount] = useState('4'); // Kaç hafta? (Varsayılan 4)

    const [hasHomework, setHasHomework] = useState(false);
    const [homeworkDesc, setHomeworkDesc] = useState('');

    const openEditModal = () => {
        setEditName(student.fullName);
        setEditPhone(student.phoneNumber || '');
        setEditRate(student.hourlyRate.toString());
        setShowEditForm(true);
    };

    // Diğer Inputs
    const [amount, setAmount] = useState('');
    const [topic, setTopic] = useState('');
    const [duration, setDuration] = useState('60');
    const [date, setDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);
    const [mode, setMode] = useState<'date' | 'time'>('date');

    useEffect(() => {
        if (visible && student) fetchDetails();
    }, [visible, student]);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            const [balanceRes, lessonsRes, paymentsRes] = await Promise.all([
                studentService.getBalance(student.id),
                studentService.getLessons(student.id),
                paymentService.getByStudent(student.id)
            ]);
            setBalanceInfo(balanceRes);
            setLessons(lessonsRes);
            setPayments(paymentsRes);
        } catch (error) { Alert.alert("Hata", "Veri çekilemedi"); }
        finally { setLoading(false); }
    };

    // --- ACTIONS ---
    const handleAddPayment = async () => {
        if (!amount) return;
        try {
            await paymentService.create({ studentId: student.id, amount: parseFloat(amount), method: 1, description: "Mobil ödeme" });
            setShowPaymentForm(false); setAmount(''); fetchDetails();
        } catch (e) { Alert.alert("Hata", "İşlem başarısız"); }
    };

const handleAddLesson = async () => {
        if (!duration) return;
        const tzOffset = date.getTimezoneOffset() * 60000; // Dakika farkını milisaniyeye çevir
        const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, -1);
        try {
            await lessonService.create({
                studentId: student.id,
                startTime: localISOTime,
                durationMinutes: parseInt(duration),
                topic: topic || "Genel Tekrar",
                internalNotes: "",
                // YENİ EKLENEN KISIMLAR:
                isRecurring: isRecurring, 
                recurringCount: isRecurring ? parseInt(recurringCount) : 1,
                hasHomework: hasHomework,
                homeworkDescription: hasHomework ? homeworkDesc : ""
            });
            
            // Formu temizle ve kapat
            setHasHomework(false);
            setHomeworkDesc('');
            setShowLessonForm(false); 
            setTopic(''); 
            setDuration('60'); 
            setIsRecurring(false); // Sıfırla
            setRecurringCount('4'); // Sıfırla
            fetchDetails();
            
            Alert.alert("Başarılı", isRecurring ? `${recurringCount} haftalık ders planlandı! 📅` : "Ders eklendi! ✅");

        } catch (e) { 
            Alert.alert("Hata", "İşlem başarısız"); 
        }
    };

    const handleComplete = (lesson: any) => {
        Alert.alert("Ders Tamamla", "Bu ders yapıldı mı?", [
            { text: "Hayır", style: 'cancel' },
            {
                text: "Evet", onPress: async () => {
                    await lessonService.complete(lesson.id);
                    fetchDetails();
                }
            }
        ]);
    };

    const handleDelete = (id: string, type: 'lesson' | 'payment') => {
        Alert.alert("Sil", "Bu kaydı silmek istiyor musun?", [
            { text: "Vazgeç", style: "cancel" },
            {
                text: "Sil", style: "destructive", onPress: async () => {
                    if (type === 'lesson') await lessonService.delete(id);
                    else await paymentService.delete(id);
                    fetchDetails();
                }
            }
        ]);
    };

    const handleUpdateStudent = async () => {
        try {
            await studentService.update(student.id, {
                fullName: editName,
                phoneNumber: editPhone,
                hourlyRate: parseFloat(editRate)
            });
            Alert.alert("Başarılı", "Bilgiler güncellendi ✅");
            setShowEditForm(false);
            onClose(); // Ana modalı kapatıp yenilenmesini sağla
        } catch (error) {
            Alert.alert("Hata", "Güncelleme yapılamadı.");
        }
    };

    const onChangeDate = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') setShowPicker(false);
        if (selectedDate) setDate(selectedDate);
    };

    if (!student) return null;

    return (
        <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
            <SafeAreaView style={styles.container}>

                {/* HEADER */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.backBtn}>
                        <Text style={{ fontSize: 20, color: COLORS.text }}>✕</Text>
                    </TouchableOpacity>

                    <Text style={styles.headerTitle}>{student.fullName}</Text>

                    {/* DÜZENLE BUTONU */}
                    <TouchableOpacity onPress={openEditModal} style={[styles.backBtn, { backgroundColor: '#EEF2FF' }]}>
                        <Text style={{ fontSize: 20 }}>✏️</Text>
                    </TouchableOpacity>
                </View>

                {loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} /> : (
                    <>
                        {/* BALANCE CARD */}
                        <View style={styles.balanceContainer}>
                            <View style={styles.balanceCard}>
                                <Text style={styles.balanceLabel}>Güncel Bakiye</Text>
                                <Text style={[styles.balanceValue, { color: balanceInfo?.currentBalance > 0 ? '#EF4444' : '#10B981' }]}>
                                    {balanceInfo?.currentBalance > 0 ? `-${balanceInfo?.currentBalance} ₺` : `+${Math.abs(balanceInfo?.currentBalance)} ₺`}
                                </Text>
                                <View style={styles.balanceRow}>
                                    <View style={styles.balanceItem}>
                                        <Text style={styles.subVal}>{balanceInfo?.totalDebt}₺</Text>
                                        <Text style={styles.subLabel}>Hizmet</Text>
                                    </View>
                                    <View style={styles.verticalDivider} />
                                    <View style={styles.balanceItem}>
                                        <Text style={styles.subVal}>{balanceInfo?.totalPayment}₺</Text>
                                        <Text style={styles.subLabel}>Tahsilat</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* TABS */}
                        <View style={styles.tabContainer}>
                            <TouchableOpacity onPress={() => setActiveTab('lessons')} style={[styles.tab, activeTab === 'lessons' && styles.activeTab]}>
                                <Text style={[styles.tabText, activeTab === 'lessons' && styles.activeTabText]}>Dersler</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setActiveTab('payments')} style={[styles.tab, activeTab === 'payments' && styles.activeTab]}>
                                <Text style={[styles.tabText, activeTab === 'payments' && styles.activeTabText]}>Ödemeler</Text>
                            </TouchableOpacity>
                        </View>

                        {/* LIST */}
                        <View style={styles.listContainer}>
                            {activeTab === 'lessons' ? (
                                <FlatList
                                    data={lessons}
                                    keyExtractor={item => item.id}
                                    contentContainerStyle={{ paddingBottom: 100 }}
                                    ListEmptyComponent={<Text style={styles.emptyText}>Henüz ders yok.</Text>}
                                    renderItem={({ item }) => (
                                        <View style={styles.cardItem}>
                                            <View style={styles.dateBadge}>
                                                <Text style={styles.dayText}>{new Date(item.startTime).getDate()}</Text>
                                                <Text style={styles.monthText}>{new Date(item.startTime).toLocaleDateString('tr-TR', { month: 'short' })}</Text>
                                            </View>
                                            <View style={{ flex: 1, marginLeft: 15 }}>
                                                <Text style={styles.itemTitle}>{item.topic}</Text>
                                                <Text style={styles.itemSub}>{item.durationMinutes} dk • {new Date(item.startTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</Text>
                                            </View>
<TouchableOpacity 
                                                style={[styles.iconBtn, {backgroundColor: '#E0F2F1', marginRight: 8}]}
                                                onPress={() => {
                                                    // Eğer ders tamamlanmışsa (Status=2 veya Completed) tamamlandı mesajı at
                                                    if (item.status === 2 || item.status === "Completed") { 
                                                        const msg = whatsappService.templates.lessonCompleted(
                                                            student.fullName, 
                                                            item.topic,
                                                            item.homeworkDescription // <--- Backend'den gelen veri
                                                        );
                                                        whatsappService.send(student.phoneNumber, msg);
                                                    } else {
                                                        // Tamamlanmamışsa planlama mesajı at (Eski mantık)
                                                        const msg = whatsappService.templates.lessonCreated(
                                                            student.fullName, 
                                                            new Date(item.startTime), 
                                                            item.topic
                                                        );
                                                        whatsappService.send(student.phoneNumber, msg);
                                                    }
                                                }}
                                            >
                                                <Text style={{fontSize: 16}}>💬</Text>
                                            </TouchableOpacity>
                                            {item.status === 1 && (
                                                <TouchableOpacity onPress={() => handleComplete(item)} style={styles.checkBtn}><Text>✔</Text></TouchableOpacity>
                                            )}
                                            <TouchableOpacity onPress={() => handleDelete(item.id, 'lesson')} style={styles.delBtn}><Text>🗑</Text></TouchableOpacity>
                                        </View>
                                    )}
                                />
                            ) : (
                                <FlatList
                                    data={payments}
                                    keyExtractor={item => item.id}
                                    contentContainerStyle={{ paddingBottom: 100 }}
                                    ListEmptyComponent={<Text style={styles.emptyText}>Henüz ödeme yok.</Text>}
                                    renderItem={({ item }) => (
                                        <View style={styles.cardItem}>
                                            <View style={[styles.dateBadge, { backgroundColor: COLORS.greenLight }]}>
                                                <Text style={[styles.dayText, { color: COLORS.greenText }]}>₺</Text>
                                            </View>
                                            <View style={{ flex: 1, marginLeft: 15 }}>
                                                <Text style={[styles.itemTitle, { color: COLORS.greenText }]}>+{item.amount} TL</Text>
                                                <Text style={styles.itemSub}>{new Date(item.PaymentDate || item.date || item.createdAt).toLocaleDateString('tr-TR')}</Text>
                                            </View>
                                            <TouchableOpacity
                                                style={[styles.iconBtn, { backgroundColor: '#E0F2F1', marginRight: 8 }]}
                                                onPress={() => {
                                                    // Kalan borcu hesaplamak için elimizdeki veriyi kullanabiliriz
                                                    // veya basitçe bakiyeyi yazdırabiliriz.
                                                    const currentDebt = balanceInfo?.currentBalance || 0;
                                                    const msg = whatsappService.templates.paymentReceived(item.amount, currentDebt);
                                                    whatsappService.send(student.phoneNumber, msg);
                                                }}
                                            >
                                                <Text style={{ fontSize: 16 }}>💬</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => handleDelete(item.id, 'payment')} style={styles.delBtn}><Text>🗑</Text></TouchableOpacity>
                                        </View>
                                    )}
                                />
                            )}
                        </View>

                        {/* ACTION BUTTONS */}
                        <View style={styles.floatingActions}>
                            <TouchableOpacity onPress={() => setShowPaymentForm(true)} style={[styles.actionBtn, { backgroundColor: '#F59E0B' }]}>
                                <Text style={styles.actionIcon}>💰</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowLessonForm(true)} style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}>
                                <Text style={styles.actionIcon}>📅</Text>
                            </TouchableOpacity>
                        </View>

                        {/* --- MODAL YERİNE OVERLAY KULLANIYORUZ --- */}
                        {/* Tüm formlar (Ders Ekle, Ödeme Al, Öğrenci Düzenle) burada aynı mantıkla çalışır */}

                        {(showLessonForm || showPaymentForm || showEditForm) && (
                            <View style={styles.formOverlay}>
                                <View style={styles.formCard}>
                                    <Text style={styles.formTitle}>
                                        {showLessonForm ? "Ders Planla" : showPaymentForm ? "Ödeme Al" : "Bilgileri Düzenle"}
                                    </Text>

{showLessonForm && (
                                        <>
                                            <TextInput style={styles.input} placeholder="Konu" value={topic} onChangeText={setTopic} />
                                            <TextInput style={styles.input} placeholder="Süre (dk)" keyboardType="numeric" value={duration} onChangeText={setDuration} />
                                            
                                            {/* --- YENİ EKLENEN KISIM BAŞLANGIÇ --- */}
                                            <View style={styles.switchContainer}>
                                                <Text style={styles.label}>Her Hafta Tekrarla?</Text>
                                                <Switch 
                                                    value={isRecurring} 
                                                    onValueChange={setIsRecurring}
                                                    trackColor={{ false: "#767577", true: COLORS.primary }}
                                                    thumbColor={isRecurring ? "#fff" : "#f4f3f4"}
                                                />
                                            </View>

                                            {isRecurring && (
                                                <View style={{marginBottom: 10}}>
                                                    <Text style={styles.label}>Kaç Hafta?</Text>
                                                    <TextInput 
                                                        style={styles.input} 
                                                        placeholder="Örn: 4" 
                                                        keyboardType="numeric" 
                                                        value={recurringCount} 
                                                        onChangeText={setRecurringCount} 
                                                    />
                                                </View>
                                            )}

                                            {/* --- ÖDEV BÖLÜMÜ --- */}
                                            <View style={styles.switchContainer}>
                                                <Text style={styles.label}>Ödev Verilecek mi?</Text>
                                                <Switch 
                                                    value={hasHomework} 
                                                    onValueChange={setHasHomework}
                                                    trackColor={{ false: "#767577", true: COLORS.primary }}
                                                    thumbColor={hasHomework ? "#fff" : "#f4f3f4"}
                                                />
                                            </View>

                                            {hasHomework && (
                                                <TextInput 
                                                    style={[styles.input, {height: 80, textAlignVertical: 'top'}]} 
                                                    placeholder="Ödev Açıklaması (Örn: Sayfa 10-15 çözülecek)" 
                                                    multiline={true}
                                                    numberOfLines={3}
                                                    value={homeworkDesc} 
                                                    onChangeText={setHomeworkDesc} 
                                                />
                                            )}
                                            {/* --- YENİ EKLENEN KISIM BİTİŞ --- */}

                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
                                                <TouchableOpacity onPress={() => { setMode('date'); setShowPicker(true) }} style={styles.dateBtn}>
                                                    <Text style={styles.dateBtnText}>{date.toLocaleDateString()}</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity onPress={() => { setMode('time'); setShowPicker(true) }} style={styles.dateBtn}>
                                                    <Text style={styles.dateBtnText}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                                </TouchableOpacity>
                                            </View>
                                            {showPicker && <DateTimePicker value={date} mode={mode} is24Hour onChange={onChangeDate} />}
                                        </>
                                    )}

                                    {showPaymentForm && (
                                        <TextInput style={styles.input} placeholder="Tutar (TL)" keyboardType="numeric" value={amount} onChangeText={setAmount} />
                                    )}

                                    {showEditForm && (
                                        <>
                                            <Text style={styles.label}>Öğrenci Adı</Text>
                                            <TextInput style={styles.input} value={editName} onChangeText={setEditName} />
                                            <Text style={styles.label}>Telefon</Text>
                                            <TextInput style={styles.input} value={editPhone} keyboardType="phone-pad" onChangeText={setEditPhone} />
                                            <Text style={styles.label}>Saatlik Ücret (TL)</Text>
                                            <TextInput style={styles.input} value={editRate} keyboardType="numeric" onChangeText={setEditRate} />
                                        </>
                                    )}

                                    <View style={{ flexDirection: 'row', marginTop: 10 }}>
                                        <TouchableOpacity
                                            onPress={() => { setShowLessonForm(false); setShowPaymentForm(false); setShowEditForm(false); }}
                                            style={[styles.btn, { backgroundColor: '#EEE' }]}
                                        >
                                            <Text>İptal</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={() => {
                                                if (showLessonForm) handleAddLesson();
                                                else if (showPaymentForm) handleAddPayment();
                                                else if (showEditForm) handleUpdateStudent();
                                            }}
                                            style={[styles.btn, { backgroundColor: COLORS.primary }]}
                                        >
                                            <Text style={{ color: 'white' }}>
                                                {showEditForm ? "Güncelle" : "Kaydet"}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        )}

                    </>
                )}
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: COLORS.white },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 20 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },

    balanceContainer: { padding: 20, paddingBottom: 10 },
    balanceCard: { backgroundColor: COLORS.white, padding: 20, borderRadius: 20, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    balanceLabel: { color: COLORS.textLight, fontSize: 14, marginBottom: 5 },
    balanceValue: { fontSize: 32, fontWeight: '800', marginBottom: 15 },
    balanceRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 15 },
    balanceItem: { alignItems: 'center' },
    subVal: { fontWeight: 'bold', fontSize: 16, color: COLORS.text },
    subLabel: { color: COLORS.textLight, fontSize: 12 },
    verticalDivider: { width: 1, height: '100%', backgroundColor: '#F3F4F6' },

    tabContainer: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: '#E5E7EB', borderRadius: 12, padding: 4, marginBottom: 10 },
    tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
    activeTab: { backgroundColor: COLORS.white, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2 },
    tabText: { fontWeight: '600', color: COLORS.textLight },
    activeTabText: { color: COLORS.text, fontWeight: 'bold' },

    listContainer: { flex: 1, paddingHorizontal: 20 },
    cardItem: { backgroundColor: COLORS.white, borderRadius: 16, padding: 15, marginBottom: 10, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, elevation: 1 },
    dateBadge: { backgroundColor: '#EEF2FF', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, alignItems: 'center', minWidth: 50 },
    dayText: { fontWeight: 'bold', fontSize: 16, color: COLORS.primary },
    monthText: { fontSize: 10, color: COLORS.primary },
    itemTitle: { fontWeight: 'bold', fontSize: 16, color: COLORS.text },
    itemSub: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
    emptyText: { textAlign: 'center', marginTop: 50, color: COLORS.textLight },

    checkBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.greenLight, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    delBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.redLight, justifyContent: 'center', alignItems: 'center' },

    floatingActions: { position: 'absolute', bottom: 40, width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 20 },
    actionBtn: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, elevation: 5 },
    actionIcon: { fontSize: 24 },

    formOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 99 },
    formCard: { width: '85%', backgroundColor: 'white', borderRadius: 20, padding: 25 },
    formTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
    input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, marginBottom: 10 },
    btn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', marginHorizontal: 5 },
    dateBtn: { flex: 0.48, backgroundColor: '#EFF6FF', padding: 10, borderRadius: 10, alignItems: 'center' },
    dateBtnText: { color: COLORS.primary, fontWeight: 'bold' },
    label: {
        fontWeight: 'bold',
        marginBottom: 5,
        color: COLORS.text,
        marginLeft: 5
    },
    iconBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center'
    },
    // ... diğer stiller ...
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB'
    },
});