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
    "analysis-failed": "The analysis failed on our side. Try again in a moment.",
  },

  monorepo: {
    message:
      "This looks like a monorepo. Paste the path to a specific package for a better forecast.",
    workspaces: "Workspaces declared:",
    example: "For example:",
    useExample: "Edit this URL",
  },

  progress: {
    reading: "Reading package.json…",
    connecting: "Contacting npm and GitHub…",
    checking: "Checking {done}/{total}…",
    current: "Last checked: {name}",
    label: "Analysis progress",
  },

  preview: {
    title: "Evidence collected",
    analyzed: {
      one: "{count} package analyzed",
      other: "{count} packages analyzed",
    },
    project: "Project: {name}",
    truncated: {
      one: "{count} more was left out — a forecast covers up to {max} packages.",
      other: "{count} more were left out — a forecast covers up to {max} packages.",
    },
    noData: {
      one: "{count} package has no data because a source failed. It will be left out of the score.",
      other:
        "{count} packages have no data because a source failed. They will be left out of the score.",
    },
    skipped: {
      one: "{count} skipped — not from the npm registry",
      other: "{count} skipped — not from the npm registry",
    },
    devTag: "dev",
    aliasOf: "alias {alias}",
    pending: "Risk scoring arrives next. This is the raw evidence it will be computed from.",
  },

  facts: {
    maintainers: { one: "{count} maintainer", other: "{count} maintainers" },
    lastRelease: "released {time}",
    downloads: "{count}/month",
    pushed: "pushed {time}",
    stars: "{count} stars",
    issues: { one: "{count} open issue", other: "{count} open issues" },
  },

  tags: {
    deprecated: "Deprecated",
    archived: "Archived",
    unpublished: "Unpublished",
    noData: "No data",
    notOnNpm: "Not on npm",
    noRepo: "No repo linked",
    notGithub: "Repo not on GitHub",
    repoNotFound: "Repo not found",
    githubLimit: "GitHub skipped (limit)",
    githubError: "GitHub unavailable",
  },

  quota: {
    lowTitle: "GitHub limit running low",
    low: "No GitHub token is set, so we're on GitHub's public limit: {remaining} of {limit} requests left this hour. It resets at {reset}. Cached repos don't count against it.",
    exhaustedTitle: "GitHub limit reached",
    exhausted: {
      one: "GitHub's hourly limit ran out, so {count} package was checked without GitHub activity. It resets at {reset}; try again after that for a complete forecast.",
      other:
        "GitHub's hourly limit ran out, so {count} packages were checked without GitHub activity. It resets at {reset}; try again after that for a complete forecast.",
    },
    tokenHint:
      "Running Dependency Doomsday yourself? Add a free GITHUB_TOKEN to .env.local for 5,000 requests per hour.",
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
