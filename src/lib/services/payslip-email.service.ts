import nodemailer from 'nodemailer'

export interface SendPayslipEmailParams {
  to: string
  employeeName: string
  employeeId?: string
  designation?: string
  monthLabel: string
  payPeriod: string
  netPay: number
  pdfBuffer: Buffer
  customMessage?: string
}

export interface SendPayslipEmailResult {
  success: boolean
  messageId?: string
  sentTo: string
  error?: string
}

export function getEmailConfig() {
  const user = process.env.GMAIL_USER || process.env.SMTP_USER || ''
  const pass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || ''
  const fromName = process.env.GMAIL_FROM_NAME || 'EdLink Education & Visa Services'

  return {
    user,
    pass,
    fromName,
    isConfigured: Boolean(user && pass),
  }
}

export async function sendPayslipEmail(params: SendPayslipEmailParams): Promise<SendPayslipEmailResult> {
  const config = getEmailConfig()

  if (!config.isConfigured) {
    throw new Error(
      'Gmail credentials not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in your .env.local file.'
    )
  }

  const {
    to,
    employeeName,
    employeeId,
    designation,
    monthLabel,
    payPeriod,
    netPay,
    pdfBuffer,
    customMessage,
  } = params

  if (!to || !to.includes('@')) {
    throw new Error(`Invalid recipient email address: "${to}"`)
  }

  // Create Nodemailer Transporter for Gmail SMTP
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // SSL
    auth: {
      user: config.user,
      pass: config.pass,
    },
  })

  const safeEmpName = (employeeName || 'Employee').trim().replace(/[/\\?%*:|"<>]/g, '').replace(/\s+/g, '_')
  const cleanMonth = monthLabel.replace(/[/\\?%*:|"<>]/g, '').replace(/\s+/g, '_')
  const attachmentFilename = `Payslip_${safeEmpName}_${cleanMonth}.pdf`

  const subject = `Employee Payslip - ${monthLabel} | ${employeeName}`

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payslip - ${monthLabel}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
      color: #1e293b;
    }
    .email-container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #003D5C 0%, #007A78 100%);
      padding: 28px 24px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .header p {
      margin: 6px 0 0 0;
      font-size: 13px;
      opacity: 0.9;
    }
    .content {
      padding: 28px 24px;
    }
    .greeting {
      font-size: 16px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 16px;
    }
    .message-box {
      background-color: #f1f5f9;
      border-left: 4px solid #009D9E;
      padding: 14px 16px;
      border-radius: 4px;
      font-size: 14px;
      line-height: 1.6;
      color: #334155;
      margin-bottom: 20px;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 13.5px;
    }
    .details-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #f1f5f9;
    }
    .details-table td.label {
      color: #64748b;
      font-weight: 600;
      width: 40%;
    }
    .details-table td.value {
      color: #0f172a;
      font-weight: 600;
      text-align: right;
    }
    .salary-highlight {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
      margin: 24px 0;
    }
    .salary-highlight .title {
      font-size: 12px;
      font-weight: 700;
      color: #047857;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .salary-highlight .amount {
      font-size: 26px;
      font-weight: 800;
      color: #065f46;
      margin-top: 4px;
      font-family: 'SF Mono', Consolas, monospace;
    }
    .footer {
      background-color: #f8fafc;
      padding: 20px 24px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    }
    .footer p {
      margin: 4px 0;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      background: #e2e8f0;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      color: #334155;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>EdLink Education &amp; Visa Services</h1>
      <p>Official Monthly Employee Payslip</p>
    </div>

    <div class="content">
      <div class="greeting">Dear ${employeeName},</div>

      <div class="message-box">
        ${
          customMessage
            ? customMessage.replace(/\n/g, '<br/>')
            : `Please find attached your official salary payslip for the month of <strong>${monthLabel}</strong>.`
        }
      </div>

      <div class="salary-highlight">
        <div class="title">Net Payable Salary</div>
        <div class="amount">PKR ${Math.round(netPay).toLocaleString('en-US')}</div>
      </div>

      <table class="details-table">
        <tr>
          <td class="label">Employee Name</td>
          <td class="value">${employeeName}</td>
        </tr>
        ${
          employeeId
            ? `<tr>
          <td class="label">Employee ID</td>
          <td class="value"><span class="badge">${employeeId}</span></td>
        </tr>`
            : ''
        }
        ${
          designation
            ? `<tr>
          <td class="label">Designation</td>
          <td class="value">${designation}</td>
        </tr>`
            : ''
        }
        <tr>
          <td class="label">Pay Period</td>
          <td class="value">${payPeriod}</td>
        </tr>
        <tr>
          <td class="label">Salary Month</td>
          <td class="value">${monthLabel}</td>
        </tr>
      </table>

      <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-top: 20px;">
        📎 Your complete detailed PDF payslip (including Attendance, Earnings, and Deductions summary) is attached to this email.
      </p>
    </div>

    <div class="footer">
      <p><strong>EdLink Education &amp; Visa Services</strong></p>
      <p>38A 1st Floor DHA Phase 3 XX Block, Lahore, Pakistan, 54000</p>
      <p>Phone: 0311 1100696 | Email: connect@edlinkservices.info</p>
      <p style="margin-top: 10px; font-size: 11px; color: #94a3b8;">
        This is an automated system generated email. If you have any questions regarding your salary, please contact the accounts/HR department.
      </p>
    </div>
  </div>
</body>
</html>
  `

  const mailOptions = {
    from: `"${config.fromName}" <${config.user}>`,
    to,
    subject,
    html: htmlContent,
    attachments: [
      {
        filename: attachmentFilename,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  }

  const info = await transporter.sendMail(mailOptions)

  return {
    success: true,
    messageId: info.messageId,
    sentTo: to,
  }
}
