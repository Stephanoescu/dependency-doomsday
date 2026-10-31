/**
 * English UI copy. Placeholders use {name}; plural messages are { one, other }.
 * **double asterisks** mark emphasis and are rendered by <RichText>.
 */
export const en = {
  meta: {
    title: "Dependency Doomsday — How close is your project to midnight?",
    description:
      "Paste your package.json and get a doomsday forecast: which dependencies are abandoned, which hang on a single maintainer, and which are critical.",
  },

  brand: {
    name: "Dependency Doomsday",
    home: "Dependency Doomsday — home",
  },

  home: {
    eyebrow: "Supply-chain forensics",
    titleBefore: "How close is your project to",
    titleAccent: "midnight?",
    lede: "In 2016, one developer unpublished **left-pad** — 11 lines of code — and builds broke across the internet. In 2024, the exhausted lone maintainer of **xz** handed commit access to a stranger who planted a backdoor that nearly reached every Linux server. Which of your dependencies is next?",
  },

  input: {
    label: "Your package.json or a GitHub repo",
    placeholder:
      'Paste your package.json…\n\n{\n  "dependencies": { … }\n}\n\n…or a public GitHub URL:\ngithub.com/expressjs/express',
    dropHint: "Drop package.json to load it",
    chooseFile: "Upload package.json",
    fileLoaded: "Loaded {name} · {size}",
    clear: "Clear",
    includeDev: "Include devDependencies",
    includeDevHint: "Build and test tools. Off by default — they don't ship to your users.",
    submit: "See my forecast",
    submitting: "Reading dependencies…",
    shortcut: "Ctrl + Enter",
    examplesLabel: "Or try a repo:",
    errorLabel: "Error:",
  },

  privacy: {
    title: "Your code never leaves your machine.",
    body: "We only read **package names**. Files you paste or drop are parsed right here in your browser. For GitHub repos we read the public package.json and nothing else. No sign-up, and your report is never stored.",
  },

  errors: {
    empty: "Paste a package.json or a GitHub URL first.",
    "too-large":
      "That's over 512 KB. A package.json is usually a few KB — is this the right file?",
    unrecognized:
      "That doesn't look like a package.json or a GitHub repo. Paste the file contents, or a URL like github.com/owner/repo.",
    "unsupported-host":
      "Only public GitHub repos are supported for now. For other hosts, paste the package.json contents instead.",
    "invalid-json": "That isn't valid JSON. Look for a missing comma, quote or brace.",
    "not-package-json": "That's valid JSON, but it doesn't look like a package.json.",
    "no-dependencies": "No npm dependencies to analyze in this package.json.",
    "no-dependencies-try-dev":
      "No runtime dependencies to analyze. Turn on devDependencies to include build and test tools.",
    "repo-not-found": "We couldn't find that repo. It may be private, renamed or misspelled.",
    "package-json-not-found": "The repo exists, but there's no package.json at {location}.",
    "github-rate-limited":
      "GitHub is rate-limiting us right now. Try again in a few minutes, or paste the package.json instead.",
    "github-timeout":
      "GitHub took too long to answer. Try again, or paste the package.json instead.",
    "github-unavailable":
      "We couldn't reach GitHub. Try again, or paste the package.json instead.",
    "bad-request": "That request didn't look right. Refresh the page and try again.",
    "file-type": "That file isn't JSON. Drop your package.json.",
    "file-unreadable": "We couldn't read that file. Try pasting its contents instead.",
    network: "Network error. Check your connection and try again.",
  },

  monorepo: {
    message:
      "This looks like a monorepo. Paste the path to a specific package for a better forecast.",
    workspaces: "Workspaces declared:",
    example: "For example:",
    useExample: "Edit this URL",
  },

  preview: {
    title: "Dependencies detected",
    ready: {
      one: "{count} package ready for analysis",
      other: "{count} packages ready for analysis",
    },
    project: "Project: {name}",
    truncated: {
      one: "{count} more was left out — a forecast covers up to {max} packages.",
      other: "{count} more were left out — a forecast covers up to {max} packages.",
    },
    skipped: {
      one: "{count} skipped — not from the npm registry",
      other: "{count} skipped — not from the npm registry",
    },
    devTag: "dev",
    aliasOf: "alias {alias}",
    pending:
      "Forecast engine coming online. This preview confirms we read your dependencies correctly.",
  },

  skipReasons: {
    local: "local path",
    workspace: "workspace package",
    git: "git dependency",
    url: "tarball URL",
    "other-registry": "other registry",
    "invalid-name": "invalid name",
    "invalid-spec": "invalid version",
  },

  footer: {
    tagline: "Free. No sign-up. Rules, not AI — every score is explainable.",
    data: "Data from the npm registry and GitHub.",
  },
};
