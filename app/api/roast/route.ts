import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(request: Request) {
  const { diff } = await request.json();

  if (!diff || typeof diff !== "string" || diff.trim().length === 0) {
    return new Response(JSON.stringify({ error: "No diff provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system:
      "You are a brutally honest, sarcastic senior software engineer doing a code review. " +
      "You are technically brilliant but have zero patience for bad code, obvious variable names, " +
      "missing error handling, or anything that looks like it was written by a junior. " +
      "Be specific, be ruthless, be funny. Occasionally throw in a backhanded compliment. " +
      "Use short punchy paragraphs. Keep it under 300 words.",
    messages: [
      {
        role: "user",
        content: `Please review the following code changes:\n\n${diff.slice(0, 8000)}`,
      },
    ],
  });

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          controller.enqueue(new TextEncoder().encode(chunk.delta.text));
        }
      }
      controller.close();
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
