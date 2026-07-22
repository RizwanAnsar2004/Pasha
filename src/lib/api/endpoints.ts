// Every API path in one place — reference these, never inline a "/api/..." string.
export const ENDPOINTS = {
  chat: "/api/chat",
  upload: "/api/upload",
  claim: "/api/claim",
  submit: "/api/submit",
  womenLed: "/api/women-led-startups",

  applicant: {
    auth: "/api/applicant/auth",
    draft: "/api/applicant/draft",
    draftReopen: "/api/applicant/draft/reopen",
  },

  admin: {
    auth: "/api/admin/auth",
    awards: "/api/admin/awards",
    committeeActivity: "/api/admin/committee-activity",
    committeeMembers: "/api/admin/committee-members",
    databank: "/api/admin/databank",
    emailBroadcast: "/api/admin/email-broadcast",
    emailTemplates: "/api/admin/email-templates",
    events: "/api/admin/events",
    featuredStartups: "/api/admin/featured-startups",
    forms: "/api/admin/forms",
    optionLists: "/api/admin/option-lists",
    siteContent: "/api/admin/site-content",
    submission: "/api/admin/submission",
    verifyStartup: "/api/admin/verify-startup",
  },

  superAdmin: {
    admins: "/api/super-admin/admins",
    auth: "/api/super-admin/auth",
  },
} as const;
