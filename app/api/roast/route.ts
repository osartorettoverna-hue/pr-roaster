import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const GITHUB_PR_REGEX = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/;

async function fetchGitHubDiff(url: string): Promise<string> {
  const match = url.match(GITHUB_PR_REGEX);
  if (!match) throw new Error("Invalid GitHub PR URL");
  const [, owner, repo, number] = match;

  const res = await fetch(
    `https://github.com/${owner}/${repo}/pull/${number}.diff`,
    {
      headers: {
        Accept: "text/plain",
        "User-Agent": "pr-roaster/1.0",
      },
    }
  );

  if (res.status === 404) throw new Error("PR not found — is the repo public?");
  if (!res.ok) throw new Error(`GitHub returned ${res.status}`);

  const diff = await res.text();
  if (!diff.trim()) throw new Error("This PR has no changes to roast.");
  return diff;
}

export async function POST(request: Request) {
  const { diff: input } = await request.json();

  if (!input || typeof input !== "string" || input.trim().length === 0) {
    return new Response(JSON.stringify({ error: "No input provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let diff = input.trim();
  let isGitHub = false;

  if (GITHUB_PR_REGEX.test(diff)) {
    isGitHub = true;
    try {
      diff = await fetchGitHubDiff(diff);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to fetch PR";
      return new Response(JSON.stringify({ error: msg }), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      });
    }
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
        content: `Please review the following code changes${isGitHub ? " (fetched from GitHub)" : ""}:\n\n${diff.slice(0, 8000)}`,
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
