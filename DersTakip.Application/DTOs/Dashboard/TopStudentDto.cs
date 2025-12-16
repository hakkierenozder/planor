namespace DersTakip.Application.DTOs.Dashboard
{
    public class TopStudentDto
    {
        public string StudentName { get; set; }
        public string StudentImageUrl { get; set; }
        public int LessonCount { get; set; }
        public string MotivationMessage { get; set; } // Örn: "Bu ayın yıldızı!"
    }
}
