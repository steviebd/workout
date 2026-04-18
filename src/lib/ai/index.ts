import { createAiGateway } from 'ai-gateway-provider';
import { createUnified } from 'ai-gateway-provider/providers/unified';

const aigateway = createAiGateway({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
  gateway: process.env.AI_GATEWAY_NAME!,
  apiKey: process.env.CF_AI_GATEWAY_TOKEN,
});

const unified = createUnified();

export const model = aigateway(unified(process.env.AI_MODEL_NAME ?? '@cf/meta/llama-3.3-70b-instruct-fp8-fast'));