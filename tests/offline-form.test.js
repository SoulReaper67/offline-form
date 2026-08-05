/**
 * offline-form.test.js
 * Tests unitaires pour offline-form.js
 */

import { jest } from '@jest/globals'
import { watch, unwatch, clear, getAll } from '../src/offline-form.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createForm() {
  document.body.innerHTML = `
    <form id="test-form" action="/api/submit" method="POST">
      <input name="prenom" type="text" value="" />
      <input name="email" type="email" value="" />
      <input name="cgu" type="checkbox" />
      <select name="pays">
        <option value="">—</option>
        <option value="fr">France</option>
      </select>
      <textarea name="message"></textarea>
    </form>
  `
  return document.getElementById('test-form')
}

// La clé générée par le module dans jsdom (pathname = '/')
const STORAGE_KEY = '__offline-form__test-form'

beforeEach(() => {
  localStorage.clear()
  document.body.innerHTML = ''
})

afterEach(() => {
  const form = document.getElementById('test-form')
  if (form) unwatch(form)
})

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('watch()', () => {

  test('retourne undefined si le sélecteur ne trouve rien', () => {
    const result = watch('#inexistant')
    expect(result).toBeUndefined()
  })

  test('retourne le formulaire si trouvé', () => {
    const form = createForm()
    const result = watch('#test-form', { toast: false })
    expect(result).toBe(form)
  })

  test('restaure les données sauvegardées au chargement', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      prenom: 'Alice',
      email: 'alice@test.fr',
      pays: 'fr'
    }))

    const form = createForm()
    watch('#test-form', { toast: false })

    expect(form.querySelector('[name="prenom"]').value).toBe('Alice')
    expect(form.querySelector('[name="email"]').value).toBe('alice@test.fr')
    expect(form.querySelector('[name="pays"]').value).toBe('fr')
  })

  test('appelle onRestore avec les données si données sauvegardées', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ prenom: 'Bob' }))

    createForm()
    const onRestore = jest.fn()
    watch('#test-form', { toast: false, onRestore })

    expect(onRestore).toHaveBeenCalledWith({ prenom: 'Bob' })
  })

  test('ne restaure pas si localStorage vide', () => {
    const form = createForm()
    const onRestore = jest.fn()
    watch('#test-form', { toast: false, onRestore })

    expect(onRestore).not.toHaveBeenCalled()
    expect(form.querySelector('[name="prenom"]').value).toBe('')
  })

  test('sauvegarde les données sur input avec debounce', async () => {
    const form = createForm()
    const onSave = jest.fn()
    watch('#test-form', { toast: false, debounce: 50, onSave })

    const input = form.querySelector('[name="prenom"]')
    input.value = 'Dominique'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    await new Promise(r => setTimeout(r, 120))

    expect(onSave).toHaveBeenCalledTimes(1)
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    expect(saved.prenom).toBe('Dominique')
  })

  test('sauvegarde les checkboxes correctement', async () => {
    const form = createForm()
    watch('#test-form', { toast: false, debounce: 50 })

    const checkbox = form.querySelector('[name="cgu"]')
    checkbox.checked = true
    checkbox.dispatchEvent(new Event('change', { bubbles: true }))

    await new Promise(r => setTimeout(r, 120))

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    expect(saved.cgu).toBe(true)
  })

  test('efface le cache après soumission réussie (online)', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true })

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ prenom: 'Alice' }))

    const form = createForm()
    watch('#test-form', { toast: false, autoSubmit: false })

    form.dispatchEvent(new Event('submit', { bubbles: true }))

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  test('utilise la clé custom si fournie', async () => {
    const form = createForm()
    watch('#test-form', { toast: false, debounce: 50, key: 'ma-cle-custom' })

    const input = form.querySelector('[name="prenom"]')
    input.value = 'Test'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    await new Promise(r => setTimeout(r, 120))

    expect(localStorage.getItem('ma-cle-custom')).not.toBeNull()
  })

})

describe('unwatch()', () => {

  test('stoppe la sauvegarde après unwatch', async () => {
    const form = createForm()
    const onSave = jest.fn()
    watch('#test-form', { toast: false, debounce: 50, onSave })
    unwatch('#test-form')

    const input = form.querySelector('[name="prenom"]')
    input.value = 'Test'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    await new Promise(r => setTimeout(r, 120))

    expect(onSave).not.toHaveBeenCalled()
  })

})

describe('clear()', () => {

  test('efface les données du localStorage', async () => {
    const form = createForm()
    watch('#test-form', { toast: false, debounce: 50 })

    const input = form.querySelector('[name="prenom"]')
    input.value = 'Alice'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    await new Promise(r => setTimeout(r, 120))

    clear('#test-form')
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

})

describe('getAll()', () => {

  test('retourne les formulaires surveillés avec leurs données', async () => {
    const form = createForm()
    watch('#test-form', { toast: false, debounce: 50 })

    const input = form.querySelector('[name="prenom"]')
    input.value = 'Alice'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    await new Promise(r => setTimeout(r, 120))

    const all = getAll()
    expect(all.length).toBe(1)
    expect(all[0].data.prenom).toBe('Alice')
  })

})

describe('sérialisation', () => {

  test('sérialise tous les types de champs', async () => {
    const form = createForm()
    watch('#test-form', { toast: false, debounce: 50 })

    form.querySelector('[name="prenom"]').value = 'Alice'
    form.querySelector('[name="email"]').value = 'alice@test.fr'
    form.querySelector('[name="cgu"]').checked = true
    form.querySelector('[name="pays"]').value = 'fr'
    form.querySelector('[name="message"]').value = 'Bonjour !'

    form.querySelector('[name="prenom"]').dispatchEvent(new Event('input', { bubbles: true }))

    await new Promise(r => setTimeout(r, 120))

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    expect(saved.prenom).toBe('Alice')
    expect(saved.email).toBe('alice@test.fr')
    expect(saved.cgu).toBe(true)
    expect(saved.pays).toBe('fr')
    expect(saved.message).toBe('Bonjour !')
  })

})
