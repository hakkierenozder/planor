using System.Text.Json.Serialization;

namespace DersTakip.Application.DTOs.Dashboard
{
    public class DashboardSummaryDto
    {
        [JsonPropertyName("monthlyRevenue")]
        public decimal MonthlyRevenue { get; set; }

        [JsonPropertyName("totalStudentCount")]
        public int TotalStudentCount { get; set; }

        [JsonPropertyName("lowCreditCount")]
        public int LowCreditCount { get; set; }

        [JsonPropertyName("todayLessonCount")]
        public int TodayLessonCount { get; set; }

        [JsonPropertyName("nextLessonInfo")]
        public string? NextLessonInfo { get; set; }

        [JsonPropertyName("nextLessonTime")]
        public string? NextLessonTime { get; set; }
    }
}