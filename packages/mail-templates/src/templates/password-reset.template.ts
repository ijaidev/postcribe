import mjml2html from "mjml";
import {
    getEmailHeaderMjml,
    getEmailFooterMjml,
    getEmailStylesMjml,
    getEmailAttributesMjml,
    createPrimaryButton,
    createAlternativeLink,
    createGreeting,
    createMainTitle,
    createInfoBox,
    defaultEmailConfig
} from "../components/email-layout.template";

export interface PasswordResetData {
    userName: string;
    resetUrl: string;
    expiresIn?: string; // e.g., "1 hour"
}

const getMjmlTemplate = (data: PasswordResetData) => {
    return `
<mjml>
  <mj-head>
    <mj-title>Reset your PostCribe password</mj-title>
    <mj-preview>Reset your password to regain access to your PostCribe account.</mj-preview>
    
    ${getEmailAttributesMjml()}
    ${getEmailStylesMjml()}
  </mj-head>
  
  <mj-body background-color="${defaultEmailConfig.backgroundColor}">
    ${getEmailHeaderMjml()}
    
    <!-- Main Content -->
    <mj-section background-color="#ffffff" padding="40px 20px">
      <mj-column>
        ${createGreeting(data.userName)}
        
        ${createMainTitle("Reset your password", "🔐")}
        
        <!-- Reset Message -->
        <mj-text font-size="16px" color="#111827" padding="0 0 24px 0">
          You requested to reset your password for your PostCribe account. Click the button below to create a new password.
        </mj-text>
        
        ${createPrimaryButton(data.resetUrl, "Reset Password")}
        
        ${createAlternativeLink(data.resetUrl, "Copy and paste this link into your browser")}
        
        ${createInfoBox(
            "Security Notice",
            `This password reset link ${data.expiresIn ? `will expire in ${data.expiresIn}` : 'is valid for a limited time'}. If you didn't request this password reset, you can safely ignore this email.`
        )}
        
        <!-- Additional Security Info -->
        <mj-text font-size="14px" color="#6b7280" padding="24px 0 0 0">
          For security reasons, this link can only be used once. If you need to reset your password again, please request a new reset link.
        </mj-text>
      </mj-column>
    </mj-section>
    
    ${getEmailFooterMjml(defaultEmailConfig, `
    <mj-text align="center" font-size="14px" color="#6b7280" padding="0 0 16px 0">
      This email was sent from your PostCribe account security system.
    </mj-text>
    `)}
  </mj-body>
</mjml>
`;
};

export const generatePasswordResetEmail = (
    data: PasswordResetData,
): string => {
    const mjmlTemplate = getMjmlTemplate(data);

    try {
        const result = mjml2html(mjmlTemplate, {
            validationLevel: "soft",
            beautify: true,
        });

        if (result.errors.length > 0) {
            console.warn("MJML compilation warnings:", result.errors);
        }

        return result.html;
    } catch (error) {
        console.error("Error generating MJML email:", error);
        throw new Error("Failed to generate password reset template");
    }
}; 