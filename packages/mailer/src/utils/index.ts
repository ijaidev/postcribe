import nodemailer, { type SendMailOptions } from "nodemailer";
import type { SendEmailOptions } from "../types";
import { logger } from "@repo/logger";

const host = process.env.SMTP_HOST;
const port = process.env.SMTP_PORT
    ? parseInt(process.env.SMTP_PORT)
    : undefined;
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

if (!host || !port || !user || !pass) {
    throw new Error("Missing SMTP configuration. Please check your .env file");
}

const transporter = nodemailer.createTransport({
    host: host,
    port: port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
        user: user,
        pass: pass,
    },
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
transporter.verify((error, success) => {
    if (error) {
        logger.error({ error }, "SMTP connection error");
    } else {
        logger.info("SMTP server is ready to take messages");
    }
});

const sendEmail = async (options: SendEmailOptions) => {
    try {
        const mailOptions: SendMailOptions = {
            from: `"${options.sender.name}" <${options.sender.email}>`,
            to: options.to
                .map(recipient => `"${recipient.name}" <${recipient.email}>`)
                .join(", "),
            subject: options.subject,
            html: options.htmlContent,
        };

        const info = await transporter.sendMail(mailOptions);
        return info;
    } catch (error) {
        logger.error({ error }, "Error sending email");
        throw error;
    }
};

export { transporter, sendEmail };
