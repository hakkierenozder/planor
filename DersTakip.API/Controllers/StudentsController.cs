using DersTakip.Application.DTOs.Student;
using DersTakip.Application.Interfaces;
using DersTakip.Domain.Entities;
using DersTakip.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using System.Security.Claims;

namespace DersTakip.API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class StudentsController : ControllerBase
{
    private readonly IStudentRepository _studentRepository;
    private readonly ILessonRepository _lessonRepository;
    private readonly IPaymentRepository _paymentRepository;

    public StudentsController(
        IStudentRepository studentRepository,
        ILessonRepository lessonRepository,
        IPaymentRepository paymentRepository)
    {
        _studentRepository = studentRepository;
        _lessonRepository = lessonRepository;
        _paymentRepository = paymentRepository;
    }

    // 1. ÖĞRENCİ EKLEME
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Student student)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        student.UserId = userId;
        await _studentRepository.CreateAsync(student);
        return Ok(student);
    }

    // 2. LİSTELEME
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var students = await _studentRepository.GetAllByUserIdAsync(userId);
        return Ok(students);
    }

    // 3. TEK ÖĞRENCİ DETAYI
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var student = await _studentRepository.GetByIdAsync(id);
        if (student == null) return NotFound("Öğrenci bulunamadı.");
        return Ok(student);
    }

    // 4. ÖĞRENCİ GÜNCELLEME
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

    // 5. DERSLERİ GETİR
    [HttpGet("{id}/lessons")]
    public async Task<IActionResult> GetStudentLessons(Guid id)
    {
        var lessons = await _lessonRepository.GetByStudentIdAsync(id);
        return Ok(lessons.OrderByDescending(l => l.StartTime));
    }

    // 6. BAKİYE SORGULAMA
    [HttpGet("{id}/balance")]
    public async Task<IActionResult> GetBalance(Guid id)
    {
        var balanceDto = await _studentRepository.GetStudentBalanceAsync(id);
        if (balanceDto == null) return NotFound("Öğrenci bulunamadı.");
        return Ok(balanceDto);
    }

    // 7. PDF EKSTRE (Düzeltilmiş Renk Kodlarıyla)
    [HttpGet("{id}/statement")]
    public async Task<IActionResult> GetStatementPdf(Guid id)
    {
        var student = await _studentRepository.GetByIdAsync(id);
        if (student == null) return NotFound("Öğrenci bulunamadı.");

        var lessons = await _lessonRepository.GetByStudentIdAsync(id);
        var payments = await _paymentRepository.GetByStudentIdAsync(id);

        var transactions = new List<StatementItem>();

        foreach (var l in lessons.Where(x => x.Status != LessonStatus.Cancelled))
        {
            transactions.Add(new StatementItem
            {
                Date = l.StartTime,
                Description = $"Ders: {l.Topic} ({l.DurationMinutes} dk)",
                Debt = l.PriceSnapshot,
                Credit = 0
            });
        }

        foreach (var p in payments)
        {
            transactions.Add(new StatementItem
            {
                Date = p.PaymentDate,
                Description = "Ödeme Alındı",
                Debt = 0,
                Credit = p.Amount
            });
        }

        var sortedTransactions = transactions.OrderBy(t => t.Date).ToList();

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontSize(10));

                // Başlık
                page.Header().Row(row =>
                {
                    row.RelativeItem().Column(col =>
                    {
                        col.Item().Text("PLANÖR DERS TAKİP").FontSize(20).SemiBold().FontColor(Colors.Blue.Medium);
                        col.Item().Text("Öğrenci Hesap Ekstresi").FontSize(14).FontColor(Colors.Grey.Darken2);
                    });

                    row.ConstantItem(120).AlignRight().Column(col =>
                    {
                        col.Item().Text(DateTime.Now.ToString("dd.MM.yyyy HH:mm"));
                        col.Item().Text("Sayfa 1");
                    });
                });

                // İçerik
                page.Content().PaddingVertical(1, Unit.Centimetre).Column(col =>
                {
                    // RENK DÜZELTMESİ YAPILAN SATIR BURASI: Colors.Grey.Lighten2
                    col.Item().Border(1).BorderColor(Colors.Grey.Lighten2).Padding(10).Row(row =>
                    {
                        row.RelativeItem().Column(c => {
                            c.Item().Text("Öğrenci Bilgileri").Bold();
                            c.Item().Text(student.FullName).FontSize(12);
                            c.Item().Text(student.PhoneNumber ?? "-");
                        });

                        row.RelativeItem().AlignRight().Column(c => {
                            c.Item().Text("Saatlik Ücret").Bold();
                            c.Item().Text($"{student.HourlyRate:N2} ₺").FontSize(12);
                        });
                    });

                    col.Item().PaddingBottom(10);

                    // Tablo
                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.ConstantColumn(80);
                            columns.RelativeColumn();
                            columns.ConstantColumn(70);
                            columns.ConstantColumn(70);
                            columns.ConstantColumn(80);
                        });

                        table.Header(header =>
                        {
                            header.Cell().Element(CellStyle).Text("Tarih");
                            header.Cell().Element(CellStyle).Text("Açıklama");
                            header.Cell().Element(CellStyle).AlignRight().Text("Borç (TL)");
                            header.Cell().Element(CellStyle).AlignRight().Text("Ödeme (TL)");
                            header.Cell().Element(CellStyle).AlignRight().Text("Bakiye");
                        });

                        decimal runningBalance = 0;

                        foreach (var item in sortedTransactions)
                        {
                            runningBalance = runningBalance + item.Debt - item.Credit;

                            table.Cell().Element(CellStyle).Text(item.Date.ToString("dd.MM.yyyy"));
                            table.Cell().Element(CellStyle).Text(item.Description);

                            table.Cell().Element(CellStyle).AlignRight().Text(item.Debt > 0 ? item.Debt.ToString("N2") : "-")
                                .FontColor(item.Debt > 0 ? Colors.Red.Medium : Colors.Black);

                            table.Cell().Element(CellStyle).AlignRight().Text(item.Credit > 0 ? item.Credit.ToString("N2") : "-")
                                .FontColor(item.Credit > 0 ? Colors.Green.Medium : Colors.Black);

                            table.Cell().Element(CellStyle).AlignRight().Text(runningBalance.ToString("N2"));
                        }

                        // Stil Fonksiyonu
                        static IContainer CellStyle(IContainer container)
                        {
                            // Burada da Light yerine Lighten2 kullandım
                            return container.BorderBottom(1).BorderColor(Colors.Grey.Lighten2).PaddingVertical(5);
                        }
                    });

                    // Toplamlar
                    decimal totalDebt = sortedTransactions.Sum(x => x.Debt);
                    decimal totalCredit = sortedTransactions.Sum(x => x.Credit);
                    decimal finalBalance = totalDebt - totalCredit;

                    col.Item().PaddingTop(10).AlignRight().Text($"Genel Toplam Bakiye: {finalBalance:N2} ₺")
                        .FontSize(14).Bold().FontColor(finalBalance > 0 ? Colors.Red.Medium : Colors.Green.Medium);
                });

                page.Footer().AlignCenter().Text("Planör Sistemi tarafından oluşturulmuştur.");
            });
        });

        var pdfBytes = document.GeneratePdf();
        // Dosya ismindeki Türkçe karakterleri düzeltelim
        string safeName = student.FullName
            .Replace(" ", "_")
            .Replace("ö", "o").Replace("Ö", "O")
            .Replace("ü", "u").Replace("Ü", "U")
            .Replace("ş", "s").Replace("Ş", "S")
            .Replace("ı", "i").Replace("İ", "I")
            .Replace("ğ", "g").Replace("Ğ", "G")
            .Replace("ç", "c").Replace("Ç", "C");

        return File(pdfBytes, "application/pdf", $"Ekstre_{safeName}_{DateTime.Now:yyyyMMdd}.pdf");
    }

    // YENİ: PAKET (KREDİ) YÜKLEME
    [HttpPost("add-package")]
    public async Task<IActionResult> AddPackage([FromBody] AddPackageRequest request)
    {
        var student = await _studentRepository.GetByIdAsync(request.StudentId);
        if (student == null) return NotFound("Öğrenci bulunamadı.");

        // 1. Krediyi Yükle
        student.Credits += request.CreditAmount;
        await _studentRepository.UpdateAsync(student);

        // 2. Ödeme Kaydı Oluştur (Otomatik)
        var payment = new Payment
        {
            StudentId = request.StudentId,
            Amount = request.TotalPrice,
            PaymentDate = DateTime.UtcNow, // Veya yerel saat
            Method = PaymentMethod.Cash, // Varsayılan Nakit, istersen parametre alabilirsin
            Description = request.PackageName ?? $"{request.CreditAmount} Derslik Paket Alımı"
        };

        await _paymentRepository.CreateAsync(payment);

        return Ok(new { message = "Paket başarıyla tanımlandı.", newBalance = student.Credits });
    }

    // Yardımcı Sınıf
    private class StatementItem
    {
        public DateTime Date { get; set; }
        public string Description { get; set; } = string.Empty;
        public decimal Debt { get; set; }
        public decimal Credit { get; set; }
    }
}