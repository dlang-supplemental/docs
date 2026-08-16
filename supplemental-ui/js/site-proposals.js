;(function () {
  const roots = document.querySelectorAll('[data-proposals], [data-catalog]')
  if (!roots.length) return

  roots.forEach((root) => {
    const catalogUrl =
      root.getAttribute('data-catalog-url') || window.__pageCatalogUrl
    const tag = (root.getAttribute('data-tag') || 'proposal').toLowerCase()
    const list = root.querySelector('[data-proposals-list], [data-catalog-list]')
    const status = root.querySelector('[data-proposals-status], [data-catalog-status]')
    const label = root.getAttribute('data-empty') || 'No items tagged yet.'
    if (!catalogUrl || !list) return

    function setStatus (text) {
      if (!status) return
      status.hidden = !text
      status.textContent = text || ''
    }

    setStatus('Loading…')

    function render (pages) {
      const items = (pages || []).filter(
        (page) => Array.isArray(page.tags) && page.tags.includes(tag)
      )
      if (!items.length) {
        setStatus(label)
        return
      }
      const cards = list.classList.contains('project-list')
      const frag = document.createDocumentFragment()
      for (const page of items) {
        const li = document.createElement('li')
        const a = document.createElement('a')
        a.href = page.href || page.url
        if (cards) {
          const name = document.createElement('span')
          name.className = 'project-list__name'
          name.textContent = page.title
          a.appendChild(name)
          if (page.description) {
            const desc = document.createElement('span')
            desc.className = 'project-list__desc'
            desc.textContent = page.description
            a.appendChild(desc)
          }
        } else {
          a.textContent = page.title
          if (page.description) {
            li.appendChild(a)
            li.appendChild(document.createTextNode(' — ' + page.description))
            frag.appendChild(li)
            continue
          }
        }
        li.appendChild(a)
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
  })
})()
