using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DersTakip.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCreditSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Credits",
                table: "Students",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "IsPaidByCredit",
                table: "Lessons",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Credits",
                table: "Students");

            migrationBuilder.DropColumn(
                name: "IsPaidByCredit",
                table: "Lessons");
        }
    }
}
