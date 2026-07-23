import { createHash } from 'crypto';
import type { Pool, PoolClient, QueryResult } from 'pg';

type Queryable = Pick<Pool | PoolClient, 'query'>;

export type ShiftPlanningImpactDay = {
  date: string;
  plan_id: string;
  shift_id: string;
  shift_name: string;
  shift_short_name: string;
  requirement_id: string | null;
  required_staff: number | null;
  planned_staff: number;
  remaining_staff: number;
  deficit_staff: number | null;
  replacement_candidates: Array<{
    employee_id: string;
    employee_code: string | null;
    employee_name: string;
  }>;
};

export type ShiftPlanningImpactAssessment = {
  request_id: string;
  policy_key: string | null;
  policy_label: string | null;
  assessment_key: 'NO_IMPACT' | 'SAFE' | 'CONDITIONAL' | 'NOT_FEASIBLE' | 'CONFIGURATION_REQUIRED' | 'RISK_ACCEPTANCE_REQUIRED';
  approval_control: string | null;
  risk_acceptance_required: boolean;
  message: string;
  affected_plan_count: number;
  date_from: string;
  date_to: string;
  days: ShiftPlanningImpactDay[];
  assessment_token: string;
};

type RequestContext = {
  id: string;
  tenant_id: string;
  company_id: string;
  employee_id: string;
  start_local: string;
  end_local: string;
  date_from: string;
  date_to: string;
  attendance_timezone: string;
  policy_key: string | null;
  policy_label: string | null;
  policy_metadata: Record<string, unknown> | null;
  work_location_id: string | null;
  department_id: string | null;
  area_id: string | null;
  cost_center_id: string | null;
  work_group_id: string | null;
};

type PlanRow = {
  plan_id: string;
  shift_date: string;
  shift_id: string;
  shift_name: string;
  shift_short_name: string;
  start_time: string;
  shift_duration_minutes: number;
  work_minutes: number;
};

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function localTimestamp(value: string): number {
  return Date.parse(`${value}Z`);
}

function planInterval(row: PlanRow): { start: number; end: number } {
  const start = localTimestamp(`${row.shift_date}T${String(row.start_time).slice(0, 8)}`);
  const configuredDuration = numberValue(row.shift_duration_minutes);
  const fallbackDuration = numberValue(row.work_minutes);
  const durationMinutes = configuredDuration > 0 ? configuredDuration : fallbackDuration;
  return { start, end: start + durationMinutes * 60_000 };
}

function assessmentToken(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

async function requestContext(db: Queryable, tenantId: string, requestId: string): Promise<RequestContext | null> {
  const result = await db.query(
    `
      SELECT
        request.id,
        request.tenant_id,
        request.company_id,
        request.employee_id,
        public.resolve_attendance_timezone(request.tenant_id, request.company_id, assignment.work_location_id, NULL) AS attendance_timezone,
        to_char(
          request.start_datetime AT TIME ZONE public.resolve_attendance_timezone(request.tenant_id, request.company_id, assignment.work_location_id, NULL),
          'YYYY-MM-DD"T"HH24:MI:SS'
        ) AS start_local,
        to_char(
          request.end_datetime AT TIME ZONE public.resolve_attendance_timezone(request.tenant_id, request.company_id, assignment.work_location_id, NULL),
          'YYYY-MM-DD"T"HH24:MI:SS'
        ) AS end_local,
        to_char(
          request.start_datetime AT TIME ZONE public.resolve_attendance_timezone(request.tenant_id, request.company_id, assignment.work_location_id, NULL),
          'YYYY-MM-DD'
        ) AS date_from,
        to_char(
          request.end_datetime AT TIME ZONE public.resolve_attendance_timezone(request.tenant_id, request.company_id, assignment.work_location_id, NULL),
          'YYYY-MM-DD'
        ) AS date_to,
        policy.lookup_key AS policy_key,
        policy.lookup_label AS policy_label,
        policy.metadata AS policy_metadata,
        assignment.work_location_id,
        assignment.department_id,
        assignment.area_id,
        assignment.cost_center_id,
        assignment.work_group_id
      FROM public.employee_absence_requests request
      JOIN public.justification_types justification
        ON justification.id = request.justification_type_id
       AND justification.tenant_id = request.tenant_id
      LEFT JOIN public.lookup_values policy
        ON policy.id = justification.planning_policy_id
       AND policy.is_active
      LEFT JOIN public.employee_companies assignment
        ON assignment.tenant_id = request.tenant_id
       AND assignment.company_id = request.company_id
       AND assignment.employee_id = request.employee_id
       AND assignment.is_active
      WHERE request.id = $1::uuid
        AND request.tenant_id = $2::uuid
        AND request.is_active
      ORDER BY assignment.created_at DESC NULLS LAST
      LIMIT 1
    `,
    [requestId, tenantId]
  );
  return (result.rows[0] as RequestContext | undefined) || null;
}

async function activeProductivePlans(db: Queryable, context: RequestContext): Promise<PlanRow[]> {
  const result = await db.query(
    `
      SELECT
        plan.id AS plan_id,
        plan.shift_date::text,
        plan.shift_id,
        shift.shift_name,
        shift.shift_short_name,
        shift.start_time::text,
        shift.shift_duration_minutes,
        shift.work_minutes
      FROM public.employee_shift_plans plan
      JOIN public.shifts shift
        ON shift.id = plan.shift_id
       AND shift.tenant_id = plan.tenant_id
       AND shift.is_active
      WHERE plan.tenant_id = $1::uuid
        AND plan.company_id = $2::uuid
        AND plan.employee_id = $3::uuid
        AND plan.shift_date BETWEEN $4::date AND $5::date
        AND plan.is_active
        AND shift.work_minutes > 0
      ORDER BY plan.shift_date, shift.start_time, plan.created_at
    `,
    [context.tenant_id, context.company_id, context.employee_id, context.date_from, context.date_to]
  );
  return result.rows as PlanRow[];
}

async function evaluateDay(
  db: Queryable,
  context: RequestContext,
  plan: PlanRow
): Promise<ShiftPlanningImpactDay> {
  const dayOfWeek = new Date(`${plan.shift_date}T00:00:00Z`).getUTCDay();
  const requirementResult = await db.query(
    `
      SELECT requirement.*
      FROM public.shift_coverage_requirements requirement
      WHERE requirement.tenant_id = $1::uuid
        AND requirement.is_active
        AND requirement.effective_from <= $2::date
        AND (requirement.effective_to IS NULL OR requirement.effective_to >= $2::date)
        AND (requirement.company_id IS NULL OR requirement.company_id = $3::uuid)
        AND (requirement.work_location_id IS NULL OR requirement.work_location_id = $4::uuid)
        AND (requirement.department_id IS NULL OR requirement.department_id = $5::uuid)
        AND (requirement.area_id IS NULL OR requirement.area_id = $6::uuid)
        AND (requirement.cost_center_id IS NULL OR requirement.cost_center_id = $7::uuid)
        AND (requirement.work_group_id IS NULL OR requirement.work_group_id = $8::uuid)
        AND (requirement.shift_id IS NULL OR requirement.shift_id = $9::uuid)
        AND (requirement.day_of_week IS NULL OR requirement.day_of_week = $10::smallint)
      ORDER BY
        ((requirement.company_id IS NOT NULL)::integer
          + (requirement.work_location_id IS NOT NULL)::integer
          + (requirement.department_id IS NOT NULL)::integer
          + (requirement.area_id IS NOT NULL)::integer
          + (requirement.cost_center_id IS NOT NULL)::integer
          + (requirement.work_group_id IS NOT NULL)::integer
          + (requirement.shift_id IS NOT NULL)::integer
          + (requirement.day_of_week IS NOT NULL)::integer) DESC,
        requirement.priority DESC,
        requirement.effective_from DESC,
        requirement.created_at DESC
      LIMIT 1
    `,
    [
      context.tenant_id,
      plan.shift_date,
      context.company_id,
      context.work_location_id,
      context.department_id,
      context.area_id,
      context.cost_center_id,
      context.work_group_id,
      plan.shift_id,
      dayOfWeek,
    ]
  );
  const requirement = requirementResult.rows[0] || null;

  const organizationFilters = [
    ['work_location_id', requirement?.work_location_id],
    ['department_id', requirement?.department_id],
    ['area_id', requirement?.area_id],
    ['cost_center_id', requirement?.cost_center_id],
    ['work_group_id', requirement?.work_group_id],
  ].filter((entry) => Boolean(entry[1])) as Array<[string, string]>;
  const filterSql = organizationFilters
    .map(([column], index) => `AND assignment.${column} = $${5 + index}::uuid`)
    .join('\n');
  const filterValues = organizationFilters.map(([, value]) => value);

  const plannedResult = await db.query(
    `
      SELECT count(DISTINCT plan.employee_id)::integer AS planned_staff
      FROM public.employee_shift_plans plan
      JOIN public.shifts shift
        ON shift.id = plan.shift_id
       AND shift.tenant_id = plan.tenant_id
       AND shift.is_active
       AND shift.work_minutes > 0
      JOIN public.employee_companies assignment
        ON assignment.tenant_id = plan.tenant_id
       AND assignment.company_id = plan.company_id
       AND assignment.employee_id = plan.employee_id
       AND assignment.is_active
      WHERE plan.tenant_id = $1::uuid
        AND plan.company_id = $2::uuid
        AND plan.shift_date = $3::date
        AND plan.shift_id = $4::uuid
        AND plan.is_active
        ${filterSql}
    `,
    [context.tenant_id, context.company_id, plan.shift_date, plan.shift_id, ...filterValues]
  );
  const plannedStaff = numberValue(plannedResult.rows[0]?.planned_staff);
  const remainingStaff = Math.max(0, plannedStaff - 1);
  const requiredStaff = requirement ? numberValue(requirement.minimum_staff) : null;
  const deficitStaff = requiredStaff === null ? null : Math.max(0, requiredStaff - remainingStaff);

  const candidatesResult = await db.query(
    `
      SELECT
        employee.id AS employee_id,
        employee.employee_code,
        concat_ws(' ', employee.employee_name, employee.employee_lastname) AS employee_name
      FROM public.employee_companies assignment
      JOIN public.employees employee
        ON employee.id = assignment.employee_id
       AND employee.tenant_id = assignment.tenant_id
       AND employee.is_active
      WHERE assignment.tenant_id = $1::uuid
        AND assignment.company_id = $2::uuid
        AND assignment.employee_id <> $3::uuid
        AND assignment.is_active
        ${filterSql}
        AND NOT EXISTS (
          SELECT 1
          FROM public.employee_shift_plans candidate_plan
          JOIN public.shifts candidate_shift
            ON candidate_shift.id = candidate_plan.shift_id
           AND candidate_shift.work_minutes > 0
          WHERE candidate_plan.tenant_id = assignment.tenant_id
            AND candidate_plan.employee_id = assignment.employee_id
            AND candidate_plan.shift_date = $4::date
            AND candidate_plan.is_active
        )
        AND NOT EXISTS (
          SELECT 1
          FROM public.employee_absence_requests absence
          JOIN public.justification_types justification ON justification.id = absence.justification_type_id
          JOIN public.lookup_values policy ON policy.id = justification.planning_policy_id
          JOIN public.lookup_values status ON status.id = absence.request_status_id
          WHERE absence.tenant_id = assignment.tenant_id
            AND absence.employee_id = assignment.employee_id
            AND absence.is_active
            AND status.metadata->>'notification_status_key' = 'APPROVED'
            AND COALESCE((policy.metadata->>'blocks_assignment')::boolean, false)
            AND $4::date BETWEEN
                (absence.start_datetime AT TIME ZONE $${5 + filterValues.length})::date
                AND (absence.end_datetime AT TIME ZONE $${5 + filterValues.length})::date
        )
      ORDER BY employee.employee_lastname, employee.employee_name, employee.employee_code
      LIMIT 5
    `,
    [
      context.tenant_id,
      context.company_id,
      context.employee_id,
      plan.shift_date,
      ...filterValues,
      context.attendance_timezone,
    ]
  );

  return {
    date: plan.shift_date,
    plan_id: plan.plan_id,
    shift_id: plan.shift_id,
    shift_name: plan.shift_name,
    shift_short_name: plan.shift_short_name,
    requirement_id: requirement?.id || null,
    required_staff: requiredStaff,
    planned_staff: plannedStaff,
    remaining_staff: remainingStaff,
    deficit_staff: deficitStaff,
    replacement_candidates: candidatesResult.rows.map((row) => ({
      employee_id: String(row.employee_id),
      employee_code: row.employee_code ? String(row.employee_code) : null,
      employee_name: String(row.employee_name || 'Empleado'),
    })),
  };
}

export async function evaluateAbsencePlanningImpact(
  db: Queryable,
  tenantId: string,
  requestId: string
): Promise<ShiftPlanningImpactAssessment | null> {
  const context = await requestContext(db, tenantId, requestId);
  if (!context) return null;

  const policyKey = String(context.policy_key || '').toUpperCase() || null;
  const policyMetadata = context.policy_metadata || {};
  const blockingScope = String(policyMetadata.blocking_scope || '').toUpperCase();
  const approvalControl = String(policyMetadata.approval_control || '').trim().toUpperCase() || null;
  const riskAcceptanceRequired = policyMetadata.risk_acceptance_required === true;
  if (
    policyKey
    && blockingScope === 'UNCLASSIFIED'
    && approvalControl === 'ALLOW_WITH_SUPERVISOR_ACKNOWLEDGEMENT'
    && riskAcceptanceRequired
  ) {
    const base = {
      request_id: context.id,
      policy_key: policyKey,
      policy_label: context.policy_label,
      assessment_key: 'RISK_ACCEPTANCE_REQUIRED' as const,
      approval_control: approvalControl,
      risk_acceptance_required: true,
      message: 'La politica sigue sin clasificar. El supervisor puede aprobar excepcionalmente si acepta expresamente el riesgo y la responsabilidad.',
      affected_plan_count: 0,
      date_from: context.date_from,
      date_to: context.date_to,
      days: [],
    };
    return { ...base, assessment_token: assessmentToken(base) };
  }

  if (!policyKey || blockingScope === 'UNCLASSIFIED' || approvalControl === 'BLOCK_UNTIL_CONFIGURED') {
    const base = {
      request_id: context.id,
      policy_key: policyKey,
      policy_label: context.policy_label,
      assessment_key: 'CONFIGURATION_REQUIRED' as const,
      approval_control: approvalControl,
      risk_acceptance_required: false,
      message: 'El tipo de justificacion no tiene una politica de planificacion clasificada.',
      affected_plan_count: 0,
      date_from: context.date_from,
      date_to: context.date_to,
      days: [],
    };
    return { ...base, assessment_token: assessmentToken(base) };
  }

  if (policyMetadata.blocks_assignment !== true || blockingScope === 'NONE') {
    const base = {
      request_id: context.id,
      policy_key: policyKey,
      policy_label: context.policy_label,
      assessment_key: 'NO_IMPACT' as const,
      approval_control: approvalControl,
      risk_acceptance_required: false,
      message: 'La politica configurada no bloquea asignaciones de turno.',
      affected_plan_count: 0,
      date_from: context.date_from,
      date_to: context.date_to,
      days: [],
    };
    return { ...base, assessment_token: assessmentToken(base) };
  }

  const plans = await activeProductivePlans(db, context);
  const requestStart = localTimestamp(context.start_local);
  const requestEnd = localTimestamp(context.end_local);
  const affectedPlans = plans.filter((plan) => {
    if (blockingScope === 'FULL_DAY') return true;
    if (blockingScope !== 'TIME_OVERLAP') return false;
    const interval = planInterval(plan);
    return requestStart < interval.end && requestEnd > interval.start;
  });

  const days = await Promise.all(affectedPlans.map((plan) => evaluateDay(db, context, plan)));
  let key: ShiftPlanningImpactAssessment['assessment_key'] = 'SAFE';
  let message = affectedPlans.length === 0
    ? 'La solicitud no se superpone con turnos productivos planificados.'
    : 'La cobertura minima se mantiene despues de la ausencia.';

  if (days.some((day) => day.requirement_id === null)) {
    key = 'CONFIGURATION_REQUIRED';
    message = 'Falta configurar la cobertura minima para una o mas fechas afectadas.';
  } else if (days.some((day) => numberValue(day.deficit_staff) > 0 && day.replacement_candidates.length === 0)) {
    key = 'NOT_FEASIBLE';
    message = 'La ausencia produce deficit de cobertura y no hay reemplazos libres identificados.';
  } else if (days.some((day) => numberValue(day.deficit_staff) > 0)) {
    key = 'CONDITIONAL';
    message = 'La ausencia requiere reemplazo o replanificacion para conservar la cobertura minima.';
  }

  const base = {
    request_id: context.id,
    policy_key: policyKey,
    policy_label: context.policy_label,
    assessment_key: key,
    approval_control: approvalControl,
    risk_acceptance_required: false,
    message,
    affected_plan_count: affectedPlans.length,
    date_from: context.date_from,
    date_to: context.date_to,
    days,
  };
  return { ...base, assessment_token: assessmentToken(base) };
}

async function lookupValueId(db: Queryable, groupKey: string, valueKey: string): Promise<string> {
  const result: QueryResult = await db.query(
    `
      SELECT value.id
      FROM public.lookup_values value
      JOIN public.lookup_groups group_row ON group_row.id = value.lookup_group_id
      WHERE group_row.lookup_group_key = $1
        AND value.lookup_key = $2
        AND value.tenant_id IS NULL
        AND value.is_active
      LIMIT 1
    `,
    [groupKey, valueKey]
  );
  if (!result.rows[0]?.id) throw new Error(`No existe configuracion ${groupKey}.${valueKey}`);
  return String(result.rows[0].id);
}

export async function queueAbsencePlanningImpact(
  db: Queryable,
  assessment: ShiftPlanningImpactAssessment,
  context: { tenantId: string; requestId: string; actor: string; resolutionMode: string }
): Promise<string | null> {
  if (assessment.affected_plan_count === 0 || ['NO_IMPACT', 'CONFIGURATION_REQUIRED'].includes(assessment.assessment_key)) {
    return null;
  }
  const impactStatusId = await lookupValueId(db, 'SHIFT_PLANNING_IMPACT_STATUS', 'QUEUED');
  const queueStatusId = await lookupValueId(db, 'SHIFT_PLANNING_QUEUE_STATUS', 'PENDING');
  const sourceResult = await db.query(
    `SELECT company_id, employee_id FROM public.employee_absence_requests WHERE id = $1::uuid AND tenant_id = $2::uuid`,
    [context.requestId, context.tenantId]
  );
  const source = sourceResult.rows[0];
  if (!source) return null;

  const existing = await db.query(
    `
      UPDATE public.shift_planning_impacts
      SET impact_status_id = $3::uuid,
          assessment_key = $4,
          assessment_snapshot = $5::jsonb,
          affected_plan_count = $6,
          resolution_mode = $7,
          updated_by = $8,
          updated_at = now()
      WHERE tenant_id = $1::uuid
        AND source_table = 'employee_absence_requests'
        AND source_id = $2::uuid
        AND is_active
        AND resolved_at IS NULL
      RETURNING id
    `,
    [
      context.tenantId,
      context.requestId,
      impactStatusId,
      assessment.assessment_key,
      JSON.stringify(assessment),
      assessment.affected_plan_count,
      context.resolutionMode,
      context.actor,
    ]
  );
  let impactId = existing.rows[0]?.id as string | undefined;
  if (!impactId) {
    const inserted = await db.query(
      `
        INSERT INTO public.shift_planning_impacts (
          tenant_id, company_id, employee_id, absence_request_id,
          source_table, source_id, impact_status_id, date_from, date_to,
          assessment_key, assessment_snapshot, affected_plan_count,
          resolution_mode, created_by
        ) VALUES (
          $1::uuid, $2::uuid, $3::uuid, $4::uuid,
          'employee_absence_requests', $4::uuid, $5::uuid, $6::date, $7::date,
          $8, $9::jsonb, $10, $11, $12
        )
        RETURNING id
      `,
      [
        context.tenantId,
        source.company_id,
        source.employee_id,
        context.requestId,
        impactStatusId,
        assessment.date_from,
        assessment.date_to,
        assessment.assessment_key,
        JSON.stringify(assessment),
        assessment.affected_plan_count,
        context.resolutionMode,
        context.actor,
      ]
    );
    impactId = inserted.rows[0]?.id;
  }
  if (!impactId) throw new Error('No se pudo registrar el impacto de planificacion');

  await db.query(
    `
      INSERT INTO public.shift_planning_recalculation_queue (
        tenant_id, impact_id, queue_status_id, payload, created_by
      )
      SELECT $1::uuid, $2::uuid, $3::uuid, $4::jsonb, $5
      WHERE NOT EXISTS (
        SELECT 1 FROM public.shift_planning_recalculation_queue queue
        WHERE queue.impact_id = $2::uuid AND queue.is_active
      )
    `,
    [context.tenantId, impactId, queueStatusId, JSON.stringify(assessment), context.actor]
  );
  return impactId;
}
