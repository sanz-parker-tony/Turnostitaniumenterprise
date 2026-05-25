import { Router, Request, Response } from 'express';
import { createDbClient } from '../lib/postgres-client.js';

const router = Router();

function getPostgres() {
  return createDbClient(
    process.env.Postgres_URL || '',
    process.env.Postgres_SERVICE_ROLE_KEY || ''
  );
}

function getActor(req: Request) {
  const user = (req as any)?.user;
  return String(user?.email || user?.id || 'SYSTEM');
}

function normalizeCode(value: string) {
  return String(value || '').trim().toUpperCase();
}

function validateReportCode(reportCode: string) {
  return /^RPT_[A-Z0-9_]+$/.test(reportCode) && reportCode.length >= 5;
}

async function getLookupByGroupKey(groupKey: string) {
  const Postgres = getPostgres();
  const { data: group, error: groupError } = await Postgres
    .from('lookup_groups')
    .select('id')
    .eq('lookup_group_key', groupKey)
    .maybeSingle();

  if (groupError) throw new Error(groupError.message);
  if (!group?.id) return [];

  const { data, error } = await Postgres
    .from('lookup_values')
    .select('id, lookup_key, lookup_label, lookup_short_label, is_active, sort_order')
    .eq('lookup_group_id', group.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

router.get('/catalogs/handler-types', async (_req: Request, res: Response) => {
  try {
    const values = await getLookupByGroupKey('REPORT_HANDLER');
    return res.status(200).json({ success: true, handlerTypes: values });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

router.get('/catalogs/application-modules', async (_req: Request, res: Response) => {
  try {
    const values = await getLookupByGroupKey('APPLICATION_MODULE');
    return res.status(200).json({ success: true, applicationModules: values });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

router.get('/catalogs/parameter-data-types', async (_req: Request, res: Response) => {
  try {
    const values = await getLookupByGroupKey('DATA_TYPE');
    return res.status(200).json({ success: true, dataTypes: values });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

router.get('/catalogs/parameter-ui-controls', async (_req: Request, res: Response) => {
  try {
    const values = await getLookupByGroupKey('UI_CONTROL');
    return res.status(200).json({ success: true, uiControls: values });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

router.get('/catalogs/lookup-groups', async (_req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();
    const { data, error } = await Postgres
      .from('lookup_groups')
      .select('id, lookup_group_key, lookup_group_label, lookup_group_short_label, is_active')
      .eq('is_active', true)
      .order('lookup_group_key', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, lookupGroups: data || [] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

router.get('/', async (_req: Request, res: Response) => {
  try {
    const Postgres = getPostgres();
    const { data, error } = await Postgres
      .from('system_reports')
      .select(`
        *,
        handler_type:lookup_values!system_reports_handler_type_id_fkey(id, lookup_key, lookup_label),
        application_module:lookup_values!system_reports_application_module_id_fkey(id, lookup_key, lookup_label)
      `)
      .order('report_code', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({
      success: true,
      reports: data || [],
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
      .from('system_reports')
      .select(`
        *,
        handler_type:lookup_values!system_reports_handler_type_id_fkey(id, lookup_key, lookup_label),
        application_module:lookup_values!system_reports_application_module_id_fkey(id, lookup_key, lookup_label)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Reporte no encontrado' });

    return res.status(200).json({ success: true, report: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

router.get('/:id/parameters', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const Postgres = getPostgres();

    const { data: report, error: reportError } = await Postgres
      .from('system_reports')
      .select('id')
      .eq('id', id)
      .maybeSingle();
    if (reportError) return res.status(500).json({ error: reportError.message });
    if (!report) return res.status(404).json({ error: 'Reporte no encontrado' });

    const { data, error } = await Postgres
      .from('report_parameters')
      .select(`
        *,
        data_type:lookup_values!report_parameters_data_type_id_fkey(id, lookup_key, lookup_label),
        ui_control:lookup_values!report_parameters_ui_control_id_fkey(id, lookup_key, lookup_label),
        lookup_group:lookup_groups!report_parameters_lookup_group_id_fkey(id, lookup_group_key, lookup_group_label)
      `)
      .eq('system_report_id', id)
      .order('sort_order', { ascending: true })
      .order('parameter_key', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({
      success: true,
      parameters: data || [],
      count: (data || []).length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

router.post('/:id/parameters', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const Postgres = getPostgres();

    const { data: report, error: reportError } = await Postgres
      .from('system_reports')
      .select('id')
      .eq('id', id)
      .maybeSingle();
    if (reportError) return res.status(500).json({ error: reportError.message });
    if (!report) return res.status(404).json({ error: 'Reporte no encontrado' });

    const parameter_key = normalizeCode(body.parameter_key);
    const parameter_label = String(body.parameter_label || '').trim();
    const parameter_description = String(body.parameter_description || '').trim();
    const data_type_id = String(body.data_type_id || '').trim();
    const ui_control_id = String(body.ui_control_id || '').trim();
    const lookup_group_id = String(body.lookup_group_id || '').trim();
    const default_value = body.default_value === undefined || body.default_value === null
      ? null
      : String(body.default_value);
    const is_required = body.is_required === true;
    const is_multi_value = body.is_multi_value === true;
    const sort_order = Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0;
    const is_active = body.is_active !== false;

    if (!parameter_key || !parameter_label || !data_type_id || !ui_control_id) {
      return res.status(400).json({
        error: 'Campos obligatorios: parameter_key, parameter_label, data_type_id, ui_control_id',
      });
    }

    const { data: existing } = await Postgres
      .from('report_parameters')
      .select('id')
      .eq('system_report_id', id)
      .eq('parameter_key', parameter_key)
      .maybeSingle();
    if (existing) {
      return res.status(409).json({ error: 'Ya existe un parametro con esa clave para este reporte' });
    }

    const { data: dataType, error: dataTypeError } = await Postgres
      .from('lookup_values')
      .select('id, lookup_key')
      .eq('id', data_type_id)
      .maybeSingle();
    if (dataTypeError) return res.status(500).json({ error: dataTypeError.message });
    if (!dataType) return res.status(400).json({ error: 'data_type_id invalido' });
    if (String(dataType.lookup_key || '').toUpperCase() === 'LOOKUP' && !lookup_group_id) {
      return res.status(400).json({ error: 'lookup_group_id es obligatorio cuando el tipo de dato es LOOKUP' });
    }

    const { data, error } = await Postgres
      .from('report_parameters')
      .insert({
        system_report_id: id,
        parameter_key,
        parameter_label,
        parameter_description: parameter_description || null,
        data_type_id,
        ui_control_id,
        is_required,
        default_value,
        lookup_group_id: lookup_group_id || null,
        is_multi_value,
        sort_order,
        is_active,
        created_by: getActor(req),
      })
      .select(`
        *,
        data_type:lookup_values!report_parameters_data_type_id_fkey(id, lookup_key, lookup_label),
        ui_control:lookup_values!report_parameters_ui_control_id_fkey(id, lookup_key, lookup_label),
        lookup_group:lookup_groups!report_parameters_lookup_group_id_fkey(id, lookup_group_key, lookup_group_label)
      `)
      .single();

    if (error) return res.status(500).json({ error: error.message });

    return res.status(201).json({
      success: true,
      parameter: data,
      message: 'Parametro de reporte creado',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

router.put('/:id/parameters/:parameterId', async (req: Request, res: Response) => {
  try {
    const { id, parameterId } = req.params;
    const body = req.body || {};
    const Postgres = getPostgres();

    const { data: current, error: currentError } = await Postgres
      .from('report_parameters')
      .select('id, system_report_id, parameter_key')
      .eq('id', parameterId)
      .eq('system_report_id', id)
      .maybeSingle();
    if (currentError) return res.status(500).json({ error: currentError.message });
    if (!current) return res.status(404).json({ error: 'Parametro no encontrado para el reporte indicado' });

    const updateData: any = {
      updated_by: getActor(req),
      updated_at: new Date().toISOString(),
    };

    if (body.parameter_key !== undefined) {
      const nextKey = normalizeCode(body.parameter_key);
      if (!nextKey) return res.status(400).json({ error: 'parameter_key no puede estar vacio' });
      if (nextKey !== current.parameter_key) {
        const { data: dup } = await Postgres
          .from('report_parameters')
          .select('id')
          .eq('system_report_id', id)
          .eq('parameter_key', nextKey)
          .neq('id', parameterId)
          .maybeSingle();
        if (dup) return res.status(409).json({ error: 'Ya existe un parametro con esa clave para este reporte' });
      }
      updateData.parameter_key = nextKey;
    }

    if (body.parameter_label !== undefined) {
      const v = String(body.parameter_label || '').trim();
      if (!v) return res.status(400).json({ error: 'parameter_label no puede estar vacio' });
      updateData.parameter_label = v;
    }

    if (body.parameter_description !== undefined) {
      updateData.parameter_description = String(body.parameter_description || '').trim() || null;
    }

    if (body.data_type_id !== undefined) {
      const v = String(body.data_type_id || '').trim();
      if (!v) return res.status(400).json({ error: 'data_type_id no puede estar vacio' });
      updateData.data_type_id = v;
    }

    if (body.ui_control_id !== undefined) {
      const v = String(body.ui_control_id || '').trim();
      if (!v) return res.status(400).json({ error: 'ui_control_id no puede estar vacio' });
      updateData.ui_control_id = v;
    }

    if (body.lookup_group_id !== undefined) {
      updateData.lookup_group_id = String(body.lookup_group_id || '').trim() || null;
    }

    if (body.default_value !== undefined) {
      updateData.default_value = body.default_value === null ? null : String(body.default_value);
    }

    if (body.is_required !== undefined) updateData.is_required = Boolean(body.is_required);
    if (body.is_multi_value !== undefined) updateData.is_multi_value = Boolean(body.is_multi_value);
    if (body.sort_order !== undefined) {
      const n = Number(body.sort_order);
      if (!Number.isFinite(n)) return res.status(400).json({ error: 'sort_order debe ser numerico' });
      updateData.sort_order = n;
    }
    if (body.is_active !== undefined) updateData.is_active = Boolean(body.is_active);

    const effectiveDataTypeId = updateData.data_type_id || body.data_type_id || undefined;
    const effectiveLookupGroupId = updateData.lookup_group_id !== undefined
      ? updateData.lookup_group_id
      : undefined;
    if (effectiveDataTypeId) {
      const { data: dataType, error: dataTypeError } = await Postgres
        .from('lookup_values')
        .select('id, lookup_key')
        .eq('id', effectiveDataTypeId)
        .maybeSingle();
      if (dataTypeError) return res.status(500).json({ error: dataTypeError.message });
      if (!dataType) return res.status(400).json({ error: 'data_type_id invalido' });
      const nextLookupGroup = effectiveLookupGroupId !== undefined
        ? effectiveLookupGroupId
        : (body.lookup_group_id !== undefined
          ? (String(body.lookup_group_id || '').trim() || null)
          : undefined);
      if (String(dataType.lookup_key || '').toUpperCase() === 'LOOKUP' && !nextLookupGroup) {
        return res.status(400).json({ error: 'lookup_group_id es obligatorio cuando el tipo de dato es LOOKUP' });
      }
    }

    const { data, error } = await Postgres
      .from('report_parameters')
      .update(updateData)
      .eq('id', parameterId)
      .eq('system_report_id', id)
      .select(`
        *,
        data_type:lookup_values!report_parameters_data_type_id_fkey(id, lookup_key, lookup_label),
        ui_control:lookup_values!report_parameters_ui_control_id_fkey(id, lookup_key, lookup_label),
        lookup_group:lookup_groups!report_parameters_lookup_group_id_fkey(id, lookup_group_key, lookup_group_label)
      `)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Parametro no encontrado para el reporte indicado' });

    return res.status(200).json({
      success: true,
      parameter: data,
      message: 'Parametro de reporte actualizado',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

router.patch('/:id/parameters/:parameterId/status', async (req: Request, res: Response) => {
  try {
    const { id, parameterId } = req.params;
    const { is_active } = req.body || {};
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active debe ser booleano' });
    }

    const Postgres = getPostgres();
    const { data, error } = await Postgres
      .from('report_parameters')
      .update({
        is_active,
        updated_by: getActor(req),
        updated_at: new Date().toISOString(),
      })
      .eq('id', parameterId)
      .eq('system_report_id', id)
      .select('id, system_report_id, is_active')
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Parametro no encontrado para el reporte indicado' });

    return res.status(200).json({
      success: true,
      parameter: data,
      message: `Parametro ${is_active ? 'activado' : 'desactivado'}`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

router.delete('/:id/parameters/:parameterId', async (req: Request, res: Response) => {
  try {
    const { id, parameterId } = req.params;
    const Postgres = getPostgres();
    const { data: current, error: currentError } = await Postgres
      .from('report_parameters')
      .select('id, system_report_id')
      .eq('id', parameterId)
      .eq('system_report_id', id)
      .maybeSingle();

    if (currentError) return res.status(500).json({ error: currentError.message });
    if (!current) return res.status(404).json({ error: 'Parametro no encontrado para el reporte indicado' });

    const translations = await Postgres
      .from('report_parameter_translations')
      .select('id')
      .eq('report_parameter_id', parameterId);

    const blockers = {
      report_parameter_translations: (translations.data || []).length,
    };
    if (Object.values(blockers).some((v) => v > 0)) {
      return res.status(409).json({
        error: 'No se puede eliminar el parametro: existen registros relacionados',
        blockers,
      });
    }

    const { error } = await Postgres
      .from('report_parameters')
      .delete()
      .eq('id', parameterId)
      .eq('system_report_id', id);
    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({
      success: true,
      message: 'Parametro eliminado',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const report_code = normalizeCode(body.report_code);
    const report_name = String(body.report_name || '').trim();
    const report_description = String(body.report_description || '').trim();
    const report_notes = String(body.report_notes || '').trim();
    const handler_type_id = String(body.handler_type_id || '').trim();
    const report_handler = String(body.report_handler || '').trim();
    const application_module_id = String(body.application_module_id || '').trim();
    const is_active = body.is_active !== false;

    if (!report_code || !report_name || !report_description || !handler_type_id || !report_handler) {
      return res.status(400).json({ error: 'Campos obligatorios: report_code, report_name, report_description, handler_type_id, report_handler' });
    }
    if (!validateReportCode(report_code)) {
      return res.status(400).json({ error: 'report_code invalido. Debe iniciar con RPT_ y usar A-Z, 0-9 o _' });
    }

    const Postgres = getPostgres();
    const { data: existing } = await Postgres
      .from('system_reports')
      .select('id')
      .eq('report_code', report_code)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'Ya existe un reporte con ese codigo' });
    }

    const { data, error } = await Postgres
      .from('system_reports')
      .insert({
        report_code,
        report_name,
        report_description,
        report_notes: report_notes || null,
        handler_type_id,
        report_handler,
        application_module_id: application_module_id || null,
        is_active,
        created_by: getActor(req),
      })
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });

    return res.status(201).json({
      success: true,
      report: data,
      message: 'Reporte creado',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const Postgres = getPostgres();

    const { data: current, error: currentError } = await Postgres
      .from('system_reports')
      .select('id, report_code')
      .eq('id', id)
      .maybeSingle();

    if (currentError) return res.status(500).json({ error: currentError.message });
    if (!current) return res.status(404).json({ error: 'Reporte no encontrado' });

    const updateData: any = {
      updated_by: getActor(req),
      updated_at: new Date().toISOString(),
    };

    if (body.report_code !== undefined) {
      const nextCode = normalizeCode(body.report_code);
      if (!validateReportCode(nextCode)) {
        return res.status(400).json({ error: 'report_code invalido. Debe iniciar con RPT_ y usar A-Z, 0-9 o _' });
      }
      if (nextCode !== current.report_code) {
        const { data: dup } = await Postgres
          .from('system_reports')
          .select('id')
          .eq('report_code', nextCode)
          .neq('id', id)
          .maybeSingle();
        if (dup) return res.status(409).json({ error: 'Ya existe un reporte con ese codigo' });
      }
      updateData.report_code = nextCode;
    }

    if (body.report_name !== undefined) {
      const v = String(body.report_name || '').trim();
      if (!v) return res.status(400).json({ error: 'report_name no puede estar vacio' });
      updateData.report_name = v;
    }

    if (body.report_description !== undefined) {
      const v = String(body.report_description || '').trim();
      if (!v) return res.status(400).json({ error: 'report_description no puede estar vacio' });
      updateData.report_description = v;
    }

    if (body.report_notes !== undefined) updateData.report_notes = String(body.report_notes || '').trim() || null;

    if (body.handler_type_id !== undefined) {
      const v = String(body.handler_type_id || '').trim();
      if (!v) return res.status(400).json({ error: 'handler_type_id no puede estar vacio' });
      updateData.handler_type_id = v;
    }

    if (body.report_handler !== undefined) {
      const v = String(body.report_handler || '').trim();
      if (!v) return res.status(400).json({ error: 'report_handler no puede estar vacio' });
      updateData.report_handler = v;
    }

    if (body.application_module_id !== undefined) {
      updateData.application_module_id = String(body.application_module_id || '').trim() || null;
    }

    if (body.is_active !== undefined) updateData.is_active = Boolean(body.is_active);

    const { data, error } = await Postgres
      .from('system_reports')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({
      success: true,
      report: data,
      message: 'Reporte actualizado',
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
      .from('system_reports')
      .update({
        is_active,
        updated_by: getActor(req),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Reporte no encontrado' });

    return res.status(200).json({
      success: true,
      report: data,
      message: `Reporte ${is_active ? 'activado' : 'desactivado'}`,
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
      .from('system_reports')
      .select('id, report_code')
      .eq('id', id)
      .maybeSingle();
    if (currentError) return res.status(500).json({ error: currentError.message });
    if (!current) return res.status(404).json({ error: 'Reporte no encontrado' });

    const [paramsCount, permsCount, scopeCount, transCount, execCount] = await Promise.all([
      Postgres.from('report_parameters').select('id').eq('system_report_id', id),
      Postgres.from('report_permissions').select('id').eq('system_report_id', id),
      Postgres.from('report_scope_policies').select('id').eq('system_report_id', id),
      Postgres.from('system_report_translations').select('id').eq('system_report_id', id),
      Postgres.from('report_executions').select('id').eq('system_report_id', id),
    ]);

    const blockers = {
      report_parameters: (paramsCount.data || []).length,
      report_permissions: (permsCount.data || []).length,
      report_scope_policies: (scopeCount.data || []).length,
      system_report_translations: (transCount.data || []).length,
      report_executions: (execCount.data || []).length,
    };
    const hasBlockers = Object.values(blockers).some((v) => v > 0);
    if (hasBlockers) {
      return res.status(409).json({
        error: 'No se puede eliminar: existen registros relacionados',
        blockers,
      });
    }

    const { error } = await Postgres
      .from('system_reports')
      .delete()
      .eq('id', id);
    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({
      success: true,
      message: 'Reporte eliminado',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

export default router;
