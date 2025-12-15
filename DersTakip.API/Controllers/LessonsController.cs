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
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var student = await _studentRepository.GetByIdAsync(request.StudentId);
        if (student == null) return NotFound("Öğrenci bulunamadı.");

        Guid? groupId = request.IsRecurring ? Guid.NewGuid() : null;
        int count = request.IsRecurring ? (request.RecurringCount ?? 4) : 1;

        // --- 1. KREDİ KONTROLÜ (YENİDEN EKLENDİ) ---
        if (request.UseCredit)
        {
            if (student.Credits < count)
            {
                return BadRequest(new
                {
                    message = "Yetersiz Kredi! ⚠️",
                    detail = $"İşlem için {count} kredi lazım ama öğrencinin {student.Credits} kredisi var."
                });
            }
        }
        // ------------------------------------------

        var lessonsToCreate = new List<Lesson>();

        for (int i = 0; i < count; i++)
        {
            var lessonStart = request.StartTime.AddDays(i * 7);
            var lessonEnd = lessonStart.AddMinutes(request.DurationMinutes);

            bool hasConflict = await _lessonRepository.HasConflictAsync(userId, lessonStart, lessonEnd);
            if (hasConflict)
            {
                return BadRequest(new
                {
                    message = "Çakışma Tespit Edildi! 🛑",
                    detail = $"{lessonStart:dd.MM.yyyy HH:mm} tarihinde zaten ders var."
                });
            }

            lessonsToCreate.Add(new Lesson
            {
                StudentId = request.StudentId,
                StartTime = lessonStart,
                DurationMinutes = request.DurationMinutes,
                Topic = request.Topic,
                InternalNotes = request.InternalNotes,
                Status = LessonStatus.Scheduled,
                PriceSnapshot = student.HourlyRate,
                RecurringGroupId = groupId,
                HasHomework = request.HasHomework,
                HomeworkDescription = request.HomeworkDescription,

                // --- 2. KREDİ BİLGİSİNİ İŞLE ---
                IsPaidByCredit = request.UseCredit
            });
        }

        foreach (var lesson in lessonsToCreate)
        {
            await _lessonRepository.CreateAsync(lesson);
        }

        // --- 3. KREDİYİ DÜŞ VE KAYDET ---
        if (request.UseCredit)
        {
            student.Credits -= count;
            await _studentRepository.UpdateAsync(student);
        }

        return Ok(lessonsToCreate.FirstOrDefault());
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