require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter
  .sendMail({
    from: process.env.SMTP_FROM,
    to: process.env.SMTP_USER,
    subject: 'CoreSY activation email test',
    text: 'Admin resend activation SMTP OK',
    html: '<p><strong>Admin resend activation SMTP OK</strong></p>',
  })
  .then((info) => {
    console.log('SEND_OK', info.messageId);
    process.exit(0);
  })
  .catch((error) => {
    console.error('SEND_FAIL', error.message);
    process.exit(1);
  });
