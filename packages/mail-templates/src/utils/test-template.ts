import {
    generatePostApprovalEmail,
    type PostApprovalEmailData,
} from "../templates/post-approval.template";
import {
    generateEmailVerificationEmail,
    type EmailVerificationData,
} from "../templates/email-verification.template";
import {
    generatePasswordResetEmail,
    type PasswordResetData,
} from "../templates/password-reset.template";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { logger } from "@repo/logger";

export const previewPostApproval = () => {
    const sampleData: PostApprovalEmailData = {
        userName: "Jane Smith",
        postTitle: "5 Tips for Better Social Media Engagement",
        reviewUrl: "https://app.postcribe.com/post/draft/sample-post-id",
        previewText:
            "Discover proven strategies to boost your social media engagement rates and connect with your audience on a deeper level...",
    };

    const htmlContent = generatePostApprovalEmail(sampleData);

    // Create dist/samples directory if it doesn't exist
    const samplesDir = join(process.cwd(), "dist", "samples");
    mkdirSync(samplesDir, { recursive: true });

    // Write the HTML file
    const filePath = join(samplesDir, "post-approval-sample.html");
    writeFileSync(filePath, htmlContent);

    logger.info("Post approval preview generated!");
    logger.info(`Open ${filePath} in your browser to preview the email.`);

    return htmlContent;
};

export const previewEmailVerification = () => {
    const sampleData: EmailVerificationData = {
        userName: "John Doe",
        verificationUrl:
            "https://app.postcribe.com/verify-email?token=sample-verification-token",
        expiresIn: "24 hours",
    };

    const htmlContent = generateEmailVerificationEmail(sampleData);

    // Create dist/samples directory if it doesn't exist
    const samplesDir = join(process.cwd(), "dist", "samples");
    mkdirSync(samplesDir, { recursive: true });

    // Write the HTML file
    const filePath = join(samplesDir, "email-verification-sample.html");
    writeFileSync(filePath, htmlContent);

    logger.info("Email verification preview generated!");
    logger.info(`Open ${filePath} in your browser to preview the email.`);

    return htmlContent;
};

export const previewPasswordReset = () => {
    const sampleData: PasswordResetData = {
        userName: "Alice Johnson",
        resetUrl:
            "https://app.postcribe.com/reset-password?token=sample-reset-token",
        expiresIn: "1 hour",
    };

    const htmlContent = generatePasswordResetEmail(sampleData);

    // Create dist/samples directory if it doesn't exist
    const samplesDir = join(process.cwd(), "dist", "samples");
    mkdirSync(samplesDir, { recursive: true });

    // Write the HTML file
    const filePath = join(samplesDir, "password-reset-sample.html");
    writeFileSync(filePath, htmlContent);

    logger.info("Password reset preview generated!");
    logger.info(`Open ${filePath} in your browser to preview the email.`);

    return htmlContent;
};

export const previewAllTemplates = () => {
    logger.info("Generating all email template previews...\n");

    previewPostApproval();
    previewEmailVerification();
    previewPasswordReset();

    logger.info("\n✅ All email template previews generated successfully!");
    logger.info(
        "Check the dist/samples/ directory to view them in your browser.",
    );
};

// Run if this file is executed directly
if (import.meta.main) {
    previewAllTemplates();
}
