// Common email layout components for PostCribe emails

export interface EmailLayoutConfig {
    backgroundColor?: string;
    primaryColor?: string;
    foregroundColor?: string;
    mutedColor?: string;
    borderColor?: string;
    companyName?: string;
    companyUrl?: string;
}

export const defaultEmailConfig: EmailLayoutConfig = {
    backgroundColor: "#f8f9fa",
    primaryColor: "#1f2937",
    foregroundColor: "#111827",
    mutedColor: "#6b7280",
    borderColor: "#e5e7eb",
    companyName: "PostCribe",
    companyUrl: "https://postcribe.com",
};

export const getEmailHeaderMjml = (
    config: EmailLayoutConfig = defaultEmailConfig,
) => `
<!-- Header -->
<mj-section background-color="#ffffff" padding="20px 0">
  <mj-column>
    <mj-text align="center" padding="0">
      <a href="${config.companyUrl}" class="header-logo">${config.companyName}</a>
    </mj-text>
  </mj-column>
</mj-section>
`;

export const getEmailFooterMjml = (
    config: EmailLayoutConfig = defaultEmailConfig,
    customContent?: string,
) => `
<!-- Divider -->
<mj-section background-color="#ffffff" padding="0">
  <mj-column>
    <mj-divider border-color="${config.borderColor}" border-width="1px" />
  </mj-column>
</mj-section>

<!-- Footer -->
<mj-section background-color="#ffffff" padding="32px 20px">
  <mj-column>
    ${
        customContent ||
        `
    <mj-text align="center" font-size="14px" color="${config.mutedColor}" padding="0 0 16px 0">
      This email was sent by your ${config.companyName} system.
    </mj-text>
    `
    }
    
    <mj-text align="center" font-size="13px" color="#9ca3af" padding="0">
      Need help? <a href="#" class="footer-link">Contact Support</a> | 
      <a href="#" class="footer-link">Privacy Policy</a> |
      <a href="#" class="footer-link">Unsubscribe</a>
    </mj-text>
    
    <mj-spacer height="16px" />
    
    <mj-text align="center" font-size="12px" color="#9ca3af" padding="0">
      © ${new Date().getFullYear()} ${config.companyName}. All rights reserved.
    </mj-text>
  </mj-column>
</mj-section>
`;

export const getEmailStylesMjml = (
    config: EmailLayoutConfig = defaultEmailConfig,
) => `
<mj-style>
  .header-logo {
    font-weight: 700;
    font-size: 28px;
    color: ${config.primaryColor};
    text-decoration: none;
  }
  
  .main-title {
    font-size: 24px;
    font-weight: 600;
    color: ${config.foregroundColor};
    margin: 0;
    line-height: 1.3;
  }
  
  .primary-button {
    background: ${config.primaryColor};
    border-radius: 8px;
    box-shadow: 0 1px 3px 0px hsl(0 0% 0% / 0.1), 0 1px 2px -1px hsl(0 0% 0% / 0.1);
  }
  
  .primary-button:hover {
    background: #374151;
    box-shadow: 0 1px 3px 0px hsl(0 0% 0% / 0.1), 0 4px 6px -1px hsl(0 0% 0% / 0.1);
  }
  
  .footer-link {
    color: ${config.mutedColor};
    text-decoration: none;
  }
  
  .highlight-box {
    background-color: #f8f9fa;
    border-left: 4px solid ${config.primaryColor};
    border-radius: 6px;
  }
  
  .info-box {
    background-color: #f9fafb;
    border: 1px solid ${config.borderColor};
    border-radius: 8px;
  }
</mj-style>
`;

export const getEmailAttributesMjml = () => `
<mj-attributes>
  <mj-all font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'" />
  <mj-text font-size="16px" line-height="1.5" color="#111827" />
  <mj-section padding="0" />
</mj-attributes>
`;

export const createPrimaryButton = (
    href: string,
    text: string,
    extraClasses?: string,
) => `
<mj-button 
  href="${href}"
  background-color="#1f2937"
  color="#f9fafb"
  font-size="16px"
  font-weight="600"
  border-radius="8px"
  width="320px"
  align="center"
  padding="16px 0 16px 0"
  inner-padding="16px 32px"
  css-class="primary-button ${extraClasses || ""}"
>
  ${text}
</mj-button>
`;

export const createAlternativeLink = (href: string, linkText: string) => `
<mj-text align="center" font-size="14px" color="#6b7280" padding="16px 0 24px 0">
  Can't click the button? 
  <a href="${href}" style="color: #1f2937; text-decoration: none;">
    ${linkText}
  </a>
</mj-text>
`;

export const createGreeting = (userName: string) => `
<mj-text font-size="18px" color="#111827" padding="0 0 20px 0">
  Hi ${userName},
</mj-text>
`;

export const createMainTitle = (title: string, emoji?: string) => `
<mj-text padding="0 0 24px 0">
  <h1 class="main-title">${title} ${emoji || ""}</h1>
</mj-text>
`;

export const createInfoBox = (title: string, content: string) => `
<mj-table css-class="info-box" padding="20px">
  <tr>
    <td style="padding: 20px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif; font-size: 14px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
        ${title}
      </div>
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif; font-size: 14px; color: #111827; line-height: 1.5;">
        ${content}
      </div>
    </td>
  </tr>
</mj-table>
`;

export interface FeatureItem {
    emoji: string;
    title: string;
    description: string;
}

export const createFeaturesSection = (
    sectionTitle: string,
    features: FeatureItem[],
) => `
<mj-section background-color="#f9fafb" padding="32px 20px">
  <mj-column>
    <mj-text align="center" font-size="18px" font-weight="600" color="#111827" padding="0 0 24px 0">
      ${sectionTitle}
    </mj-text>
  </mj-column>
  
  ${features
      .map(
          feature => `
  <mj-column width="${100 / features.length}%">
    <mj-text align="center" font-size="40px" padding="0 0 12px 0">${feature.emoji}</mj-text>
    <mj-text align="center" font-size="14px" font-weight="600" color="#111827" padding="0 0 8px 0">
      ${feature.title}
    </mj-text>
    <mj-text align="center" font-size="13px" color="#6b7280" padding="0">
      ${feature.description}
    </mj-text>
  </mj-column>
  `,
      )
      .join("")}
</mj-section>
`;

export const createHighlightBox = (
    title: string,
    content: string,
    additionalContent?: string,
) => `
<mj-table css-class="highlight-box" padding="20px">
  <tr>
    <td style="padding: 20px; background-color: #f8f9fa; border-left: 4px solid #1f2937; border-radius: 6px;">
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif; font-size: 14px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
        ${title}
      </div>
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif; font-size: 18px; color: #111827; font-weight: 600; margin-bottom: 16px;">
        ${content}
      </div>
      ${additionalContent || ""}
    </td>
  </tr>
</mj-table>
`;
