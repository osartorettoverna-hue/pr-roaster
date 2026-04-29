"use client";

import { useState, useRef, useEffect } from "react";

const SEVERITY_LEVELS = [
  { label: "MILD DISAPPOINTMENT", className: "bg-[#1a1a1a] border border-[#555] text-[#aaa]", minLen: 0 },
  { label: "GENUINE CONCERN",     className: "bg-[#1a1200] border border-[#aa6600] text-[#ffaa00]", minLen: 150 },
  { label: "CAREER THREATENING",  className: "bg-[#1a0500] border border-[#aa2200] text-[#ff4400]", minLen: 400 },
  { label: "CALL YOUR THERAPIST", className: "bg-[#1a0000] border border-[#cc0000] text-[#ff2200]", minLen: 700 },
];

function getSeverity(text: string) {
  const len = text.length;
  let level = SEVERITY_LEVELS[0];
  for (const s of SEVERITY_LEVELS) {
    if (len >= s.minLen) level = s;
  }
  return level;
}

function addFlames(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let linesSinceFlame = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    linesSinceFlame++;
    const isNonEmpty = line.trim().length > 0;
    const shouldFlame = isNonEmpty && linesSinceFlame >= 3;
    if (shouldFlame) {
      linesSinceFlame = 0;
      nodes.push(
        <span key={i}>
          <span className="text-[#FF4500] mr-1">🔥</span>
          {line}
          {"\n"}
        </span>
      );
    } else {
      nodes.push(<span key={i}>{line}{"\n"}</span>);
    }
  }
  return nodes;
}

export default function Home() {
  const [diff, setDiff] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  async function handleRoast() {
    if (!diff.trim()) {
      textareaRef.current?.focus();
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
        body: JSON.stringify({ diff }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Something went wrong");
      }

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

  const severity = getSeverity(output);
  const showOutput = output.length > 0 || loading;

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Subtle grid background */}
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
        <span className="text-xs text-[#555] hidden sm:block">
          Brutally honest since 2025
        </span>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex flex-col items-center px-4 pt-16 pb-8 sm:pt-24 flex-1">
        {/* Big flame */}
        <div className="flame-animate text-7xl sm:text-8xl mb-6 select-none" aria-hidden="true">
          🔥
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-center tracking-tight leading-none mb-4 uppercase">
          YOUR CODE DESERVES
          <br />
          <span className="gradient-text">THE TRUTH</span>
        </h1>

        <p className="text-[#888] text-base sm:text-lg text-center mb-12 max-w-md">
          Paste your PR diff or describe your changes.
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
              placeholder={"Paste your PR diff here... if you dare"}
              className="w-full bg-transparent text-white text-sm font-mono placeholder-[#444] resize-none p-4 rounded-lg min-h-[200px] leading-relaxed"
              rows={10}
              spellCheck={false}
              disabled={loading}
            />
          </div>

          <div className="flex items-center gap-3 mb-2">
            <div className="text-xs text-[#444]">{diff.length > 0 ? `${diff.length} chars` : "No input yet"}</div>
            {diff.length > 0 && (
              <button
                onClick={() => setDiff("")}
                className="text-xs text-[#555] hover:text-[#888] transition-colors"
              >
                clear
              </button>
            )}
          </div>

          <button
            onClick={handleRoast}
            disabled={loading}
            className="roast-btn btn-gradient w-full py-4 rounded-xl font-black text-white text-base sm:text-lg tracking-widest uppercase cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-orange-900/20"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ROASTING...
              </span>
            ) : (
              "🔥 ROAST MY PR"
            )}
          </button>
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
            {/* Severity badge */}
            {(output.length > 0) && (
              <div className="flex items-center gap-3 mb-3">
                <span className={`text-xs font-black tracking-widest px-3 py-1 rounded-full uppercase ${severity.className}`}>
                  {severity.label}
                </span>
                {done && (
                  <span className="text-xs text-[#555]">review complete</span>
                )}
              </div>
            )}

            {/* Output card */}
            <div
              ref={outputRef}
              className="output-card bg-[#111] rounded-r-xl p-6 max-h-[500px] overflow-y-auto"
            >
              <pre
                className={`text-sm font-mono text-white/90 whitespace-pre-wrap leading-relaxed ${!done && loading ? "cursor-blink" : ""}`}
              >
                {output.length > 0
                  ? addFlames(output)
                  : (
                    <span className="text-[#444]">Preparing your roast...</span>
                  )
                }
              </pre>
            </div>

            {done && (
              <button
                onClick={() => {
                  setOutput("");
                  setDone(false);
                  setDiff("");
                  textareaRef.current?.focus();
                }}
                className="mt-4 text-xs text-[#555] hover:text-[#FF4500] transition-colors underline underline-offset-2"
              >
                roast another PR →
              </button>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 text-[#444] text-xs border-t border-[#111]">
        Made with{" "}
        <span className="gradient-text font-semibold">Claude API</span>
        {" · "}
        No PRs were harmed
      </footer>
    </div>
  );
}
