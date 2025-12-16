using DersTakip.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using System.Security.Claims;

namespace DersTakip.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class ReportsController : ControllerBase
    {
        private readonly IStudentRepository _studentRepository;
        private readonly ILessonRepository _lessonRepository;
        private readonly IPaymentRepository _paymentRepository;
        private readonly ITeacherSettingsRepository _settingsRepository;

        public ReportsController(IStudentRepository studentRepository, ILessonRepository lessonRepository, IPaymentRepository paymentRepository, ITeacherSettingsRepository settingsRepository)
        {
            _studentRepository = studentRepository;
            _lessonRepository = lessonRepository;
            _paymentRepository = paymentRepository;
            _settingsRepository = settingsRepository;
        }

        [HttpGet("student-report/{studentId}")]
        public async Task<IActionResult> GetStudentReport(Guid studentId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            QuestPDF.Settings.License = LicenseType.Community; // Lisans anahtarı (Ücretsiz sürüm)

            // 1. Verileri Çek
            var student = await _studentRepository.GetByIdAsync(studentId);
            var lessons = await _lessonRepository.GetAllByStudentIdAsync(studentId);
            var payments = await _paymentRepository.GetByStudentIdAsync(studentId);
            var settings = await _settingsRepository.GetByUserIdAsync(userId);

            if (student == null) return NotFound("Öğrenci bulunamadı.");

            // 2. Hesaplamalar
            // DÜZELTME 1: Price yerine PriceSnapshot kullanıldı
            var totalLessonPrice = lessons.Sum(x => x.PriceSnapshot);
            var totalPaid = payments.Sum(x => x.Amount);
            var balance = totalLessonPrice - totalPaid;

            // 3. PDF Oluştur (QuestPDF)
            var document = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(2, Unit.Centimetre);
                    page.PageColor(Colors.White);
                    page.DefaultTextStyle(x => x.FontSize(12).FontFamily(Fonts.Arial));

                    // --- BAŞLIK ---
                    page.Header().Row(row =>
                    {
                        row.RelativeItem().Column(col =>
                        {
                            col.Item().Text(settings?.FullName ?? "Özel Ders Öğretmeni").FontSize(20).SemiBold().FontColor(Colors.Blue.Medium);
                            col.Item().Text(settings?.Title ?? "Branş Belirtilmemiş").FontSize(14).FontColor(Colors.Grey.Medium);
                            col.Item().Text(DateTime.Now.ToString("dd MMMM yyyy")).FontSize(10).FontColor(Colors.Grey.Darken1);
                        });

                        row.ConstantItem(60).Height(60).Placeholder("Logo");
                    });

                    // --- İÇERİK ---
                    page.Content().PaddingVertical(1, Unit.Centimetre).Column(col =>
                    {
                        col.Item().Text($"Sayın Veli, aşağıda öğrencimiz {student.FullName} için hazırlanan ders ve ödeme dökümü yer almaktadır.").FontSize(12);
                        col.Item().PaddingVertical(10).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);

                        // Özet Kutuları
                        col.Item().Row(row =>
                        {
                            row.RelativeItem().Column(c => { c.Item().Text("Toplam Ders").Bold(); c.Item().Text(lessons.Count.ToString()); });
                            row.RelativeItem().Column(c => { c.Item().Text("Toplam Tutar").Bold(); c.Item().Text($"{totalLessonPrice:N2} ₺"); });
                            row.RelativeItem().Column(c => { c.Item().Text("Ödenen").Bold(); c.Item().Text($"{totalPaid:N2} ₺").FontColor(Colors.Green.Medium); });
                            row.RelativeItem().Column(c => { c.Item().Text("Kalan Bakiye").Bold(); c.Item().Text($"{balance:N2} ₺").FontColor(balance > 0 ? Colors.Red.Medium : Colors.Black); });
                        });

                        col.Item().PaddingVertical(15).Text("Son Yapılan Dersler").FontSize(14).SemiBold();

                        // Tablo
                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(columns =>
                            {
                                columns.RelativeColumn();
                                columns.RelativeColumn(3);
                                columns.RelativeColumn();
                            });

                            table.Header(header =>
                            {
                                header.Cell().Element(CellStyle).Text("Tarih");
                                header.Cell().Element(CellStyle).Text("Konu");
                                header.Cell().Element(CellStyle).Text("Tutar");

                                static IContainer CellStyle(IContainer container)
                                {
                                    return container.DefaultTextStyle(x => x.SemiBold()).PaddingVertical(5).BorderBottom(1).BorderColor(Colors.Grey.Lighten2);
                                }
                            });

                            foreach (var lesson in lessons.OrderByDescending(x => x.StartTime).Take(10))
                            {
                                table.Cell().Element(CellStyle).Text(lesson.StartTime.ToString("dd.MM.yyyy"));
                                table.Cell().Element(CellStyle).Text(lesson.Topic ?? "Konu Belirtilmedi");
                                // DÜZELTME 2: Price yerine PriceSnapshot kullanıldı
                                table.Cell().Element(CellStyle).Text($"{lesson.PriceSnapshot:N0} ₺");

                                static IContainer CellStyle(IContainer container)
                                {
                                    return container.PaddingVertical(5).BorderBottom(1).BorderColor(Colors.Grey.Lighten3);
                                }
                            }
                        });
                    });

                    // --- ALT BİLGİ ---
                    page.Footer().AlignCenter().Text(x =>
                    {
                        x.Span("Bu rapor ");
                        x.Span("Planör").SemiBold().FontColor(Colors.Blue.Medium);
                        x.Span(" uygulaması ile oluşturulmuştur.");
                    });
                });
            });

            // 4. Dosyayı Döndür
            byte[] pdfBytes = document.GeneratePdf();
            return File(pdfBytes, "application/pdf", $"Extre_{student.FullName}.pdf");
        }
    }
}