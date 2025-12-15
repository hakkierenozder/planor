using DersTakip.Domain.Entities;

namespace DersTakip.Application.Interfaces
{
    public interface ILessonRepository
    {
        Task<Lesson> CreateAsync(Lesson lesson);

        // Belirli bir öğrencinin derslerini getir
        Task<List<Lesson>> GetByStudentIdAsync(Guid studentId);

        // Belirli tarih aralığındaki dersleri getir (Takvim için)
        Task<List<Lesson>> GetByDateRangeAsync(DateTime start, DateTime end);

        Task<Lesson?> GetByIdAsync(Guid id);

        Task UpdateAsync(Lesson lesson);     // Dersi güncellemek için

        Task DeleteAsync(Lesson lesson);

        Task<List<Lesson>> GetAllByUserIdAsync(string userId);
    }
}
