import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Carrega o .env da raiz do monorepo (dois níveis acima de src/config).
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

function required(name, fallback = undefined) {
  const value = process.env[name] ?? fallback;
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: required('DATABASE_URL', 'file:./dev.db'),

  meta: {
    appSecret: required('META_APP_SECRET', ''),
    verifyToken: required('META_VERIFY_TOKEN', ''),
    capiToken: required('META_CAPI_TOKEN', ''),
    pageId: required('META_PAGE_ID', ''),
    datasetId: required('META_DATASET_ID', ''),
    testEventCode: required('META_TEST_EVENT_CODE', ''),
    graphApiVersion: required('META_GRAPH_API_VERSION', 'v21.0'),
  },

  kommo: {
    subdomain: required('KOMMO_SUBDOMAIN', ''),
    accessToken: required('KOMMO_ACCESS_TOKEN', ''),
    ctwaFieldId: required('KOMMO_CTWA_FIELD_ID', ''),
    pipelineId: required('KOMMO_PIPELINE_ID', ''),
  },

  internalApiKey: required('INTERNAL_API_KEY', ''),
};

/** Verifica quais integrações estão configuradas, sem nunca expor os valores. */
export function getConfigStatus() {
  return {
    meta: {
      appSecret: Boolean(env.meta.appSecret),
      verifyToken: Boolean(env.meta.verifyToken),
      capiToken: Boolean(env.meta.capiToken),
      pageId: Boolean(env.meta.pageId),
      datasetId: Boolean(env.meta.datasetId),
    },
    kommo: {
      subdomain: Boolean(env.kommo.subdomain),
      accessToken: Boolean(env.kommo.accessToken),
      ctwaFieldId: Boolean(env.kommo.ctwaFieldId),
    },
  };
}
