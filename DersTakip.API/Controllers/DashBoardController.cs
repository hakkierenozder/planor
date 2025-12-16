using DersTakip.Application.DTOs.Dashboard;
using DersTakip.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace DersTakip.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class DashBoardController : ControllerBase
    {
        private readonly IStudentRepository _studentRepository;
        private readonly ILessonRepository _lessonRepository;
        private readonly IPaymentRepository _paymentRepository;

        public DashBoardController(IStudentRepository studentRepository, ILessonRepository lessonRepository, IPaymentRepository paymentRepository)
        {
            _studentRepository = studentRepository;
            _lessonRepository = lessonRepository;
            _paymentRepository = paymentRepository;
        }

        // ... GetSummary metodu aynen kalabilir ...
        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            var students = await _studentRepository.GetAllByUserIdAsync(userId);
            var activeStudents = students.Where(s => s.IsActive).ToList();

            var allLessons = await _lessonRepository.GetAllByUserIdAsync(userId);
            var today = DateTime.Today;
            var todaysLessons = allLessons
                .Where(l => l.StartTime.Date == today && l.Status != Domain.Enums.LessonStatus.Cancelled)
                .OrderBy(l => l.StartTime)
                .ToList();

            var nextLesson = todaysLessons.FirstOrDefault(l => l.StartTime > DateTime.Now);

            var allPayments = await _paymentRepository.GetAllByUserIdAsync(userId);
            var monthlyRevenue = allPayments
                .Where(p => p.PaymentDate.Month == today.Month && p.PaymentDate.Year == today.Year)
                .Sum(p => p.Amount);

            var lowCredits = activeStudents.Count(s => s.Credits <= 2);

            var summary = new DashboardSummaryDto
            {
                MonthlyRevenue = monthlyRevenue,
                TotalStudentCount = activeStudents.Count,
                LowCreditCount = lowCredits,
                TodayLessonCount = todaysLessons.Count,
                NextLessonInfo = nextLesson != null ? $"{nextLesson.Student.FullName}" : "Ders Yok",
                NextLessonTime = nextLesson?.StartTime.ToString("HH:mm")
            };

            return Ok(summary);
        }

        // --- YENİ EKLENEN METOTLAR (DÜZELTİLMİŞ) ---

        [HttpGet("monthly-earnings")]
        public async Task<IActionResult> GetMonthlyEarnings()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var sixMonthsAgo = DateTime.Now.AddMonths(-6);

            // 1. Repository'den o kullanıcının TÜM ödemelerini çekiyoruz
            var allPayments = await _paymentRepository.GetAllByUserIdAsync(userId);

            // 2. Bellek içinde (LINQ to Objects) filtreleme yapıyoruz
            var earnings = allPayments
                .Where(p => p.PaymentDate >= sixMonthsAgo)
                .GroupBy(p => new { p.PaymentDate.Year, p.PaymentDate.Month })
                .Select(g => new
                {
                    // Tarihi sıralı almak için Group Key'i kullanabiliriz ama basitçe ilk elemanın tarihi yeterli
                    DateObj = g.First().PaymentDate,
                    TotalAmount = g.Sum(p => p.Amount)
                })
                .OrderBy(x => x.DateObj) // Tarihe göre sırala
                .ToList();

            var result = new MonthlyEarningsDto
            {
                // Türkçe ay isimleri için (Oca, Şub...)
                Labels = earnings.Select(x => x.DateObj.ToString("MMM", new System.Globalization.CultureInfo("tr-TR"))).ToList(),
                Data = earnings.Select(x => x.TotalAmount).ToList()
            };

            return Ok(result);
        }

        [HttpGet("top-student")]
        public async Task<IActionResult> GetTopStudent()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var startOfMonth = new DateTime(DateTime.Now.Year, DateTime.Now.Month, 1);

            // 1. Repository'den o kullanıcının TÜM derslerini çekiyoruz
            var allLessons = await _lessonRepository.GetAllByUserIdAsync(userId);

            // 2. Bellek içinde analiz ediyoruz
            var topStudentGroup = allLessons
                .Where(l => l.StartTime >= startOfMonth && l.Status == Domain.Enums.LessonStatus.Completed)
                .GroupBy(l => l.StudentId)
                .Select(g => new
                {
                    StudentId = g.Key,
                    Count = g.Count(),
                    // Student entity'sinin Include ile geldiğini varsayıyoruz (GetSummary'de geldiği gibi)
                    StudentName = g.First().Student?.FullName ?? "Öğrenci"
                })
                .OrderByDescending(x => x.Count)
                .FirstOrDefault();

            if (topStudentGroup == null) return NoContent();

            return Ok(new TopStudentDto
            {
                StudentName = topStudentGroup.StudentName,
                LessonCount = topStudentGroup.Count,
                MotivationMessage = "🥇 Ayın En Çalışkanı!"
            });
        }

        [HttpGet("reports")]
        public async Task<IActionResult> GetReports()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            // 1. Gelir Verisi (Son 6 Ay)
            var sixMonthsAgo = DateTime.Today.AddMonths(-6);
            var allPayments = await _paymentRepository.GetAllByUserIdAsync(userId);

            var incomeData = allPayments
                .Where(p => p.PaymentDate >= sixMonthsAgo)
                .GroupBy(p => new { p.PaymentDate.Year, p.PaymentDate.Month })
                .Select(g => new
                {
                    month = g.First().PaymentDate.ToString("MMM", new System.Globalization.CultureInfo("tr-TR")),
                    total = g.Sum(p => p.Amount)
                })
                .OrderBy(x => x.month)
                .ToList();

            // 2. Ders İstatistikleri (DÜZELTİLEN KISIM)
            var allLessons = await _lessonRepository.GetAllByUserIdAsync(userId);

            var lessonStats = new
            {
                // IsCompleted yerine Status kontrolü yapıyoruz:
                completed = allLessons.Count(l => l.Status == Domain.Enums.LessonStatus.Completed),

                // Gelecekteki planlı dersler:
                scheduled = allLessons.Count(l => l.Status == Domain.Enums.LessonStatus.Scheduled && l.StartTime > DateTime.Now),

                cancelled = allLessons.Count(l => l.Status == Domain.Enums.LessonStatus.Cancelled)
            };

            return Ok(new { income = incomeData, lessons = lessonStats });
        }
    }
}