'use strict'

/**
 * Publish page-catalog.json: tagged Antora pages for the org home page and portal.
 *
 * Pages opt in with `:page-tags:` (comma-separated). The welcome site loads
 * entries tagged `proposal`.
 */

function parseTags (raw) {
  if (raw == null || raw === '') return []
  const parts = Array.isArray(raw) ? raw : String(raw).split(/[,;]/)
  const seen = new Set()
  const tags = []
  for (const part of parts) {
    const tag = String(part).trim().toLowerCase()
    if (!tag || seen.has(tag)) continue
    seen.add(tag)
    tags.push(tag)
  }
  return tags
}

function joinUrl (base, path) {
  if (!path) return base || ''
  if (/^https?:\/\//i.test(path)) return path
  if (!base) return path
  const prefix = String(base).replace(/\/+$/, '')
  const suffix = String(path).startsWith('/') ? path : `/${path}`
  return `${prefix}${suffix}`
}

function pageKind (relative) {
  const rel = String(relative || '').split('\\').join('/')
  if (rel.startsWith('blog/')) return 'blog'
  if (rel.startsWith('news/')) return 'news'
  return 'article'
}

function stringAttr (attrs, name) {
  const value = attrs[name]
  if (value == null || value === '') return ''
  return String(value).trim()
}

function plainText (value) {
  return String(value || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#8217;/g, '\u2019')
    .trim()
}

module.exports.register = function () {
  this.on('beforePublish', ({ contentCatalog, siteCatalog, playbook }) => {
    const siteUrl = playbook.site?.url || ''
    const pages = []

    for (const page of contentCatalog.getPages()) {
      if (!page.out || !page.asciidoc) continue
      const attrs = page.asciidoc.attributes || {}
      const tags = parseTags(attrs['page-tags'] ?? attrs.tags)
      if (!tags.length) continue

      const url = page.pub?.url || `/${page.out.path}`
      const relative = page.src?.relative || ''
      pages.push({
        title: plainText(page.title || stringAttr(attrs, 'doctitle') || relative),
        description: stringAttr(attrs, 'description'),
        date: stringAttr(attrs, 'date'),
        tags,
        kind: pageKind(relative),
        component: page.src?.component || '',
        url,
        href: joinUrl(siteUrl, url),
      })
    }

    pages.sort((a, b) => {
      const byDate = String(b.date).localeCompare(String(a.date))
      if (byDate) return byDate
      return String(a.title).localeCompare(String(b.title))
    })

    const body = `${JSON.stringify({ pages }, null, 2)}\n`
    siteCatalog.addFile({
      contents: Buffer.from(body),
      out: { path: 'page-catalog.json' },
    })
  })
}
