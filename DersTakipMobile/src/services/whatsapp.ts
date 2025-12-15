import { Linking, Alert } from 'react-native';

export const whatsappService = {

  send: async (phone: string, message: string) => {
    if (!phone) {
      Alert.alert("Hata", "Öğrencinin telefon numarası kayıtlı değil.");
      return;
    }

    // Telefon numarasını temizle
    let cleanPhone = phone.replace(/[^\d]/g, '');

    // Başındaki 0'ı sil
    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);

    // Ülke kodu ekle (Yoksa 90 ekle)
    if (!cleanPhone.startsWith('90')) cleanPhone = '90' + cleanPhone;

    // YÖNTEM DEĞİŞİKLİĞİ:
    // whatsapp:// yerine https://wa.me/ kullanıyoruz.
    // Bu yöntem Expo Go'da izin sorunu yaşatmaz, direkt uygulamayı tetikler.
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    try {
      // canOpenURL kontrolünü kaldırdık. Direkt açmayı deniyoruz.
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert("Hata", "WhatsApp açılamadı veya yüklü değil.");
    }
  },

  // Şablonlar (Aynı kalıyor)
  templates: {
    lessonCreated: (studentName: string, date: Date, topic: string) => {
      const dateStr = date.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
      const timeStr = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      return `Merhaba, ${studentName} ile ${dateStr} saat ${timeStr}'de "${topic}" konulu dersimiz planlanmıştır. Görüşmek üzere! 👋`;
    },

    paymentReceived: (amount: number, remainingDebt: number) => {
      return `Teşekkürler, ${amount} TL ödemeniz alınmıştır. ✅\nGüncel kalan bakiye: ${remainingDebt} TL.`;
    },

    lessonCompleted: (studentName: string, topic: string, homeworkDesc?: string) => {
      let message = `Merhaba, bugünkü "${topic}" dersimizi ${studentName} ile başarıyla tamamladık. 📚`;

      if (homeworkDesc) {
        message += `\n\n📝 ÖDEV: ${homeworkDesc}\n(Lütfen bir sonraki derse kadar tamamlayalım.)`;
      }

      message += `\n\nİyi çalışmalar! 👋`;
      return message;
    }
  }
};