import type { Express, Request, Response, Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import type { SwaggerOperationDoc, SwaggerParameter } from './lib/swagger-docs.js';

type Endpoint = {
  method: string;
  path: string;
  docs?: SwaggerOperationDoc;
};

function regexToPath(regexp: RegExp | undefined): string {
  if (!regexp) return '';

  const source = regexp.source;
  if (!source || source === '^\\/?$') return '';

  return source
    .replace('^\\/', '/')
    .replace('\\/?(?=\\/|$)', '')
    .replace(/\$$/, '')
    .replace(/\\\//g, '/')
    .replace(/\(\?:\(\[\^\\\/\]\+\?\)\)/g, ':param')
    .replace(/^\^/, '');
}

function joinPaths(basePath: string, path: string): string {
  const base = basePath === '/' ? '' : basePath.replace(/\/$/, '');
  const nested = path === '/' ? '' : path;
  const full = `${base}/${nested}`.replace(/\/+/g, '/');
  return full || '/';
}

function normalizeOpenApiPath(path: string): string {
  let normalized = path.replace(/\/+/g, '/');
  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  if (normalized.length > 1 && normalized.endsWith('/')) normalized = normalized.slice(0, -1);

  // Express params (/users/:id) -> OpenAPI params (/users/{id})
  normalized = normalized.replace(/:([A-Za-z0-9_]+)(\([^)]*\))?/g, '{$1}');

  return normalized;
}

function tagFromPath(path: string): string {
  const firstSegment = path.split('/').filter(Boolean)[0] ?? 'system';
  return firstSegment
    .split(/[-_]/g)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function extractPathParameters(path: string): Array<{ name: string; in: 'path'; required: true; schema: { type: 'string' } }> {
  const matches = [...path.matchAll(/\{([A-Za-z0-9_]+)\}/g)];
  return matches.map((match) => ({
    name: match[1],
    in: 'path',
    required: true,
    schema: { type: 'string' as const },
  }));
}

function extractRouteDocs(route: any): SwaggerOperationDoc | undefined {
  const stack = route?.stack || [];
  for (const layer of stack) {
    const docs = layer?.handle?.__swagger as SwaggerOperationDoc | undefined;
    if (docs) return docs;
  }
  return undefined;
}

function mergeParameters(baseParameters: SwaggerParameter[], overrideParameters: SwaggerParameter[] | undefined): SwaggerParameter[] {
  if (!overrideParameters || overrideParameters.length === 0) return baseParameters;

  const map = new Map<string, SwaggerParameter>();
  for (const parameter of baseParameters) {
    map.set(`${parameter.in}:${parameter.name}`, parameter);
  }
  for (const parameter of overrideParameters) {
    map.set(`${parameter.in}:${parameter.name}`, parameter);
  }

  return Array.from(map.values());
}

function collectEndpointsFromStack(stack: any[], basePath = ''): Endpoint[] {
  const endpoints: Endpoint[] = [];

  for (const layer of stack || []) {
    if (layer?.route) {
      const routePaths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
      const methods = Object.entries(layer.route.methods || {})
        .filter(([, enabled]) => Boolean(enabled))
        .map(([method]) => method.toUpperCase())
        .filter((method) => method !== 'HEAD' && method !== 'OPTIONS');

      for (const routePath of routePaths) {
        const fullPath = joinPaths(basePath, String(routePath));
        const docs = extractRouteDocs(layer.route);
        for (const method of methods) {
          endpoints.push({ method, path: fullPath, docs });
        }
      }
      continue;
    }

    if (layer?.name === 'router' && layer?.handle?.stack) {
      const mountedPath = regexToPath(layer.regexp);
      endpoints.push(...collectEndpointsFromStack(layer.handle.stack, joinPaths(basePath, mountedPath)));
    }
  }

  return endpoints;
}

function buildOpenApiSpec(router: Router) {
  const port = process.env.BACKEND_PORT || 3001;
  const serverUrl = process.env.SWAGGER_SERVER_URL || `http://localhost:${port}`;
  const endpoints = collectEndpointsFromStack((router as any).stack ?? []);

  const paths: Record<string, Record<string, any>> = {};

  for (const endpoint of endpoints) {
    const normalizedPath = normalizeOpenApiPath(endpoint.path);
    if (normalizedPath.startsWith('/docs')) continue;

    const methodKey = endpoint.method.toLowerCase();
    const defaultPathParameters = extractPathParameters(normalizedPath);
    const docs = endpoint.docs || {};
    const mergedParameters = mergeParameters(defaultPathParameters, docs.parameters);
    const mergedResponses = {
      '200': { description: 'OK' },
      ...(docs.responses || {}),
    };

    paths[normalizedPath] ||= {};
    paths[normalizedPath][methodKey] = {
      tags: [tagFromPath(normalizedPath)],
      summary: `${endpoint.method} ${normalizedPath}`,
      security: [{ bearerAuth: [] }],
      ...docs,
      parameters: mergedParameters,
      responses: mergedResponses,
    };
  }

  return {
    openapi: '3.0.3',
    info: {
      title: 'Turnos Titanium Enterprise API',
      version: '1.0.0',
      description: 'Documentacion generada automaticamente desde rutas de Express.',
    },
    servers: [
      {
        url: serverUrl,
        description: 'Servidor actual',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    paths,
  };
}

export function setupSwagger(app: Express, router: Router): void {
  app.get('/docs/openapi.json', (_req: Request, res: Response) => {
    const spec = buildOpenApiSpec(router);
    res.json(spec);
  });

  app.use('/docs', swaggerUi.serve);
  app.get('/docs', (req, res, next) => {
    const spec = buildOpenApiSpec(router);
    return swaggerUi.setup(spec, { explorer: true })(req, res, next);
  });
}
