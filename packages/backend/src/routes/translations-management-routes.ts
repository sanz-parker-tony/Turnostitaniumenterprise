import { Router, Request, Response } from 'express';
import { createDbClient } from '../lib/postgres-client.js';

const router = Router();

type TranslationGroup =
  | 'menu_groups'
  | 'screens'
  | 'actions'
  | 'lookup_groups'
  | 'lookup_values'
  | 'system_reports'
  | 'report_parameters'
  | 'system_messages';

const VALID_GROUPS: TranslationGroup[] = [
  'menu_groups',
  'screens',
  'actions',
  'lookup_groups',
  'lookup_values',
  'system_reports',
  'report_parameters',
  'system_messages',
];

function getPostgres() {
  return createDbClient(
    process.env.Postgres_URL || '',
    process.env.Postgres_SERVICE_ROLE_KEY || ''
  );
}

function asText(value: any) {
  return String(value ?? '').trim();
}

function isGroup(value: string): value is TranslationGroup {
  return VALID_GROUPS.includes(value as TranslationGroup);
}

router.get('/catalogs/languages', async (_req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();
    const { data, error } = await Postgres
      .from('system_languages')
      .select('code, language_name, is_active, is_default')
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('language_name', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({
      success: true,
      languages: data || [],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

router.get('/:group', async (req: Request, res: Response) => {
  try {
    const group = String(req.params.group || '');
    if (!isGroup(group)) {
      return res.status(400).json({ error: 'Grupo de traduccion invalido' });
    }

    const languageCode = asText(req.query.language_code).toLowerCase();
    if (!languageCode) {
      return res.status(400).json({ error: 'language_code es obligatorio' });
    }
    const search = asText(req.query.search).toLowerCase();

    const Postgres = getPostgres();
    let rows: any[] = [];

    if (group === 'menu_groups') {
      const { data: base, error: baseError } = await Postgres
        .from('system_menu_groups')
        .select('id, menu_group_key, menu_group_name, menu_group_short_name, is_active, sort_order')
        .order('sort_order', { ascending: true });
      if (baseError) return res.status(500).json({ error: baseError.message });

      const ids = (base || []).map((x: any) => x.id);
      const { data: trans, error: transError } = await Postgres
        .from('system_menu_group_translations')
        .select('id, menu_group_id, language_code, menu_group_name, menu_group_short_name')
        .eq('language_code', languageCode)
        .in('menu_group_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
      if (transError) return res.status(500).json({ error: transError.message });

      const transById = new Map((trans || []).map((t: any) => [t.menu_group_id, t]));
      rows = (base || []).map((b: any) => {
        const t: any = transById.get(b.id);
        return {
          entity_id: b.id,
          key: b.menu_group_key,
          base_label: b.menu_group_name,
          base_secondary: b.menu_group_short_name || '',
          context: '',
          is_active: b.is_active,
          translation: {
            id: t?.id || null,
            label: t?.menu_group_name || '',
            secondary: t?.menu_group_short_name || '',
          },
        };
      });
    }

    if (group === 'screens') {
      const { data: base, error: baseError } = await Postgres
        .from('screens')
        .select('id, screen_key, screen_name, menu_label, route_path, is_active, sort_order')
        .order('sort_order', { ascending: true });
      if (baseError) return res.status(500).json({ error: baseError.message });

      const ids = (base || []).map((x: any) => x.id);
      const { data: trans, error: transError } = await Postgres
        .from('screen_translations')
        .select('id, screen_id, language_code, screen_name, menu_label')
        .eq('language_code', languageCode)
        .in('screen_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
      if (transError) return res.status(500).json({ error: transError.message });

      const transById = new Map((trans || []).map((t: any) => [t.screen_id, t]));
      rows = (base || []).map((b: any) => {
        const t: any = transById.get(b.id);
        return {
          entity_id: b.id,
          key: b.screen_key,
          base_label: b.screen_name,
          base_secondary: b.menu_label || '',
          context: b.route_path || '',
          is_active: b.is_active,
          translation: {
            id: t?.id || null,
            label: t?.screen_name || '',
            secondary: t?.menu_label || '',
          },
        };
      });
    }

    if (group === 'actions') {
      const { data: base, error: baseError } = await Postgres
        .from('actions')
        .select('id, action_key, action_name, is_active')
        .order('action_key', { ascending: true });
      if (baseError) return res.status(500).json({ error: baseError.message });

      const ids = (base || []).map((x: any) => x.id);
      const { data: trans, error: transError } = await Postgres
        .from('action_translations')
        .select('id, action_id, language_code, action_name')
        .eq('language_code', languageCode)
        .in('action_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
      if (transError) return res.status(500).json({ error: transError.message });

      const transById = new Map((trans || []).map((t: any) => [t.action_id, t]));
      rows = (base || []).map((b: any) => {
        const t: any = transById.get(b.id);
        return {
          entity_id: b.id,
          key: b.action_key,
          base_label: b.action_name,
          base_secondary: '',
          context: '',
          is_active: b.is_active,
          translation: {
            id: t?.id || null,
            label: t?.action_name || '',
          },
        };
      });
    }

    if (group === 'lookup_groups') {
      const { data: base, error: baseError } = await Postgres
        .from('lookup_groups')
        .select('id, lookup_group_key, lookup_group_label, lookup_group_short_label, is_active')
        .order('lookup_group_key', { ascending: true });
      if (baseError) return res.status(500).json({ error: baseError.message });

      const ids = (base || []).map((x: any) => x.id);
      const { data: trans, error: transError } = await Postgres
        .from('lookup_group_translations')
        .select('id, lookup_group_id, language_code, label, short_label')
        .eq('language_code', languageCode)
        .in('lookup_group_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
      if (transError) return res.status(500).json({ error: transError.message });

      const transById = new Map((trans || []).map((t: any) => [t.lookup_group_id, t]));
      rows = (base || []).map((b: any) => {
        const t: any = transById.get(b.id);
        return {
          entity_id: b.id,
          key: b.lookup_group_key,
          base_label: b.lookup_group_label,
          base_secondary: b.lookup_group_short_label || '',
          context: '',
          is_active: b.is_active,
          translation: {
            id: t?.id || null,
            label: t?.label || '',
            secondary: t?.short_label || '',
          },
        };
      });
    }

    if (group === 'lookup_values') {
      const { data: groups, error: groupsError } = await Postgres
        .from('lookup_groups')
        .select('id, lookup_group_key');
      if (groupsError) return res.status(500).json({ error: groupsError.message });
      const groupMap = new Map((groups || []).map((g: any) => [g.id, g.lookup_group_key]));

      const { data: base, error: baseError } = await Postgres
        .from('lookup_values')
        .select('id, lookup_group_id, lookup_key, lookup_label, lookup_short_label, is_active')
        .order('lookup_key', { ascending: true });
      if (baseError) return res.status(500).json({ error: baseError.message });

      const ids = (base || []).map((x: any) => x.id);
      const { data: trans, error: transError } = await Postgres
        .from('lookup_value_translations')
        .select('id, lookup_value_id, language_code, label, short_label')
        .eq('language_code', languageCode)
        .in('lookup_value_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
      if (transError) return res.status(500).json({ error: transError.message });

      const transById = new Map((trans || []).map((t: any) => [t.lookup_value_id, t]));
      rows = (base || []).map((b: any) => {
        const t: any = transById.get(b.id);
        return {
          entity_id: b.id,
          key: b.lookup_key,
          base_label: b.lookup_label,
          base_secondary: b.lookup_short_label || '',
          context: groupMap.get(b.lookup_group_id) || '',
          is_active: b.is_active,
          translation: {
            id: t?.id || null,
            label: t?.label || '',
            secondary: t?.short_label || '',
          },
        };
      });
    }

    if (group === 'system_reports') {
      const { data: base, error: baseError } = await Postgres
        .from('system_reports')
        .select('id, report_code, report_name, report_description, report_notes, is_active')
        .order('report_code', { ascending: true });
      if (baseError) return res.status(500).json({ error: baseError.message });

      const ids = (base || []).map((x: any) => x.id);
      const { data: trans, error: transError } = await Postgres
        .from('system_report_translations')
        .select('id, system_report_id, language_code, report_name, report_description, report_notes')
        .eq('language_code', languageCode)
        .in('system_report_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
      if (transError) return res.status(500).json({ error: transError.message });

      const transById = new Map((trans || []).map((t: any) => [t.system_report_id, t]));
      rows = (base || []).map((b: any) => {
        const t: any = transById.get(b.id);
        return {
          entity_id: b.id,
          key: b.report_code,
          base_label: b.report_name,
          base_secondary: b.report_description || '',
          context: b.report_notes || '',
          is_active: b.is_active,
          translation: {
            id: t?.id || null,
            label: t?.report_name || '',
            description: t?.report_description || '',
            notes: t?.report_notes || '',
          },
        };
      });
    }

    if (group === 'report_parameters') {
      const { data: reports, error: reportsError } = await Postgres
        .from('system_reports')
        .select('id, report_code');
      if (reportsError) return res.status(500).json({ error: reportsError.message });
      const reportMap = new Map((reports || []).map((r: any) => [r.id, r.report_code]));

      const { data: base, error: baseError } = await Postgres
        .from('report_parameters')
        .select('id, system_report_id, parameter_key, parameter_label, parameter_description, is_active')
        .order('parameter_key', { ascending: true });
      if (baseError) return res.status(500).json({ error: baseError.message });

      const ids = (base || []).map((x: any) => x.id);
      const { data: trans, error: transError } = await Postgres
        .from('report_parameter_translations')
        .select('id, report_parameter_id, language_code, parameter_label, parameter_description')
        .eq('language_code', languageCode)
        .in('report_parameter_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
      if (transError) return res.status(500).json({ error: transError.message });

      const transById = new Map((trans || []).map((t: any) => [t.report_parameter_id, t]));
      rows = (base || []).map((b: any) => {
        const t: any = transById.get(b.id);
        return {
          entity_id: b.id,
          key: b.parameter_key,
          base_label: b.parameter_label,
          base_secondary: b.parameter_description || '',
          context: reportMap.get(b.system_report_id) || '',
          is_active: b.is_active,
          translation: {
            id: t?.id || null,
            label: t?.parameter_label || '',
            description: t?.parameter_description || '',
          },
        };
      });
    }

    if (group === 'system_messages') {
      const { data: base, error: baseError } = await Postgres
        .from('system_message_keys')
        .select('id, message_key, default_text, is_active')
        .order('message_key', { ascending: true });
      if (baseError) return res.status(500).json({ error: baseError.message });

      const keys = (base || []).map((x: any) => x.message_key);
      const { data: trans, error: transError } = await Postgres
        .from('system_message_translations')
        .select('id, message_key, message_key_id, language_code, translated_text, is_active')
        .eq('language_code', languageCode)
        .in('message_key', keys.length ? keys : ['__NONE__']);
      if (transError) return res.status(500).json({ error: transError.message });

      const transByKey = new Map((trans || []).map((t: any) => [t.message_key, t]));
      rows = (base || []).map((b: any) => {
        const t: any = transByKey.get(b.message_key);
        return {
          entity_id: b.id,
          key: b.message_key,
          base_label: b.default_text,
          base_secondary: '',
          context: '',
          is_active: b.is_active,
          translation: {
            id: t?.id || null,
            text: t?.translated_text || '',
            is_active: t?.is_active ?? true,
          },
        };
      });
    }

    if (search) {
      rows = rows.filter((r: any) => {
        const blob = `${r.key} ${r.base_label} ${r.base_secondary} ${r.context}`.toLowerCase();
        return blob.includes(search);
      });
    }

    return res.status(200).json({
      success: true,
      group,
      language_code: languageCode,
      rows,
      count: rows.length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

router.put('/:group/:entityId', async (req: Request, res: Response) => {
  try {
    const group = String(req.params.group || '');
    const entityId = String(req.params.entityId || '');
    if (!isGroup(group)) {
      return res.status(400).json({ error: 'Grupo de traduccion invalido' });
    }
    if (!entityId) {
      return res.status(400).json({ error: 'entityId es obligatorio' });
    }

    const languageCode = asText(req.body?.language_code).toLowerCase();
    if (!languageCode) {
      return res.status(400).json({ error: 'language_code es obligatorio' });
    }

    const Postgres = getPostgres();

    if (group === 'menu_groups') {
      const label = asText(req.body?.label);
      const secondary = asText(req.body?.secondary);
      if (!label) return res.status(400).json({ error: 'label es obligatorio' });

      const { data: existing } = await Postgres
        .from('system_menu_group_translations')
        .select('id')
        .eq('menu_group_id', entityId)
        .eq('language_code', languageCode)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await Postgres
          .from('system_menu_group_translations')
          .update({ menu_group_name: label, menu_group_short_name: secondary || null })
          .eq('id', existing.id);
        if (error) return res.status(500).json({ error: error.message });
      } else {
        const { error } = await Postgres
          .from('system_menu_group_translations')
          .insert({
            menu_group_id: entityId,
            language_code: languageCode,
            menu_group_name: label,
            menu_group_short_name: secondary || null,
          });
        if (error) return res.status(500).json({ error: error.message });
      }
    }

    if (group === 'screens') {
      const label = asText(req.body?.label);
      const secondary = asText(req.body?.secondary);
      if (!label) return res.status(400).json({ error: 'label es obligatorio' });

      const { data: existing } = await Postgres
        .from('screen_translations')
        .select('id')
        .eq('screen_id', entityId)
        .eq('language_code', languageCode)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await Postgres
          .from('screen_translations')
          .update({ screen_name: label, menu_label: secondary || null })
          .eq('id', existing.id);
        if (error) return res.status(500).json({ error: error.message });
      } else {
        const { error } = await Postgres
          .from('screen_translations')
          .insert({
            screen_id: entityId,
            language_code: languageCode,
            screen_name: label,
            menu_label: secondary || null,
          });
        if (error) return res.status(500).json({ error: error.message });
      }
    }

    if (group === 'actions') {
      const label = asText(req.body?.label);
      if (!label) return res.status(400).json({ error: 'label es obligatorio' });

      const { data: existing } = await Postgres
        .from('action_translations')
        .select('id')
        .eq('action_id', entityId)
        .eq('language_code', languageCode)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await Postgres
          .from('action_translations')
          .update({ action_name: label })
          .eq('id', existing.id);
        if (error) return res.status(500).json({ error: error.message });
      } else {
        const { error } = await Postgres
          .from('action_translations')
          .insert({
            action_id: entityId,
            language_code: languageCode,
            action_name: label,
          });
        if (error) return res.status(500).json({ error: error.message });
      }
    }

    if (group === 'lookup_groups') {
      const label = asText(req.body?.label);
      const secondary = asText(req.body?.secondary);
      if (!label || !secondary) return res.status(400).json({ error: 'label y secondary son obligatorios' });

      const { data: existing } = await Postgres
        .from('lookup_group_translations')
        .select('id')
        .eq('lookup_group_id', entityId)
        .eq('language_code', languageCode)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await Postgres
          .from('lookup_group_translations')
          .update({ label, short_label: secondary })
          .eq('id', existing.id);
        if (error) return res.status(500).json({ error: error.message });
      } else {
        const { error } = await Postgres
          .from('lookup_group_translations')
          .insert({
            lookup_group_id: entityId,
            language_code: languageCode,
            label,
            short_label: secondary,
          });
        if (error) return res.status(500).json({ error: error.message });
      }
    }

    if (group === 'lookup_values') {
      const label = asText(req.body?.label);
      const secondary = asText(req.body?.secondary);
      if (!label || !secondary) return res.status(400).json({ error: 'label y secondary son obligatorios' });

      const { data: existing } = await Postgres
        .from('lookup_value_translations')
        .select('id')
        .eq('lookup_value_id', entityId)
        .eq('language_code', languageCode)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await Postgres
          .from('lookup_value_translations')
          .update({ label, short_label: secondary })
          .eq('id', existing.id);
        if (error) return res.status(500).json({ error: error.message });
      } else {
        const { error } = await Postgres
          .from('lookup_value_translations')
          .insert({
            lookup_value_id: entityId,
            language_code: languageCode,
            label,
            short_label: secondary,
          });
        if (error) return res.status(500).json({ error: error.message });
      }
    }

    if (group === 'system_reports') {
      const label = asText(req.body?.label);
      const description = asText(req.body?.description);
      const notes = asText(req.body?.notes);
      if (!label || !description) {
        return res.status(400).json({ error: 'label y description son obligatorios' });
      }

      const { data: existing } = await Postgres
        .from('system_report_translations')
        .select('id')
        .eq('system_report_id', entityId)
        .eq('language_code', languageCode)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await Postgres
          .from('system_report_translations')
          .update({
            report_name: label,
            report_description: description,
            report_notes: notes || null,
          })
          .eq('id', existing.id);
        if (error) return res.status(500).json({ error: error.message });
      } else {
        const { error } = await Postgres
          .from('system_report_translations')
          .insert({
            system_report_id: entityId,
            language_code: languageCode,
            report_name: label,
            report_description: description,
            report_notes: notes || null,
          });
        if (error) return res.status(500).json({ error: error.message });
      }
    }

    if (group === 'report_parameters') {
      const label = asText(req.body?.label);
      const description = asText(req.body?.description);
      if (!label) {
        return res.status(400).json({ error: 'label es obligatorio' });
      }

      const { data: existing } = await Postgres
        .from('report_parameter_translations')
        .select('id')
        .eq('report_parameter_id', entityId)
        .eq('language_code', languageCode)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await Postgres
          .from('report_parameter_translations')
          .update({
            parameter_label: label,
            parameter_description: description || null,
          })
          .eq('id', existing.id);
        if (error) return res.status(500).json({ error: error.message });
      } else {
        const { error } = await Postgres
          .from('report_parameter_translations')
          .insert({
            report_parameter_id: entityId,
            language_code: languageCode,
            parameter_label: label,
            parameter_description: description || null,
          });
        if (error) return res.status(500).json({ error: error.message });
      }
    }

    if (group === 'system_messages') {
      const text = asText(req.body?.text);
      const isActive = req.body?.is_active !== false;
      if (!text) {
        return res.status(400).json({ error: 'text es obligatorio' });
      }

      const { data: messageKey, error: keyError } = await Postgres
        .from('system_message_keys')
        .select('id, message_key')
        .eq('id', entityId)
        .maybeSingle();
      if (keyError) return res.status(500).json({ error: keyError.message });
      if (!messageKey) return res.status(404).json({ error: 'Mensaje base no encontrado' });

      const { data: existing } = await Postgres
        .from('system_message_translations')
        .select('message_key, language_code')
        .eq('message_key', messageKey.message_key)
        .eq('language_code', languageCode)
        .maybeSingle();

      if (existing) {
        const { error } = await Postgres
          .from('system_message_translations')
          .update({
            translated_text: text,
            is_active: isActive,
            message_key_id: messageKey.id,
          })
          .eq('message_key', messageKey.message_key)
          .eq('language_code', languageCode);
        if (error) return res.status(500).json({ error: error.message });
      } else {
        const { error } = await Postgres
          .from('system_message_translations')
          .insert({
            message_key: messageKey.message_key,
            message_key_id: messageKey.id,
            language_code: languageCode,
            translated_text: text,
            is_active: isActive,
          });
        if (error) return res.status(500).json({ error: error.message });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Traduccion guardada',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

export default router;
