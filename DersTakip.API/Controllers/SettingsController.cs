using DersTakip.Application.DTOs.Settings;
using DersTakip.Application.Interfaces;
using DersTakip.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace DersTakip.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class SettingsController : ControllerBase
    {
        private readonly ITeacherSettingsRepository _repository;

        public SettingsController(ITeacherSettingsRepository repository)
        {
            _repository = repository;
        }

        [HttpGet]
        public async Task<IActionResult> GetSettings()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var settings = await _repository.GetByUserIdAsync(userId);

            if (settings == null)
            {
                // Henüz ayar yoksa varsayılan boş bir model dön
                return Ok(new TeacherSettingsDto
                {
                    FullName = "",
                    Title = "",
                    DefaultHourlyRate = 0,
                    DefaultLessonDuration = 60
                });
            }

            return Ok(new TeacherSettingsDto
            {
                FullName = settings.FullName,
                Title = settings.Title,
                DefaultHourlyRate = settings.DefaultHourlyRate,
                DefaultLessonDuration = settings.DefaultLessonDuration
            });
        }

        [HttpPost]
        public async Task<IActionResult> SaveSettings([FromBody] TeacherSettingsDto request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var settings = await _repository.GetByUserIdAsync(userId);

            if (settings == null)
            {
                settings = new TeacherSettings
                {
                    UserId = userId,
                    FullName = request.FullName,
                    Title = request.Title,
                    DefaultHourlyRate = request.DefaultHourlyRate,
                    DefaultLessonDuration = request.DefaultLessonDuration
                };
                await _repository.CreateAsync(settings);
            }
            else
            {
                settings.FullName = request.FullName;
                settings.Title = request.Title;
                settings.DefaultHourlyRate = request.DefaultHourlyRate;
                settings.DefaultLessonDuration = request.DefaultLessonDuration;
                await _repository.UpdateAsync(settings);
            }

            return Ok(new { message = "Ayarlar kaydedildi." });
        }
    }
}