import { Router, Request, Response } from 'express';
import { createDbClient } from '../lib/postgres-client.js';

const router = Router();

function getPostgres() {
  return createDbClient(
    process.env.Postgres_URL || '',
    process.env.Postgres_SERVICE_ROLE_KEY || ''
  );
}

function normalizeMessageKey(value: string) {
  return String(value || '').trim().toUpperCase();
}

function isValidMessageKey(value: string) {
  return /^[A-Z0-9._-]+$/.test(value) && value.length >= 3;
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();
    const { data, error } = await Postgres
      .from('system_message_keys')
      .select('*')
      .order('message_key', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      success: true,
      messageKeys: data || [],
      count: (data || []).length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const Postgres = getPostgres();
    const { data, error } = await Postgres
      .from('system_message_keys')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    if (!data) {
      return res.status(404).json({ error: 'Clave de mensaje no encontrada' });
    }

    return res.status(200).json({ success: true, messageKey: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const message_key = normalizeMessageKey(body.message_key);
    const default_text = String(body.default_text || '').trim();
    const is_active = body.is_active !== false;

    if (!message_key || !default_text) {
      return res.status(400).json({ error: 'Campos obligatorios: message_key, default_text' });
    }
    if (!isValidMessageKey(message_key)) {
      return res.status(400).json({ error: 'message_key invalido. Use A-Z, 0-9, ".", "_" o "-"' });
    }

    const Postgres = getPostgres();
    const { data: existing } = await Postgres
      .from('system_message_keys')
      .select('id')
      .eq('message_key', message_key)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'Ya existe una clave de mensaje con ese codigo' });
    }

    const { data, error } = await Postgres
      .from('system_message_keys')
      .insert({
        message_key,
        default_text,
        is_active,
      })
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({
      success: true,
      messageKey: data,
      message: 'Clave de mensaje creada',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const updateData: any = {};

    if (body.message_key !== undefined) {
      const message_key = normalizeMessageKey(body.message_key);
      if (!message_key) {
        return res.status(400).json({ error: 'message_key no puede estar vacio' });
      }
      if (!isValidMessageKey(message_key)) {
        return res.status(400).json({ error: 'message_key invalido. Use A-Z, 0-9, ".", "_" o "-"' });
      }
      updateData.message_key = message_key;
    }

    if (body.default_text !== undefined) {
      const default_text = String(body.default_text || '').trim();
      if (!default_text) {
        return res.status(400).json({ error: 'default_text no puede estar vacio' });
      }
      updateData.default_text = default_text;
    }

    if (body.is_active !== undefined) {
      updateData.is_active = Boolean(body.is_active);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    const Postgres = getPostgres();
    const { data: current, error: currentError } = await Postgres
      .from('system_message_keys')
      .select('id, message_key')
      .eq('id', id)
      .maybeSingle();

    if (currentError) {
      return res.status(500).json({ error: currentError.message });
    }
    if (!current) {
      return res.status(404).json({ error: 'Clave de mensaje no encontrada' });
    }

    if (updateData.message_key && updateData.message_key !== current.message_key) {
      const { data: dup } = await Postgres
        .from('system_message_keys')
        .select('id')
        .eq('message_key', updateData.message_key)
        .neq('id', id)
        .maybeSingle();
      if (dup) {
        return res.status(409).json({ error: 'Ya existe una clave de mensaje con ese codigo' });
      }
    }

    const { data, error } = await Postgres
      .from('system_message_keys')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      success: true,
      messageKey: data,
      message: 'Clave de mensaje actualizada',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
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
      .from('system_message_keys')
      .update({ is_active })
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    if (!data) {
      return res.status(404).json({ error: 'Clave de mensaje no encontrada' });
    }

    return res.status(200).json({
      success: true,
      messageKey: data,
      message: `Registro ${is_active ? 'activado' : 'desactivado'}`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const Postgres = getPostgres();

    const { data: current, error: currentError } = await Postgres
      .from('system_message_keys')
      .select('id, message_key')
      .eq('id', id)
      .maybeSingle();

    if (currentError) {
      return res.status(500).json({ error: currentError.message });
    }
    if (!current) {
      return res.status(404).json({ error: 'Clave de mensaje no encontrada' });
    }

    // Borrado seguro de traducciones relacionadas antes de borrar la clave.
    const { error: translationsByIdError } = await Postgres
      .from('system_message_translations')
      .delete()
      .eq('message_key_id', id);

    if (translationsByIdError) {
      return res.status(500).json({ error: translationsByIdError.message });
    }

    const { error: translationsByKeyError } = await Postgres
      .from('system_message_translations')
      .delete()
      .eq('message_key', current.message_key);

    if (translationsByKeyError) {
      return res.status(500).json({ error: translationsByKeyError.message });
    }

    const { error } = await Postgres
      .from('system_message_keys')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      success: true,
      message: 'Clave de mensaje eliminada',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

export default router;

