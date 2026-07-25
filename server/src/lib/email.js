// TODO: Replace with actual email transport (nodemailer + SMTP, AWS SES, etc.)
// Interface contract: sendPasswordResetEmail(to, resetLink) → Promise<void>

export async function sendPasswordResetEmail(to, resetLink) {
    console.log(`[EMAIL STUB] Password reset email to ${to}`);
    console.log(`[EMAIL STUB] Reset link: ${resetLink}`);
}
