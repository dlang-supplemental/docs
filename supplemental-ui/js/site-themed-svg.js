import { upgradeThemedSvgImages } from "https://cdn.jsdelivr.net/npm/@dev-centr/themed-svg@0.2.3/browser/themed-svg-element.js"

upgradeThemedSvgImages(document, {
  selector: ".imageblock.themed-svg img",
})

function onSoftNavLoaded (fn) {
  if (window.SoftNav && typeof SoftNav.on === 'function') SoftNav.on('loaded', fn)
  else document.addEventListener('soft-nav:loaded', function (e) { fn(e.detail || {}) })
}
onSoftNavLoaded(function () { upgradeThemedSvgImages(document, { selector: ".imageblock.themed-svg img" }) })
