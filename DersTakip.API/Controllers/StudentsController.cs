using DersTakip.Application.DTOs.Student;
using DersTakip.Application.Interfaces;
using DersTakip.Domain.Entities;
using Microsoft.AspNetCore.Authorization; // <--- EKLENDİ
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace DersTakip.API.Controllers;

[Authorize] // <--- ARTIK KİLİTLİ (Sadece giriş yapanlar girebilir)
[ApiController]
[Route("api/[controller]")]
public class StudentsController : ControllerBase
{
    private readonly IStudentRepository _studentRepository;
    private readonly ILessonRepository _lessonRepository; // <--- EKLENDİ (Dersleri çekmek için şart)

    // Constructor'ı güncelledik: Hem Student hem Lesson repository istiyoruz
    public StudentsController(IStudentRepository studentRepository, ILessonRepository lessonRepository)
    {
        _studentRepository = studentRepository;
        _lessonRepository = lessonRepository;
    }

    // ÖĞRENCİ EKLEME
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Student student)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        student.UserId = userId;
        await _studentRepository.CreateAsync(student);
        return Ok(student);
    }

    // LİSTELEME
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var students = await _studentRepository.GetAllByUserIdAsync(userId);
        return Ok(students);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var student = await _studentRepository.GetByIdAsync(id);
        if (student == null) return NotFound();
        return Ok(student);
    }

    // --- EKSİK OLAN METOT BUYDU ---
    // Frontend isteği: GET /api/students/{id}/lessons
    [HttpGet("{id}/lessons")]
    public async Task<IActionResult> GetStudentLessons(Guid id)
    {
        // LessonRepository'deki hazır metodu kullanıyoruz
        var lessons = await _lessonRepository.GetByStudentIdAsync(id);
        return Ok(lessons);
    }
    // -----------------------------

    [HttpGet("{id}/balance")]
    public async Task<IActionResult> GetBalance(Guid id)
    {
        // Senin Repository kodunda bu metot zaten harika hesaplama yapıyor
        var balanceDto = await _studentRepository.GetStudentBalanceAsync(id);

        if (balanceDto == null)
            return NotFound("Öğrenci bulunamadı.");

        return Ok(balanceDto);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateStudent(Guid id, [FromBody] Student student)
    {
        if (id != student.Id) return BadRequest("ID uyuşmazlığı.");

        var existingStudent = await _studentRepository.GetByIdAsync(id);
        if (existingStudent == null) return NotFound("Öğrenci bulunamadı.");

        existingStudent.FullName = student.FullName;
        existingStudent.PhoneNumber = student.PhoneNumber;
        existingStudent.HourlyRate = student.HourlyRate;

        await _studentRepository.UpdateAsync(existingStudent);
        return Ok(new { message = "Öğrenci güncellendi." });
    }


}