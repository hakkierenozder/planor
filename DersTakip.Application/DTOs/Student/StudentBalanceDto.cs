namespace DersTakip.Application.DTOs.Student;

public class StudentBalanceDto
{
    public Guid StudentId { get; set; }
    public string FullName { get; set; }

    public decimal TotalDebt { get; set; }      // Toplam Borç (Verilen Hizmet)
    public decimal TotalPayment { get; set; }   // Toplam Tahsilat
    public decimal CurrentBalance { get; set; } // Güncel Durum (+ ise borçlu, - ise alacaklı)
    public string StatusMessage { get; set; }   // "Borçlu", "Ödeşildi", "Alacaklı"
}