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
    createHighlightBox,
    createFeaturesSection,
    defaultEmailConfig,
    type FeatureItem
} from "../components/email-layout.template";

export interface PostApprovalEmailData {
    userName: string;
    postTitle: string;
    reviewUrl: string;
    previewText?: string;
}

const getMjmlTemplate = (data: PostApprovalEmailData) => {
    const features: FeatureItem[] = [
        {
            emoji: "✏️",
            title: "Edit Content",
            description: "Modify the AI-generated text to match your voice"
        },
        {
            emoji: "🖼️",
            title: "Add Media",
            description: "Upload images or generate new visuals"
        },
        {
            emoji: "📅",
            title: "Schedule",
            description: "Set the perfect time to publish"
        }
    ];

    const previewContent = data.previewText ? `
    <mj-text font-size="14px" color="#6b7280" font-weight="600" text-transform="uppercase" letter-spacing="0.5px" padding="0 0 8px 0">
      Preview
    </mj-text>
    <mj-text font-size="16px" color="#111827" padding="0">
      ${data.previewText}
    </mj-text>
    ` : '';

    return `
<mjml>
  <mj-head>
    <mj-title>Post Ready for Review: ${data.postTitle}</mj-title>
    <mj-preview>Your scheduled post "${data.postTitle}" is ready for review and approval.</mj-preview>
    
    ${getEmailAttributesMjml()}
    ${getEmailStylesMjml()}
  </mj-head>
  
  <mj-body background-color="${defaultEmailConfig.backgroundColor}">
    ${getEmailHeaderMjml()}
    
    <!-- Main Content -->
    <mj-section background-color="#ffffff" padding="40px 20px">
      <mj-column>
        ${createGreeting(data.userName)}
        
        ${createMainTitle("Your scheduled post is ready for review!", "🎉")}
        
        ${createHighlightBox("Post Title", data.postTitle, previewContent)}
        
        <!-- Description -->
        <mj-text font-size="16px" color="#111827" padding="24px 0">
          Your AI-generated post content has been created based on your requirements. Please review the content, make any necessary edits, and publish when you're ready.
        </mj-text>
        
        ${createPrimaryButton(data.reviewUrl, "Review & Edit Post")}
        
        ${createAlternativeLink(data.reviewUrl, "Copy and paste this link into your browser")}
      </mj-column>
    </mj-section>
    
    ${createFeaturesSection("What you can do in the editor:", features)}
    
    ${getEmailFooterMjml(defaultEmailConfig, `
    <mj-text align="center" font-size="14px" color="#6b7280" padding="0 0 16px 0">
      This email was sent by your PostCribe scheduling system.
    </mj-text>
    `)}
  </mj-body>
</mjml>
`;
};

export const generatePostApprovalEmail = (
    data: PostApprovalEmailData,
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
        throw new Error("Failed to generate email template");
    }
};
