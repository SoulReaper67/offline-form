/**
 * offline-form.js
 * Sauvegarde automatique de formulaires avec restauration hors-ligne
 * v0.1.0 — TwinsMi Studio
 */

// ─── Stockage ────────────────────────────────────────────────────────────────

const storage = {
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (e) {
      console.warn('[offline-form] Impossible d\'écrire dans localStorage', e)
    }
  },
  get(key) {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : null
    } catch (e) {
      return null
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key)
    } catch (e) {}
  }
}

// ─── Sérialisation ───────────────────────────────────────────────────────────

/**
 * Lit tous les champs d'un formulaire et retourne un objet clé/valeur
 */
function serializeForm(form) {
  const data = {}
  const fields = form.querySelectorAll('input, textarea, select')

  fields.forEach(field => {
    const name = field.name || field.id
    if (!name) return

    if (field.type === 'checkbox') {
      data[name] = field.checked
    } else if (field.type === 'radio') {
      if (field.checked) data[name] = field.value
    } else if (field.type === 'file') {
      // Les fichiers ne sont pas sérialisables, on ignore
      return
    } else {
      data[name] = field.value
    }
  })

  return data
}

/**
 * Applique un objet de données sauvegardé sur les champs du formulaire
 */
function deserializeForm(form, data) {
  if (!data || typeof data !== 'object') return

  const fields = form.querySelectorAll('input, textarea, select')

  fields.forEach(field => {
    const name = field.name || field.id
    if (!name || !(name in data)) return

    if (field.type === 'checkbox') {
      field.checked = Boolean(data[name])
    } else if (field.type === 'radio') {
      field.checked = field.value === data[name]
    } else if (field.type === 'file') {
      return
    } else {
      field.value = data[name]
    }
  })
}

// ─── Debounce ────────────────────────────────────────────────────────────────

function debounce(fn, delay) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

// ─── Toast discret ───────────────────────────────────────────────────────────

function showToast(message) {
  const existing = document.getElementById('__offline-form-toast__')
  if (existing) existing.remove()

  const toast = document.createElement('div')
  toast.id = '__offline-form-toast__'
  toast.textContent = message
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #333;
    color: #fff;
    padding: 10px 18px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 99999;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  `

  document.body.appendChild(toast)
  requestAnimationFrame(() => { toast.style.opacity = '1' })

  setTimeout(() => {
    toast.style.opacity = '0'
    setTimeout(() => toast.remove(), 300)
  }, 3000)
}

// ─── Registre des formulaires surveillés ─────────────────────────────────────

const registry = new Map()

// ─── Cœur : watch ────────────────────────────────────────────────────────────

/**
 * @param {string|HTMLFormElement} selector - Sélecteur CSS ou élément form
 * @param {object} options
 * @param {number}   [options.debounce=800]       - Délai en ms entre chaque save
 * @param {string}   [options.key]                - Clé de stockage custom
 * @param {string}   [options.storage='localStorage'] - 'localStorage' | 'indexedDB'
 * @param {boolean}  [options.toast=true]         - Affiche un toast au restore
 * @param {boolean}  [options.autoSubmit=false]   - Resoumission auto au retour réseau
 * @param {function} [options.onSave]             - Callback après chaque save
 * @param {function} [options.onRestore]          - Callback après restauration
 * @param {function} [options.onRetry]            - Callback avant resoumission auto
 */
function watch(selector, options = {}) {
  const form = typeof selector === 'string'
    ? document.querySelector(selector)
    : selector

  if (!form || form.tagName !== 'FORM') {
    console.warn('[offline-form] Élément introuvable ou non-formulaire :', selector)
    return
  }

  const opts = {
    debounce: 800,
    key: null,
    storage: 'localStorage',
    toast: true,
    autoSubmit: false,
    onSave: null,
    onRestore: null,
    onRetry: null,
    ...options
  }

  // Clé unique basée sur l'id/name du form ou l'URL
  const storageKey = opts.key
    || `__offline-form__${form.id || form.name || window.location.pathname}`

  // ── Restauration au chargement ──────────────────────────────────────────
  const saved = storage.get(storageKey)
  if (saved && Object.keys(saved).length > 0) {
    deserializeForm(form, saved)

    if (opts.toast) {
      showToast('📋 Vos données ont été restaurées automatiquement')
    }
    if (typeof opts.onRestore === 'function') {
      opts.onRestore(saved)
    }
  }

  // ── Sauvegarde automatique à chaque frappe ──────────────────────────────
  const saveNow = () => {
    const data = serializeForm(form)
    storage.set(storageKey, data)
    if (typeof opts.onSave === 'function') opts.onSave(data)
  }

  const debouncedSave = debounce(saveNow, opts.debounce)

  form.addEventListener('input', debouncedSave)
  form.addEventListener('change', debouncedSave)

  // ── Nettoyage après soumission réussie ──────────────────────────────────
  const onSubmit = () => {
    storage.remove(storageKey)
  }
  form.addEventListener('submit', onSubmit)

  // ── Enregistrement dans le registre ────────────────────────────────────
  registry.set(form, {
    storageKey,
    opts,
    listeners: { input: debouncedSave, change: debouncedSave, submit: onSubmit }
  })

  return form
}

// ─── unwatch ─────────────────────────────────────────────────────────────────

function unwatch(selector) {
  const form = typeof selector === 'string'
    ? document.querySelector(selector)
    : selector

  if (!form || !registry.has(form)) return

  const { listeners } = registry.get(form)
  form.removeEventListener('input', listeners.input)
  form.removeEventListener('change', listeners.change)
  form.removeEventListener('submit', listeners.submit)
  registry.delete(form)
}

// ─── clear ───────────────────────────────────────────────────────────────────

function clear(selector) {
  const form = typeof selector === 'string'
    ? document.querySelector(selector)
    : selector

  if (!form || !registry.has(form)) return

  const { storageKey } = registry.get(form)
  storage.remove(storageKey)
}

// ─── getAll ───────────────────────────────────────────────────────────────────

function getAll() {
  const result = []
  registry.forEach((meta, form) => {
    const data = storage.get(meta.storageKey)
    result.push({ form, key: meta.storageKey, data })
  })
  return result
}

// ─── Export ──────────────────────────────────────────────────────────────────

const OfflineForm = { watch, unwatch, clear, getAll }

export default OfflineForm
export { watch, unwatch, clear, getAll }
