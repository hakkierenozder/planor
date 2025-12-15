using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DersTakip.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddHomeworkFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "HasHomework",
                table: "Lessons",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "HomeworkDescription",
                table: "Lessons",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HasHomework",
                table: "Lessons");

            migrationBuilder.DropColumn(
                name: "HomeworkDescription",
                table: "Lessons");
        }
    }
}
