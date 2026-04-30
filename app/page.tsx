"use client";

import { useState, useRef, useEffect } from "react";

const DAILY_LIMIT = 5;
const STORAGE_KEY = "pr_roaster_usage";

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getRoastsToday(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const { date, count } = JSON.parse(raw);
    return date === getTodayKey() ? count : 0;
  } catch {
    return 0;
  }
}

function incrementRoastsToday(): number {
  const count = getRoastsToday() + 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: getTodayKey(), count }));
  return count;
}

const SAMPLE_DIFF = `diff
- function getData(x) {
-   var data2 = [];
-   var temp = null;
-   for (var i = 0; i < x.length; i++) {
-     temp = x[i];
-     if (temp != null) {
-       data2.push(temp);
-     }
-   }
-   return data2;
- }
+ function getData(x) {
+   var data2 = [];
+   var temp = null;
+   var xxx = 0;
+   for (var i = 0; i < x.length; i++) {
+     temp = x[i];
+     if (temp != null && temp != undefined && temp !== '') {
+       data2.push(temp);
+       xxx++;
+     }
+   }
+   console.log("done");
+   return data2;
+ }`;

const SEVERITY_LEVELS = [
  { emoji: "😌", label: "MILD DISAPPOINTMENT", className: "bg-[#1a1a1a] border border-[#555] text-[#aaa]",         minWords: 0   },
  { emoji: "😬", label: "GENUINE CONCERN",     className: "bg-[#1a1200] border border-[#aa6600] text-[#ffaa00]",   minWords: 100 },
  { emoji: "💀", label: "CAREER THREATENING",  className: "bg-[#1a0500] border border-[#aa2200] text-[#ff4400]",   minWords: 150 },
  { emoji: "🚨", label: "CALL YOUR THERAPIST", className: "bg-[#1a0000] border border-[#cc0000] text-[#ff2200]",   minWords: 200 },
];

const ROAST_EMOJIS = ["🔥", "💀", "🤦", "😤", "🗑️", "☠️", "🤡", "💩", "🧟", "😭"];

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function getSeverity(text: string) {
  const words = countWords(text);
  let level = SEVERITY_LEVELS[0];
  for (const s of SEVERITY_LEVELS) {
    if (words >= s.minWords) level = s;
  }
  return level;
}

function renderInline(text: string, key: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return (
    <span key={key}>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={i} className="text-white font-bold">{part.slice(2, -2)}</strong>;
        if (part.startsWith("*") && part.endsWith("*"))
          return <em key={i} className="text-[#FF6B00] not-italic font-semibold">{part.slice(1, -1)}</em>;
        if (part.startsWith("`") && part.endsWith("`"))
          return <span key={i} className="text-[#FF6B00] bg-[#1a0e00] px-1 rounded text-xs">{part.slice(1, -1)}</span>;
        return part;
      })}
    </span>
  );
}

function addAnnotations(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let linesSinceAnnotation = 0;
  let emojiIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    linesSinceAnnotation++;
    const isNonEmpty = line.trim().length > 0;
    const shouldAnnotate = isNonEmpty && linesSinceAnnotation >= 3;

    if (shouldAnnotate) {
      linesSinceAnnotation = 0;
      const emoji = ROAST_EMOJIS[emojiIndex % ROAST_EMOJIS.length];
      emojiIndex++;
      nodes.push(
        <span key={i} className="block">
          <span className="mr-1">{emoji}</span>
          {renderInline(line, `il-${i}`)}
          {"\n"}
        </span>
      );
    } else {
      nodes.push(<span key={i} className="block">{renderInline(line, `il-${i}`)}{"\n"}</span>);
    }
  }
  return nodes;
}

const GITHUB_PR_REGEX = /^https?:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+/;
const GITHUB_REPO_REGEX = /^https?:\/\/github\.com\/[^/]+\/[^/]+\/?$/;

export default function Home() {
  const [diff, setDiff] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [roastsToday, setRoastsToday] = useState(0);
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setRoastsToday(getRoastsToday());
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  async function handleRoast() {
    const trimmed = diff.trim();
    if (!trimmed) {
      textareaRef.current?.focus();
      return;
    }

    if (GITHUB_REPO_REGEX.test(trimmed)) {
      setError("That's a repo link, not a PR. Paste a specific PR URL — github.com/owner/repo/pull/123");
      return;
    }

    if (getRoastsToday() >= DAILY_LIMIT) {
      setError(`You've used all ${DAILY_LIMIT} roasts for today. Come back tomorrow with worse code.`);
      return;
    }

    setOutput("");
    setError("");
    setDone(false);
    setLoading(true);

    try {
      const res = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diff: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Something went wrong");
      }

      setRoastsToday(incrementRoastsToday());

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;
        setOutput((prev) => prev + decoder.decode(value, { stream: true }));
      }
      setDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something exploded. Fitting.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  function handleReset() {
    setOutput("");
    setDone(false);
    setDiff("");
    setCopied(false);
    textareaRef.current?.focus();
  }

  function handleShare(platform: "linkedin" | "x") {
    const appUrl = "https://pr-roaster.vercel.app";
    if (platform === "linkedin") {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(appUrl)}`, "_blank");
    } else {
      const snippet = output.replace(/\s+/g, " ").trim().slice(0, 80);
      const text = `I just got my PR roasted 🔥 "${snippet}" ${appUrl}`;
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
    }
  }

  const severity = getSeverity(output);
  const showOutput = output.length > 0 || loading;
  const remaining = Math.max(0, DAILY_LIMIT - roastsToday);
  const isLimitReached = roastsToday >= DAILY_LIMIT;
  const isGitHubPR = GITHUB_PR_REGEX.test(diff.trim());
  const isRepoOnly = GITHUB_REPO_REGEX.test(diff.trim());

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#FF4500 1px, transparent 1px), linear-gradient(90deg, #FF4500 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a]">
        <span className="font-black text-lg tracking-tight">
          <span className="gradient-text">PR</span>
          <span className="text-white"> ROASTER</span>
        </span>
        <span className="text-xs text-[#555] hidden sm:block">Brutally honest since 2025</span>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex flex-col items-center px-4 pt-16 pb-8 sm:pt-24 flex-1">
        <div className="flame-animate text-7xl sm:text-8xl mb-6 select-none" aria-hidden="true">
          🔥
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-center tracking-tight leading-none mb-4 uppercase">
          YOUR CODE DESERVES
          <br />
          <span className="gradient-text">THE TRUTH</span>
        </h1>

        <p className="text-[#888] text-base sm:text-lg text-center mb-12 max-w-md">
          Paste a GitHub PR link or a raw diff.
          <br />
          <span className="text-[#666]">Get absolutely destroyed.</span>
        </p>

        {/* Input card */}
        <div className="w-full max-w-2xl">
          <div className="bg-[#111] border border-[#222] rounded-xl p-1 mb-4">
            <textarea
              ref={textareaRef}
              value={diff}
              onChange={(e) => setDiff(e.target.value)}
              placeholder={"https://github.com/owner/repo/pull/123\n\nor paste a raw diff..."}
              className="w-full bg-transparent text-white text-sm font-mono placeholder-[#444] resize-none p-4 rounded-lg min-h-[200px] leading-relaxed"
              rows={10}
              spellCheck={false}
              disabled={loading || isLimitReached}
            />
          </div>

          {/* Status row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="text-xs text-[#444]">
                {diff.length > 0 ? `${diff.length} chars` : "No input yet"}
              </div>
              {isGitHubPR && (
                <span className="flex items-center gap-1 text-xs text-green-500 bg-green-950/40 border border-green-900 px-2 py-0.5 rounded-full">
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  GitHub PR detected
                </span>
              )}
              {isRepoOnly && (
                <span className="text-xs text-yellow-600">
                  Needs a PR link — add /pull/123
                </span>
              )}
              {diff.length > 0 && (
                <button
                  onClick={() => setDiff("")}
                  className="text-xs text-[#555] hover:text-[#888] transition-colors"
                >
                  clear
                </button>
              )}
            </div>
            <div className="text-xs">
              {isLimitReached ? (
                <span className="text-red-700">0 roasts left today</span>
              ) : (
                <span>
                  <span className="text-[#FF6B00]">{remaining}</span>
                  <span className="text-[#333]"> / {DAILY_LIMIT} roasts left today</span>
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleRoast}
            disabled={loading || isLimitReached}
            className="roast-btn btn-gradient w-full py-4 rounded-xl font-black text-white text-base sm:text-lg tracking-widest uppercase cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-orange-900/20"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ROASTING...
              </span>
            ) : isLimitReached ? (
              "COME BACK TOMORROW"
            ) : (
              "🔥 ROAST MY PR"
            )}
          </button>

          {/* Sample PR button */}
          {!isLimitReached && (
            <div className="flex justify-center mt-3">
              <button
                onClick={() => setDiff(SAMPLE_DIFF)}
                disabled={loading}
                className="text-xs text-[#555] hover:text-[#888] transition-colors disabled:opacity-40"
              >
                Try a sample PR 👀
              </button>
            </div>
          )}

          {isLimitReached && (
            <p className="text-center text-xs text-[#555] mt-3">
              You've used all {DAILY_LIMIT} roasts for today. Resets at midnight.
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="w-full max-w-2xl mt-6 bg-[#1a0000] border border-red-900 rounded-xl p-4 text-red-400 text-sm font-mono">
            ⚠️ {error}
          </div>
        )}

        {/* Output */}
        {showOutput && (
          <div className="w-full max-w-2xl mt-8">
            {/* Severity badge row — only after streaming completes */}
            {done && output.length > 0 && (
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-black tracking-widest px-3 py-1 rounded-full uppercase ${severity.className}`}>
                    {severity.emoji} {severity.label}
                  </span>
                  <span className="text-xs text-[#555]">review complete</span>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all duration-200"
                  style={copied
                    ? { borderColor: "#22c55e", color: "#22c55e", background: "#052010" }
                    : { borderColor: "#333", color: "#888", background: "transparent" }
                  }
                >
                  {copied ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      COPIED
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <rect x="4" y="4" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                        <path d="M4 3V2a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H9" stroke="currentColor" strokeWidth="1.2"/>
                      </svg>
                      COPY ROAST
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Output card */}
            <div ref={outputRef} className="output-card bg-[#111] rounded-r-xl p-6 max-h-[500px] overflow-y-auto">
              <pre className={`text-sm font-mono text-white/90 whitespace-pre-wrap leading-relaxed ${!done && loading ? "cursor-blink" : ""}`}>
                {output.length > 0
                  ? addAnnotations(output)
                  : <span className="text-[#444]">Preparing your roast...</span>
                }
              </pre>
            </div>

            {/* Share + reset row — fade in after done */}
            {done && (
              <div
                className="mt-4 flex flex-wrap items-center gap-3"
                style={{ animation: "fadeInUp 0.4s ease-out" }}
              >
                {/* LinkedIn */}
                <button
                  onClick={() => handleShare("linkedin")}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#0a66c2]/50 text-[#0a66c2] hover:bg-[#0a66c2]/10 transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  Share on LinkedIn
                </button>

                {/* X / Twitter */}
                <button
                  onClick={() => handleShare("x")}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#444] text-[#aaa] hover:border-white hover:text-white transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.26 5.632L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  Share on X
                </button>

                <button
                  onClick={handleReset}
                  className="ml-auto text-xs text-[#555] hover:text-[#FF4500] transition-colors underline underline-offset-2"
                >
                  roast another PR →
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="relative z-10 text-center py-6 text-[#444] text-xs border-t border-[#111]">
        Made with <span className="gradient-text font-semibold">Claude API</span> · No PRs were harmed
      </footer>
    </div>
  );
}
