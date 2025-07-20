import { createProviderRegistry } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import secrets from 'secret-manager';

// Create provider instances with API keys
const openaiProvider = createOpenAI({
  apiKey: secrets.OPENAI_TOKEN
});

const anthropicProvider = createAnthropic({
  apiKey: secrets.ANTHROPIC_API_KEY
});

const googleProvider = createGoogleGenerativeAI({
  apiKey: secrets.GOOGLE_API_KEY
});

// Create provider registry
export const registry = createProviderRegistry({
  openai: openaiProvider,
  anthropic: anthropicProvider,
  google: googleProvider
});

// Available models configuration with correct and current model names
export const AVAILABLE_MODELS = {
  // OpenAI models
  'openai:gpt-4': openaiProvider('gpt-4'),
  'openai:gpt-4-turbo': openaiProvider('gpt-4-turbo'),
  'openai:gpt-4o': openaiProvider('gpt-4o'),
  'openai:gpt-4o-mini': openaiProvider('gpt-4o-mini'),
  'openai:gpt-3.5-turbo': openaiProvider('gpt-3.5-turbo'),

  // Anthropic models - using correct model IDs
  'anthropic:claude-3-haiku': registry.languageModel('anthropic:claude-3-haiku-20240307'),
  'anthropic:claude-3-sonnet': registry.languageModel('anthropic:claude-3-sonnet-20240229'),
  'anthropic:claude-3-opus': registry.languageModel('anthropic:claude-3-opus-20240229'),
  'anthropic:claude-3.5-sonnet': registry.languageModel('anthropic:claude-3-5-sonnet-20240620'),
  'anthropic:claude-3.5-haiku': registry.languageModel('anthropic:claude-3-5-haiku-20241022'),
  'anthropic:claude-3.7-sonnet': registry.languageModel('anthropic:claude-3-7-sonnet-20250219'),
  'anthropic:claude-4-sonnet': registry.languageModel('anthropic:claude-4-sonnet-20250514'),
  'anthropic:claude-4-opus': registry.languageModel('anthropic:claude-4-opus-20250514'),

  // Google models (updated to current available models)
  'google:gemini-1.5-pro': googleProvider('gemini-1.5-pro'),
  'google:gemini-1.5-flash': googleProvider('gemini-1.5-flash'),
  'google:gemini-2.0-flash-exp': googleProvider('gemini-2.0-flash-exp')
};

// Default model - using a stable, widely available model
const DEFAULT_MODEL = 'openai:gpt-4o';

export function getModel(modelId?: string) {
  const modelToUse = modelId || process.env.AI_MODEL || DEFAULT_MODEL;

  if (modelToUse in AVAILABLE_MODELS) {
    return AVAILABLE_MODELS[modelToUse as keyof typeof AVAILABLE_MODELS];
  }

  // Fallback to default model if requested model not found
  console.warn(`Model ${modelToUse} not found, falling back to ${DEFAULT_MODEL}`);
  return AVAILABLE_MODELS[DEFAULT_MODEL];
}

export function listAvailableModels(): string[] {
  return Object.keys(AVAILABLE_MODELS);
}
