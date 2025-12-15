using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DersTakip.Domain.Enums;

public enum LessonStatus
{
    Scheduled = 1,
    Completed = 2,
    Cancelled = 3
}

public enum PaymentMethod
{
    Cash = 1,
    BankTransfer = 2
}
