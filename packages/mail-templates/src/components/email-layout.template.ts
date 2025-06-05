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
    backgroundColor: "oklch(0.97 0 0)",
    primaryColor: "oklch(0.205 0 0)",
    foregroundColor: "oklch(0.145 0 0)",
    mutedColor: "oklch(0.556 0 0)",
    borderColor: "oklch(0.922 0 0)",
    companyName: "PostCribe",
    companyUrl: "https://postcribe.com",
};

export const getEmailHeaderMjml = (config: EmailLayoutConfig = defaultEmailConfig) => `
<!-- Header -->
<mj-section background-color="oklch(1 0 0)" padding="20px 0">
  <mj-column>
    <mj-text align="center" padding="0">
      <a href="${config.companyUrl}" class="header-logo">${config.companyName}</a>
    </mj-text>
  </mj-column>
</mj-section>
`;

export const getEmailFooterMjml = (config: EmailLayoutConfig = defaultEmailConfig, customContent?: string) => `
<!-- Divider -->
<mj-section background-color="oklch(1 0 0)" padding="0">
  <mj-column>
    <mj-divider border-color="${config.borderColor}" border-width="1px" />
  </mj-column>
</mj-section>

<!-- Footer -->
<mj-section background-color="oklch(1 0 0)" padding="32px 20px">
  <mj-column>
    ${customContent || `
    <mj-text align="center" font-size="14px" color="${config.mutedColor}" padding="0 0 16px 0">
      This email was sent by your ${config.companyName} system.
    </mj-text>
    `}
    
    <mj-text align="center" font-size="13px" color="oklch(0.708 0 0)" padding="0">
      Need help? <a href="#" class="footer-link">Contact Support</a> | 
      <a href="#" class="footer-link">Privacy Policy</a> |
      <a href="#" class="footer-link">Unsubscribe</a>
    </mj-text>
    
    <mj-spacer height="16px" />
    
    <mj-text align="center" font-size="12px" color="oklch(0.708 0 0)" padding="0">
      © ${new Date().getFullYear()} ${config.companyName}. All rights reserved.
    </mj-text>
  </mj-column>
</mj-section>
`;

export const getEmailStylesMjml = (config: EmailLayoutConfig = defaultEmailConfig) => `
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
    background: oklch(0.175 0 0);
    box-shadow: 0 1px 3px 0px hsl(0 0% 0% / 0.1), 0 4px 6px -1px hsl(0 0% 0% / 0.1);
  }
  
  .footer-link {
    color: ${config.mutedColor};
    text-decoration: none;
  }
  
  .highlight-box {
    background-color: oklch(0.97 0 0);
    border-left: 4px solid ${config.primaryColor};
    border-radius: 6px;
  }
  
  .info-box {
    background-color: oklch(0.985 0 0);
    border: 1px solid ${config.borderColor};
    border-radius: 8px;
  }
</mj-style>
`;

export const getEmailAttributesMjml = () => `
<mj-attributes>
  <mj-all font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'" />
  <mj-text font-size="16px" line-height="1.5" color="oklch(0.145 0 0)" />
  <mj-section padding="0" />
</mj-attributes>
`;

export const createPrimaryButton = (href: string, text: string, extraClasses?: string) => `
<mj-button 
  href="${href}"
  background-color="oklch(0.205 0 0)"
  color="oklch(0.985 0 0)"
  font-size="16px"
  font-weight="600"
  border-radius="8px"
  padding="32px 0"
  inner-padding="16px 32px"
  css-class="primary-button ${extraClasses || ''}"
>
  ${text}
</mj-button>
`;

export const createAlternativeLink = (href: string, linkText: string) => `
<mj-text align="center" font-size="14px" color="oklch(0.556 0 0)" padding="16px 0 24px 0">
  Can't click the button? 
  <a href="${href}" style="color: oklch(0.205 0 0); text-decoration: none;">
    ${linkText}
  </a>
</mj-text>
`;

export const createGreeting = (userName: string) => `
<mj-text font-size="18px" color="oklch(0.145 0 0)" padding="0 0 20px 0">
  Hi ${userName},
</mj-text>
`;

export const createMainTitle = (title: string, emoji?: string) => `
<mj-text padding="0 0 24px 0">
  <h1 class="main-title">${title} ${emoji || ''}</h1>
</mj-text>
`;

export const createInfoBox = (title: string, content: string) => `
<mj-section css-class="info-box" padding="20px" background-color="oklch(0.985 0 0)">
  <mj-column>
    <mj-text font-size="14px" color="oklch(0.556 0 0)" font-weight="600" text-transform="uppercase" letter-spacing="0.5px" padding="0 0 8px 0">
      ${title}
    </mj-text>
    <mj-text font-size="14px" color="oklch(0.145 0 0)" padding="0">
      ${content}
    </mj-text>
  </mj-column>
</mj-section>
`;

export interface FeatureItem {
    emoji: string;
    title: string;
    description: string;
}

export const createFeaturesSection = (sectionTitle: string, features: FeatureItem[]) => `
<mj-section background-color="oklch(0.985 0 0)" padding="32px 20px">
  <mj-column>
    <mj-text align="center" font-size="18px" font-weight="600" color="oklch(0.145 0 0)" padding="0 0 24px 0">
      ${sectionTitle}
    </mj-text>
  </mj-column>
  
  ${features.map(feature => `
  <mj-column width="${100 / features.length}%">
    <mj-text align="center" font-size="40px" padding="0 0 12px 0">${feature.emoji}</mj-text>
    <mj-text align="center" font-size="14px" font-weight="600" color="oklch(0.145 0 0)" padding="0 0 8px 0">
      ${feature.title}
    </mj-text>
    <mj-text align="center" font-size="13px" color="oklch(0.556 0 0)" padding="0">
      ${feature.description}
    </mj-text>
  </mj-column>
  `).join('')}
</mj-section>
`;

export const createHighlightBox = (title: string, content: string, additionalContent?: string) => `
<mj-section css-class="highlight-box" padding="20px" background-color="oklch(0.97 0 0)">
  <mj-column>
    <mj-text font-size="14px" color="oklch(0.556 0 0)" font-weight="600" text-transform="uppercase" letter-spacing="0.5px" padding="0 0 8px 0">
      ${title}
    </mj-text>
    <mj-text font-size="18px" color="oklch(0.145 0 0)" font-weight="600" padding="0 0 16px 0">
      ${content}
    </mj-text>
    ${additionalContent || ''}
  </mj-column>
</mj-section>
`; 