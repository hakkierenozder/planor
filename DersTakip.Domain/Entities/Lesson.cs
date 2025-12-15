using DersTakip.Domain.Common;
using DersTakip.Domain.Enums;

namespace DersTakip.Domain.Entities
{
    public class Lesson : BaseEntity
    {
        public Guid StudentId { get; set; }
        public DateTime StartTime { get; set; }
        public int DurationMinutes { get; set; } // 45, 60, 90...

        // Snapshot Price: Ders oluşturulduğu anki fiyat buraya kopyalanır.
        public decimal PriceSnapshot { get; set; }

        public string? Topic { get; set; }
        public string? InternalNotes { get; set; }

        public LessonStatus Status { get; set; } = LessonStatus.Scheduled;
        public string? CancellationReason { get; set; }

        // Bakiyeye yansıdı mı? (Örn: İptal oldu ama hoca parasını istedi -> True)
        public bool IsCharged { get; set; }

        // Navigation Property
        public Student Student { get; set; } = null!;
    }
}
