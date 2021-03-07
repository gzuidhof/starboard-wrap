# 🌯 starboard-wrap
A small library that wraps a Starboard Notebook iframe in the parent webpage

## What?

A starboard notebook runtime should always run in a sandboxed iFrame on a different domain. This makes sure any code in the notebook can't take over the webpage that contains it.

The webpage talks to the notebook runtime in the iFrame using `postMessage`. This package provides an easy-to-use class that facilitates this communication.
