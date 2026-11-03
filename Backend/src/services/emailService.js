import nodemailer from 'nodemailer';

const createTransporter = async () => {
  if (process.env.NODE_ENV === 'development' && !process.env.EMAIL_USER) {
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Generic email sender
 * @param {Object} options - { to, subject, html }
 */
export const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = await createTransporter();
    const info = await transporter.sendMail({
      from: `"Tutoring Platform" <${process.env.EMAIL_USER || 'no-reply@tutoring.com'}>`,
      to,
      subject,
      html,
    });
    console.log(`✅ Email sent to ${to} – Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    return info;
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    throw error;
  }
};

// Keep original reminder function (can be removed later if not used elsewhere)
export const sendSessionReminder = async (to, name, session, role) => {
  const subject = `⏰ Session Reminder: ${session.subject} with ${role === 'student' ? session.tutorName : session.studentName}`;
  const dateStr = new Date(session.date).toDateString();
  const timeStr = `${session.startTime} – ${session.endTime}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2>Hello ${name},</h2>
      <p>This is a reminder for your upcoming tutoring session:</p>
      <ul>
        <li><strong>Subject:</strong> ${session.subject}</li>
        <li><strong>Grade Level:</strong> ${session.gradeLevel}</li>
        <li><strong>Date:</strong> ${dateStr}</li>
        <li><strong>Time:</strong> ${timeStr}</li>
        <li><strong>Location:</strong> ${session.location.type === 'online' ? 'Online' : session.location.address || 'In-person'}</li>
        ${session.notes ? `<li><strong>Notes:</strong> ${session.notes}</li>` : ''}
      </ul>
      <p>Please be on time and prepared. Thank you for using our platform!</p>
    </div>
  `;
  return sendEmail({ to, subject, html });
};