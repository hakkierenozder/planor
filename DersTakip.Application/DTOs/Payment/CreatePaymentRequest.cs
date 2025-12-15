using DersTakip.Domain.Enums;

namespace DersTakip.Application.DTOs.Payment;

public class CreatePaymentRequest
{
    public Guid StudentId { get; set; }
    public decimal Amount { get; set; } // Örn: 1000 TL
    public PaymentMethod Method { get; set; } // 1: Nakit, 2: Havale
    public string? Description { get; set; } // "Kasım ayı ödemesi"
}