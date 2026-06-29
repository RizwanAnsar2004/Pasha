// Regenerates src/lib/email-shell.ts from the MailerLite source email.
//
// The source (mailerlite-email.html) is the canonical email chrome. This script
// splits it into a trusted HEADER (logo banner) and FOOTER (social links,
// address, unsubscribe), then emits a TS module exporting `wrapEmail()`, which
// injects admin-authored content between them. Run after editing the HTML:
//
//   node scripts/build-email-shell.cjs
//
// Why a build step (not a runtime file read): bundling/serverless makes runtime
// fs reads fragile, and embedding via JSON.stringify guarantees safe escaping.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "mailerlite-email.html");
const OUT = path.join(ROOT, "src", "lib", "email-shell.ts");

const html = fs.readFileSync(SRC, "utf8");

const BLOCK_OPEN =
  '<table align="center" border="0" bgcolor="#ffffff" class="mlContentTable mlContentTableDefault"';

// Header ends where the first content block begins — the mlContentTableDefault
// block immediately AFTER the banner image block.
const bannerIdx = html.indexOf('id="imageBlock-4"');
const headerEnd = html.indexOf(BLOCK_OPEN, bannerIdx);
// Footer begins at the dotted-divider block that sits right after the CTA.
const dottedIdx = html.indexOf("dotted #EAECED");
const footerStart = html.lastIndexOf(BLOCK_OPEN, dottedIdx);

if (
  bannerIdx < 0 ||
  headerEnd < 0 ||
  dottedIdx < 0 ||
  footerStart < 0 ||
  footerStart <= headerEnd
) {
  console.error("Anchor resolution failed", {
    bannerIdx,
    headerEnd,
    dottedIdx,
    footerStart,
  });
  process.exit(1);
}

const header = html.slice(0, headerEnd);
const footer = html.slice(footerStart);

// Content-block wrapper: mirrors the original body block (40px side padding,
// Poppins 14px base, top/bottom spacing) so admin-authored HTML renders with
// the same look as the source template.
const CONTENT_OPEN = `
                        <!-- DYNAMIC CONTENT START -->
                        <table align="center" border="0" bgcolor="#ffffff" class="mlContentTable mlContentTableDefault" cellpadding="0" cellspacing="0" width="640">
                          <tr>
                            <td class="mlContentTableCardTd">
                              <table align="center" bgcolor="#ffffff" border="0" cellpadding="0" cellspacing="0" class="mlContentTable ml-default" style="width: 640px; min-width: 640px;" width="640">
                                <tr>
                                  <td>
                                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="640" style="width: 640px; min-width: 640px;" class="mlContentTable">
                                      <tr>
                                        <td height="20" class="spacingHeight-20" style="line-height: 20px; min-height: 20px;"></td>
                                      </tr>
                                    </table>
                                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="640" style="width: 640px; min-width: 640px;" class="mlContentTable">
                                      <tr>
                                        <td align="center" style="padding: 0px 40px;" class="mlContentOuter">
                                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="100%">
                                            <tr>
                                              <td class="bodyTitle" style="font-family: 'Poppins', sans-serif; font-size: 14px; line-height: 150%; color: #000000;">
`;

const CONTENT_CLOSE = `
                                              </td>
                                            </tr>
                                          </table>
                                        </td>
                                      </tr>
                                    </table>
                                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" width="640" style="width: 640px; min-width: 640px;" class="mlContentTable">
                                      <tr>
                                        <td height="20" class="spacingHeight-20" style="line-height: 20px; min-height: 20px;"></td>
                                      </tr>
                                    </table>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                        <!-- DYNAMIC CONTENT END -->
`;

const ts = `// AUTO-GENERATED from mailerlite-email.html by scripts/build-email-shell.cjs.
// Do not edit the embedded markup by hand — edit the HTML source and rerun:
//   node scripts/build-email-shell.cjs
//
// The MailerLite email is split into a trusted HEADER (logo banner) and FOOTER
// (social links, address, unsubscribe). Admin-authored content from the
// \`email_templates\` table is injected between them at send time so every email
// shares one consistent header/footer. Sending always happens server-side
// (see src/lib/mailer.ts), so this is the single source of truth for the chrome.

const EMAIL_SHELL_HEADER = ${JSON.stringify(header)};

const EMAIL_SHELL_FOOTER = ${JSON.stringify(footer)};

const CONTENT_BLOCK_OPEN = ${JSON.stringify(CONTENT_OPEN)};

const CONTENT_BLOCK_CLOSE = ${JSON.stringify(CONTENT_CLOSE)};

/**
 * Wrap admin-authored email body HTML in the P@SHA header/footer shell.
 * \`contentHtml\` is the already-rendered template body (placeholders substituted
 * and sanitized). It is dropped into a content block matching the template's
 * 40px padding + Poppins base styling so it looks native to the email.
 */
export function wrapEmail(contentHtml: string): string {
  const block = CONTENT_BLOCK_OPEN + contentHtml + CONTENT_BLOCK_CLOSE;
  return EMAIL_SHELL_HEADER + block + EMAIL_SHELL_FOOTER;
}
`;

fs.writeFileSync(OUT, ts);
console.log("Wrote", path.relative(ROOT, OUT), `(${ts.length} bytes)`);
console.log("  header:", header.length, "bytes | footer:", footer.length, "bytes");
