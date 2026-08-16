;(function () {
  const root = document.querySelector('[data-proposals]')
  if (!root) return

  const catalogUrl =
    root.getAttribute('data-catalog-url') || window.__pageCatalogUrl
  const tag = (root.getAttribute('data-tag') || 'proposal').toLowerCase()
  const list = root.querySelector('[data-proposals-list]')
  const status = root.querySelector('[data-proposals-status]')
  if (!catalogUrl || !list) return

  setStatus('Loading proposals…')

  function setStatus (text) {
    if (!status) return
    status.hidden = !text
    status.textContent = text || ''
  }

  function render (pages) {
    const items = pages.filter((page) => Array.isArray(page.tags) && page.tags.includes(tag))
    if (!items.length) {
      setStatus('No proposals are tagged yet.')
      return
    }
    const frag = document.createDocumentFragment()
    for (const page of items) {
      const li = document.createElement('li')
      const a = document.createElement('a')
      a.href = page.href || page.url
      a.textContent = page.title
      li.appendChild(a)
      if (page.description) {
        li.appendChild(document.createTextNode(' — ' + page.description))
      }
      frag.appendChild(li)
    }
    list.replaceChildren(frag)
    setStatus('')
  }

  fetch(catalogUrl, { headers: { Accept: 'application/json' } })
    .then((res) => {
      if (!res.ok) throw new Error('catalog ' + res.status)
      return res.json()
    })
    .then((catalog) => render(catalog.pages || []))
    .catch(() => {
      setStatus('')
    })
})()
