using DersTakip.Application.DTOs.Payment;
using DersTakip.Application.Interfaces;
using DersTakip.Domain.Entities;
using Microsoft.AspNetCore.Authorization; // <--- EKLENDİ
using Microsoft.AspNetCore.Mvc;

namespace DersTakip.API.Controllers;

[Authorize] // <--- EKLENDİ
[ApiController]
[Route("api/[controller]")]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentRepository _repository;

    public PaymentsController(IPaymentRepository repository)
    {
        _repository = repository;
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreatePaymentRequest request)
    {
        var payment = new Payment
        {
            StudentId = request.StudentId,
            Amount = request.Amount,
            Method = request.Method,
            Description = request.Description,
            PaymentDate = DateTime.UtcNow
        };

        var createdPayment = await _repository.CreateAsync(payment);
        return Ok(createdPayment);
    }

    [HttpGet("student/{studentId}")]
    public async Task<IActionResult> GetStudentPayments(Guid studentId)
    {
        var payments = await _repository.GetByStudentIdAsync(studentId);
        return Ok(payments);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePayment(Guid id)
    {
        var payment = await _repository.GetByIdAsync(id);
        if (payment == null) return NotFound("Ödeme bulunamadı.");

        await _repository.DeleteAsync(payment);
        return Ok(new { message = "Ödeme silindi." });
    }
}