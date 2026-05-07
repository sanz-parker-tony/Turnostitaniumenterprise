/**
 * subscription-plans-routes.ts
 * Turnos Titanium Enterprise
 * CRUD para public.subscription_plans (SaaS plans)
 */

import { Router, Request, Response } from 'express';
import { createDbClient } from '../lib/postgres-client.js';

const router = Router();

function getPostgres() {
  return createDbClient(
    process.env.Postgres_URL || '',
    process.env.Postgres_SERVICE_ROLE_KEY || ''
  );
}

function normalizePlanKey(value: string): string {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
}

function parseNumberOrDefault(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseIntegerOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.trunc(n));
}

function parseFeatures(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();
    const { data, error } = await Postgres
      .from('subscription_plans')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('plan_name', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, plans: data || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const Postgres = getPostgres();
    const { data, error } = await Postgres
      .from('subscription_plans')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Plan no encontrado' });
    return res.status(200).json({ success: true, plan: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const plan_key = normalizePlanKey(body.plan_key);
    const plan_name = String(body.plan_name || '').trim();

    if (!plan_key || !plan_name) {
      return res.status(400).json({ error: 'Campos obligatorios: plan_key, plan_name' });
    }
    if (!/^[A-Z0-9_-]{2,80}$/.test(plan_key)) {
      return res.status(400).json({ error: 'plan_key inválido: use mayúsculas, números, _ o -' });
    }

    const currency_code = String(body.currency_code || 'USD').trim().toUpperCase().slice(0, 3);
    const payload = {
      plan_key,
      plan_name,
      plan_description: body.plan_description || null,
      price_monthly: parseNumberOrDefault(body.price_monthly, 0),
      price_yearly: parseNumberOrDefault(body.price_yearly, 0),
      currency_code,
      max_users: parseIntegerOrNull(body.max_users),
      max_employees: parseIntegerOrNull(body.max_employees),
      max_companies: parseIntegerOrNull(body.max_companies),
      max_locations: parseIntegerOrNull(body.max_locations),
      features: parseFeatures(body.features),
      trial_days: Math.max(0, parseIntegerOrNull(body.trial_days) || 0),
      is_active: body.is_active !== false,
      is_featured: body.is_featured === true,
      sort_order: Math.max(0, parseIntegerOrNull(body.sort_order) || 0),
      created_by: 'system',
    };

    const Postgres = getPostgres();
    const { data: duplicate } = await Postgres
      .from('subscription_plans')
      .select('id')
      .eq('plan_key', plan_key)
      .maybeSingle();

    if (duplicate) {
      return res.status(409).json({ error: `Ya existe un plan con clave ${plan_key}` });
    }

    const { data, error } = await Postgres
      .from('subscription_plans')
      .insert(payload)
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ success: true, plan: data, message: 'Plan creado correctamente' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const Postgres = getPostgres();

    const { data: existing } = await Postgres
      .from('subscription_plans')
      .select('id, plan_key')
      .eq('id', id)
      .maybeSingle();

    if (!existing) return res.status(404).json({ error: 'Plan no encontrado' });

    const updateData: Record<string, unknown> = {
      updated_by: 'system',
      updated_at: new Date().toISOString(),
    };

    if (body.plan_key !== undefined) {
      const plan_key = normalizePlanKey(body.plan_key);
      if (!/^[A-Z0-9_-]{2,80}$/.test(plan_key)) {
        return res.status(400).json({ error: 'plan_key inválido: use mayúsculas, números, _ o -' });
      }
      if (plan_key !== existing.plan_key) {
        const { data: duplicate } = await Postgres
          .from('subscription_plans')
          .select('id')
          .eq('plan_key', plan_key)
          .neq('id', id)
          .maybeSingle();
        if (duplicate) {
          return res.status(409).json({ error: `Ya existe un plan con clave ${plan_key}` });
        }
      }
      updateData.plan_key = plan_key;
    }

    if (body.plan_name !== undefined) updateData.plan_name = String(body.plan_name || '').trim();
    if (body.plan_description !== undefined) updateData.plan_description = body.plan_description || null;
    if (body.price_monthly !== undefined) updateData.price_monthly = parseNumberOrDefault(body.price_monthly, 0);
    if (body.price_yearly !== undefined) updateData.price_yearly = parseNumberOrDefault(body.price_yearly, 0);
    if (body.currency_code !== undefined) {
      updateData.currency_code = String(body.currency_code || 'USD').trim().toUpperCase().slice(0, 3);
    }
    if (body.max_users !== undefined) updateData.max_users = parseIntegerOrNull(body.max_users);
    if (body.max_employees !== undefined) updateData.max_employees = parseIntegerOrNull(body.max_employees);
    if (body.max_companies !== undefined) updateData.max_companies = parseIntegerOrNull(body.max_companies);
    if (body.max_locations !== undefined) updateData.max_locations = parseIntegerOrNull(body.max_locations);
    if (body.features !== undefined) updateData.features = parseFeatures(body.features);
    if (body.trial_days !== undefined) updateData.trial_days = Math.max(0, parseIntegerOrNull(body.trial_days) || 0);
    if (body.is_active !== undefined) updateData.is_active = body.is_active === true;
    if (body.is_featured !== undefined) updateData.is_featured = body.is_featured === true;
    if (body.sort_order !== undefined) updateData.sort_order = Math.max(0, parseIntegerOrNull(body.sort_order) || 0);

    const { data, error } = await Postgres
      .from('subscription_plans')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, plan: data, message: 'Plan actualizado correctamente' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body || {};
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active debe ser booleano' });
    }

    const Postgres = getPostgres();
    const { data, error } = await Postgres
      .from('subscription_plans')
      .update({
        is_active,
        updated_by: 'system',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Plan no encontrado' });
    return res.status(200).json({ success: true, plan: data, message: `Plan ${is_active ? 'activado' : 'desactivado'}` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const Postgres = getPostgres();

    const { data: existing } = await Postgres
      .from('subscription_plans')
      .select('id, plan_key')
      .eq('id', id)
      .maybeSingle();

    if (!existing) return res.status(404).json({ error: 'Plan no encontrado' });

    const { error } = await Postgres
      .from('subscription_plans')
      .delete()
      .eq('id', id);

    if (error) {
      const lower = String(error.message || '').toLowerCase();
      if (lower.includes('foreign key') || lower.includes('violates')) {
        return res.status(409).json({ error: 'No se puede eliminar: el plan está siendo usado por suscripciones.' });
      }
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true, message: `Plan ${existing.plan_key} eliminado correctamente` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;

