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
    defaultEmailConfig,
} from "../components/email-layout.template";

export interface EmailVerificationData {
    userName: string;
    verificationUrl: string;
    expiresIn?: string; // e.g., "24 hours"
}

const getMjmlTemplate = (data: EmailVerificationData) => {  
    return `
<mjml>
  <mj-head>
    <mj-title>Verify your email address</mj-title>
    <mj-preview>Please verify your email address to complete your PostCribe account setup.</mj-preview>
    
    ${getEmailAttributesMjml()}
    ${getEmailStylesMjml()}
  </mj-head>
  
  <mj-body background-color="${defaultEmailConfig.backgroundColor}">
    ${getEmailHeaderMjml()}
    
    <!-- Main Content -->
    <mj-section background-color="oklch(1 0 0)" padding="40px 20px">
      <mj-column>
        ${createGreeting(data.userName)}
        
        ${createMainTitle("Welcome to PostCribe!", "🎉")}
        
        <!-- Welcome Message -->
        <mj-text font-size="16px" color="oklch(0.145 0 0)" padding="0 0 24px 0">
          Thank you for signing up! To complete your account setup and start creating amazing social media content, please verify your email address.
        </mj-text>
        
        ${createPrimaryButton(data.verificationUrl, "Verify Email Address")}
        
        ${createAlternativeLink(data.verificationUrl, "Copy and paste this link into your browser")}
        
        ${createInfoBox(
            "Security Notice",
            `This verification link ${data.expiresIn ? `will expire in ${data.expiresIn}` : 'is valid for a limited time'}. If you didn't create a PostCribe account, you can safely ignore this email.`
        )}
      </mj-column>
    </mj-section>
    
    ${getEmailFooterMjml(defaultEmailConfig, `
    <mj-text align="center" font-size="14px" color="oklch(0.556 0 0)" padding="0 0 16px 0">
      This email was sent to verify your PostCribe account.
    </mj-text>
    `)}
  </mj-body>
</mjml>
`;
};

export const generateEmailVerificationEmail = (
    data: EmailVerificationData,
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
        throw new Error("Failed to generate email verification template");
    }
}; 