/** App-side minimum — validated before we call Supabase Auth. */
export const APPLICANT_MIN_PASSWORD_LENGTH = 8;

export function applicantPasswordError(password: string): string | null {
  if (!password) return "Password is required.";
  if (password.length < APPLICANT_MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${APPLICANT_MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

export function applicantEmailError(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "Please enter a valid email address.";
  }
  return null;
}
