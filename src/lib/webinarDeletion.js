export function validateDeleteConfirmation(confirmation, webinarTitle) {
  return Boolean(webinarTitle) && String(confirmation) === String(webinarTitle);
}

export function buildDeleteWebinarPlan({ webinar, orgId, userId, confirmation }) {
  if (!webinar?.id) {
    return { ok: false, reason: 'missing_webinar' };
  }

  if (!orgId || webinar.org_id !== orgId) {
    return { ok: false, reason: 'org_mismatch' };
  }

  if (!validateDeleteConfirmation(confirmation, webinar.title)) {
    return { ok: false, reason: 'confirmation_mismatch' };
  }

  return {
    ok: true,
    deleteFilter: {
      id: webinar.id,
      org_id: orgId,
    },
    audit: {
      orgId,
      userId,
      action: 'delete',
      entityType: 'webinar',
      entityId: webinar.id,
      description: `Webinar "${webinar.title}" excluido`,
      metadata: {
        title: webinar.title,
        slug: webinar.slug || null,
      },
    },
  };
}
