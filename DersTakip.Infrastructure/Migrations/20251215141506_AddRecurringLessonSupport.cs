using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DersTakip.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRecurringLessonSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "RecurringGroupId",
                table: "Lessons",
                type: "uuid",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RecurringGroupId",
                table: "Lessons");
        }
    }
}
