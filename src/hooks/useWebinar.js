import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useOrg } from '../contexts/OrgContext';
import { useAuth } from '../contexts/AuthContext';
import { logAudit } from '../lib/audit';
import { defaultEmailConfigsForWebinar } from '../lib/emailTemplates';
import { slugBaseFromTitle } from '../lib/slugify';

async function generateUniqueSlug(orgId, title, videoUrl = '') {
  const base = slugBaseFromTitle(title, videoUrl);
  let candidate = base;
  let attempt = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data } = await supabase
      .from('webinars')
      .select('id')
      .eq('org_id', orgId)
      .eq('slug', candidate)
      .maybeSingle();

    if (!data) return candidate;
    attempt += 1;
    candidate = `${base}-${attempt + 1}`;
  }
}

export function useWebinars() {
  const { orgId } = useOrg();
  const [webinars, setWebinars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWebinars = useCallback(async () => {
    if (!orgId) {
      setWebinars([]);
      setError('Organização não encontrada.');
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase
      .from('webinars')
      .select('*, registrations(count)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (err) {
      setError(err.message);
    } else {
      setWebinars(data || []);
      setError(null);
    }
    setLoading(false);
  }, [orgId]);

  useEffect(() => {
    fetchWebinars();
  }, [fetchWebinars]);

  return { webinars, loading, error, refetch: fetchWebinars };
}

export function useWebinar(id) {
  const { orgId } = useOrg();
  const { user } = useAuth();
  const [webinar, setWebinar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWebinar = useCallback(async () => {
    if (!id) {
      setWebinar(null);
      setError('Webinar não encontrado.');
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase
      .from('webinars')
      .select(`
        *,
        registration_pages(*),
        simulated_messages(*, order: sort_order),
        cta_configs(*, order: sort_order),
        polls(*, poll_responses(count)),
        email_configs(*),
        sales_notifications(*, order: show_at_seconds),
        audience_configs(*),
        login_customizations(*)
      `)
      .eq('id', id)
      .single();

    if (err) {
      setError(err.message);
    } else {
      setWebinar(data);
      setError(null);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchWebinar();
  }, [fetchWebinar]);

  const updateWebinar = async (updates) => {
    const { data, error: err } = await supabase
      .from('webinars')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (err) throw err;
    setWebinar((prev) => ({ ...prev, ...data }));

    // Audit log
    logAudit({
      orgId,
      userId: user?.id,
      action: 'update',
      entityType: 'webinar',
      entityId: id,
      description: `Webinar "${data.title}" atualizado`,
    });

    return data;
  };

  const deleteWebinar = async () => {
    // Audit log before delete (captura título)
    if (webinar) {
      logAudit({
        orgId,
        userId: user?.id,
        action: 'delete',
        entityType: 'webinar',
        entityId: id,
        description: `Webinar "${webinar.title}" excluído`,
      });
    }

    const { error: err } = await supabase
      .from('webinars')
      .delete()
      .eq('id', id);

    if (err) throw err;
  };

  return { webinar, loading, error, refetch: fetchWebinar, updateWebinar, deleteWebinar };
}

export function useCreateWebinar() {
  const { orgId } = useOrg();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const createWebinar = async (webinarData) => {
    if (!orgId) throw new Error('No organization');
    setLoading(true);
    try {
      const slug = await generateUniqueSlug(
        orgId,
        webinarData.title,
        webinarData.video_url
      );

      // If the operator pasted a video URL as the title, keep a clean display title
      const looksLikeUrl =
        /^https?:\/\//i.test(webinarData.title || '') ||
        /youtube\.com|youtu\.be|vimeo\.com/i.test(webinarData.title || '');
      const payload = {
        ...webinarData,
        org_id: orgId,
        slug,
        title: looksLikeUrl
          ? `Webinário ${slug.replace(/^video-/, '').slice(0, 12)}`
          : webinarData.title,
      };

      const { data, error } = await supabase
        .from('webinars')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      // Audit log
      logAudit({
        orgId,
        userId: user?.id,
        action: 'create',
        entityType: 'webinar',
        entityId: data.id,
        description: `Webinar "${data.title}" criado`,
      });

      // Defaults de audiência e customização da tela de entrada
      await supabase.from('audience_configs').insert({ webinar_id: data.id });
      await supabase.from('login_customizations').insert({ webinar_id: data.id });

      // Create default registration page
      await supabase.from('registration_pages').insert({
        webinar_id: data.id,
        blocks: JSON.stringify([
          { type: 'hero', data: { title: webinarData.title, subtitle: webinarData.description || '', cta: 'Garantir minha vaga' } },
          { type: 'countdown', data: {} },
          { type: 'form', data: { fields: ['name', 'email'] } },
        ]),
        theme: JSON.stringify({ primaryColor: '#3366ff', backgroundColor: '#ffffff', textColor: '#101828' }),
        published: false,
      });

      // Create default email configs (branded Resend HTML templates)
      await supabase
        .from('email_configs')
        .insert(defaultEmailConfigsForWebinar(data.id));

      return data;
    } finally {
      setLoading(false);
    }
  };

  return { createWebinar, loading };
}
