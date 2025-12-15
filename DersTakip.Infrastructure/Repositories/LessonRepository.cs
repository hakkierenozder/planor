using DersTakip.Application.Interfaces;
using DersTakip.Domain.Entities;
using DersTakip.Domain.Enums;
using DersTakip.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DersTakip.Infrastructure.Repositories;

public class LessonRepository : ILessonRepository
{
    private readonly AppDbContext _context;

    public LessonRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Lesson> CreateAsync(Lesson lesson)
    {
        await _context.Lessons.AddAsync(lesson);
        await _context.SaveChangesAsync();
        return lesson;
    }

    public async Task<List<Lesson>> GetByStudentIdAsync(Guid studentId)
    {
        return await _context.Lessons
                             .Where(l => l.StudentId == studentId && !l.IsDeleted)
                             .OrderByDescending(l => l.StartTime) // En yeni en üstte
                             .ToListAsync();
    }

    public async Task<List<Lesson>> GetByDateRangeAsync(DateTime start, DateTime end)
    {
        return await _context.Lessons
                             .Include(l => l.Student) // Takvimde öğrenci adını görmek isteriz
                             .Where(l => l.StartTime >= start && l.StartTime <= end && !l.IsDeleted)
                             .OrderBy(l => l.StartTime)
                             .ToListAsync();
    }

    public async Task<Lesson?> GetByIdAsync(Guid id)
    {
        return await _context.Lessons.FindAsync(id);
    }

    public async Task UpdateAsync(Lesson lesson)
    {
        _context.Lessons.Update(lesson);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Lesson lesson)
    {
        // Entity Framework'te silme işlemi
        _context.Lessons.Remove(lesson);

        // Değişikliği veritabanına kaydet
        await _context.SaveChangesAsync();
    }

    public async Task<List<Lesson>> GetAllByUserIdAsync(string userId)
    {
        // Öğrenci tablosu üzerinden filtreliyoruz (Öğrenci benimse, ders de benimdir)
        return await _context.Lessons
            .Include(l => l.Student) // Öğrenci bilgisini de getir (Adı lazım olacak)
            .Where(l => l.Student.UserId == userId && !l.IsDeleted)
            .OrderBy(l => l.StartTime)
            .ToListAsync();
    }

    public async Task<bool> HasConflictAsync(string userId, DateTime startTime, DateTime endTime, Guid? excludeLessonId = null)
    {
        // Çakışma Mantığı: (MevcutBaşlangıç < YeniBitiş) VE (MevcutBitiş > YeniBaşlangıç)
        return await _context.Lessons
            .Include(l => l.Student) // Öğrenci üzerinden öğretmene (UserId) ulaşıyoruz
            .AnyAsync(l =>
                l.Student.UserId == userId &&
                l.Status != LessonStatus.Cancelled && // İptal edilen dersler çakışma yaratmaz
                (excludeLessonId == null || l.Id != excludeLessonId) && // Güncelleme yaparken kendisiyle çakışmasın
                l.StartTime < endTime &&
                (l.StartTime.AddMinutes(l.DurationMinutes)) > startTime
            );
    }
}