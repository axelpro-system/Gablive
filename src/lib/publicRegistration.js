function parseJsonField(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
}

/**
 * Public /register page: org template wins over the per-webinar editor page.
 */
export function resolvePublicRegistrationPage(webinar) {
  const template = webinar?.registration_page_template;
  if (template && (template.blocks || template.theme)) {
    return {
      ...template,
      blocks: parseJsonField(template.blocks, []),
      theme: parseJsonField(template.theme, {}),
    };
  }

  const editorPage = webinar?.registration_pages?.[0];
  if (!editorPage) return null;

  return {
    ...editorPage,
    blocks: parseJsonField(editorPage.blocks, []),
    theme: parseJsonField(editorPage.theme, {}),
  };
}

export function canAccessLiveSession(registration) {
  if (!registration?.id) return false;
  return registration.waitlisted !== true;
}
