using DersTakip.Application.DTOs.Lesson;
using DersTakip.Application.Interfaces;
using DersTakip.Domain.Entities;
using DersTakip.Domain.Enums;
using Microsoft.AspNetCore.Authorization; // <--- EKLENDİ
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace DersTakip.API.Controllers;

[Authorize] // <--- EKLENDİ
[ApiController]
[Route("api/[controller]")]
public class LessonsController : ControllerBase
{
    private readonly ILessonRepository _lessonRepository;
    private readonly IStudentRepository _studentRepository;

    public LessonsController(ILessonRepository lessonRepository, IStudentRepository studentRepository)
    {
        _lessonRepository = lessonRepository;
        _studentRepository = studentRepository;
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateLessonRequest request)
    {
        var student = await _studentRepository.GetByIdAsync(request.StudentId);
        if (student == null) return NotFound("Öğrenci bulunamadı.");

        // Eğer tekrar edecekse bir Grup ID oluştur, yoksa null olsun.
        Guid? groupId = request.IsRecurring ? Guid.NewGuid() : null;

        // Eğer tekrar sayısı girilmediyse ama tekrar seçildiyse varsayılan 4 hafta yapalım.
        int count = request.IsRecurring ? (request.RecurringCount ?? 4) : 1;

        // Oluşturulan dersleri tutacağımız liste (Dönüş değeri için)
        var createdLessons = new List<Lesson>();

        for (int i = 0; i < count; i++)
        {
            // Her döngüde tarihi 7 gün (bir hafta) ileri atıyoruz.
            // i=0 iken: StartTime + 0 gün
            // i=1 iken: StartTime + 7 gün ...
            var lessonDate = request.StartTime.AddDays(i * 7);

            var lesson = new Lesson
            {
                StudentId = request.StudentId,
                StartTime = lessonDate, // <--- Hesaplanmış yeni tarih
                DurationMinutes = request.DurationMinutes,
                Topic = request.Topic,
                InternalNotes = request.InternalNotes,
                Status = LessonStatus.Scheduled,
                PriceSnapshot = student.HourlyRate,
                RecurringGroupId = groupId, // <--- Grup ID'yi basıyoruz,
                HasHomework = request.HasHomework,
                HomeworkDescription = request.HomeworkDescription
            };

            // Veritabanına kaydet
            // Not: Performans için ilerde 'CreateRangeAsync' yazabilirsin ama şimdilik döngü yeterli.
            var created = await _lessonRepository.CreateAsync(lesson);
            createdLessons.Add(created);
        }

        // İlk oluşturulan dersi veya hepsini dönebilirsin.
        // Frontend genelde tek bir onay beklediği için ilkini dönmek yeterlidir ama liste de dönebilirsin.
        return Ok(createdLessons.FirstOrDefault());
    }

    [HttpGet("student/{studentId}")]
    public async Task<IActionResult> GetByStudent(Guid studentId)
    {
        var lessons = await _lessonRepository.GetByStudentIdAsync(studentId);
        return Ok(lessons);
    }

    [HttpPut("{id}/complete")]
    public async Task<IActionResult> CompleteLesson(Guid id)
    {
        var lesson = await _lessonRepository.GetByIdAsync(id);
        if (lesson == null) return NotFound("Ders bulunamadı.");

        lesson.Status = LessonStatus.Completed;
        await _lessonRepository.UpdateAsync(lesson);

        return Ok(new { message = "Ders tamamlandı." });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteLesson(Guid id)
    {
        var lesson = await _lessonRepository.GetByIdAsync(id);
        if (lesson == null) return NotFound("Ders bulunamadı.");

        await _lessonRepository.DeleteAsync(lesson);
        return Ok(new { message = "Ders başarıyla silindi." });
    }

    // GET /api/lessons/all
    [HttpGet("all")]
    public async Task<IActionResult> GetAllLessons()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var lessons = await _lessonRepository.GetAllByUserIdAsync(userId);

        // Frontend'de öğrenci adını kolayca okumak için DTO'ya çevirebilirsin 
        // ama şimdilik hızlıca JSON ayarların (ReferenceHandler.IgnoreCycles) sayesinde direkt dönebiliriz.
        return Ok(lessons);
    }
}