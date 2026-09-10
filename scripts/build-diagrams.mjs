import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { DOMParser } from "@xmldom/xmldom"
import { prepareThemedMermaidSvgDualOutput } from "@dev-centr/mermaid-svg-css-vars"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const sourceDir = path.join(root, "docs", "modules", "ROOT", "partials", "diagrams")
const outputDir = path.join(root, "docs", "modules", "ROOT", "images")
const cacheDir = path.join(root, "diagrams", ".cache")
const config = path.join(root, "diagrams", "mermaid-config.json")
const manifestDir = path.join(root, "diagrams", "manifests")
const check = process.argv.includes("--check")

const diagrams = {
  "tgc-actors": ["TLS isolation and a shared heap", "Threads keep private TLS data and communicate through a mailbox while allocations still enter one process-wide heap."],
  "tgc-desktop-mock": ["Responsive desktop workload with tgc", "The GUI and detached audio threads continue running while only the decode worker collects its local heap."],
  "tgc-many-to-many-regions": ["Many-to-many partitioned GC regions", "Workers attach only to local and shared regions they need; collecting Region Beta leaves Worker 2 running."],
  "tgc-opt-in-mock": ["Opting in to tgc", "A command selects the tgc runtime collector while the conservative collector remains the default."],
  "tgc-performance-compare": ["Shared heap versus per-thread heaps", "A shared heap requires synchronization and stop-the-world collection while tgc heaps collect locally and exchange remote frees."],
  "tgc-stw-timeline": ["Stop-the-world versus local collection", "The default collector pauses both threads; tgc pauses only the collecting thread while its sibling continues."]
}

const forbidden = [
  [/<(?:script|foreignObject|iframe|object|embed|audio|video)\b/i, "active or foreign content"],
  [/\son[a-z]+\s*=/i, "event handler"],
  [/(?:href|src)\s*=\s*["'](?:https?:|data:|javascript:|\/\/)/i, "external or executable reference"],
  [/\burl\(\s*["']?(?:https?:|data:|javascript:|\/\/)/i, "external CSS URL"],
  [/<(?:animate|set|animateTransform|animateMotion)\b/i, "SMIL mutation"],
]

function assertSvgContract(name, mode, svg) {
  const errors = []
  const document = new DOMParser({
    onError: (_level, message) => errors.push(message),
  }).parseFromString(svg, "image/svg+xml")
  if (errors.length || document.documentElement.nodeName !== "svg") {
    throw new Error(`${name} (${mode}): invalid XML: ${errors.join("; ")}`)
  }
  const rootElement = document.documentElement
  for (const [attribute, expected] of [
    ["xmlns", "http://www.w3.org/2000/svg"],
    ["role", "img"],
    ["preserveAspectRatio", "xMidYMid meet"],
  ]) {
    if (rootElement.getAttribute(attribute) !== expected) {
      throw new Error(`${name} (${mode}): missing ${attribute}="${expected}"`)
    }
  }
  if (!rootElement.getAttribute("viewBox") || !rootElement.getElementsByTagName("title").length || !rootElement.getElementsByTagName("desc").length) {
    throw new Error(`${name} (${mode}): missing viewBox, title, or description`)
  }
  if (/<text[^>]*>\s*<\/text>/i.test(svg)) throw new Error(`${name} (${mode}): empty text label`)
  for (const [pattern, label] of forbidden) {
    if (pattern.test(svg)) throw new Error(`${name} (${mode}): contains ${label}`)
  }
  if (/var\(\s*--[^,)]+\)/i.test(svg)) throw new Error(`${name} (${mode}): CSS variable lacks a fallback`)
  const hasDarkMedia = /prefers-color-scheme\s*:\s*dark/i.test(svg)
  if (mode === "standalone-adaptive" && !hasDarkMedia) throw new Error(`${name}: standalone output lacks dark-mode media query`)
  if (mode === "host" && hasDarkMedia) throw new Error(`${name}: host output must not bundle mode selection`)
}

mkdirSync(cacheDir, { recursive: true })
mkdirSync(outputDir, { recursive: true })
const mermaidCli = fileURLToPath(new URL("cli.js", import.meta.resolve("@mermaid-js/mermaid-cli")))
let stale = false

for (const [name, [title, description]] of Object.entries(diagrams)) {
  const sourcePath = path.join(sourceDir, `${name}.mmd`)
  const rawPath = path.join(cacheDir, `${name}.raw.svg`)
  const manifest = JSON.parse(readFileSync(path.join(manifestDir, `${name}.theme.json`), "utf8"))
  mkdirSync(cacheDir, { recursive: true })
  execFileSync(process.execPath, [mermaidCli, "-i", sourcePath, "-o", rawPath, "-c", config, "-b", "transparent", "-q"], {
    cwd: root,
    stdio: "inherit",
  })
  let raw = readFileSync(rawPath, "utf8")
  raw = raw.replace(/\srole="[^"]*"/, "").replace(/\saria-roledescription="[^"]*"/, "")
  raw = raw.replace(
    /<svg\b([^>]*)>/,
    `<svg$1 role="img" preserveAspectRatio="xMidYMid meet" aria-labelledby="${name}-title ${name}-desc"><title id="${name}-title">${title}</title><desc id="${name}-desc">${description}</desc>`,
  )
  const result = prepareThemedMermaidSvgDualOutput(raw, manifest)
  const errors = result.diagnostics.filter((item) => item.severity === "error")
  if (errors.length || !result.standaloneSvg || !result.hostSvg) {
    throw new Error(`${name}: ${JSON.stringify(result.diagnostics, null, 2)}`)
  }
  const standaloneSvg = result.standaloneSvg.replace(/\sheight="auto"/g, "")
  const hostSvg = result.hostSvg.replace(/\sheight="auto"/g, "")
  assertSvgContract(name, "standalone-adaptive", standaloneSvg)
  assertSvgContract(name, "host", hostSvg)
  for (const [suffix, value] of [
    [".svg", standaloneSvg],
    [".host.svg", hostSvg],
  ]) {
    const target = path.join(outputDir, `${name}${suffix}`)
    if (check) {
      if (!existsSync(target) || readFileSync(target, "utf8") !== value) {
        console.error(`stale ${path.relative(root, target)}`)
        stale = true
      }
    } else {
      writeFileSync(target, value, "utf8")
      console.log(`wrote ${path.relative(root, target)}`)
    }
  }
}

rmSync(cacheDir, { recursive: true, force: true })
if (stale) process.exitCode = 3
