import mjml2html from "mjml";
import {
    getEmailHeaderMjml,
    getEmailFooterMjml,
    getEmailStylesMjml,
    getEmailAttributesMjml,
    createPrimaryButton,
    createGreeting,
    createMainTitle,
    defaultEmailConfig,
} from "../components/email-layout.template";
import { logger } from "@repo/logger";

export interface NoCreditsEmailData {
    userName: string;
    message: string;
    accountUrl: string;
}

const getMjmlTemplate = (data: NoCreditsEmailData) => `
<mjml>
  <mj-head>
    <mj-title>No More Credits</mj-title>
    <mj-preview>${data.message}</mj-preview>
    ${getEmailAttributesMjml()}
    ${getEmailStylesMjml()}
  </mj-head>
  <mj-body background-color="${defaultEmailConfig.backgroundColor}">
    ${getEmailHeaderMjml()}
    <mj-section background-color="#ffffff" padding="40px 20px">
      <mj-column>
        ${createGreeting(data.userName)}
        ${createMainTitle("You’ve run out of credits", "⚡")}
        <mj-text font-size="16px" color="#111827" padding="0 0 24px 0">
          ${data.message}
        </mj-text>
        ${createPrimaryButton(data.accountUrl, "View Account")}
      </mj-column>
    </mj-section>
    ${getEmailFooterMjml(
        defaultEmailConfig,
        `
      <mj-text align="center" font-size="14px" color="#6b7280" padding="0 0 16px 0">
        This email was sent by your PostCribe account system.
      </mj-text>
      `,
    )}
  </mj-body>
</mjml>
`;

export const generateNoCreditsEmail = (data: NoCreditsEmailData): string => {
    const mjmlTemplate = getMjmlTemplate(data);

    try {
        const result = mjml2html(mjmlTemplate, {
            validationLevel: "soft",
            beautify: true,
        });

        if (result.errors.length > 0) {
            logger.warn({ errors: result.errors }, "MJML compilation warnings");
        }

        return result.html;
    } catch (error) {
        logger.error({ error }, "Error generating MJML email");
        throw new Error("Failed to generate no credits template");
    }
};
