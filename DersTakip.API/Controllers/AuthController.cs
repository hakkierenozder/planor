using DersTakip.Application.Interfaces;
using DersTakip.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace DersTakip.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<IdentityUser> _userManager;
        private readonly IConfiguration _configuration;
        private readonly ITeacherSettingsRepository _settingsRepository; // <--- YENİ EKLENDİ

        // Constructor'a settingsRepository eklendi
        public AuthController(UserManager<IdentityUser> userManager, IConfiguration configuration, ITeacherSettingsRepository settingsRepository)
        {
            _userManager = userManager;
            _configuration = configuration;
            _settingsRepository = settingsRepository;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            var user = new IdentityUser { UserName = request.Email, Email = request.Email };
            var result = await _userManager.CreateAsync(user, request.Password);

            if (result.Succeeded)
            {
                // --- KRİTİK GÜNCELLEME BURASI ---
                // Kullanıcı oluştuğu an Ayarlarını da oluşturuyoruz.
                var settings = new TeacherSettings
                {
                    UserId = user.Id,
                    FullName = request.FullName, // Formdan gelen isim
                    Title = "Öğretmen",          // Varsayılan Unvan
                    DefaultHourlyRate = 0,
                    DefaultLessonDuration = 60
                };

                await _settingsRepository.CreateAsync(settings);
                // ---------------------------------

                return Ok(new { message = "User registered successfully" });
            }

            return BadRequest(result.Errors);
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var user = await _userManager.FindByEmailAsync(request.Email);
            if (user != null && await _userManager.CheckPasswordAsync(user, request.Password))
            {
                var authClaims = new List<Claim>
                {
                    new Claim(ClaimTypes.Name, user.UserName!),
                    new Claim(ClaimTypes.NameIdentifier, user.Id), // UserId Claim'i
                    new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                };

                var authSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));

                var token = new JwtSecurityToken(
                    issuer: _configuration["Jwt:Issuer"],
                    audience: _configuration["Jwt:Audience"],
                    expires: DateTime.Now.AddDays(30), // Token ömrü 30 gün
                    claims: authClaims,
                    signingCredentials: new SigningCredentials(authSigningKey, SecurityAlgorithms.HmacSha256)
                );

                return Ok(new
                {
                    token = new JwtSecurityTokenHandler().WriteToken(token),
                    expiration = token.ValidTo
                });
            }
            return Unauthorized();
        }
    }

    // --- DTO CLASSES ---
    public class RegisterRequest
    {
        public string Email { get; set; }
        public string Password { get; set; }
        public string FullName { get; set; } // <--- YENİ ALAN
    }

    public class LoginRequest
    {
        public string Email { get; set; }
        public string Password { get; set; }
    }
}