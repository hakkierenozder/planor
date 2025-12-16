namespace DersTakip.Application.DTOs.Settings
{
    public class TeacherSettingsDto
    {
        public string FullName { get; set; }
        public string Title { get; set; }
        public decimal DefaultHourlyRate { get; set; }
        public int DefaultLessonDuration { get; set; }
    }
}