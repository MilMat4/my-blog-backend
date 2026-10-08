import nodemailer from 'nodemailer'

export function createMailtrapTransport() {
  const host = process.env.MAILTRAP_HOST
  const user = process.env.MAILTRAP_USER
  const pass = process.env.MAILTRAP_PASS

  if (!host || !user || !pass) {
    throw new Error('MAILTRAP_HOST, MAILTRAP_USER, and MAILTRAP_PASS must be set to use Mailtrap SMTP.')
  }

  const port = Number(process.env.MAILTRAP_PORT || 2525)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('MAILTRAP_PORT must be a valid TCP port.')
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
}

export async function sendSignupOtp({ email, name, code }) {
  const transport = createMailtrapTransport()
  try {
    await transport.sendMail({
      from: process.env.MAILTRAP_FROM || 'My Blog <no-reply@example.com>',
      to: email,
      subject: 'Your My Blog sign-up code',
      text: `Hi ${name},\n\nYour sign-up verification code is ${code}. It expires in 10 minutes. If you did not request this code, you can ignore this email.`,
    })
  } finally {
    transport.close()
  }
}
