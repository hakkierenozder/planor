using DersTakip.Domain.Entities;

namespace DersTakip.Application.Interfaces;

public interface IPaymentRepository
{
    Task<Payment> CreateAsync(Payment payment);

    // Öğrencinin ödeme geçmişi (Kim ne zaman ne kadar ödemiş?)
    Task<List<Payment>> GetByStudentIdAsync(Guid studentId);

    Task DeleteAsync(Payment payment);
    Task<Payment> GetByIdAsync(Guid id); // Eğer yoksa bunu da ekle
    // Hocanın tüm öğrencilerinden aldığı ödemeleri getirir
    Task<List<Payment>> GetAllByUserIdAsync(string userId);
}