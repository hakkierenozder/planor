namespace DersTakip.Application.DTOs.Student
{
    public class CreateStudentRequest
    {
        public string FullName { get; set; }
        public string PhoneNumber { get; set; }
        public decimal HourlyRate { get; set; }
        public string? GuardianName { get; set; }
        public string? Notes { get; set; }
    }
}
