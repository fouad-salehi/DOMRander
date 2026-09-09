# DOMRander

![Version](https://img.shields.io/badge/version-1.0.0-black)
![Language](https://img.shields.io/badge/language-JavaScript-yellow)
![Platform](https://img.shields.io/badge/platform-Browser-blue)
![Dependencies](https://img.shields.io/badge/dependencies-None-success)
![RTL](https://img.shields.io/badge/RTL-Persian%20%2F%20Arabic-purple)
![Canvas](https://img.shields.io/badge/output-HTML%20Canvas-orange)
![License](https://img.shields.io/badge/license-Custom%20%2F%20Proprietary-red)

DOMRander is a lightweight, dependency-free JavaScript renderer that converts HTML and CSS DOM elements into HTML Canvas.

It is designed with a strong focus on Persian, Arabic, RTL, mixed RTL/LTR, and Unicode text rendering while providing a simple browser-based API.

## Features

* HTML to Canvas rendering
* Persian and Arabic text support
* RTL and LTR text direction
* Mixed RTL/LTR content
* Unicode and special characters
* Browser font rendering
* Background colors
* Linear gradients
* Borders
* Border radius
* Box shadows
* Opacity
* CSS transforms
* Basic overflow clipping
* PNG export
* Blob export
* Dependency-free
* Browser-based
* Simple API
* Built-in playground for testing

## Why DOMRander?

DOM-to-image rendering can become especially difficult when working with Persian and Arabic text.

Rendering text character by character can break Arabic shaping, joining behavior, and bidirectional text layout.

DOMRander uses browser text layout information and renders text segments as complete strings instead of drawing individual characters separately.

This allows Persian and Arabic text to preserve their natural shaping and joining behavior.

## Installation

No package manager or external dependency is required.

Download `domrander.js` and include it in your HTML:

```html
<script src="domrander.js"></script>
```

## Basic Usage

```html
<div id="content">
    Hello World
</div>

<script src="domrander.js"></script>

<script>
    const element = document.getElementById("content");

    DOMRander.toCanvas(element).then(canvas => {
        document.body.appendChild(canvas);
    });
</script>
```

## Persian and RTL

DOMRander supports Persian and Arabic text while preserving browser-based text shaping.

```html
<div id="content" dir="rtl">
    سلام دنیا
</div>

<script>
    const element = document.getElementById("content");

    DOMRander.toCanvas(element, {
        scale: 2
    }).then(canvas => {
        document.body.appendChild(canvas);
    });
</script>
```

## Mixed RTL and LTR

Mixed-direction content can also be rendered:

```html
<div id="content" dir="rtl">
    فارسی + English + 123
</div>
```

## Unicode and Persian Testing

DOMRander can be tested with content such as:

```text
سلام دنیا 👋
برنامه‌نویسی فارسی
فارسی + English + 123
RTL ← → LTR
فؤاد
★ ☆ ♥ ♠ ♣
```

These examples are useful for testing:

* Persian text shaping
* Arabic joining
* RTL direction
* LTR direction
* Mixed-direction text
* Numbers
* Unicode symbols
* Emoji
* Special characters

## Screenshots

<p align="center"> <img src="https://github.com/user-attachments/assets/e4449cd2-0510-455a-bb33-5e6a61239445" width="420"> <img src="https://github.com/user-attachments/assets/a810b43e-9930-40d4-b7df-09b7f47f4dbc" width="420"> </p>

## API

### `DOMRander.toCanvas()`

Renders a DOM element to an HTML Canvas element.

```js
const canvas = await DOMRander.toCanvas(element);
```

With options:

```js
const canvas = await DOMRander.toCanvas(element, {
    scale: 2,
    backgroundColor: "#ffffff"
});
```

### `DOMRander.toDataURL()`

Returns the rendered result as a Data URL.

```js
const dataURL = await DOMRander.toDataURL(element);
```

Example:

```js
const link = document.createElement("a");

link.href = await DOMRander.toDataURL(element);
link.download = "render.png";
link.click();
```

### `DOMRander.toBlob()`

Returns the rendered result as a `Blob`.

```js
const blob = await DOMRander.toBlob(element);
```

Example:

```js
const blob = await DOMRander.toBlob(element);

const url = URL.createObjectURL(blob);

const link = document.createElement("a");
link.href = url;
link.download = "render.png";
link.click();

URL.revokeObjectURL(url);
```

## Options

The renderer currently supports the following options:

```js
{
    scale: 1,
    backgroundColor: null
}
```

### `scale`

Controls the output resolution.

```js
const canvas = await DOMRander.toCanvas(element, {
    scale: 2
});
```

A higher scale produces a higher-resolution canvas.

### `backgroundColor`

Defines an optional canvas background color.

```js
const canvas = await DOMRander.toCanvas(element, {
    backgroundColor: "#ffffff"
});
```

Use `null` to keep the background transparent when possible.

## Saving as PNG

The playground can export the DOMRander Canvas result as a PNG image.

```js
const canvas = await DOMRander.toCanvas(element, {
    scale: 2
});

const link = document.createElement("a");

link.download = "domrander-output.png";
link.href = canvas.toDataURL("image/png");

link.click();
```

The downloaded PNG is the actual rendered output produced by DOMRander.

## Playground

DOMRander includes a browser playground for testing HTML and CSS.

The playground provides:

* HTML input
* CSS input
* Browser preview
* DOMRander Canvas output
* Rendering controls
* PNG export
* Engine download

The playground is separated from the renderer itself.

```text
DOMRander/
├── index.html
├── app.js
├── domrander.js
├── LICENSE
└── README.md
```

The core renderer does not contain playground-specific logic.

## Rendering Approach

DOMRander relies on the browser's own DOM and text layout engine to obtain rendering information.

For text rendering, it uses browser layout information instead of treating every character as an independent drawing operation.

This is particularly important for scripts such as Persian and Arabic where characters can change their shape depending on their position and surrounding characters.

The renderer also uses browser font information and waits for document fonts before starting the rendering process.

## Current Scope

DOMRander version 1.0.0 focuses on the following rendering capabilities:

* HTML elements
* CSS styling
* Persian
* Arabic
* RTL
* LTR
* Mixed text directions
* Unicode
* Fonts
* Backgrounds
* Gradients
* Borders
* Border radius
* Box shadows
* Opacity
* Transforms
* Basic clipping
* Canvas output
* PNG export
* Data URL output
* Blob output

## Roadmap

Possible future improvements include:

* Image rendering
* Pseudo-elements
* `::before` and `::after`
* Input rendering
* Textarea rendering
* Font Awesome support
* More advanced clipping
* More accurate CSS support
* More complex Unicode and bidi handling
* Additional browser compatibility improvements

## Browser Support

DOMRander is designed for modern browsers that support:

* HTML Canvas
* DOM APIs
* `Range`
* `getBoundingClientRect()`
* CSS computed styles
* `document.fonts`
* Modern JavaScript

## Contributing

DOMRander is currently distributed under a custom proprietary license.

The source code may be viewed and executed according to the terms defined in the `LICENSE` file.

Contributions, modifications, redistribution, and derivative works require prior written permission from the copyright owner.

## Author

**Fouad Salehi**

GitHub: https://github.com/fouad-salehi
ORCID: https://orcid.org/0009-0008-6241-8599

## License

DOMRander is **not** licensed under MIT, Apache, GPL, or another open-source license.

DOMRander is distributed under a custom proprietary license.

See the [`LICENSE`](./LICENSE) file for the complete terms.

## Copyright

Copyright © 2026 Fouad Salehi. All rights reserved.

DOMRander — DOM to Canvas Renderer
