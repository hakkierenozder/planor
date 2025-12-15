using DersTakip.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace DersTakip.Infrastructure.Persistence;

public class AppDbContext : IdentityDbContext<IdentityUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    // Domain'de yazdığımız tabloları buraya tanıtıyoruz
    public DbSet<Student> Students { get; set; }
    public DbSet<Lesson> Lessons { get; set; }
    public DbSet<Payment> Payments { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Burada veritabanı kurallarını (Configuration) belirtebiliriz.
        // Şimdilik sadece Decimal alanlar için hassasiyet ayarı yapalım (Para birimi için önemli)

        modelBuilder.Entity<Student>()
            .Property(s => s.HourlyRate)
            .HasColumnType("decimal(18,2)"); // 18 basamak, virgülden sonra 2 hane

        modelBuilder.Entity<Payment>()
            .Property(p => p.Amount)
            .HasColumnType("decimal(18,2)");

        modelBuilder.Entity<Lesson>()
            .Property(l => l.PriceSnapshot)
            .HasColumnType("decimal(18,2)");

        base.OnModelCreating(modelBuilder);
    }
}