import mjml2html from "mjml";

export interface PostApprovalEmailData {
    userName: string;
    postTitle: string;
    reviewUrl: string;
    previewText?: string;
}

const getMjmlTemplate = (data: PostApprovalEmailData) => `
<mjml>
  <mj-head>
    <mj-title>Post Ready for Review: ${data.postTitle}</mj-title>
    <mj-preview>Your scheduled post "${data.postTitle}" is ready for review and approval.</mj-preview>
    
    <mj-attributes>
      <mj-all font-family="'Helvetica Neue', Helvetica, Arial, sans-serif" />
      <mj-text font-size="16px" line-height="1.5" color="#333333" />
      <mj-section padding="0" />
    </mj-attributes>
    
    <mj-style>
      .header-logo {
        font-weight: 700;
        font-size: 28px;
        color: #2563eb;
        text-decoration: none;
      }
      
      .main-title {
        font-size: 24px;
        font-weight: 600;
        color: #1f2937;
        margin: 0;
        line-height: 1.3;
      }
      
      .review-button {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        border-radius: 8px;
        box-shadow: 0 4px 14px 0 rgba(37, 99, 235, 0.2);
      }
      
      .review-button:hover {
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        box-shadow: 0 6px 20px 0 rgba(37, 99, 235, 0.3);
      }
      
      .footer-link {
        color: #6b7280;
        text-decoration: none;
      }
      
      .highlight-box {
        background-color: #f8fafc;
        border-left: 4px solid #3b82f6;
        border-radius: 6px;
      }
    </mj-style>
  </mj-head>
  
  <mj-body background-color="#f9fafb">
    <!-- Header -->
    <mj-section background-color="#ffffff" padding="20px 0">
      <mj-column>
        <mj-text align="center" padding="0">
          <a href="#" class="header-logo">PostCribe</a>
        </mj-text>
      </mj-column>
    </mj-section>
    
    <!-- Main Content -->
    <mj-section background-color="#ffffff" padding="40px 20px">
      <mj-column>
        <!-- Greeting -->
        <mj-text font-size="18px" color="#374151" padding="0 0 20px 0">
          Hi ${data.userName},
        </mj-text>
        
        <!-- Main Title -->
        <mj-text padding="0 0 24px 0">
          <h1 class="main-title">Your scheduled post is ready for review! 🎉</h1>
        </mj-text>
        
        <!-- Post Info Box -->
        <mj-section css-class="highlight-box" padding="20px" background-color="#f8fafc">
          <mj-column>
            <mj-text font-size="14px" color="#6b7280" font-weight="600" text-transform="uppercase" letter-spacing="0.5px" padding="0 0 8px 0">
              Post Title
            </mj-text>
            <mj-text font-size="18px" color="#1f2937" font-weight="600" padding="0 0 16px 0">
              ${data.postTitle}
            </mj-text>
            
            ${
                data.previewText
                    ? `
            <mj-text font-size="14px" color="#6b7280" font-weight="600" text-transform="uppercase" letter-spacing="0.5px" padding="0 0 8px 0">
              Preview
            </mj-text>
            <mj-text font-size="16px" color="#4b5563" padding="0">
              ${data.previewText}
            </mj-text>
            `
                    : ""
            }
          </mj-column>
        </mj-section>
        
        <!-- Description -->
        <mj-text font-size="16px" color="#4b5563" padding="24px 0">
          Your AI-generated post content has been created based on your requirements. Please review the content, make any necessary edits, and publish when you're ready.
        </mj-text>
        
        <!-- CTA Button -->
        <mj-button 
          href="${data.reviewUrl}"
          background-color="#3b82f6"
          color="#ffffff"
          font-size="16px"
          font-weight="600"
          border-radius="8px"
          padding="32px 0"
          inner-padding="16px 32px"
          css-class="review-button"
        >
          Review & Edit Post
        </mj-button>
        
        <!-- Alternative Link -->
        <mj-text align="center" font-size="14px" color="#6b7280" padding="16px 0 0 0">
          Can't click the button? 
          <a href="${data.reviewUrl}" style="color: #3b82f6; text-decoration: none;">
            Copy and paste this link into your browser
          </a>
        </mj-text>
      </mj-column>
    </mj-section>
    
    <!-- Features Section -->
    <mj-section background-color="#f8fafc" padding="32px 20px">
      <mj-column>
        <mj-text align="center" font-size="18px" font-weight="600" color="#1f2937" padding="0 0 24px 0">
          What you can do in the editor:
        </mj-text>
      </mj-column>
      
      <mj-column width="33.33%">
        <mj-text align="center" font-size="40px" padding="0 0 12px 0">✏️</mj-text>
        <mj-text align="center" font-size="14px" font-weight="600" color="#374151" padding="0 0 8px 0">
          Edit Content
        </mj-text>
        <mj-text align="center" font-size="13px" color="#6b7280" padding="0">
          Modify the AI-generated text to match your voice
        </mj-text>
      </mj-column>
      
      <mj-column width="33.33%">
        <mj-text align="center" font-size="40px" padding="0 0 12px 0">🖼️</mj-text>
        <mj-text align="center" font-size="14px" font-weight="600" color="#374151" padding="0 0 8px 0">
          Add Media
        </mj-text>
        <mj-text align="center" font-size="13px" color="#6b7280" padding="0">
          Upload images or generate new visuals
        </mj-text>
      </mj-column>
      
      <mj-column width="33.33%">
        <mj-text align="center" font-size="40px" padding="0 0 12px 0">📅</mj-text>
        <mj-text align="center" font-size="14px" font-weight="600" color="#374151" padding="0 0 8px 0">
          Schedule
        </mj-text>
        <mj-text align="center" font-size="13px" color="#6b7280" padding="0">
          Set the perfect time to publish
        </mj-text>
      </mj-column>
    </mj-section>
    
    <!-- Divider -->
    <mj-section background-color="#ffffff" padding="0">
      <mj-column>
        <mj-divider border-color="#e5e7eb" border-width="1px" />
      </mj-column>
    </mj-section>
    
    <!-- Footer -->
    <mj-section background-color="#ffffff" padding="32px 20px">
      <mj-column>
        <mj-text align="center" font-size="14px" color="#6b7280" padding="0 0 16px 0">
          This email was sent by your PostCribe scheduling system.
        </mj-text>
        
        <mj-text align="center" font-size="13px" color="#9ca3af" padding="0">
          Need help? <a href="#" class="footer-link">Contact Support</a> | 
          <a href="#" class="footer-link">Manage Notifications</a>
        </mj-text>
        
        <mj-spacer height="16px" />
        
        <mj-text align="center" font-size="12px" color="#d1d5db" padding="0">
          © 2024 PostCribe. All rights reserved.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
`;

export const generatePostApprovalEmail = (
    data: PostApprovalEmailData,
): { html: string; text: string } => {
    const mjmlTemplate = getMjmlTemplate(data);

    try {
        const result = mjml2html(mjmlTemplate, {
            validationLevel: "soft",
            beautify: true,
        });

        if (result.errors.length > 0) {
            console.warn("MJML compilation warnings:", result.errors);
        }

        // Generate a simple text version for fallback
        const textVersion = `
Hi ${data.userName},

Your scheduled post is ready for review!

Post Title: ${data.postTitle}
${data.previewText ? `Preview: ${data.previewText}` : ""}

Your AI-generated post content has been created based on your requirements. Please review the content, make any necessary edits, and publish when you're ready.

Review & Edit Post: ${data.reviewUrl}

What you can do in the editor:
• Edit Content - Modify the AI-generated text to match your voice
• Add Media - Upload images or generate new visuals  
• Schedule - Set the perfect time to publish

This email was sent by your PostCribe scheduling system.

© 2024 PostCribe. All rights reserved.
        `.trim();

        return {
            html: result.html,
            text: textVersion,
        };
    } catch (error) {
        console.error("Error generating MJML email:", error);
        throw new Error("Failed to generate email template");
    }
};
