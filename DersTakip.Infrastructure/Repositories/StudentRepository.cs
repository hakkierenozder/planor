using DersTakip.Application.DTOs.Student;
using DersTakip.Application.Interfaces;
using DersTakip.Domain.Entities;
using DersTakip.Domain.Enums;
using DersTakip.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DersTakip.Infrastructure.Repositories;

public class StudentRepository : IStudentRepository
{
    private readonly AppDbContext _context;

    public StudentRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Student> CreateAsync(Student student)
    {
        await _context.Students.AddAsync(student);
        await _context.SaveChangesAsync();
        return student;
    }

    public async Task<List<Student>> GetAllAsync()
    {
        // Aktif olanları getir sadece
        return await _context.Students
                             .Where(s => !s.IsDeleted && s.IsActive)
                             .ToListAsync();
    }

    public async Task<Student?> GetByIdAsync(Guid id)
    {
        return await _context.Students
                             .FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted);
    }

    public async Task<StudentBalanceDto?> GetStudentBalanceAsync(Guid studentId)
    {
        // 1. Öğrenci var mı kontrol et
        var student = await _context.Students
            .AsNoTracking() // Sadece okuma yapacağız, takip etmeye gerek yok (Hız artırır)
            .FirstOrDefaultAsync(s => s.Id == studentId && !s.IsDeleted);

        if (student == null) return null;

        // 2. Toplam Borcu Hesapla
        // Kural: Ders "Tamamlanmış" ise YA DA "İptal ama Ücretli" ise topla.
        var totalDebt = await _context.Lessons
                    .Where(l => l.StudentId == studentId && !l.IsDeleted)
                    // SADECE "Krediyle Ödenmemiş" (IsPaidByCredit == false) dersleri topla
                    .Where(l => !l.IsPaidByCredit) // <--- KRİTİK DÜZELTME BURADA
                    .Where(l => l.Status == LessonStatus.Completed || (l.Status == LessonStatus.Cancelled && l.IsCharged))
                    .SumAsync(l => l.PriceSnapshot);

        // 3. Toplam Ödemeyi Hesapla
        var totalPayment = await _context.Payments
            .Where(p => p.StudentId == studentId && !p.IsDeleted)
            .SumAsync(p => p.Amount);

        // 4. Sonucu Hazırla
        var balance = totalDebt - totalPayment;

        string statusMsg = balance > 0 ? "Öğrenci Borçlu" :
                           balance < 0 ? "Öğrenci Alacaklı (Paket/Peşin)" :
                           "Hesap Kapalı";

        return new StudentBalanceDto
        {
            StudentId = student.Id,
            FullName = student.FullName,
            TotalDebt = totalDebt,
            TotalPayment = totalPayment,
            CurrentBalance = balance,
            StatusMessage = statusMsg
        };
    }

    public async Task UpdateAsync(Student student)
    {
        _context.Students.Update(student);
        await _context.SaveChangesAsync();
    }

    public async Task<List<Student>> GetAllByUserIdAsync(string userId)
    {
        return await _context.Students
            .Where(s => s.UserId == userId && !s.IsDeleted)
            .ToListAsync();
    }
}