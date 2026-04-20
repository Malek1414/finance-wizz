import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001';

export function getActiveModel(): string {
  return MODEL;
}

/** Text-only prompt — used for transaction categorization */
export async function claudeChat(prompt: string): Promise<string> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }]
  });
  const block = response.content[0];
  return block.type === 'text' ? block.text : '';
}

/** PDF-aware prompt — sends the raw PDF buffer to Claude for extraction */
export async function claudeParsePDF(buffer: Buffer, prompt: string): Promise<string> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: buffer.toString('base64')
          }
        },
        { type: 'text', text: prompt }
      ]
    }]
  });
  const block = response.content[0];
  return block.type === 'text' ? block.text : '';
}
