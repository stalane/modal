# age-gate

Generic age-confirmation modal. Plain JS/CSS, no dependencies, works on any site.

## Install

Drop one tag before `</head>` (or before `</body>`):

```html
<script src="/age-gate.js" defer></script>
```

Copy `age-gate.js` to the root of the site, or host it once and point every
site at the same URL.

## Behavior

- On the **first page load** of a domain the modal appears over the site:
  *"There is nothing on this website that is interesting or suitable for
  children. Click to accept that you are over the age of 16"*
- Clicking the accept button sets a cookie (`age_gate=1`, 365 days) on the
  **registrable domain** (apex), so every subdomain shares it — the modal
  shows once per domain, not once per subdomain.
- The gate is **inescapable until accepted**: Esc or clicking outside only
  shakes the panel; the page behind stays blurred; focus is trapped on the
  accept button.
- If the browser blocks cookies the modal still dismisses on accept, and
  simply asks again next visit (never a loop).

## Style injection

The modal reads the host page's computed styles at load and matches them:

| Modal element       | Taken from                                   |
|---------------------|----------------------------------------------|
| font                | `body` `font-family`                         |
| panel background    | resolved `body`/`html` background, lifted/dropped slightly |
| text color          | `body` `color`                               |
| button background   | computed `color` of the first `<a>` (site accent) |
| button text         | black or white, whichever contrasts with the accent |
| overlay tint        | derived from light/dark classification of the page |

No stylesheet include is needed — the script injects its own `<style>` at
runtime, so one tag is the entire install.

## Config (optional)

Before the script tag:

```html
<script>
  window.AGE_GATE = {
    name: 'age_gate',   // cookie name
    days: 365,          // cookie lifetime
    text: '...',        // modal copy
    button: '...',      // button label
  };
</script>
```

## Local demo

```bash
python3 -m http.server 8080
```

- Light site: `http://localhost:8080/` (or `http://a.lvh.me:8080/`)
- Dark site: `http://localhost:8080/dark.html` (or `http://a.lvh.me:8080/dark.html`)
- Subdomain cookie-sharing test: accept on `a.lvh.me:8080`, then open
  `b.lvh.me:8080` — the modal stays hidden (`lvh.me` resolves `*.lvh.me`
  to 127.0.0.1).

To re-trigger the modal while testing, delete the `age_gate` cookie
(devtools → Application → Cookies) or run in the console:

```js
document.cookie = 'age_gate=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
document.cookie = 'age_gate=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.' + location.hostname.split('.').slice(-2).join('.');
```

## Known limits

- Apex detection uses a small built-in list of common second-level TLDs
  (`co.uk`, `com.au`, ...); sites on unusual public-suffix patterns fall
  back to a host-only cookie (modal asks once per subdomain instead of
  once per domain).
- Sites behind "Set-Cookie"-only flows or strict cookie-blocking will not
  persist the acceptance.
