using DersTakip.Domain.Entities;

public interface ITeacherSettingsRepository
{
    Task<TeacherSettings> GetByUserIdAsync(string userId);
    Task CreateAsync(TeacherSettings settings);
    Task UpdateAsync(TeacherSettings settings);
}