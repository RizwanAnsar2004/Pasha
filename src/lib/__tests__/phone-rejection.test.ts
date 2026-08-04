import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  PHONE_MAX_DIGITS,
  PHONE_REJECTION_MESSAGES,
  phoneRejectionReason,
  sanitizePhoneInput,
} from "@/lib/validators/phone";

// Typing letters into a phone field used to surface only "Required": the
// sanitizer strips them before react-hook-form sees the value, so the field
// arrives at the resolver empty and requiredPhone fails on .min(1). These cover
// the reason-detection that drives the replacement message.

test("letters are stripped, which is why the field reads as empty", () => {
  assert.equal(sanitizePhoneInput("abc"), "");
  assert.equal(sanitizePhoneInput("+92 300abc"), "+92 300");
});

test("letters are reported as a character rejection", () => {
  assert.equal(phoneRejectionReason("abc"), "chars");
  assert.equal(phoneRejectionReason("+92 300abc"), "chars");
  assert.match(PHONE_REJECTION_MESSAGES.chars, /letters/i);
});

test("a digit past the maximum is reported as length, not as letters", () => {
  const tooLong = "1".repeat(PHONE_MAX_DIGITS + 1);
  assert.equal(phoneRejectionReason(tooLong), "length");
  // The regression this guards: reusing the "chars" message here would tell a
  // user typing digits that letters aren't allowed.
  assert.doesNotMatch(PHONE_REJECTION_MESSAGES.length, /letters/i);
});

test("letters win over length when both are present", () => {
  assert.equal(phoneRejectionReason("a".repeat(3) + "1".repeat(PHONE_MAX_DIGITS + 1)), "chars");
});

test("acceptable input reports no rejection", () => {
  for (const ok of ["+92 300 1234567", "(021) 111-222", "03001234567", ""]) {
    assert.equal(phoneRejectionReason(ok), null, ok);
    assert.equal(sanitizePhoneInput(ok), ok, ok);
  }
});

test("reason is read from the raw value, not the sanitized one", () => {
  // sanitizePhoneInput's output never carries a reason — the bug this guards
  // was computing the reason after the input's value had been overwritten.
  const raw = "1".repeat(PHONE_MAX_DIGITS + 1);
  assert.equal(phoneRejectionReason(raw), "length");
  assert.equal(phoneRejectionReason(sanitizePhoneInput(raw)), null);
});
