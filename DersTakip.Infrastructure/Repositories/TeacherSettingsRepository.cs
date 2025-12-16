using DersTakip.Application.Interfaces;
using DersTakip.Domain.Entities;
using DersTakip.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DersTakip.Infrastructure.Repositories
{
    public class TeacherSettingsRepository : ITeacherSettingsRepository
    {
        private readonly AppDbContext _context;

        public TeacherSettingsRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<TeacherSettings> GetByUserIdAsync(string userId)
        {
            return await _context.TeacherSettings.FirstOrDefaultAsync(x => x.UserId == userId);
        }

        public async Task CreateAsync(TeacherSettings settings)
        {
            await _context.TeacherSettings.AddAsync(settings);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(TeacherSettings settings)
        {
            _context.TeacherSettings.Update(settings);
            await _context.SaveChangesAsync();
        }
    }
}