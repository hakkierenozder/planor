using DersTakip.Domain.Common;

namespace DersTakip.Domain.Entities
{
    public class TeacherSettings : BaseEntity
    {
        public string UserId { get; set; } // Hangi hocaya ait?
        public string FullName { get; set; } // Ad Soyad (Raporda görünecek)
        public string Title { get; set; } // Branş (Örn: Matematik Öğretmeni)
        public decimal DefaultHourlyRate { get; set; } // Varsayılan Ders Ücreti
        public int DefaultLessonDuration { get; set; } // Varsayılan Ders Süresi (dk)
    }
}