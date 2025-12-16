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

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            // 1. Öğrencileri Çek
            var students = await _studentRepository.GetAllByUserIdAsync(userId);
            var activeStudents = students.Where(s => s.IsActive).ToList();

            // 2. Dersleri Çek (Bugün İçin)
            var allLessons = await _lessonRepository.GetAllByUserIdAsync(userId);
            var today = DateTime.Today;
            var todaysLessons = allLessons
                .Where(l => l.StartTime.Date == today && l.Status != Domain.Enums.LessonStatus.Cancelled)
                .OrderBy(l => l.StartTime)
                .ToList();

            // 3. Sıradaki Dersi Bul
            var nextLesson = todaysLessons.FirstOrDefault(l => l.StartTime > DateTime.Now);

            // 4. Bu Ayki Ödemeleri Çek (Ciro)
            // Not: Repository'de tarih bazlı filtre yoksa hepsini çekip burada filtreleriz (küçük veri için sorun olmaz)
            var allPayments = await _paymentRepository.GetAllByUserIdAsync(userId);
            var monthlyRevenue = allPayments
                .Where(p => p.PaymentDate.Month == today.Month && p.PaymentDate.Year == today.Year)
                .Sum(p => p.Amount);

            // 5. Kredisi Azalanlar (2 ve altı)
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
    }
}