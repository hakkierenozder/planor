using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DersTakip.Application.DTOs.Lesson
{
    public class CreateLessonRequest
    {
        public Guid StudentId { get; set; }
        public DateTime StartTime { get; set; }
        public int DurationMinutes { get; set; } // 60, 45, 90...
        public string? Topic { get; set; } // "Logaritma Giriş"
        public string? InternalNotes { get; set; } // "Çok yorgundu"
    }
}
