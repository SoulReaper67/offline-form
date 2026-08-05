# offline-form.js

> Auto-save HTML forms with offline detection and automatic retry. Zero dependency, < 3kb gzip.

[![npm version](https://img.shields.io/npm/v/offline-form)](https://www.npmjs.com/package/offline-form)
[![license](https://img.shields.io/npm/l/offline-form)](LICENSE)
[![gzip size](https://img.shields.io/badge/gzip-%3C3kb-brightgreen)]()

**The problem:** Users fill out a long form, lose their connection (or close the tab by mistake), and lose everything.

**The solution:** 2 lines of code.

---

## Install

```bash
npm install offline-form
```

Or use the CDN (no install needed):

```html
<script type="module">
  import OfflineForm from 'https://cdn.jsdelivr.net/npm/offline-form/src/offline-form.js'
</script>
```

---

## Quick start

```html
<form id="my-form" action="/api/submit" method="POST">
  <input name="email" type="email" placeholder="Email" />
  <textarea name="message"></textarea>
  <button type="submit">Send</button>
</form>

<script type="module">
  import OfflineForm from 'offline-form'

  OfflineForm.watch('#my-form')
</script>
```

That's it. The form now:
- **Auto-saves** every keystroke (debounced)
- **Restores** data on page reload
- **Detects** when the user goes offline
- **Retries** the submit automatically when connection is back

---

## Options

```js
OfflineForm.watch('#my-form', {
  debounce:   800,       // ms between each save (default: 800)
  key:        'checkout',// custom storage key (default: auto-generated)
  toast:      true,      // show a subtle restore notification (default: true)
  autoSubmit: false,     // auto-retry submit on reconnection (default: false)
  onSave:    (data)  => console.log('Saved', data),
  onRestore: (data)  => console.log('Restored', data),
  onRetry:   (item)  => console.log('Retrying', item.action),
})
```

| Option | Type | Default | Description |
|---|---|---|---|
| `debounce` | `number` | `800` | Delay in ms between saves |
| `key` | `string` | auto | Custom localStorage key |
| `toast` | `boolean` | `true` | Show restore notification |
| `autoSubmit` | `boolean` | `false` | Auto-retry submit on reconnect |
| `onSave` | `function` | `null` | Called after each save |
| `onRestore` | `function` | `null` | Called after data restore |
| `onRetry` | `function` | `null` | Called before each retry attempt |

---

## Methods

```js
// Stop watching a form
OfflineForm.unwatch('#my-form')

// Clear saved data for a form
OfflineForm.clear('#my-form')

// Get all watched forms and their cached data
OfflineForm.getAll()
// → [{ form, key, data }]
```

---

## Framework usage

### React

```jsx
import OfflineForm from 'offline-form'
import { useEffect } from 'react'

function ContactForm() {
  useEffect(() => {
    OfflineForm.watch('#contact', { autoSubmit: true })
    return () => OfflineForm.unwatch('#contact')
  }, [])

  return (
    <form id="contact" action="/api/contact" method="POST">
      <input name="email" type="email" />
      <textarea name="message" />
      <button type="submit">Send</button>
    </form>
  )
}
```

### Vue

```vue
<script setup>
import OfflineForm from 'offline-form'
import { onMounted, onUnmounted } from 'vue'

onMounted(() => OfflineForm.watch('#my-form', { toast: true }))
onUnmounted(() => OfflineForm.unwatch('#my-form'))
</script>
```

### Plain HTML (CDN)

```html
<script type="module">
  import OfflineForm from 'https://cdn.jsdelivr.net/npm/offline-form/src/offline-form.js'
  OfflineForm.watch('#my-form')
</script>
```

---

## How it works

```
User types → debounce 800ms → serialize fields → localStorage
                                                       ↓
Page reload ──────────────────────────────────→ restore fields + toast

User submits (online)  → submit normally → clear cache
User submits (offline) → queue in localStorage → show banner
Connection back        → retry fetch → clear cache on success
```

---

## Supported field types

| Type | Saved | Restored |
|---|---|---|
| `text`, `email`, `tel`, `url`, `number` | ✅ | ✅ |
| `textarea` | ✅ | ✅ |
| `select` | ✅ | ✅ |
| `checkbox` | ✅ | ✅ |
| `radio` | ✅ | ✅ |
| `file` | ❌ (not serializable) | ❌ |

---

## Browser support

All modern browsers. No polyfill needed.

| Chrome | Firefox | Safari | Edge |
|---|---|---|---|
| ✅ 61+ | ✅ 60+ | ✅ 10.1+ | ✅ 16+ |

---

## License

MIT © [TwinMi Studio](https://github.com/soulreaper67)
