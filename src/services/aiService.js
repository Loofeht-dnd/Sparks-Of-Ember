// This module is the ONLY place the game's UI/hooks should talk to an AI
// provider. Everything below it (providers.js -> Gemini/Groq/OpenRouter) can
// be swapped or extended — e.g. adding a "local Ollama" or a future backend
// proxy provider — without any caller here needing to change.
//
//   GameScreen / hooks
//        |
//        v
//   services/aiService.js   <-- you are here
//        |
//        v
//   services/providers.js   (provider-agnostic failover across configured keys)
//        |
//        v
//   Gemini / Groq / OpenRouter (or a future provider added to PROVIDERS)

import { chatComplete, generateImage as providerGenerateImage } from "./providers.js";

/**
 * The core "ask the Dungeon Master to continue the story" call. Used for the
 * opening scene, player actions, roll follow-ups, and hints.
 */
export async function generateNarration(systemPrompt, history, maxTokens = 2048) {
  try {
    const text = await chatComplete(systemPrompt, history, maxTokens);
    if (!text.trim()) throw new Error("empty reply");
    return text;
  } catch (e) {
    throw new Error(e.message || "The Dungeon Master stumbled and didn't answer — try sending your action again.");
  }
}

/**
 * For the smaller "ask the model for structured data" calls (world theme
 * colors, gear reflavoring) that expect JSON back and nothing else.
 * Returns the parsed value, or throws if the reply wasn't parseable JSON
 * matching `extractPattern` (a regex used to pull the JSON blob out of the
 * reply in case the model adds any stray text around it).
 */
export async function generateJSON(instruction, prompt, { maxTokens = 400, extractPattern = /[\{\[][\s\S]*[\}\]]/ } = {}) {
  const text = await chatComplete(instruction, [{ role: "user", content: prompt }], maxTokens);
  const match = text.match(extractPattern);
  if (!match) throw new Error("no JSON found in reply");
  return JSON.parse(match[0]);
}

/**
 * Compresses an older chunk of conversation history into (or onto) a running
 * summary, so long sessions don't keep growing the full history sent on
 * every turn — this is used as a rolling checkpoint that gets fed back into
 * the system prompt, not a way to hide detail from the AI.
 */
export async function summarizeHistory(existingSummary, transcriptChunk) {
  const instruction = "You compress Dungeons & Dragons session transcripts into a short running summary for later reference. Write 3-5 plain prose sentences covering key events, decisions, and the current situation. No markdown, no meta-commentary, no bullet points.";
  const prompt = existingSummary?.trim()
    ? `Existing summary so far:\n${existingSummary.trim()}\n\nNew events to fold in:\n${transcriptChunk}\n\nWrite one updated combined summary (still just 3-5 sentences total — don't let it keep growing).`
    : `Events to summarize:\n${transcriptChunk}\n\nWrite a summary in 3-5 sentences.`;
  const text = await generateNarration(instruction, [{ role: "user", content: prompt }], 220);
  return text.trim();
}

/** Passthrough to the image-generation provider (currently Gemini only). Pass
 * `referenceDataUrl` (an existing generated image) to keep a character/scene
 * visually consistent with a prior generation instead of reinventing them
 * each time. */
export async function generateImage(prompt, referenceDataUrl) {
  return providerGenerateImage(prompt, referenceDataUrl);
}
