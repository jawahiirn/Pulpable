export const generationErrorCodes = [
  'CONFIGURATION_ERROR',
  'OPENAI_ERROR',
  'E2B_ERROR',
  'INNGEST_ERROR',
  'DATABASE_ERROR',
  'TIMEOUT',
  'INVALID_AGENT_OUTPUT',
  'UNKNOWN_ERROR',
] as const;

export type GenerationErrorCode = (typeof generationErrorCodes)[number];

function getErrorText(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function classifyGenerationError(error: unknown): GenerationErrorCode {
  const message = getErrorText(error).toLowerCase();

  if (message.includes('generation configuration')) {
    return 'CONFIGURATION_ERROR';
  }
  if (
    message.includes('openai') ||
    message.includes('invalid_api_key') ||
    message.includes('model') ||
    message.includes('rate limit') ||
    message.includes('429')
  ) {
    return 'OPENAI_ERROR';
  }
  if (message.includes('e2b') || message.includes('sandbox')) {
    return 'E2B_ERROR';
  }
  if (message.includes('inngest') || message.includes('event key')) {
    return 'INNGEST_ERROR';
  }
  if (
    message.includes('prisma') ||
    message.includes('database') ||
    message.includes('postgres')
  ) {
    return 'DATABASE_ERROR';
  }
  if (message.includes('timeout') || message.includes('timed out')) {
    return 'TIMEOUT';
  }

  return 'UNKNOWN_ERROR';
}

export function getSafeGenerationError(code: GenerationErrorCode) {
  switch (code) {
    case 'CONFIGURATION_ERROR':
      return 'Generation is not configured correctly. Please contact the administrator.';
    case 'OPENAI_ERROR':
      return 'The AI service could not complete this request. Please try again.';
    case 'E2B_ERROR':
      return 'The build sandbox could not be started. Please try again.';
    case 'INNGEST_ERROR':
      return 'The generation job could not be queued. Please try again.';
    case 'DATABASE_ERROR':
      return 'The project could not be saved. Please try again.';
    case 'TIMEOUT':
      return 'The generation took too long. Please try again with a smaller request.';
    case 'INVALID_AGENT_OUTPUT':
      return 'The AI did not produce a usable app. Please try again.';
    default:
      return 'The generation failed unexpectedly. Please try again.';
  }
}

export function logGenerationError(
  projectId: string,
  error: unknown,
  code: GenerationErrorCode
) {
  console.error('[generation] failed', {
    projectId,
    code,
    error: getErrorText(error),
  });
}
