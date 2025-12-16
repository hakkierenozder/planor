namespace DersTakip.Application.DTOs.Dashboard
{
    public class MonthlyEarningsDto
    {
        public List<string> Labels { get; set; } // Örn: ["Oca", "Şub", "Mar", "Nis"]
        public List<decimal> Data { get; set; }  // Örn: [1200, 1500, 1100, 2400]
        public string Currency { get; set; } = "TL";
    }
}
