using DersTakip.Domain.Common;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DersTakip.Domain.Entities
{
    public class Student : BaseEntity
    {
        public string UserId { get; set; } = string.Empty; // Hangi kullanıcıya ait olduğunu tutar

        public string FullName { get; set; } = string.Empty;
        public string? GuardianName { get; set; } // Veli Adı
        public string PhoneNumber { get; set; } = string.Empty;
        public string? Notes { get; set; }

        // Anlaşılan saatlik ücret (Değişebilir, değişince eski dersleri etkilemez)
        public decimal HourlyRate { get; set; }
        public string? ColorCode { get; set; } // Örn: #FF5733
        public bool IsActive { get; set; } = true;

        // Navigation Properties
        public ICollection<Lesson> Lessons { get; set; } = new List<Lesson>();
        public ICollection<Payment> Payments { get; set; } = new List<Payment>();
    }
}
