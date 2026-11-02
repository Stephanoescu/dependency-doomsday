/**
 * English UI copy. Placeholders use {name}; plural messages are { one, other }.
 * **double asterisks** mark emphasis and are rendered by <RichText>.
 */
export const en = {
  meta: {
    title: "Dependency Doomsday — How close is your project to midnight?",
    description:
      "Paste your package.json and get a doomsday forecast: which dependencies are abandoned, which have a single npm maintainer, and which are critical.",
  },

  brand: {
    name: "Dependency Doomsday",
    short: "Doomsday",
    home: "Dependency Doomsday — home",
  },

  home: {
    eyebrow: "Supply-chain forensics",
    titleBefore: "How close is your project to",
    titleAccent: "midnight?",
    lede: "In 2016, one developer unpublished **left-pad** — 11 lines of code — and builds broke across the internet. In 2024, the exhausted lone maintainer of **xz** handed commit access to a stranger who planted a backdoor that nearly reached every Linux server. Which of your dependencies is next?",
    preview: {
      title: "What a forecast looks like",
      body: "A real forecast for {label}, captured {date}. Open it to see the live version.",
      cta: "Open the live forecast",
      srSummary: "Sample forecast for {label}: doomsday score {score} out of 100, {minutes}. Open the live forecast.",
    },
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
    body: "We only read **package names**. Files you paste or drop are parsed right here in your browser. For GitHub repos we read the public package.json and nothing else. No sign-up, and your report is never stored. We count anonymous visits with Vercel Web Analytics — no cookies, and package lists are never sent to it.",
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
    "rate-limited": "Too many forecasts in a minute. Try again in {seconds} s.",
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
    analyzed: {
      one: "{count} package analyzed",
      other: "{count} packages analyzed",
    },
    truncated: {
      one: "{count} more was left out — a forecast covers up to {max} packages.",
      other: "{count} more were left out — a forecast covers up to {max} packages.",
    },
    noData: {
      one: "{count} package has no npm data because a source failed. It's left out of the score.",
      other:
        "{count} packages have no npm data because a source failed. They're left out of the score.",
    },
    skipped: {
      one: "{count} skipped — not from the npm registry",
      other: "{count} skipped — not from the npm registry",
    },
    devTag: "dev",
    aliasOf: "alias {alias}",
  },

  facts: {
    maintainers: { one: "{count} npm maintainer", other: "{count} npm maintainers" },
    lastRelease: "released {time}",
    downloads: "{count}/month",
    pushed: "pushed {time}",
    stars: "{count} stars",
    issues: { one: "{count} open issue", other: "{count} open issues" },
  },

  tags: {
    noData: "No data",
    notOnNpm: "Not on npm",
    notGithub: "Repo not on GitHub",
    repoNotFound: "Repo not found",
    githubLimit: "GitHub skipped (limit)",
    githubError: "GitHub unavailable",
    npmDataOnly: "npm data only",
    possiblyFinished: "Possibly finished, not abandoned",
    critical: "Critical",
  },

  levels: {
    low: "Low risk",
    mid: "Watch",
    high: "High risk",
  },

  forecast: {
    scoreLabel: "Doomsday score",
    outOf: "/100",
    minutes: { one: "{count} minute to midnight", other: "{count} minutes to midnight" },
    noScore: "Not enough data to score this project.",
    risk: "Risk {risk}",
    npmDataOnly: {
      one: "{count} package scored without GitHub data.",
      other: "{count} packages scored without GitHub data.",
    },
    critical: {
      one: "{count} critical package: a single npm maintainer, over 1M downloads a month.",
      other: "{count} critical packages: a single npm maintainer each, over 1M downloads a month.",
    },
    methodology: "Methodology v{version}",
  },

  result: {
    /** The worst finding, read first. See headline() in lib/narrative.ts for the priorities. */
    headline: {
      critical:
        "Your most critical dependency (**{name}**, {downloads} downloads/month) has **a single npm maintainer**.",
      deprecated: "**{name}**, one of your dependencies, is **deprecated**.",
      archived: "**{name}**, one of your dependencies, lives in an **archived** repo.",
      unpublished: "**{name}**, one of your dependencies, was **unpublished** from npm.",
      "stale-release": "**{name}** hasn't had a release in **{age}**.",
      "stale-push": "Nobody has pushed to **{name}**'s repo in **{age}**.",
      "single-maintainer": "**{name}** ({downloads} downloads/month) has **a single npm maintainer**.",
      "no-repo": "**{name}** has no public source repository.",
      watch: {
        one: "Nothing is on fire, but **{count} dependency** needs watching.",
        other: "Nothing is on fire, but **{count} dependencies** need watching.",
      },
      allClear: {
        one: "**Doomsday postponed.** Your only dependency is low risk.",
        other: "**Doomsday postponed.** All {count} dependencies are low risk.",
      },
      insufficient:
        "We couldn't get data for **{unscored} of {total}** packages, so a score would be misleading.",
    },
    sentences: {
      levels: {
        one: "{count} dependency checked: {high} high risk, {mid} to watch, {low} low risk.",
        other: "{count} dependencies checked: {high} high risk, {mid} to watch, {low} low risk.",
      },
      singleMaintainer: {
        one: "1 has a single npm maintainer.",
        other: "{count} have a single npm maintainer.",
      },
      singleMaintainerCritical: {
        one: "1 has a single npm maintainer, and it's critical: over 1M downloads a month.",
        other: "{count} have a single npm maintainer — {critical} of them critical, with over 1M downloads a month.",
      },
      oldest: "The oldest release is {age} old ({name}).",
      insufficient:
        "Only {scored} of {total} packages could be checked — npm may be having trouble. Try again in a minute.",
    },
    allClearNote: "Every dependency has recent releases, more than one npm maintainer or a clean bill of health.",
    scoreSr: "Doomsday score: {score} out of 100. {minutes}.",
    unknownScore: "?",
    replay: "Replay",
    newForecast: "New forecast",
    allPackages: { one: "All packages ({count})", other: "All packages ({count})" },
  },

  treemap: {
    title: "Every dependency at a glance",
    hint: "Size is the package's weight in your score. Tap a tile to see why.",
    label: "Dependencies by risk",
    more: "+{count} more",
    moreLabel: { one: "{count} more package — see the full list", other: "{count} more packages — see the full list" },
    tile: "{name}: risk {risk}, {level}",
    tileCritical: "{name}: risk {risk}, {level}, critical",
    tileNoData: "{name}: no data",
    legendCritical: "Critical",
    legendNoData: "No data",
  },

  detail: {
    close: "Close",
    risk: "Risk",
    why: "Why",
    noRules: "No risk rules apply. Healthy by every measure we check.",
    noData: "npm didn't answer for this package, so it isn't scored.",
    evidence: "Evidence",
    maintainers: "npm maintainers",
    npm: "npm page",
    repo: "Repository",
    support: "Support",
  },

  heroes: {
    title: "Invisible heroes",
    intro:
      "These packages hold your project up, often on someone's free time. A thank-you, a fix or a sponsorship goes a long way.",
    maintainedBy: "Published on npm by",
    andMore: "+{count} more",
    support: "Support",
    supportSr: "Support {name}",
    profile: "npm profile",
    profileSr: "{user} on npm",
  },

  share: {
    title: "Share your forecast",
    copyLink: "Copy link",
    copied: "Copied",
    linkedin: "LinkedIn",
    x: "X",
    native: "Share…",
    image: "Download image",
    imageWide: "Landscape · 1200×630",
    imageWideHint: "LinkedIn, X",
    imageStory: "Story · 1080×1920",
    imageStoryHint: "Instagram, TikTok",
    imageWorking: "Rendering…",
    imageFailed: "The image couldn't be generated. Try again in a moment.",
    badge: "Copy badge",
    badgeCopied: "Badge Markdown copied",
    badgeReposOnly: "Badges are for GitHub repos.",
    linkedinCopied: "Post text copied — paste it into LinkedIn.",
    listPrivacy: "This link contains your package names, nothing else.",
    excluded: {
      one: "{count} package wasn't found on npm (it may be private), so it's left out of the link.",
      other: "{count} packages weren't found on npm (they may be private), so they're left out of the link.",
    },
    /** First-person versions of the headline, for posts. Plain text, no emphasis. */
    headline: {
      critical: "My most critical dependency ({name}, {downloads} downloads/month) has a single npm maintainer.",
      deprecated: "One of my dependencies ({name}) is deprecated.",
      archived: "One of my dependencies ({name}) lives in an archived repo.",
      unpublished: "One of my dependencies ({name}) was unpublished from npm.",
      "stale-release": "One of my dependencies ({name}) hasn't had a release in {age}.",
      "stale-push": "Nobody has pushed to the repo of {name}, one of my dependencies, in {age}.",
      "single-maintainer": "One of my dependencies ({name}, {downloads} downloads/month) has a single npm maintainer.",
      "no-repo": "One of my dependencies ({name}) has no public source repository.",
      watch: {
        one: "Nothing is on fire, but {count} dependency needs watching.",
        other: "Nothing is on fire, but {count} dependencies need watching.",
      },
      allClear: {
        one: "Doomsday postponed: my only dependency is low risk.",
        other: "Doomsday postponed: all {count} of my dependencies are low risk.",
      },
      insufficient: "",
    },
    /** Same, without the package name, when a post would be too long. */
    headlineShort: {
      critical: "My most critical dependency has a single npm maintainer.",
      deprecated: "One of my dependencies is deprecated.",
      archived: "One of my dependencies lives in an archived repo.",
      unpublished: "One of my dependencies was unpublished from npm.",
      "stale-release": "One of my dependencies hasn't had a release in {age}.",
      "stale-push": "Nobody has pushed to one of my dependencies in {age}.",
      "single-maintainer": "One of my dependencies has a single npm maintainer.",
      "no-repo": "One of my dependencies has no public source repository.",
      watch: {
        one: "Nothing is on fire, but {count} dependency needs watching.",
        other: "Nothing is on fire, but {count} dependencies need watching.",
      },
      allClear: {
        one: "Doomsday postponed: my only dependency is low risk.",
        other: "Doomsday postponed: all {count} of my dependencies are low risk.",
      },
      insufficient: "",
    },
    lead: {
      one: "My project is {count} minute to midnight.",
      other: "My project is {count} minutes to midnight.",
    },
    cta: "Check yours:",
    generic: "How close is your project to midnight? Check your npm dependencies:",
    linkedinPost:
      "{lead} Doomsday score: {score}/100.\n\n{headline}\n\nDependency Doomsday checks every npm dependency for abandoned packages, single maintainers and critical single points of failure — with fixed public rules, not AI.\n\nCheck yours: {url}",
    linkedinGeneric:
      "How close is your project to midnight? Dependency Doomsday checks every npm dependency for abandoned packages, single maintainers and critical single points of failure — with fixed public rules, not AI.\n\nCheck yours: {url}",
  },

  /** Pages opened from a share link. */
  shared: {
    eyebrow: "Doomsday forecast",
    untitled: "Shared project",
    home: "Get your own forecast",
    metaTitle: "{label} — Doomsday forecast",
    metaTitleList: "A doomsday forecast",
    metaDescription:
      "How close is {label} to midnight? A forecast of its npm dependencies: abandoned packages, single maintainers and critical ones.",
    metaDescriptionList:
      "How close is this project to midnight? A forecast of its npm dependencies: abandoned packages, single maintainers and critical ones.",
    invalid: "This forecast link is broken or incomplete. Paste the package.json or repo again for a fresh forecast.",
  },

  /** README badge (/api/badge). Short: it sits in a 20px-high badge. */
  badge: {
    pending: "analyzing…",
    noData: "no data",
    invalid: "invalid repo",
    notFound: "repo not found",
    noPackageJson: "no package.json",
  },

  /** Share images (/api/og). */
  og: {
    scoreLabel: "DOOMSDAY SCORE",
    footer: "Rules, not AI",
    cta: "How close is yours?",
    stats: "{total} dependencies · {high} high risk · {critical} critical",
    genericTitle: "How close is your project to",
    genericAccent: "midnight?",
    genericBody: "Free doomsday forecast for your npm dependencies.",
    pending: "Forecast for {label} — open the link to see the score.",
    homeAlt: "Dependency Doomsday: how close is your project to midnight?",
    homeBadge: "Free · No sign-up",
    homeBody: "Paste your package.json and get a doomsday forecast for your npm dependencies.",
    homeChips: ["Abandoned", "Single maintainer", "Critical"],
    rankingAlt: "Who holds up the internet? The single npm maintainers ten popular open-source projects rely on.",
    rankingBadge: "10 open-source projects",
    rankingBody: "The single npm maintainers that ten popular open-source projects quietly rely on.",
    rankingHeroes: "Holding it up",
    /** Used when a pasted package.json has no name. */
    thisProject: "This project",
    /** Third person, for images seen by people who don't own the project. */
    headline: {
      critical: "{project}: its most critical dependency (**{name}**, {downloads} downloads/month) has **a single npm maintainer**.",
      deprecated: "{project}: one of its dependencies, **{name}**, is **deprecated**.",
      archived: "{project}: one of its dependencies, **{name}**, lives in an **archived** repo.",
      unpublished: "{project}: one of its dependencies, **{name}**, was **unpublished** from npm.",
      "stale-release": "{project}: one of its dependencies, **{name}**, hasn't had a release in **{age}**.",
      "stale-push": "{project}: nobody has pushed to the repo of **{name}**, one of its dependencies, in **{age}**.",
      "single-maintainer": "{project}: one of its dependencies, **{name}** ({downloads} downloads/month), has **a single npm maintainer**.",
      "no-repo": "{project}: one of its dependencies, **{name}**, has no public source repository.",
      watch: {
        one: "{project}: nothing is on fire, but **{count} dependency** needs watching.",
        other: "{project}: nothing is on fire, but **{count} dependencies** need watching.",
      },
      allClear: {
        one: "{project}: **doomsday postponed.** Its only dependency is low risk.",
        other: "{project}: **doomsday postponed.** All {count} of its dependencies are low risk.",
      },
      insufficient: "{project}: we couldn't get data for **{unscored} of {total}** packages, so there's no score yet.",
    },
  },

  /** The "why" behind a package's risk. {age} is a duration like "4 years". */
  rules: {
    deprecated: "Deprecated on npm",
    unpublished: "Unpublished from npm",
    archived: "Repo archived on GitHub",
    "single-maintainer": "Single npm maintainer",
    "stale-release": "Last release {age} ago",
    "stale-push": "No GitHub push in {age}",
    "no-repo": "No repository linked",
    halved: "halved from {points}: {reasons}",
    halvedBy: {
      "possibly-finished": "possibly finished",
      "recent-push": "repo still active",
    },
    capped: "Capped at {max}",
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

  notFound: {
    metaTitle: "Page not found",
    title: "This page hit midnight.",
    body: "The link may be broken, or the page never existed. Your dependencies, hopefully, are in better shape.",
    home: "Get a forecast",
    ranking: "See the ranking",
    methodology: "How it works",
  },

  errorPage: {
    eyebrow: "Something broke",
    title: "One minute to midnight.",
    body: "Something went wrong on our side. Try again — and if it keeps happening, the data sources may be having a bad day.",
    retry: "Try again",
    home: "Back to the start",
  },

  nav: {
    label: "Main",
    ranking: "Ranking",
    methodology: "Methodology",
  },

  ranking: {
    metaTitle: "Who holds up the internet?",
    metaDescription:
      "Ten popular open-source projects and the single npm maintainers their dependencies quietly rely on. A measure of dependency fragility, not project quality.",
    eyebrow: "The ranking",
    title: "Who holds up the internet?",
    intro:
      "Ten popular open-source projects, run through the same rules as your forecast. Behind almost every one of them are packages kept alive by a single person.",
    noteTitle: "What this is — and isn't",
    note: "This measures how fragile a project's **dependencies** are, not the quality of the project or the people who build it. A low score usually means the project relies on a few people maintaining critical packages for free. Projects were picked for variety — frameworks, build tools, linters, test runners and libraries — not for how they score.",
    heroesTitle: "The people holding it up",
    heroesIntro:
      "Single npm maintainers whose packages several of these projects depend on. If you use any of these projects, you depend on them too.",
    reliedOn: { one: "{count} project relies on them", other: "{count} projects rely on them" },
    morePackages: { one: "+{count} more package", other: "+{count} more packages" },
    support: "Support",
    profile: "npm profile",
    projectsTitle: "Closest to midnight first",
    category: {
      framework: "Framework",
      build: "Build tool",
      tooling: "Tooling",
      testing: "Testing",
      library: "Library",
    },
    rank: "#{rank}",
    dependencies: { one: "{count} dependency", other: "{count} dependencies" },
    critical: { one: "{count} critical", other: "{count} critical" },
    viewReport: "Full forecast",
    updated: "Updated {time} · Methodology v{version}",
    failed: "Couldn't refresh this time: {projects}.",
    computing: "The ranking is being refreshed. Check back in a minute.",
    cta: "Check your own project",
  },

  footer: {
    tagline: "Free. No sign-up. Rules, not AI — every score is explainable.",
    data: "Data from the npm registry and GitHub.",
    methodology: "How scores are calculated",
    ranking: "Who holds up the internet?",
    source: "Source on GitHub (MIT)",
  },

  /**
   * /methodology. Numbers in {braces} are filled in from RULES in lib/risk.ts,
   * so the page can't drift from the code.
   */
  methodology: {
    metaTitle: "Methodology",
    metaDescription:
      "How Dependency Doomsday scores dependency risk with fixed, public rules — no AI, no hidden weights.",
    eyebrow: "How the forecast works",
    title: "Rules, not magic.",
    version: "Methodology v{version}",
    intro:
      "Every forecast comes from a handful of fixed rules applied to public data from npm and GitHub. No AI and no secret weights: the same dependencies get the same score on the same day, and every point traces back to a fact you can check yourself.",

    sources: {
      title: "What we look at",
      items: [
        "**npm registry**: maintainers (the people allowed to publish the package), release dates, deprecation, the linked repository and how many dependencies the latest version has.",
        "**npm downloads**: downloads in the last month.",
        "**GitHub**: last push, whether the repo is archived, and open issues.",
      ],
      privacy: "Only package names are sent to these services. Your code never is.",
    },

    package: {
      title: "Risk of each package",
      intro:
        "Every package starts at 0. Each rule that applies adds points, and the total is capped at {max}.",
      ruleHeader: "Rule",
      pointsHeader: "Points",
      terminalPoints: "= {max}",
      maintainersNote:
        "**Maintainers** are the people with permission to publish the package on npm. They aren't always the ones writing the code, but they are the ones who can ship — or break — a release.",
      rows: {
        terminal: {
          rule: "Deprecated or unpublished on npm, or the GitHub repo is archived",
          why: "The authors have said it's over. No more fixes, security fixes included.",
        },
        singleMaintainer: {
          rule: "A single npm maintainer",
          why: "One burnout, lost laptop or hijacked account away from trouble. That's how xz happened.",
        },
        releaseOld: {
          rule: "Last release more than 36 months ago",
          why: "Bugs and vulnerabilities found since then have no published fix.",
        },
        releaseStale: {
          rule: "Otherwise, last release more than 18 months ago",
          why: "Slowing down. Worth a look, not yet a fire.",
        },
        push: {
          rule: "No push to the GitHub repo in more than 24 months",
          why: "Nobody is touching the code, not even unreleased changes.",
        },
        noRepo: {
          rule: "No source repository linked",
          why: "Hard to inspect, fork or fix if the maintainer disappears.",
        },
      },
    },

    discounts: {
      title: "Quiet is not always dead",
      intro:
        "Some packages are old because they're done. The release-age penalty is **halved** when either of these is true — once, even if both are:",
      finished:
        "**Possibly finished, not abandoned.** It has no dependencies of its own, fewer than {issues} open issues on GitHub, and it isn't deprecated or archived. A small utility with nothing left to fix doesn't need new releases. These packages are tagged so you can see why.",
      alive:
        "**Still alive.** The repo had a push in the last {months} months, even if nothing new was published.",
      example:
        "Example: last released 4 years ago, no dependencies, 3 open issues → +{halved} instead of +{full}.",
    },

    colors: {
      title: "Colors",
      low: "0–29",
      mid: "30–59",
      high: "60–100",
    },

    critical: {
      title: "Critical packages",
      body: "A package is **critical** when it has a single npm maintainer and more than {downloads} downloads a month: a big slice of the internet rests on one account. Critical packages count double in the project score.",
    },

    project: {
      title: "Your project's score",
      body: "Your score is **100 minus the average risk** of your dependencies, from 0 (midnight) to 100 (all clear). The average is weighted by popularity, so a package millions of projects rely on weighs more than an obscure one.",
      formula: [
        "score  = 100 − Σ(risk × weight) ÷ Σ(weight)",
        "weight = 1 + log10(monthly downloads + 1)",
        "         × {critical} if critical",
      ],
      weights:
        "That's a weight of about 1 for a package nobody downloads, 5 for 10,000 downloads a month and 8 for 10 million.",
    },

    clock: {
      title: "The doomsday clock",
      body: "Minutes to midnight = score ÷ 10, rounded, and never less than 1. A score of 82 puts you at 8 minutes to midnight; anything under 15 is 1 minute.",
    },

    missing: {
      title: "When data is missing",
      body: "If npm doesn't answer for a package, it's marked **no data** and left out of the score. If only GitHub is missing — no repo linked, a repo on another host, or GitHub's rate limit — the package is still scored from npm alone and tagged **npm data only**. The push rule and the \"possibly finished\" discount are skipped, and the forecast says how many packages were scored this way.",
    },

    limits: {
      title: "What this doesn't tell you",
      items: [
        "It measures **maintenance risk**, not code quality or known vulnerabilities. Use npm audit or a vulnerability scanner for those.",
        "Only your **direct** dependencies are scored, not the packages they pull in.",
        "npm only shows who can publish, not who does the work, so the maintainer count is an approximation.",
        "A risky score is a reason to look closer — and maybe to sponsor someone — not a verdict on people who maintain software for free.",
      ],
    },

    versioning: {
      title: "Versioning",
      body: "Any change to a rule or a number becomes a new methodology version, and every forecast shows the version it was computed with. You're reading **Methodology v{version}**.",
    },

    cta: "Get your forecast",
  },
};
