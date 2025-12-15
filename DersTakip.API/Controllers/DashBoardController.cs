using DersTakip.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
// Projenin namespace'lerini eklemeyi unutma (Models, Data vb.)

[Route("api/[controller]")]
[ApiController]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _context; // Context ismin neyse onu kullan

    public DashboardController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        // 1. Toplam Alacak (Tüm öğrencilerin bakiyesi)
        // Mantık: (Toplam Ders Ücretleri) - (Toplam Ödemeler)

        // Önce tüm derslerin toplam tutarı (Sadece iptal olmayanlar)
        var totalLessonPrice = await _context.Lessons
            .Where(l => !l.IsDeleted)
            .SumAsync(l => l.PriceSnapshot > 0 ? l.PriceSnapshot : 0);
        // Not: PriceSnapshot 0 ise, o anki HourlyRate ile hesaplanması gerekebilir ama şimdilik basit tutalım.

        // Tüm ödemelerin toplamı
        var totalPayments = await _context.Payments.SumAsync(p => p.Amount);

        var totalReceivable = totalLessonPrice - totalPayments;

        // 2. Bugünkü Ders Sayısı
        var today = DateTime.Today;
        var tomorrow = today.AddDays(1);

        var todaysLessonCount = await _context.Lessons
            .Where(l => l.StartTime >= today && l.StartTime < tomorrow && !l.IsDeleted)
            .CountAsync();

        // 3. Sonuç Döndür
        return Ok(new
        {
            TotalReceivable = totalReceivable,
            TodaysLessonCount = todaysLessonCount,
            TotalStudents = await _context.Students.CountAsync()
        });
    }

    // GET /api/dashboard/reports
    [HttpGet("reports")]
    public async Task<IActionResult> GetReports()
    {
        // 6 Ay Öncesine Git
        var sixMonthsAgo = DateTime.UtcNow.AddMonths(-6);

        // --- 1. GELİR GRAFİĞİ VERİSİ (Çizgi Grafik) ---
        // Son 6 ayın ödemelerini çekelim
        var payments = await _context.Payments
            .Where(p => p.PaymentDate >= sixMonthsAgo && !p.IsDeleted)
            .ToListAsync();

        // C# tarafında aylara göre gruplayalım (Veritabanı bağımsız olsun diye)
        var incomeData = payments
            .GroupBy(p => new { p.PaymentDate.Year, p.PaymentDate.Month })
            .Select(g => new
            {
                Month = new DateTime(g.Key.Year, g.Key.Month, 1).ToString("MMM", new System.Globalization.CultureInfo("tr-TR")), // "Oca", "Şub"
                Total = g.Sum(p => p.Amount)
            })
            .ToList();

        // --- 2. DERS DURUMU (Pasta Grafik) ---
        var lessons = await _context.Lessons
            .Where(l => !l.IsDeleted)
            .ToListAsync();

        var lessonStats = new
        {
            Completed = lessons.Count(l => l.Status == DersTakip.Domain.Enums.LessonStatus.Completed),
            Cancelled = lessons.Count(l => l.Status == DersTakip.Domain.Enums.LessonStatus.Cancelled),
            Scheduled = lessons.Count(l => l.Status == DersTakip.Domain.Enums.LessonStatus.Scheduled)
        };

        return Ok(new { Income = incomeData, Lessons = lessonStats });
    }
}