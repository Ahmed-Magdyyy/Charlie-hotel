import nodemailer from "nodemailer";

// Create the transporter ONCE (reuse across all emails)
let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      name: process.env.EMAIL_HOST,
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
      pool: true, // reuse connections
      maxConnections: 5, // concurrent connections
      maxMessages: 100, // messages per connection before recycling
    });
  }
  return transporter;
}

const sendEmail = async (options) => {
  const emailOptions = {
    from: `Charlie Hotel <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    html: options.message,
  };

  await getTransporter().sendMail(emailOptions);
};

/**
 * Fire-and-forget version — does NOT block the caller.
 * Logs errors instead of throwing.
 */
export const sendEmailBackground = (options) => {
  sendEmail(options).catch((err) => {
    console.error(
      `[EMAIL_ERROR] Failed to send to ${options.email}:`,
      err.message,
    );
  });
};

export default sendEmail;
