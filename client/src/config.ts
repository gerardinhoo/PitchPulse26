export function isEmailVerificationRequired() {
  return import.meta.env.VITE_REQUIRE_EMAIL_VERIFICATION !== "false";
}
