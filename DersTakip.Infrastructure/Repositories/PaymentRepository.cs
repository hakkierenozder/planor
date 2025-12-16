using DersTakip.Application.Interfaces;
using DersTakip.Domain.Entities;
using DersTakip.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DersTakip.Infrastructure.Repositories;

public class PaymentRepository : IPaymentRepository
{
    private readonly AppDbContext _context;

    public PaymentRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Payment> CreateAsync(Payment payment)
    {
        await _context.Payments.AddAsync(payment);
        await _context.SaveChangesAsync();
        return payment;
    }

    public async Task<List<Payment>> GetByStudentIdAsync(Guid studentId)
    {
        return await _context.Payments
                             .Where(p => p.StudentId == studentId && !p.IsDeleted)
                             .OrderByDescending(p => p.PaymentDate) // En yeni ödeme en üstte
                             .ToListAsync();
    }

    public async Task DeleteAsync(Payment payment)
    {
        _context.Payments.Remove(payment);
        await _context.SaveChangesAsync();
    }

    public async Task<Payment> GetByIdAsync(Guid id)
    {
        return await _context.Payments.FindAsync(id);
    }

    public async Task<List<Payment>> GetAllByUserIdAsync(string userId)
    {
        // Ödemeleri getirirken Öğrenci tablosuna (Include) bağlanıyoruz.
        // Şart: Öğrencinin hocası (UserId) bizim gönderdiğimiz userId olmalı.
        return await _context.Payments
            .Include(p => p.Student)
            .Where(p => p.Student.UserId == userId && !p.IsDeleted)
            .OrderByDescending(p => p.PaymentDate)
            .ToListAsync();
    }
}