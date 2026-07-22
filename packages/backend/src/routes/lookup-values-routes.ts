/**
 * lookup-values-routes.ts
 * Turnos Titanium Enterprise
 *
 * Rutas para gestion de Valores de Catalogo (lookup_values)
 */

import { Router, Request, Response } from 'express';
import { createDbClient } from '../lib/postgres-client.js';
import { pool } from '../lib/db.js';

const router = Router();

type AuthContext = {
  userId: string;
  tenantId: string;
  authUserId: string;
};

type CatalogManagementPolicy = {
  value_scope?: 'SYSTEM' | 'TENANT' | 'INHERIT';
  value_permissions?: Partial<Record<'create' | 'update' | 'delete', string[]>>;
  required_metadata?: Record<string, { type?: string; unique_within_group?: boolean }>;
};

async function getRoleKeys(ctx: AuthContext): Promise<string[]> {
  const result = await pool.query(
    `SELECT DISTINCT r.role_key
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id AND r.is_active = true
      WHERE ur.user_id = $1 AND ur.tenant_id = $2 AND ur.is_active = true`,
    [ctx.userId, ctx.tenantId]
  );
  return result.rows.map((row) => String(row.role_key || '').trim().toUpperCase()).filter(Boolean);
}

function policyAllows(
  policy: CatalogManagementPolicy | null | undefined,
  action: 'create' | 'update' | 'delete',
  roleKeys: string[]
): boolean | null {
  const configuredRoles = policy?.value_permissions?.[action];
  if (!Array.isArray(configuredRoles) || configuredRoles.length === 0) return null;
  const allowed = new Set(configuredRoles.map((role) => String(role).trim().toUpperCase()));
  return roleKeys.some((role) => allowed.has(role));
}

function validateConfiguredMetadata(
  policy: CatalogManagementPolicy | null | undefined,
  metadata: Record<string, unknown>
): string | null {
  for (const [key, rule] of Object.entries(policy?.required_metadata || {})) {
    const value = metadata?.[key];
    if (rule?.type === 'positive_integer' && (!Number.isInteger(Number(value)) || Number(value) <= 0)) {
      return `El metadato ${key} debe ser un entero positivo`;
    }
    if (value === undefined || value === null || value === '') {
      return `El metadato ${key} es obligatorio`;
    }
  }
  return null;
}

async function resolveAuthContext(req: Request): Promise<AuthContext | null> {
  const authUserId = String((req as any)?.user?.id || '').trim();
  if (!authUserId) return null;

  const userResult = await pool.query(
    `
      SELECT u.id AS user_id, u.tenant_id
      FROM users u
      WHERE u.auth_user_id = $1
        AND u.is_active = true
      LIMIT 1
    `,
    [authUserId]
  );

  const row = userResult.rows[0];
  if (!row?.user_id || !row?.tenant_id) return null;

  return {
    userId: String(row.user_id),
    tenantId: String(row.tenant_id),
    authUserId,
  };
}

async function hasRole(ctx: AuthContext, roleKey: 'SYSTEM_ADMIN' | 'TENANT_ADMIN'): Promise<boolean> {
  const result = await pool.query(
    `
      SELECT 1
      FROM user_roles ur
      JOIN roles r
        ON r.id = ur.role_id
       AND r.is_active = true
      WHERE ur.user_id = $1
        AND ur.tenant_id = $2
        AND ur.is_active = true
        AND r.role_key = $3
      LIMIT 1
    `,
    [ctx.userId, ctx.tenantId, roleKey]
  );

  return result.rows.length > 0;
}

type TableReference = {
  schema_name: string;
  table_name: string;
  column_name: string;
  constraint_name: string;
};

function quoteIdent(value: string): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

async function getForeignKeyReferences(targetTable: string): Promise<TableReference[]> {
  const result = await pool.query(
    `
      SELECT
        ns.nspname AS schema_name,
        cls.relname AS table_name,
        att.attname AS column_name,
        con.conname AS constraint_name
      FROM pg_constraint con
      JOIN pg_class cls
        ON cls.oid = con.conrelid
      JOIN pg_namespace ns
        ON ns.oid = cls.relnamespace
      JOIN unnest(con.conkey) WITH ORDINALITY AS cols(attnum, ord)
        ON TRUE
      JOIN pg_attribute att
        ON att.attrelid = cls.oid
       AND att.attnum = cols.attnum
      WHERE con.contype = 'f'
        AND con.confrelid = $1::regclass
        AND ns.nspname NOT IN ('pg_catalog', 'information_schema')
    `,
    [targetTable]
  );

  return result.rows || [];
}

async function findReferenceUsage(targetTable: string, id: string, ignoreTables: string[] = []): Promise<{ table: string; count: number }[]> {
  const refs = await getForeignKeyReferences(targetTable);
  const blocked: { table: string; count: number }[] = [];
  const ignoreSet = new Set(ignoreTables.map(t => t.toLowerCase()));

  for (const ref of refs) {
    const fqTable = `${ref.schema_name}.${ref.table_name}`;
    if (ignoreSet.has(fqTable.toLowerCase())) continue;

    const sql = `
      SELECT COUNT(*)::int AS total
      FROM ${quoteIdent(ref.schema_name)}.${quoteIdent(ref.table_name)}
      WHERE ${quoteIdent(ref.column_name)} = $1
    `;
    const usageResult = await pool.query(sql, [id]);
    const total = Number(usageResult.rows?.[0]?.total || 0);
    if (total > 0) {
      blocked.push({ table: fqTable, count: total });
    }
  }

  return blocked;
}

// ============================================================================
// GET /lookup-values?group_id=xxx - Listar valores por grupo
// ============================================================================

router.get('/', async (req: Request, res: Response) => {
  try {
    let groupId = req.query.group_id as string | undefined;
    const groupKey = req.query.group as string | undefined;
    const tenantIdQuery = String(req.query.tenant_id || '').trim() || null;
    const includeAllTenants = String(req.query.include_all_tenants || '').trim().toLowerCase() === 'true';

    const Postgres = createDbClient(
      process.env.Postgres_URL || '',
      process.env.Postgres_SERVICE_ROLE_KEY || ''
    );

    const ctx = await resolveAuthContext(req);
    const isSystemAdmin = ctx ? await hasRole(ctx, 'SYSTEM_ADMIN') : false;
    const isTenantAdmin = ctx ? await hasRole(ctx, 'TENANT_ADMIN') : false;

    // Compatibilidad: permitir group=<LOOKUP_GROUP_KEY> ademas de group_id=<uuid>
    if (!groupId && groupKey) {
      const { data: lookupGroup, error: groupError } = await Postgres
        .from('lookup_groups')
        .select('id')
        .eq('lookup_group_key', groupKey)
        .maybeSingle();

      if (groupError) {
        console.error('[LOOKUP-VALUES] Error buscando grupo:', groupError);
        return res.status(500).json({ error: groupError.message });
      }

      if (!lookupGroup) {
        return res.status(200).json({
          success: true,
          values: [],
          count: 0,
          message: `Grupo ${groupKey} no encontrado`,
        });
      }

      groupId = lookupGroup.id;
    }

    if (!groupId) {
      return res.status(400).json({ error: 'Debe enviar group_id o group' });
    }

    const selectShape = `
      *,
      lookup_value_translations (
        id,
        language_code,
        label,
        short_label
      )
    `;

    const fetchSystemValues = async () =>
      Postgres
        .from('lookup_values')
        .select(selectShape)
        .eq('lookup_group_id', groupId)
        .is('tenant_id', null)
        .order('sort_order', { ascending: true });

    const fetchTenantValues = async (tenantId: string) =>
      Postgres
        .from('lookup_values')
        .select(selectShape)
        .eq('lookup_group_id', groupId)
        .eq('tenant_id', tenantId)
        .order('sort_order', { ascending: true });

    let values: any[] = [];

    if (isSystemAdmin && includeAllTenants) {
      const { data, error } = await Postgres
        .from('lookup_values')
        .select(selectShape)
        .eq('lookup_group_id', groupId)
        .order('sort_order', { ascending: true });
      if (error) {
        console.error('[LOOKUP-VALUES] Error cargando valores (includeAllTenants):', error);
        return res.status(500).json({ error: error.message });
      }
      values = data || [];
    } else if (isSystemAdmin && tenantIdQuery) {
      const [{ data: systemValues, error: systemError }, { data: tenantValues, error: tenantError }] = await Promise.all([
        fetchSystemValues(),
        fetchTenantValues(tenantIdQuery),
      ]);

      if (systemError || tenantError) {
        console.error('[LOOKUP-VALUES] Error cargando valores SYSTEM+TENANT:', systemError || tenantError);
        return res.status(500).json({ error: (systemError || tenantError)?.message || 'Error cargando valores' });
      }

      values = [...(systemValues || []), ...(tenantValues || [])];
    } else if (ctx && (isTenantAdmin || !isSystemAdmin)) {
      const targetTenantId = tenantIdQuery || ctx.tenantId;
      if (tenantIdQuery && tenantIdQuery !== ctx.tenantId && !isSystemAdmin) {
        return res.status(403).json({ error: 'No autorizado para consultar lookup_values de otro tenant' });
      }

      const [{ data: systemValues, error: systemError }, { data: tenantValues, error: tenantError }] = await Promise.all([
        fetchSystemValues(),
        fetchTenantValues(targetTenantId),
      ]);

      if (systemError || tenantError) {
        console.error('[LOOKUP-VALUES] Error cargando valores para tenant:', systemError || tenantError);
        return res.status(500).json({ error: (systemError || tenantError)?.message || 'Error cargando valores' });
      }

      values = [...(systemValues || []), ...(tenantValues || [])];
    } else {
      const { data, error } = await fetchSystemValues();
      if (error) {
        console.error('[LOOKUP-VALUES] Error cargando valores SYSTEM:', error);
        return res.status(500).json({ error: error.message });
      }
      values = data || [];
    }

    values.sort((a, b) => {
      const sa = Number(a?.sort_order ?? 0);
      const sb = Number(b?.sort_order ?? 0);
      if (sa !== sb) return sa - sb;
      return String(a?.lookup_key || '').localeCompare(String(b?.lookup_key || ''));
    });

    return res.status(200).json({
      success: true,
      values: values || [],
      count: (values || []).length,
      group: groupKey || null,
      group_id: groupId,
    });
  } catch (err) {
    console.error('[LOOKUP-VALUES] Error en GET /:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================================================
// GET /lookup-values/:id - Obtener un valor especifico
// ============================================================================

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    const Postgres = createDbClient(
      process.env.Postgres_URL || '',
      process.env.Postgres_SERVICE_ROLE_KEY || ''
    );

    const { data: value, error } = await Postgres
      .from('lookup_values')
      .select(`
        *,
        lookup_value_translations (
          id,
          language_code,
          label,
          short_label
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('[LOOKUP-VALUES] Error cargando valor:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!value) {
      return res.status(404).json({ error: 'Valor no encontrado' });
    }

    const { data: translations, error: transError } = await Postgres
      .from('lookup_value_translations')
      .select('id, language_code, label, short_label')
      .eq('lookup_value_id', id)
      .order('language_code', { ascending: true });

    if (transError) {
      console.error('[LOOKUP-VALUES] Error cargando traducciones del valor:', transError);
      return res.status(500).json({ error: transError.message });
    }

    const valueWithTranslations = {
      ...value,
      lookup_value_translations: translations || []
    };

    return res.status(200).json({
      success: true,
      value: valueWithTranslations,
    });
  } catch (err) {
    console.error('[LOOKUP-VALUES] Error en GET /:id:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================================================
// POST /lookup-values - Crear nuevo valor
// ============================================================================

router.post('/', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveAuthContext(req);
    if (!ctx) return res.status(401).json({ error: 'No autenticado' });

    const [isSystemAdmin, isTenantAdmin] = await Promise.all([
      hasRole(ctx, 'SYSTEM_ADMIN'),
      hasRole(ctx, 'TENANT_ADMIN'),
    ]);
    const roleKeys = await getRoleKeys(ctx);

    if (!isSystemAdmin && !isTenantAdmin) {
      return res.status(403).json({ error: 'Solo SYSTEM_ADMIN o TENANT_ADMIN puede crear valores de catalogo' });
    }

    const body = req.body;
    const {
      lookup_group_id,
      lookup_key,
      lookup_label,
      lookup_short_label,
      lookup_scope,
      tenant_id,
      sort_order,
      is_active,
      metadata,
      translations
    } = body;

    if (!lookup_group_id) {
      return res.status(400).json({ error: 'El grupo es obligatorio' });
    }

    if (!lookup_key?.trim()) {
      return res.status(400).json({ error: 'La clave es obligatoria' });
    }

    if (!lookup_label?.trim()) {
      return res.status(400).json({ error: 'La etiqueta es obligatoria' });
    }

    if (!lookup_short_label?.trim()) {
      return res.status(400).json({ error: 'La etiqueta corta es obligatoria' });
    }

    if (!/^[A-Z0-9_]+$/.test(lookup_key) || lookup_key.length < 2) {
      return res.status(400).json({
        error: 'La clave debe contener solo letras mayusculas, numeros y guiones bajos (minimo 2 caracteres)'
      });
    }

    const Postgres = createDbClient(
      process.env.Postgres_URL || '',
      process.env.Postgres_SERVICE_ROLE_KEY || ''
    );

    const { data: groupData, error: groupError } = await Postgres
      .from('lookup_groups')
      .select('id, allows_tenant_items, management_policy')
      .eq('id', lookup_group_id)
      .maybeSingle();

    if (groupError) {
      return res.status(500).json({ error: groupError.message });
    }
    if (!groupData) {
      return res.status(404).json({ error: 'Grupo de catalogo no encontrado' });
    }

    const managementPolicy = (groupData.management_policy || {}) as CatalogManagementPolicy;
    const configuredCreatePermission = policyAllows(managementPolicy, 'create', roleKeys);
    if (configuredCreatePermission === false) {
      return res.status(403).json({
        error: 'Sus roles no permiten crear valores en este catalogo'
      });
    }

    const effectiveMetadata = { ...(metadata || {}) } as Record<string, unknown>;
    for (const [key, rule] of Object.entries(managementPolicy.required_metadata || {})) {
      if (rule?.type === 'positive_integer' && effectiveMetadata[key] !== undefined) {
        effectiveMetadata[key] = Number(effectiveMetadata[key]);
      }
    }
    const metadataError = validateConfiguredMetadata(managementPolicy, effectiveMetadata);
    if (metadataError) return res.status(400).json({ error: metadataError });

    const isTenantScopedInsert = isTenantAdmin && !isSystemAdmin;
    if (isTenantScopedInsert && !groupData.allows_tenant_items) {
      return res.status(403).json({ error: 'Este grupo no permite items de tenant (allows_tenant_items=false)' });
    }

    const isSystemScopedCatalog = managementPolicy.value_scope === 'SYSTEM';
    const effectiveTenantId = isSystemScopedCatalog
      ? null
      : (isTenantScopedInsert ? ctx.tenantId : (tenant_id ? String(tenant_id) : null));
    const effectiveLookupScope = isSystemScopedCatalog
      ? 'SYSTEM'
      : isTenantScopedInsert
      ? 'TENANT'
      : (lookup_scope && ['SYSTEM', 'TENANT'].includes(lookup_scope) ? lookup_scope : 'SYSTEM');

    let existingQuery = Postgres
      .from('lookup_values')
      .select('id')
      .eq('lookup_group_id', lookup_group_id)
      .eq('lookup_key', lookup_key.toUpperCase());

    existingQuery = effectiveTenantId
      ? existingQuery.eq('tenant_id', effectiveTenantId)
      : existingQuery.is('tenant_id', null);

    const { data: existing } = await existingQuery.maybeSingle();

    if (existing) {
      return res.status(409).json({
        error: `Ya existe un valor con la clave ${lookup_key} en este grupo para este tenant`
      });
    }

    const { data: newValue, error: insertError } = await Postgres
      .from('lookup_values')
      .insert({
        lookup_group_id,
        tenant_id: effectiveTenantId,
        lookup_key: lookup_key.toUpperCase(),
        lookup_label: lookup_label.trim(),
        lookup_short_label: lookup_short_label.trim(),
        lookup_scope: effectiveLookupScope,
        sort_order: sort_order ?? 0,
        is_active: is_active ?? true,
        metadata: effectiveMetadata,
        created_by: isSystemAdmin ? 'SYSTEM_ADMIN' : `TENANT_ADMIN:${ctx.tenantId}`
      })
      .select()
      .single();

    if (insertError) {
      console.error('[LOOKUP-VALUES] Error creando valor:', insertError);
      return res.status(500).json({ error: insertError.message });
    }

    if (translations && Array.isArray(translations) && translations.length > 0) {
      const translationsToInsert = translations
        .filter(t => t.label?.trim() && t.short_label?.trim())
        .map(t => ({
          lookup_value_id: newValue.id,
          language_code: t.language_code,
          label: t.label.trim(),
          short_label: t.short_label.trim()
        }));

      if (translationsToInsert.length > 0) {
        const { error: transError } = await Postgres
          .from('lookup_value_translations')
          .insert(translationsToInsert);

        if (transError) {
          console.error('[LOOKUP-VALUES] Error creando traducciones:', transError);
        }
      }
    }

    return res.status(201).json({
      success: true,
      value: newValue,
      message: 'Valor creado exitosamente',
    });
  } catch (err) {
    console.error('[LOOKUP-VALUES] Error en POST /:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================================================
// PUT /lookup-values/:id - Actualizar valor
// ============================================================================

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveAuthContext(req);
    if (!ctx) return res.status(401).json({ error: 'No autenticado' });

    const [isSystemAdmin, isTenantAdmin] = await Promise.all([
      hasRole(ctx, 'SYSTEM_ADMIN'),
      hasRole(ctx, 'TENANT_ADMIN'),
    ]);
    const roleKeys = await getRoleKeys(ctx);

    if (!isSystemAdmin && !isTenantAdmin) {
      return res.status(403).json({ error: 'Solo SYSTEM_ADMIN o TENANT_ADMIN puede actualizar valores de catalogo' });
    }

    const id = req.params.id;
    const body = req.body;
    const {
      lookup_label,
      lookup_short_label,
      lookup_scope,
      sort_order,
      is_active,
      metadata,
      translations
    } = body;

    if (!lookup_label?.trim()) {
      return res.status(400).json({ error: 'La etiqueta es obligatoria' });
    }

    if (!lookup_short_label?.trim()) {
      return res.status(400).json({ error: 'La etiqueta corta es obligatoria' });
    }

    if (lookup_scope && !['SYSTEM', 'TENANT'].includes(lookup_scope)) {
      return res.status(400).json({ error: 'El alcance debe ser SYSTEM o TENANT' });
    }

    const Postgres = createDbClient(
      process.env.Postgres_URL || '',
      process.env.Postgres_SERVICE_ROLE_KEY || ''
    );

    const { data: existingValue, error: existingValueError } = await Postgres
      .from('lookup_values')
      .select('id, tenant_id, lookup_group_id, metadata')
      .eq('id', id)
      .maybeSingle();

    if (existingValueError) {
      return res.status(500).json({ error: existingValueError.message });
    }
    if (!existingValue) {
      return res.status(404).json({ error: 'Valor no encontrado' });
    }

    const { data: groupData, error: groupErr } = await Postgres
      .from('lookup_groups')
      .select('allows_tenant_items, management_policy')
      .eq('id', existingValue.lookup_group_id)
      .maybeSingle();

    if (groupErr) return res.status(500).json({ error: groupErr.message });
    if (!groupData) return res.status(404).json({ error: 'Grupo de catalogo no encontrado' });

    const managementPolicy = (groupData.management_policy || {}) as CatalogManagementPolicy;
    const configuredUpdatePermission = policyAllows(managementPolicy, 'update', roleKeys);
    if (configuredUpdatePermission === false) {
      return res.status(403).json({
        error: 'Sus roles no permiten modificar valores en este catalogo'
      });
    }

    if (!isSystemAdmin) {
      if (existingValue.tenant_id !== ctx.tenantId) {
        return res.status(403).json({ error: 'TENANT_ADMIN solo puede editar valores de su tenant' });
      }

      if (!groupData?.allows_tenant_items) {
        return res.status(403).json({ error: 'Este grupo no permite items de tenant (allows_tenant_items=false)' });
      }
    }

    const updateData: any = {
      lookup_label: lookup_label.trim(),
      lookup_short_label: lookup_short_label.trim(),
      is_active: is_active ?? true,
      updated_by: isSystemAdmin ? 'SYSTEM_ADMIN' : `TENANT_ADMIN:${ctx.tenantId}`,
      updated_at: new Date().toISOString()
    };

    if (sort_order !== undefined) {
      updateData.sort_order = sort_order;
    }

    if (managementPolicy.value_scope === 'SYSTEM') {
      const mergedMetadata = { ...(existingValue.metadata || {}), ...(metadata || {}) };
      for (const [key, rule] of Object.entries(managementPolicy.required_metadata || {})) {
        if (rule?.type === 'positive_integer' && mergedMetadata[key] !== undefined) {
          mergedMetadata[key] = Number(mergedMetadata[key]);
        }
      }
      const metadataError = validateConfiguredMetadata(managementPolicy, mergedMetadata);
      if (metadataError) return res.status(400).json({ error: metadataError });
      updateData.metadata = mergedMetadata;
      updateData.lookup_scope = 'SYSTEM';
      updateData.tenant_id = null;
    } else if (metadata !== undefined) {
      updateData.metadata = metadata;
    }

    if (isSystemAdmin) {
      if (lookup_scope) updateData.lookup_scope = lookup_scope;
    } else {
      updateData.lookup_scope = 'TENANT';
    }

    const { data: updatedValue, error: updateError } = await Postgres
      .from('lookup_values')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[LOOKUP-VALUES] Error actualizando valor:', updateError);
      return res.status(500).json({ error: updateError.message });
    }

    if (translations && Array.isArray(translations)) {
      await Postgres
        .from('lookup_value_translations')
        .delete()
        .eq('lookup_value_id', id);

      const translationsToInsert = translations
        .filter(t => t.label?.trim() && t.short_label?.trim())
        .map(t => ({
          lookup_value_id: id,
          language_code: t.language_code,
          label: t.label.trim(),
          short_label: t.short_label.trim()
        }));

      if (translationsToInsert.length > 0) {
        const { error: transError } = await Postgres
          .from('lookup_value_translations')
          .insert(translationsToInsert);

        if (transError) {
          console.error('[LOOKUP-VALUES] Error actualizando traducciones:', transError);
        }
      }
    }

    return res.status(200).json({
      success: true,
      value: updatedValue,
      message: 'Valor actualizado exitosamente',
    });
  } catch (err) {
    console.error('[LOOKUP-VALUES] Error en PUT /:id:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================================================
// DELETE /lookup-values/:id - Eliminar valor
// ============================================================================

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const ctx = await resolveAuthContext(req);
    if (!ctx) return res.status(401).json({ error: 'No autenticado' });

    const [isSystemAdmin, isTenantAdmin] = await Promise.all([
      hasRole(ctx, 'SYSTEM_ADMIN'),
      hasRole(ctx, 'TENANT_ADMIN'),
    ]);
    const roleKeys = await getRoleKeys(ctx);

    if (!isSystemAdmin && !isTenantAdmin) {
      return res.status(403).json({ error: 'Solo SYSTEM_ADMIN o TENANT_ADMIN puede eliminar valores de catalogo' });
    }

    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ error: 'ID invalido' });

    const Postgres = createDbClient(
      process.env.Postgres_URL || '',
      process.env.Postgres_SERVICE_ROLE_KEY || ''
    );

    const { data: existingValue, error: existingErr } = await Postgres
      .from('lookup_values')
      .select('id, tenant_id, lookup_group_id, lookup_key')
      .eq('id', id)
      .maybeSingle();

    if (existingErr) return res.status(500).json({ error: existingErr.message });
    if (!existingValue) return res.status(404).json({ error: 'Valor no encontrado' });

    const { data: groupData, error: groupErr } = await Postgres
      .from('lookup_groups')
      .select('allows_tenant_items, management_policy')
      .eq('id', existingValue.lookup_group_id)
      .maybeSingle();

    if (groupErr) return res.status(500).json({ error: groupErr.message });
    if (!groupData) return res.status(404).json({ error: 'Grupo de catalogo no encontrado' });

    const managementPolicy = (groupData.management_policy || {}) as CatalogManagementPolicy;
    const configuredDeletePermission = policyAllows(managementPolicy, 'delete', roleKeys);
    if (configuredDeletePermission === false) {
      return res.status(403).json({
        error: 'Sus roles no permiten eliminar valores en este catalogo'
      });
    }

    if (!isSystemAdmin) {
      if (!existingValue.tenant_id || existingValue.tenant_id !== ctx.tenantId) {
        return res.status(403).json({ error: 'TENANT_ADMIN solo puede eliminar valores de su tenant' });
      }

      if (!groupData?.allows_tenant_items) {
        return res.status(403).json({ error: 'Este grupo no permite items de tenant (allows_tenant_items=false)' });
      }
    }

    const usage = await findReferenceUsage('public.lookup_values', id, ['public.lookup_value_translations']);
    if (usage.length > 0) {
      const usageText = usage
        .map((u) => `${u.table} (${u.count})`)
        .join(', ');
      return res.status(409).json({
        error: `No se puede eliminar el valor porque esta en uso en: ${usageText}`,
      });
    }

    // Limpiar traducciones primero (FK NO ACTION)
    const { error: deleteTranslationsErr } = await Postgres
      .from('lookup_value_translations')
      .delete()
      .eq('lookup_value_id', id);

    if (deleteTranslationsErr) {
      return res.status(500).json({ error: deleteTranslationsErr.message });
    }

    const { error: deleteErr } = await Postgres
      .from('lookup_values')
      .delete()
      .eq('id', id);

    if (deleteErr) return res.status(500).json({ error: deleteErr.message });

    return res.status(200).json({
      success: true,
      message: `Valor ${existingValue.lookup_key} eliminado exitosamente`,
    });
  } catch (err) {
    console.error('[LOOKUP-VALUES] Error en DELETE /:id:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;


