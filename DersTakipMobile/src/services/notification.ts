import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// 1. Bildirim Nasıl Görünsün?
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const notificationService = {
  // --- İZİN İSTEME VE KURULUM ---
  registerForPushNotificationsAsync: async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default', // Sesin çalıştığından emin olmak için
      });
    }

    if (!Device.isDevice) {
      console.log('Fiziksel cihaz kullanılması önerilir.');
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Bildirim izni verilmedi!');
      return;
    }
  },

  scheduleLessonReminder: async (studentName: string, lessonDate: Date) => {
    try {
      // NOT: Test için koyduğumuz cancelAll... satırını kaldırdık.

      // 1. ZAMAN HESAPLA (Dersten 1 saat öncesi)
      const triggerDate = new Date(lessonDate);
      triggerDate.setHours(triggerDate.getHours() - 1);

      const now = new Date();
      const diffInSeconds = Math.floor((triggerDate.getTime() - now.getTime()) / 1000);

      // Geçmiş zaman kontrolü
      if (diffInSeconds <= 0) {
        return;
      }

      // 2. TETİKLEYİCİYİ AYARLA
      const trigger: any = {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: diffInSeconds,
        repeats: false,
      };

      if (Platform.OS === 'android') {
        trigger.channelId = 'default';
      }

      // 3. BİLDİRİMİ KUR
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🔔 Ders Hatırlatması",
          body: `${studentName} ile dersine 1 saat kaldı! Hazırlanmayı unutma.`,
          sound: true,
        },
        trigger: trigger,
      });

      console.log(`${studentName} için bildirim kuruldu (${diffInSeconds} sn sonra).`);

    } catch (error) {
      console.error("Bildirim hatası:", error);
    }
  },
  // --- TÜM BİLDİRİMLERİ İPTAL ET ---
  cancelAllNotifications: async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
};