export interface EmailRecipient {
    name: string;
    email: string;
}

export interface EmailSender {
    name: string;
    email: string;
}

export interface SendEmailOptions {
    to: EmailRecipient[];
    subject: string;
    htmlContent: string;
    sender: EmailSender;
}
