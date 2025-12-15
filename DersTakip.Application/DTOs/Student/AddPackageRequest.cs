namespace DersTakip.Application.DTOs.Student;

public class AddPackageRequest
{
    public Guid StudentId { get; set; }
    public int CreditAmount { get; set; } // Kaç ders? (Örn: 10)
    public decimal TotalPrice { get; set; } // Ne kadar ödendi? (Örn: 5000)
    public string? PackageName { get; set; } // Açıklama (Örn: "Yaz Kampı Paketi")
}