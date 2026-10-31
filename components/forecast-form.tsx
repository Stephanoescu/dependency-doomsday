"use client";

import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import { DependencyPreview } from "@/components/dependency-preview";
import { ErrorIcon, Spinner, UploadIcon } from "@/components/icons";
import { MonorepoHint } from "@/components/monorepo-hint";
import { PrivacyNotice } from "@/components/privacy-notice";
import { fmt, getMessages, plural, type Messages } from "@/lib/i18n";
import { resolveInput } from "@/lib/input/resolve-client";
import { MAX_INPUT_BYTES, type ResolveResponse } from "@/lib/input/types";

const EXAMPLES = [
  { label: "expressjs/express", input: "https://github.com/expressjs/express" },
  {
    label: "vercel/next.js · packages/next",
    input: "https://github.com/vercel/next.js/tree/canary/packages/next",
  },
  { label: "babel/babel", input: "https://github.com/babel/babel" },
];

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; result: ResolveResponse; includeDev: boolean };

function errorText(t: Messages, result: Extract<ResolveResponse, { ok: false }>, includeDev: boolean) {
  if (result.error === "no-dependencies" && !includeDev && !result.monorepo) {
    return t.errors["no-dependencies-try-dev"];
  }
  return fmt(t.errors[result.error], { location: result.location ?? "package.json" });
}

function formatBytes(bytes: number) {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}

export function ForecastForm() {
  const t = getMessages();
  const ids = useId();
  const [text, setText] = useState("");
  const [includeDev, setIncludeDev] = useState(false);
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const dragDepth = useRef(0);

  const loading = status.kind === "loading";

  // Dropping a file outside the drop zone would otherwise navigate away from the page.
  useEffect(() => {
    const prevent = (e: globalThis.DragEvent) => e.preventDefault();
    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);
    return () => {
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("drop", prevent);
    };
  }, []);

  // Move focus to the result so keyboard and screen-reader users land on it.
  useEffect(() => {
    if (status.kind === "done" && status.result.ok) resultHeadingRef.current?.focus();
  }, [status]);

  async function run(input: string, dev = includeDev) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus({ kind: "loading" });
    try {
      const result = await resolveInput(input, dev, controller.signal);
      if (!controller.signal.aborted) setStatus({ kind: "done", result, includeDev: dev });
    } catch {
      // Aborted by a newer request.
    }
  }

  function fail(error: "file-type" | "file-unreadable" | "too-large") {
    setStatus({ kind: "done", result: { ok: false, error }, includeDev });
  }

  async function loadFile(f: File) {
    if (!/\.json$/i.test(f.name) && f.type !== "application/json") return fail("file-type");
    if (f.size > MAX_INPUT_BYTES) return fail("too-large");
    let content: string;
    try {
      content = await f.text();
    } catch {
      return fail("file-unreadable");
    }
    setText(content);
    setFile({ name: f.name, size: f.size });
    // Parsing is local and instant, so a dropped file goes straight to the result.
    void run(content);
  }

  function handleDragEnter(e: DragEvent) {
    e.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  }

  function handleDragLeave() {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) return void loadFile(dropped);
    // Dragging a link from the address bar or another tab.
    const droppedText = e.dataTransfer.getData("text/plain").trim();
    if (droppedText) {
      setText(droppedText);
      setFile(null);
      void run(droppedText);
    }
  }

  function applyExampleUrl(url: string) {
    setText(url);
    setFile(null);
    setStatus({ kind: "idle" });
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      ta?.focus();
      ta?.setSelectionRange(url.length, url.length);
    });
  }

  function toggleDev() {
    const next = !includeDev;
    setIncludeDev(next);
    if (status.kind === "done" && text.trim()) void run(text, next);
  }

  const result = status.kind === "done" ? status.result : null;
  const resultIncludesDev = status.kind === "done" && status.includeDev;
  const announcement = result
    ? [
        result.ok
          ? plural(t.preview.ready, result.packages.length)
          : errorText(t, result, resultIncludesDev),
        result.monorepo ? t.monorepo.message : "",
      ].join(" ")
    : "";

  return (
    <div className="space-y-8">
      <form
        aria-busy={loading}
        onSubmit={(e) => {
          e.preventDefault();
          void run(text);
        }}
        className="space-y-5"
      >
        <div
          onDragEnter={handleDragEnter}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border bg-ash/80 shadow-[0_0_0_1px_rgb(0_0_0/0.4),0_30px_80px_-40px_rgb(255_69_58/0.35)] transition-colors ${
            dragging ? "border-amber" : "border-line focus-within:border-line-strong"
          }`}
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
            <label
              htmlFor={`${ids}-input`}
              className="font-mono text-[11px] tracking-[0.12em] text-fog uppercase sm:tracking-[0.2em]"
            >
              {t.input.label}
            </label>
            {text && (
              <button
                type="button"
                onClick={() => {
                  setText("");
                  setFile(null);
                  setStatus({ kind: "idle" });
                  textareaRef.current?.focus();
                }}
                className="shrink-0 font-mono text-[11px] tracking-[0.12em] text-dim uppercase hover:text-bone sm:tracking-[0.2em]"
              >
                {t.input.clear}
              </button>
            )}
          </div>

          <textarea
            ref={textareaRef}
            id={`${ids}-input`}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setFile(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void run(text);
              }
            }}
            placeholder={t.input.placeholder}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            rows={9}
            className="block w-full resize-y bg-transparent px-4 py-3.5 font-mono text-base leading-relaxed text-bone placeholder:text-dim focus:outline-none sm:text-sm"
          />

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-4 py-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 font-mono text-xs font-semibold tracking-wider text-bone uppercase hover:text-amber"
            >
              <UploadIcon className="size-4" />
              {t.input.chooseFile}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              tabIndex={-1}
              aria-hidden
              className="sr-only"
              onChange={(e) => {
                const picked = e.target.files?.[0];
                if (picked) void loadFile(picked);
                e.target.value = "";
              }}
            />
            {file && (
              <span className="font-mono text-xs text-fog">
                {fmt(t.input.fileLoaded, { name: file.name, size: formatBytes(file.size) })}
              </span>
            )}
          </div>

          {dragging && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 flex items-center justify-center border-2 border-dashed border-amber bg-void/85 font-mono text-sm font-semibold tracking-widest text-amber uppercase"
            >
              {t.input.dropHint}
            </div>
          )}
        </div>

        <div className="flex items-start gap-3">
          <button
            type="button"
            id={`${ids}-dev`}
            role="switch"
            aria-checked={includeDev}
            aria-describedby={`${ids}-dev-hint`}
            onClick={toggleDev}
            className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
              includeDev ? "border-amber bg-amber" : "border-line-strong bg-ash-2"
            }`}
          >
            <span
              className={`inline-block size-4 rounded-full transition-transform ${
                includeDev ? "translate-x-6 bg-void" : "translate-x-1 bg-fog"
              }`}
            />
          </button>
          <div>
            <label
              htmlFor={`${ids}-dev`}
              className="cursor-pointer text-sm font-semibold text-bone select-none"
            >
              {t.input.includeDev}
            </label>
            <p id={`${ids}-dev-hint`} className="text-xs leading-relaxed text-dim">
              {t.input.includeDevHint}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-3 bg-alarm px-7 py-4 font-display text-lg text-void uppercase transition-[background-color,transform] hover:bg-[#ff6a61] active:translate-y-px disabled:cursor-wait disabled:opacity-80 sm:w-auto"
          >
            {loading && <Spinner className="size-5" />}
            {loading ? t.input.submitting : t.input.submit}
            {!loading && <span aria-hidden>→</span>}
          </button>
          <kbd className="hidden font-mono text-xs text-dim sm:inline">{t.input.shortcut}</kbd>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <span className="text-dim">{t.input.examplesLabel}</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.input}
              type="button"
              disabled={loading}
              onClick={() => {
                setText(ex.input);
                setFile(null);
                void run(ex.input);
              }}
              className="border border-line px-2 py-1 text-fog transition-colors hover:border-amber hover:text-amber disabled:opacity-50"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </form>

      <PrivacyNotice />

      <p role="status" className="sr-only">
        {announcement}
      </p>

      {result && (
        <div className="space-y-4">
          {result.monorepo && (
            <MonorepoHint
              monorepo={result.monorepo}
              githubRef={result.ref}
              onUseExample={applyExampleUrl}
            />
          )}
          {result.ok ? (
            <DependencyPreview result={result} headingRef={resultHeadingRef} />
          ) : (
            <div className="animate-rise flex gap-3 border border-alarm/60 bg-alarm/10 p-4 text-sm leading-relaxed text-bone">
              <ErrorIcon className="mt-0.5 size-4 shrink-0 text-alarm" />
              <p>
                <span className="sr-only">{t.input.errorLabel} </span>
                {errorText(t, result, resultIncludesDev)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
