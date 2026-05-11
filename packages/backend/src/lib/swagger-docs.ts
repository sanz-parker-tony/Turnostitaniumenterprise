export type SwaggerParameter = {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie';
  required?: boolean;
  description?: string;
  schema?: Record<string, any>;
};

export type SwaggerOperationDoc = {
  tags?: string[];
  summary?: string;
  description?: string;
  security?: Array<Record<string, string[]>>;
  parameters?: SwaggerParameter[];
  requestBody?: Record<string, any>;
  responses?: Record<string, any>;
  deprecated?: boolean;
};

type AnyHandler = (...args: any[]) => any;

export type DocumentedHandler<T extends AnyHandler = AnyHandler> = T & {
  __swagger?: SwaggerOperationDoc;
};

export function withDocs<T extends AnyHandler>(handler: T, docs: SwaggerOperationDoc): T {
  (handler as DocumentedHandler<T>).__swagger = docs;
  return handler;
}
