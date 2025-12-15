using DersTakip.Domain.Common;
using DersTakip.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DersTakip.Domain.Entities
{
    public class Payment : BaseEntity
    {
        public Guid StudentId { get; set; }
        public decimal Amount { get; set; }
        public DateTime PaymentDate { get; set; }
        public PaymentMethod Method { get; set; } // Cash, BankTransfer
        public string? Description { get; set; }

        // Navigation Property
        public Student Student { get; set; } = null!;
    }
}
