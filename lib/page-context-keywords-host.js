'use strict'

/**
 * Host page-context keyword index pages on the hub component.
 *
 * Antora 3 invokes single-parameter extension registers as register(generatorContext)
 * only, so @antora-supplemental/page-context/antora never sees playbook `component` /
 * `path` keys. This two-parameter wrapper forwards a `{ config }` payload.
 */
const registerPageContextAntora = require('@antora-supplemental/page-context/antora')

function register (generatorContext, vars = {}) {
  const yamlConfig = vars.config || {}
  const config = {
    component: 'home',
    path: 'keywords',
    ...yamlConfig,
  }
  return registerPageContextAntora.call(generatorContext, { config })
}

module.exports = register
module.exports.register = register
