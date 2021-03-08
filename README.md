# 🌯 starboard-wrap
A small library that wraps a Starboard Notebook iframe in the parent webpage

## What?

A starboard notebook runtime should always run in a sandboxed iFrame on a different domain. This makes sure any code in the notebook can't take over the webpage that contains it.

The webpage talks to the notebook runtime in the iFrame using `postMessage`. This package provides an easy-to-use custom HTML element that facilitates this communication.

## Example

```html
<div id="mount-point"></div>

<script type="module">
    import {StarboardNotebookIFrame} from "../dist/index.js"
    const mount = document.querySelector("#mount-point");

    const el = new StarboardNotebookIFrame({
        notebookContent: "# %% [javascript]\n3+5\n",
        src: "https://unpkg.com/starboard-notebook@0.7.12/dist/index.html"
    });

    el.style.width = "100%";
    mount.appendChild(el);
</script>

```