import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

// ⚠️ BURAYI GÜNCELLE:
// '192.168.1.X' kısmına az önce ipconfig ile bulduğun kendi IP adresini yaz.
// Port numarası (5252) backend'in çalıştığı port olmalı.
const MY_IP_ADDRESS = '192.168.1.5'; // <-- Senin IP adresin buraya!
const API_PORT = '5252'; 

export const API_URL = `http://${MY_IP_ADDRESS}:${API_PORT}/api`;

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000, // 10 saniye içinde cevap gelmezse hata ver
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('userToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// --- AUTH SERVİSLERİ ---
export const authService = {
    login: async (data: any) => {
        const response = await api.post('/auth/login', data);
        if (response.data.token) {
            await AsyncStorage.setItem('userToken', response.data.token);
        }
        return response.data;
    },
    
    register: async (data: any) => {
        // data şunları içerecek: { email, password, fullName }
        const response = await api.post('/auth/register', data);
        return response.data;
    },

    logout: async () => {
        await AsyncStorage.removeItem('userToken');
    }
};

export const studentService = {
  getAll: async () => { const res = await api.get('/students'); return res.data; },
  create: async (data: any) => { const res = await api.post('/students', data); return res.data; },
  update: async (id: string, data: any) => { const res = await api.put(`/students/${id}`, { ...data, id }); return res.data; },
  getBalance: async (id: string) => { const res = await api.get(`/students/${id}/balance`); return res.data; },
  getLessons: async (id: string) => { const res = await api.get(`/students/${id}/lessons`); return res.data; },
  addPackage: async (data: { studentId: string, creditAmount: number, totalPrice: number, packageName?: string }) => {
    const res = await api.post('/students/add-package', data);
    return res.data;
  },
};

export const lessonService = {
  create: async (data: any) => { const res = await api.post('/lessons', data); return res.data; },
  complete: async (id: string) => { const res = await api.put(`/lessons/${id}/complete`); return res.data; },
  delete: async (id: string) => { const res = await api.delete(`/lessons/${id}`); return res.data; },
  getAll: async () => { 
    const res = await api.get('/lessons/all'); 
    return res.data; 
  },
};

export const paymentService = {
  create: async (data: any) => { const res = await api.post('/payments', data); return res.data; },
  getByStudent: async (id: string) => { const res = await api.get(`/payments/student/${id}`); return res.data; },
  delete: async (id: string) => { const res = await api.delete(`/payments/${id}`); return res.data; }
};

export const dashboardService = {
  getSummary: async () => { const res = await api.get('/dashboard/summary'); return res.data; },
  getReports: async () => { const res = await api.get('/dashboard/reports'); return res.data; }
};

export const settingsService = {
    get: async () => {
        const response = await api.get('/settings');
        return response.data;
    },
    save: async (data: any) => {
        const response = await api.post('/settings', data);
        return response.data;
    }
};

export const reportService = {
    shareStudentReport: async (studentId: string, studentName: string) => {
        try {
            // Türkçe karakterleri temizle
            const safeName = studentName.replace(/[^a-zA-Z0-9]/g, '_');
            const fileName = `Rapor_${safeName}.pdf`;
            
            // --- DÜZELTME BURADA ---
            // TypeScript hatasını önlemek için 'as any' kullanıyoruz.
            // documentDirectory boş gelirse cacheDirectory kullan.
            const docDir = (FileSystem as any).documentDirectory || (FileSystem as any).cacheDirectory;
            const fileUri = docDir + fileName;
            // -----------------------

            const token = await AsyncStorage.getItem('userToken');

            const downloadRes = await FileSystem.downloadAsync(
                `${API_URL}/reports/student-report/${studentId}`,
                fileUri,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (downloadRes.status !== 200) {
                throw new Error("Rapor oluşturulamadı (Status: " + downloadRes.status + ")");
            }

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri, {
                    mimeType: 'application/pdf',
                    dialogTitle: `${studentName} Raporunu Paylaş`,
                    UTI: 'com.adobe.pdf' // iOS için önemli
                });
            } else {
                Alert.alert("Hata", "Paylaşım özelliği bu cihazda kullanılamıyor.");
            }

        } catch (error) {
            console.error("PDF Hatası:", error);
            Alert.alert("Hata", "Rapor indirilirken bir sorun oluştu.");
        }
    }
};

export default api;