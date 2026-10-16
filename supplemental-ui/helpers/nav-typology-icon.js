'use strict'

const { resolveTypologyId: resolveTypologyIdCore } = require('@antora-supplemental/nav-typology/lib/resolve-typology')

const TYPOLOGIES = {
  'component-root': { id: 'component-root', spriteId: 'icon-component-root', label: 'Component' },
  'spec-component': { id: 'spec-component', spriteId: 'icon-spec-component', label: 'Component spec' },
  'spec-feature': { id: 'spec-feature', spriteId: 'icon-spec-feature', label: 'Feature spec' },
  'diataxis-tutorial': { id: 'diataxis-tutorial', spriteId: 'icon-diataxis-tutorial', label: 'Tutorial' },
  'diataxis-howto': { id: 'diataxis-howto', spriteId: 'icon-diataxis-howto', label: 'How-to' },
  'diataxis-reference': { id: 'diataxis-reference', spriteId: 'icon-diataxis-reference', label: 'Reference' },
  'diataxis-explanation': {
    id: 'diataxis-explanation',
    spriteId: 'icon-diataxis-explanation',
    label: 'Explanation',
  },
  changelog: {
    id: 'changelog',
    spriteId: 'icon-changelog',
    label: 'Changelog',
  },
  overview: {
    id: 'overview',
    spriteId: 'icon-overview',
    label: 'Overview',
  },
}

/** Typologies that render an icon by default (component-root is opt-in). */
const DEFAULT_ICON_IDS = new Set([
  'spec-component',
  'spec-feature',
  'diataxis-tutorial',
  'diataxis-howto',
  'diataxis-reference',
  'diataxis-explanation',
  'changelog',
  'overview',
])

function siteKeys (options = {}) {
  return (options.data && options.data.root && options.data.root.site && options.data.root.site.keys) || {}
}

function diataxisEnabled (options = {}) {
  const keys = siteKeys(options)
  return keys.nav_typology_diataxis === 'true' || keys.nav_typology === 'true'
}

/** Opt-in: site.keys.nav_typology_component_root_icons === 'true' */
function componentRootIconsEnabled (options = {}) {
  return siteKeys(options).nav_typology_component_root_icons === 'true'
}

function shouldRenderIcon (meta, options = {}) {
  if (!meta) return false
  if (meta.id === 'component-root') return componentRootIconsEnabled(options)
  return DEFAULT_ICON_IDS.has(meta.id)
}

function resolveTypology (item, options = {}) {
  if (!item || typeof item !== 'object') return null

  const level = options.hash?.level ?? 0
  const depth = Number(level) || 0
  const parentTypologyId = options.hash?.parentTypologyId || ''
  const diataxis = diataxisEnabled(options)

  let id = null
  if (depth === 0 && item.url && Array.isArray(item.items) && item.items.length) {
    id = 'component-root'
  } else {
    id = resolveTypologyIdCore(item, {
      depth,
      parentTypologyId,
      diataxisEnabled: diataxis,
      skipBuildFallback: false,
    })
  }

  return id && TYPOLOGIES[id] ? TYPOLOGIES[id] : null
}

module.exports = (item, options = {}) => {
  const meta = resolveTypology(item, options)
  if (!shouldRenderIcon(meta, options)) return ''
  const uiRoot = options.data?.root?.uiRootPath || options.data?.root?.siteRootPath || '/_'
  // Explicit size attributes match --nav-typology-icon-size (solid glyphs read larger).
  return (
    `<svg class="nav-typology-icon nav-typology-icon--${meta.id}" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">` +
    `<use href="${uiRoot}/img/nav-typology.svg#${meta.spriteId}"/></svg>`
  )
}

module.exports.resolveTypology = resolveTypology
module.exports.shouldRenderIcon = shouldRenderIcon
module.exports.componentRootIconsEnabled = componentRootIconsEnabled