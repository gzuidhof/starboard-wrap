# 🌯 starboard-wrap
A small library that wraps a Starboard Notebook iframe in the parent webpage.

## What?

A starboard notebook runtime should always run in a sandboxed iFrame on a different domain. This makes sure any code in the notebook can't take over the webpage that contains it.

The webpage talks to the notebook runtime in the iFrame using `postMessage`. This package provides an easy-to-use custom HTML element that facilitates this communication.

## Example

```html
<div id="mount-point"></div>

<script type="module">
    import {StarboardEmbed} from "../dist/index.js"
    const mount = document.querySelector("#mount-point");

    const el = new StarboardEmbed({
        notebookContent: "# %% [javascript]\n3+5\n",
        src: "https://unpkg.com/starboard-notebook@0.12.0/dist/index.html"
    });

    mount.appendChild(el);
</script>
```

Or

```html
<script src="/dist/index.iife.js" defer></script>

<starboard-embed>

<script type="starboard">
# %% [javascript]
3+5
</script>
<iframe src="https://unpkg.com/starboard-notebook@0.12.0/dist/index.html"></iframe>

</starboard-embed>
```

> ⚠️ Never use the second approach (the one with the `<script>` tag inside the `starboard-embed` element) for notebooks you did not author yourself! It makes cross site scripting (XSS) trivial. Its intended use is for embedding small notebooks in a blogpost, not for use in applications with user-generated content.

## Changelog

### 0.4.0
* Update for compatiblity with Starboard Notebook version `0.12.0`, which gets rid of `iframe-resizer` library for much smaller bundle size.

### 0.3.3
* The embed element now tracks unsaved and saved changes.
* Changes to options:
  * Added `preventNavigationWithUnsavedChanges` (boolean) option to prevent accidental leaving the page with unsaved changes.
   * Added `onUnsavedChangesStatusChange` (boolean => void) callback option so you can update your UI accordingly.
   * The `onSaveMessage` callback function can now return a (promise of a) boolean, in case it resolves to `true` the last saved content is updated.
* Added `setSaved(content?: string)` method to allow for manually setting the last saved content.
* Update default src to starboard-notebook version `0.10.1`.

### 0.3.2
* Better support for relative URL in embed src.
* Update default src to starboard-notebook version `0.9.4`.

### 0.3.1
* The notebook iframe src is now hardcoded to a recent starboard-notebook version if not set explicitly on the iframe or passed into the constructor.
* You can now specify your own iframe in the constructor options, this is only relevant for rather advanced use-cases in which a fast loading speed is especially critical.

### 0.3.0
* Renamed the custom element to `StarboardEmbed` with HTML tag `starboard-embed`.
* The custom element longer extends `IFrameHTMLElement`, instead it will look for an iframe child node or create one if it doesn't exist. This means that the Safari polyfill is no longer required, and pages containing a notebook in an iframe will load faster as the iframe can start loading before the main page's Javascript has been run.
* You can now embed the notebook's content in a script tag inside the `starboard-embed` element.
* `sendMessage()` function now buffers messages until the notebook ready signal has been received.