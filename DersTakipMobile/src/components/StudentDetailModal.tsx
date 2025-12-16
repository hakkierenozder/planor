import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
    Modal, View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, FlatList, Alert, TextInput, Platform, SafeAreaView, Switch, KeyboardAvoidingView, ScrollView
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { studentService, lessonService, paymentService, API_URL } from '../services/api';
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
    redText: '#991B1B',

    success: '#10B981', // Yeşil (Kredi var)
    danger: '#EF4444'   // Kırmızı (Kredi yok/Borç)
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
    const [showEditForm, setShowEditForm] = useState(false);

    // Düzenleme Formu Verileri
    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editRate, setEditRate] = useState('');

    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringCount, setRecurringCount] = useState('4');

    const [hasHomework, setHasHomework] = useState(false);
    const [homeworkDesc, setHomeworkDesc] = useState('');

    // PAKET SİSTEMİ STATE'LERİ
    const [showPackageForm, setShowPackageForm] = useState(false);
    const [packageCredits, setPackageCredits] = useState('');
    const [packagePrice, setPackagePrice] = useState('');
    const [currentCredits, setCurrentCredits] = useState(student?.credits || 0);

    // --- EKLENEN STATE: KREDİ KULLANIMI ---
    const [useCredit, setUseCredit] = useState(false);

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
            // Güncel krediyi backend'den alıp state'i güncelle (varsa)
            if (balanceRes && balanceRes.credits !== undefined) setCurrentCredits(balanceRes.credits);

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

    const handleShareStatement = async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('userToken');
            if (!token) {
                Alert.alert("Hata", "Oturum süreniz dolmuş.");
                return;
            }

            const safeName = student.fullName.replace(/[^a-zA-Z0-9]/g, "_");
            const fileName = `Ekstre_${safeName}.pdf`;
            const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
            if (!dir) throw new Error("Dizin bulunamadı");

            const fileUri = dir + fileName;

            const downloadRes = await FileSystem.downloadAsync(
                `${API_URL}/students/${student.id}/statement`,
                fileUri,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            if (downloadRes.status !== 200) {
                Alert.alert("Hata", "PDF oluşturulurken sunucu hatası oluştu.");
                return;
            }

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri, {
                    mimeType: 'application/pdf',
                    dialogTitle: `${student.fullName} Hesap Ekstresi`,
                    UTI: 'com.adobe.pdf'
                });
            } else {
                Alert.alert("Bilgi", "Paylaşım özelliği bu cihazda desteklenmiyor.");
            }

        } catch (error) {
            console.error(error);
            Alert.alert("Hata", "Ekstre indirilemedi. İnternet bağlantınızı kontrol edin.");
        } finally {
            setLoading(false);
        }
    };

    const handleAddLesson = async () => {
        if (!duration) return;
        const tzOffset = date.getTimezoneOffset() * 60000;
        const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, -1);
        try {
            await lessonService.create({
                studentId: student.id,
                startTime: localISOTime,
                durationMinutes: parseInt(duration),
                topic: topic || "Genel Tekrar",
                internalNotes: "",
                isRecurring: isRecurring,
                recurringCount: isRecurring ? parseInt(recurringCount) : 1,
                hasHomework: hasHomework,
                homeworkDescription: hasHomework ? homeworkDesc : "",
                // --- GÜNCELLENEN KISIM: Kredi bilgisini gönder ---
                useCredit: useCredit
            });

            // Formu temizle ve kapat
            setHasHomework(false);
            setHomeworkDesc('');
            setShowLessonForm(false);
            setTopic('');
            setDuration('60');
            setIsRecurring(false);
            setRecurringCount('4');
            setUseCredit(false); // Switch'i sıfırla

            fetchDetails();

            Alert.alert("Başarılı", isRecurring ? `${recurringCount} haftalık ders planlandı! 📅` : "Ders eklendi! ✅");

        } catch (error: any) {
            if (error.response && error.response.data) {
                Alert.alert(
                    error.response.data.message || "Hata",
                    error.response.data.detail || "Sunucu hatası oluştu."
                );
            } else {
                Alert.alert("Hata", "İşlem başarısız. İnternet bağlantınızı kontrol edin.");
            }
        }
    };

    const handleBuyPackage = async () => {
        if (!packageCredits || !packagePrice) {
            Alert.alert("Uyarı", "Lütfen ders adedi ve fiyatı giriniz.");
            return;
        }

        try {
            setLoading(true);
            const response = await studentService.addPackage({
                studentId: student.id,
                creditAmount: parseInt(packageCredits),
                totalPrice: parseFloat(packagePrice),
                packageName: `${packageCredits} Derslik Paket`
            });

            Alert.alert("Başarılı", "Paket tanımlandı! 📦");
            setCurrentCredits(response.newBalance);
            setShowPackageForm(false);
            setPackageCredits('');
            setPackagePrice('');
            fetchDetails();

        } catch (error) {
            Alert.alert("Hata", "Paket eklenirken bir sorun oluştu.");
        } finally {
            setLoading(false);
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
            onClose();
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
            <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                {/* HEADER */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.backBtn}>
                        <Text style={{ fontSize: 20, color: COLORS.text }}>✕</Text>
                    </TouchableOpacity>

                    <Text style={styles.headerTitle}>{student.fullName}</Text>

                    <TouchableOpacity onPress={openEditModal} style={[styles.backBtn, { backgroundColor: '#EEF2FF' }]}>
                        <Text style={{ fontSize: 20 }}>✏️</Text>
                    </TouchableOpacity>
                </View>

                {loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} /> : (
                    <>
                        {/* BALANCE CARD */}
                        <View style={styles.balanceContainer}>
                            <View style={[styles.modernCard, { backgroundColor: (balanceInfo?.currentBalance || 0) >= 0 ? '#10B981' : '#EF4444' }]}>

                                {/* Üst Satır: Para Durumu */}
                                <View>
                                    <Text style={styles.cardLabelWhite}>Kalan Bakiye</Text>
                                    <Text style={styles.cardValueWhite}>
                                        {(balanceInfo?.currentBalance || 0) >= 0 ? '+' : ''}{balanceInfo?.currentBalance} ₺
                                    </Text>
                                </View>

                                {/* Sağ Taraf: Kredi Durumu (Bilet) */}
                                <View style={styles.creditBadge}>
                                    <Text style={{ fontSize: 24 }}>🎫</Text>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={[styles.cardLabelWhite, { fontSize: 12 }]}>Kredi</Text>
                                        <Text style={[styles.cardValueWhite, { fontSize: 20 }]}>{currentCredits}</Text>
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
                                    ListEmptyComponent={<Text style={styles.emptyText}>Henüz kayıt yok.</Text>}
                                    renderItem={({ item }) => {
                                        // 1. Bu bir Paket Satışı mı? (Süre 0 ise)
                                        const isPackageSale = item.durationMinutes === 0;

                                        // 2. Bu ders Krediden mi düştü? (Backend'den gelen veri)
                                        // Not: Backend 'IsPaidByCredit' gönderiyor, JSON'da 'isPaidByCredit' olabilir.
                                        const isCreditLesson = item.isPaidByCredit === true;

                                        return (
                                            <View style={styles.cardItem}>
                                                {/* --- TARİH KUTUSU --- */}
                                                <View style={[
                                                    styles.dateBadge,
                                                    isPackageSale && { backgroundColor: '#FCE7F3' }, // Paket Satışı (Pembe)
                                                    (!isPackageSale && isCreditLesson) && { backgroundColor: '#FEF3C7' } // Paketten Düşen (Sarı/Turuncu)
                                                ]}>
                                                    {isPackageSale ? (
                                                        <Text style={{ fontSize: 20 }}>📦</Text>
                                                    ) : (
                                                        <>
                                                            <Text style={[
                                                                styles.dayText,
                                                                isCreditLesson && { color: '#D97706' } // Krediyse Rengi Turuncu yap
                                                            ]}>
                                                                {new Date(item.startTime).getDate()}
                                                            </Text>
                                                            <Text style={[
                                                                styles.monthText,
                                                                isCreditLesson && { color: '#D97706' }
                                                            ]}>
                                                                {new Date(item.startTime).toLocaleDateString('tr-TR', { month: 'short' })}
                                                            </Text>
                                                        </>
                                                    )}
                                                </View>

                                                {/* --- ORTA KISIM (BAŞLIK & DETAY) --- */}
                                                <View style={{ flex: 1, marginLeft: 15 }}>
                                                    <Text style={styles.itemTitle}>{item.topic}</Text>

                                                    {/* Alt Metin Mantığı */}
                                                    <Text style={styles.itemSub}>
                                                        {isPackageSale
                                                            ? "Paket Tanımlaması"
                                                            : isCreditLesson
                                                                ? `🎫 Paketten • ${item.durationMinutes} dk`
                                                                : `${item.durationMinutes} dk • ${new Date(item.startTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
                                                        }
                                                    </Text>
                                                </View>

                                                {/* --- BUTONLAR --- */}

                                                {/* Mesaj Butonu (Sadece Gerçek Derslerde) */}
                                                {!isPackageSale && (
                                                    <TouchableOpacity
                                                        style={[styles.iconBtn, { backgroundColor: '#E0F2F1', marginRight: 8 }]}
                                                        onPress={() => {
                                                            if (item.status === 2 || item.status === "Completed") {
                                                                const msg = whatsappService.templates.lessonCompleted(
                                                                    student.fullName,
                                                                    item.topic,
                                                                    item.homeworkDescription
                                                                );
                                                                whatsappService.send(student.phoneNumber, msg);
                                                            } else {
                                                                const msg = whatsappService.templates.lessonCreated(
                                                                    student.fullName,
                                                                    new Date(item.startTime),
                                                                    item.topic
                                                                );
                                                                whatsappService.send(student.phoneNumber, msg);
                                                            }
                                                        }}
                                                    >
                                                        <Text style={{ fontSize: 16 }}>💬</Text>
                                                    </TouchableOpacity>
                                                )}

                                                {/* Tamamla Butonu (Sadece Planlanmış Derslerde) */}
                                                {item.status === 1 && (
                                                    <TouchableOpacity onPress={() => handleComplete(item)} style={styles.checkBtn}><Text>✔</Text></TouchableOpacity>
                                                )}

                                                {/* Sil Butonu */}
                                                <TouchableOpacity onPress={() => handleDelete(item.id, 'lesson')} style={styles.delBtn}><Text>🗑</Text></TouchableOpacity>
                                            </View>
                                        );
                                    }}
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
                            <TouchableOpacity
                                onPress={handleShareStatement}
                                style={[styles.actionBtn, { backgroundColor: '#8B5CF6', marginHorizontal: 10 }]}
                            >
                                <Text style={styles.actionIcon}>📄</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowLessonForm(true)} style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}>
                                <Text style={styles.actionIcon}>📅</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setShowPackageForm(!showPackageForm)}
                                style={[styles.actionBtn, { backgroundColor: '#EC4899', marginLeft: 10 }]}
                            >
                                <Text style={styles.actionIcon}>🎁</Text>
                            </TouchableOpacity>
                        </View>

                        {/* OVERLAY FORMS */}
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

                                            {/* --- EKLENEN KISIM: KREDİ KULLANIMI --- */}
                                            {/* Sadece kredi varsa göster */}
                                            {(balanceInfo?.credits || currentCredits) > 0 && (
                                                <View style={[styles.switchContainer, { borderColor: useCredit ? COLORS.success : '#E5E7EB', borderWidth: useCredit ? 2 : 1 }]}>
                                                    <View>
                                                        <Text style={styles.label}>Paketten Düş</Text>
                                                        <Text style={{ fontSize: 10, color: COLORS.textLight }}>
                                                            {useCredit ? "Bu ders krediden düşülecek" : `Mevcut: ${currentCredits} kredi`}
                                                        </Text>
                                                    </View>
                                                    <Switch
                                                        value={useCredit}
                                                        onValueChange={setUseCredit}
                                                        trackColor={{ false: "#767577", true: COLORS.success }}
                                                        thumbColor={useCredit ? "#fff" : "#f4f3f4"}
                                                    />
                                                </View>
                                            )}
                                            {/* -------------------------------------- */}

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
                                                <View style={{ marginBottom: 10 }}>
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
                                                    style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                                                    placeholder="Ödev Açıklaması"
                                                    multiline={true}
                                                    numberOfLines={3}
                                                    value={homeworkDesc}
                                                    onChangeText={setHomeworkDesc}
                                                />
                                            )}

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

                                    {/* --- PAKET SATIN ALMA FORMU (OVERLAY İÇİNDE GÖSTERİLMEYECEK, AYRI GÖSTERİLİYOR AMA KOD YAPISI AYNEN KALDI) --- */}
                                    {/* Not: showPackageForm bu overlay içinde değil, aşağıda ayrı bir blokta. */}

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

                        {/* PAKET ALMA FORMU AYRI */}
                        {showPackageForm && (
                            <View style={styles.formOverlay}>
                                <View style={styles.formCard}>
                                    <Text style={styles.formTitle}>📦 Yeni Ders Paketi Tanımla</Text>
                                    <TextInput style={styles.input} placeholder="Ders Adedi (Örn: 10)" keyboardType="numeric" value={packageCredits} onChangeText={setPackageCredits} />
                                    <TextInput style={styles.input} placeholder="Toplam Fiyat (Örn: 5000)" keyboardType="numeric" value={packagePrice} onChangeText={setPackagePrice} />

                                    <View style={{ flexDirection: 'row', marginTop: 10 }}>
                                        <TouchableOpacity onPress={() => setShowPackageForm(false)} style={[styles.btn, { backgroundColor: '#EEE' }]}>
                                            <Text>İptal</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.btn, { backgroundColor: '#EC4899' }]} onPress={handleBuyPackage}>
                                            <Text style={{ color: 'white', fontWeight: 'bold' }}>Paketi Yükle</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        )}

                    </>
                )}
                </KeyboardAvoidingView>
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
    saveBtn: {
        backgroundColor: COLORS.primary,
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: COLORS.primary,
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 3
    },
    saveBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16
    },
    // ... diğer stiller ...

    // YENİ EKLENECEK MODERN STİLLER
    modernCard: {
        borderRadius: 20,
        padding: 25,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        marginBottom: 10
    },
    cardLabelWhite: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4
    },
    cardValueWhite: {
        color: '#FFF',
        fontSize: 32,
        fontWeight: 'bold'
    },
    creditBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 15
    },
});