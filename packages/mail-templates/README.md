# @repo/mail-templates

Professional email templates built with MJML for the PostCribe platform.

## Features

- 📧 **MJML-powered**: Professional, responsive email templates
- 🎨 **Modern Design**: Beautiful, accessible email layouts
- 📱 **Mobile-first**: Optimized for all devices and email clients
- 🔧 **TypeScript**: Fully typed for better development experience
- 🧪 **Testing utilities**: Easy preview and testing tools

## Available Templates

### Post Approval Email

A professional template for notifying users when their scheduled posts are ready for review.

**Features:**
- Responsive design for all devices
- Professional PostCribe branding
- Clear call-to-action button
- Feature highlights section
- Fallback text version
- Accessibility optimized

## Installation

This package is part of the PostCribe monorepo and uses MJML for email template generation.

```bash
bun install
```

## Usage

### Basic Usage

```typescript
import { generatePostApprovalEmail, type PostApprovalEmailData } from '@repo/mail-templates';

const emailData: PostApprovalEmailData = {
    userName: "John Doe",
    postTitle: "My Awesome Post",
    reviewUrl: "https://app.postcribe.com/post/draft/123",
    previewText: "This is a preview of the post content..." // optional
};

const { html, text } = generatePostApprovalEmail(emailData);

// Use with your email service
await sendEmail({
    to: [{ name: "John Doe", email: "john@example.com" }],
    subject: `Post Ready for Review: ${emailData.postTitle}`,
    htmlContent: html,
    // textContent: text, // optional fallback
});
```

### Integration with PostCribe Cron Handler

```typescript
import { generatePostApprovalEmail } from '@repo/mail-templates';
import { sendEmail } from '@repo/mailer';

const sendApprovalEmail = async (user: User, draftId: string, postTitle: string) => {
    const baseUrl = process.env.FRONTEND_BASE_URL;
    const reviewUrl = `${baseUrl}/post/draft/${draftId}`;

    const { html } = generatePostApprovalEmail({
        userName: user.name,
        postTitle: postTitle,
        reviewUrl: reviewUrl,
    });

    await sendEmail({
        to: [{ name: user.name, email: user.email }],
        subject: `Post Ready for Review: ${postTitle}`,
        htmlContent: html,
        sender: { name: "PostCribe", email: "noreply@postcribe.com" },
    });
};
```

## Development

### Preview Templates

Generate and preview email templates in your browser:

```bash
# Generate sample email and save to dist/samples/
bun run preview

# Then open dist/samples/post-approval-sample.html in your browser
```

### Test Custom Data

```typescript
import { previewEmail } from '@repo/mail-templates';

const customData = {
    userName: "Jane Smith",
    postTitle: "Custom Test Post",
    reviewUrl: "https://localhost:3000/post/draft/test",
    previewText: "This is a custom test..."
};

const { html, text } = previewEmail(customData);
console.log('Generated email:', html);
```

### Build

```bash
bun run build
```

## Template Structure

### PostApprovalEmailData Interface

```typescript
interface PostApprovalEmailData {
    userName: string;        // Recipient's name
    postTitle: string;       // Title of the post to review
    reviewUrl: string;       // URL to the draft editor
    previewText?: string;    // Optional preview of post content
}
```

### Template Sections

1. **Header**: PostCribe branding and logo
2. **Greeting**: Personalized welcome message
3. **Post Info**: Highlighted post title and preview
4. **Call-to-Action**: Prominent "Review & Edit Post" button
5. **Features**: What users can do in the editor
6. **Footer**: Company info and unsubscribe links

## Email Client Compatibility

Built with MJML 4.15.3, these templates are compatible with:

- ✅ Gmail (Web, iOS, Android)
- ✅ Outlook (2010+, Web, iOS, Android)
- ✅ Apple Mail (macOS, iOS)
- ✅ Yahoo Mail
- ✅ AOL Mail
- ✅ Thunderbird
- ✅ And many more...

## Customization

### Colors and Branding

The template uses a consistent color scheme:
- Primary: `#3b82f6` (blue)
- Secondary: `#2563eb` (darker blue)
- Text: `#1f2937` (dark gray)
- Muted: `#6b7280` (light gray)
- Background: `#f9fafb` (very light gray)

### Fonts

Default font stack: `'Helvetica Neue', Helvetica, Arial, sans-serif`

### Layout

- Max width: 600px (standard email width)
- Mobile breakpoint: 320px
- Responsive design with proper fallbacks

## File Structure

```
packages/mail-templates/
├── src/
│   ├── templates/
│   │   └── post-approval.template.ts    # Main template
│   ├── utils/
│   │   └── test-template.ts             # Testing utilities
│   └── index.ts                         # Package exports
├── dist/
│   └── samples/                         # Generated previews
├── package.json
└── README.md
```

## Scripts

- `bun run preview` - Generate and preview email template
- `bun run build` - Build TypeScript files
- `bun run lint` - Run ESLint
- `bun run typecheck` - Check TypeScript types
- `bun run test-template` - Generate sample email

## Contributing

When adding new templates:

1. Create a new file in `src/templates/`
2. Follow the existing naming convention
3. Export the template function and types
4. Add exports to `src/index.ts`
5. Create test utilities if needed
6. Update this README

## Best Practices

### Email Design
- Keep content concise and scannable
- Use clear, action-oriented CTAs
- Ensure good contrast ratios
- Test across multiple clients
- Include text fallbacks

### MJML Usage
- Use semantic components when possible
- Leverage MJML's responsive features
- Keep CSS simple and inline-friendly
- Use mj-attributes for consistency
- Validate templates during build

### Performance
- Optimize images and assets
- Keep HTML size reasonable
- Use web-safe fonts with fallbacks
- Minimize external dependencies

## Troubleshooting

### Common Issues

**MJML compilation errors:**
- Check MJML syntax and component usage
- Ensure all required attributes are provided
- Validate template structure

**Rendering issues:**
- Test in multiple email clients
- Check for unsupported CSS properties
- Ensure proper fallbacks are in place

**Development issues:**
- Run `bun install` to ensure dependencies
- Check TypeScript compilation with `bun run typecheck`
- Verify MJML version compatibility

### Getting Help

- Check MJML documentation: https://mjml.io/documentation/
- Review email client compatibility charts
- Test templates with Email on Acid or Litmus
- Consult the PostCribe team for design guidance
