export { generatePostApprovalEmail } from './templates/post-approval.template';
export type { PostApprovalEmailData } from './templates/post-approval.template';

export { generateEmailVerificationEmail } from './templates/email-verification.template';
export type { EmailVerificationData } from './templates/email-verification.template';

export { generatePasswordResetEmail } from './templates/password-reset.template';
export type { PasswordResetData } from './templates/password-reset.template';

export * from './components/email-layout.template';

// Export utility functions for testing and previewing
export { previewPostApproval, previewEmailVerification, previewPasswordReset, previewAllTemplates } from './utils/test-template';

