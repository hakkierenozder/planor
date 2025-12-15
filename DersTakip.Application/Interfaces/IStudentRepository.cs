using DersTakip.Application.DTOs.Student;
using DersTakip.Domain.Entities;

namespace DersTakip.Application.Interfaces
{
    public interface IStudentRepository
    {
        Task<Student> CreateAsync(Student student);
        Task<List<Student>> GetAllAsync();
        Task<Student?> GetByIdAsync(Guid id);
        Task<StudentBalanceDto?> GetStudentBalanceAsync(Guid studentId);
        Task UpdateAsync(Student student);
        Task<List<Student>> GetAllByUserIdAsync(string userId);
    }
}
