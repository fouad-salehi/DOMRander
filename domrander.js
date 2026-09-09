(function (global) {
    "use strict";

    class DOMRander {
        static async toCanvas(element, options = {}) {
            if (!(element instanceof Element)) {
                throw new TypeError("DOMRander: element must be a DOM Element");
            }

            await this.#waitForFonts();

            const scale = Number(options.scale) > 0 ? Number(options.scale) : 1;
            const backgroundColor =
                options.backgroundColor === undefined
                    ? null
                    : options.backgroundColor;

            const rect = element.getBoundingClientRect();

            const width = Math.max(
                1,
                Math.ceil(rect.width)
            );

            const height = Math.max(
                1,
                Math.ceil(rect.height)
            );

            const canvas = document.createElement("canvas");

            canvas.width = Math.ceil(width * scale);
            canvas.height = Math.ceil(height * scale);

            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

            const ctx = canvas.getContext("2d", {
                alpha: true
            });

            ctx.scale(scale, scale);

            if (backgroundColor !== null) {
                ctx.fillStyle = backgroundColor;
                ctx.fillRect(0, 0, width, height);
            }

            await this.#renderNode(
                element,
                ctx,
                rect.left,
                rect.top,
                {
                    root: element
                }
            );

            return canvas;
        }

        static async toDataURL(element, options = {}) {
            const canvas = await this.toCanvas(
                element,
                options
            );

            return canvas.toDataURL(
                options.type || "image/png",
                options.quality ?? 1
            );
        }

        static async toBlob(element, options = {}) {
            const canvas = await this.toCanvas(
                element,
                options
            );

            return new Promise((resolve, reject) => {
                canvas.toBlob(
                    blob => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(
                                new Error(
                                    "DOMRander: failed to create Blob"
                                )
                            );
                        }
                    },
                    options.type || "image/png",
                    options.quality ?? 1
                );
            });
        }

        static async #waitForFonts() {
            if (document.fonts?.ready) {
                try {
                    await document.fonts.ready;
                } catch (_) {}
            }
        }

        static async #renderNode(
            node,
            ctx,
            offsetX,
            offsetY,
            state
        ) {
            if (node.nodeType === Node.TEXT_NODE) {
                this.#renderText(
                    node,
                    ctx,
                    offsetX,
                    offsetY,
                    state
                );
                return;
            }

            if (node.nodeType !== Node.ELEMENT_NODE) {
                return;
            }

            const element = node;

            const style = getComputedStyle(element);

            if (
                style.display === "none" ||
                style.visibility === "hidden" ||
                parseFloat(style.opacity) === 0
            ) {
                return;
            }

            const rect = element.getBoundingClientRect();

            if (
                rect.width <= 0 &&
                rect.height <= 0
            ) {
                return;
            }

            ctx.save();

            const opacity =
                parseFloat(style.opacity);

            if (!Number.isNaN(opacity)) {
                ctx.globalAlpha *= opacity;
            }

            this.#applyTransform(
                ctx,
                element,
                rect,
                offsetX,
                offsetY
            );

            this.#renderBoxShadow(
                ctx,
                element,
                rect,
                style,
                offsetX,
                offsetY
            );

            this.#renderBackground(
                ctx,
                element,
                rect,
                style,
                offsetX,
                offsetY
            );

            this.#renderBorders(
                ctx,
                rect,
                style,
                offsetX,
                offsetY
            );

            const overflowHidden =
                style.overflow === "hidden" ||
                style.overflowX === "hidden" ||
                style.overflowY === "hidden";

            if (overflowHidden) {
                ctx.save();

                this.#roundedPath(
                    ctx,
                    rect.left - offsetX,
                    rect.top - offsetY,
                    rect.width,
                    rect.height,
                    this.#getRadii(style)
                );

                ctx.clip();
            }

            for (const child of element.childNodes) {
                await this.#renderNode(
                    child,
                    ctx,
                    offsetX,
                    offsetY,
                    state
                );
            }

            if (overflowHidden) {
                ctx.restore();
            }

            ctx.restore();
        }

        static #renderText(
            textNode,
            ctx,
            offsetX,
            offsetY
        ) {
            const text = textNode.nodeValue;

            if (!text || !text.length) {
                return;
            }

            const element = textNode.parentElement;

            if (!element) {
                return;
            }

            const style = getComputedStyle(element);

            if (
                style.display === "none" ||
                style.visibility === "hidden"
            ) {
                return;
            }

            const range = document.createRange();

            const segments =
                this.#getTextSegments(
                    textNode,
                    range
                );

            for (const segment of segments) {
                this.#drawTextSegment(
                    segment.text,
                    segment.rect,
                    style,
                    ctx,
                    offsetX,
                    offsetY
                );
            }

            range.detach();
        }

        static #getTextSegments(
            textNode,
            range
        ) {
            const text = textNode.nodeValue;
            const segments = [];

            let start = 0;

            while (start < text.length) {
                let end = start + 1;
                let lastValid = null;

                while (end <= text.length) {
                    range.setStart(
                        textNode,
                        start
                    );

                    range.setEnd(
                        textNode,
                        end
                    );

                    const rects =
                        Array.from(
                            range.getClientRects()
                        );

                    if (!rects.length) {
                        end++;
                        continue;
                    }

                    const rect =
                        rects[rects.length - 1];

                    if (!lastValid) {
                        lastValid = {
                            end,
                            rect
                        };

                        end++;
                        continue;
                    }

                    const sameLine =
                        Math.abs(
                            rect.top -
                            lastValid.rect.top
                        ) <= 1.5;

                    const sameVertical =
                        Math.abs(
                            rect.bottom -
                            lastValid.rect.bottom
                        ) <= 1.5;

                    if (
                        !sameLine ||
                        !sameVertical
                    ) {
                        break;
                    }

                    lastValid = {
                        end,
                        rect
                    };

                    end++;
                }

                if (!lastValid) {
                    break;
                }

                let segmentText =
                    text.slice(
                        start,
                        lastValid.end
                    );

                if (
                    segmentText &&
                    !segmentText.trim() &&
                    start === 0
                ) {
                    start = lastValid.end;
                    continue;
                }

                range.setStart(
                    textNode,
                    start
                );

                range.setEnd(
                    textNode,
                    lastValid.end
                );

                const rects =
                    Array.from(
                        range.getClientRects()
                    );

                const rect =
                    rects[rects.length - 1];

                segments.push({
                    text: segmentText,
                    rect
                });

                start = lastValid.end;
            }

            return segments;
        }

        static #drawTextSegment(
            text,
            rect,
            style,
            ctx,
            offsetX,
            offsetY
        ) {
            if (!text) {
                return;
            }

            const fontSize =
                parseFloat(style.fontSize) || 16;

            const fontFamily =
                style.fontFamily || "sans-serif";

            const fontWeight =
                style.fontWeight || "400";

            const fontStyle =
                style.fontStyle || "normal";

            const fontVariant =
                style.fontVariant || "normal";

            const fontStretch =
                style.fontStretch || "normal";

            const lineHeight =
                this.#getLineHeight(
                    style,
                    fontSize
                );

            const direction =
                style.direction === "rtl"
                    ? "rtl"
                    : "ltr";

            const unicodeBidi =
                style.unicodeBidi || "normal";

            const textAlign =
                this.#resolveTextAlign(
                    style.textAlign,
                    direction
                );

            ctx.save();

            ctx.font =
                `${fontStyle} ${fontVariant} ${fontWeight} ${fontStretch} ${fontSize}px ${fontFamily}`;

            ctx.fillStyle =
                style.color || "#000";

            ctx.textBaseline = "alphabetic";

            ctx.direction = direction;

            ctx.fontKerning = "normal";
            ctx.fontStretch = fontStretch;

            if ("fontVariantCaps" in ctx) {
                ctx.fontVariantCaps =
                    style.fontVariantCaps;
            }

            if ("letterSpacing" in ctx) {
                ctx.letterSpacing =
                    style.letterSpacing;
            }

            if ("wordSpacing" in ctx) {
                ctx.wordSpacing =
                    style.wordSpacing;
            }

            let x;

            if (textAlign === "center") {
                x =
                    rect.left -
                    offsetX +
                    rect.width / 2;
            } else if (textAlign === "right") {
                x =
                    rect.right -
                    offsetX;
            } else {
                x =
                    rect.left -
                    offsetX;
            }

            const y =
                rect.bottom -
                offsetY -
                this.#getBaselineCorrection(
                    style,
                    fontSize,
                    lineHeight
                );

            const content =
                unicodeBidi === "plaintext"
                    ? this.#normalizePlaintext(
                        text,
                        direction
                    )
                    : text;

            ctx.textAlign = textAlign;

            this.#drawTextWithSpacing(
                ctx,
                content,
                x,
                y,
                style,
                direction,
                textAlign
            );

            ctx.restore();
        }

        static #drawTextWithSpacing(
            ctx,
            text,
            x,
            y,
            style,
            direction,
            textAlign
        ) {
            const letterSpacing =
                this.#parseLength(
                    style.letterSpacing
                );

            const wordSpacing =
                this.#parseLength(
                    style.wordSpacing
                );

            if (
                Math.abs(letterSpacing) < 0.01 &&
                Math.abs(wordSpacing) < 0.01
            ) {
                ctx.fillText(
                    text,
                    x,
                    y
                );

                return;
            }

            const graphemes =
                this.#segmentGraphemes(text);

            if (graphemes.length <= 1) {
                ctx.fillText(
                    text,
                    x,
                    y
                );

                return;
            }

            const widths =
                graphemes.map(g => {
                    let width =
                        ctx.measureText(g).width;

                    if (
                        g === " " ||
                        g === "\u00A0"
                    ) {
                        width += wordSpacing;
                    }

                    return width;
                });

            const totalWidth =
                widths.reduce(
                    (a, b) => a + b,
                    0
                ) +
                letterSpacing *
                    Math.max(
                        0,
                        graphemes.length - 1
                    );

            let cursor;

            if (textAlign === "center") {
                cursor =
                    x -
                    totalWidth / 2;
            } else if (
                (
                    direction === "rtl" &&
                    textAlign === "right"
                ) ||
                (
                    direction === "ltr" &&
                    textAlign === "left"
                )
            ) {
                cursor =
                    direction === "rtl"
                        ? x
                        : x;
            } else {
                cursor =
                    x;
            }

            if (direction === "rtl") {
                if (
                    textAlign === "right"
                ) {
                    cursor = x;
                } else if (
                    textAlign === "left"
                ) {
                    cursor =
                        x +
                        totalWidth;
                }

                for (let i = 0; i < graphemes.length; i++) {
                    const width =
                        widths[i];

                    cursor -= width;

                    ctx.fillText(
                        graphemes[i],
                        cursor,
                        y
                    );

                    cursor -= letterSpacing;
                }

                return;
            }

            for (let i = 0; i < graphemes.length; i++) {
                ctx.fillText(
                    graphemes[i],
                    cursor,
                    y
                );

                cursor +=
                    widths[i] +
                    letterSpacing;
            }
        }

        static #normalizePlaintext(
            text,
            direction
        ) {
            if (
                direction !== "rtl"
            ) {
                return text;
            }

            return text;
        }

        static #segmentGraphemes(text) {
            if (
                typeof Intl !== "undefined" &&
                Intl.Segmenter
            ) {
                const segmenter =
                    new Intl.Segmenter(
                        undefined,
                        {
                            granularity:
                                "grapheme"
                        }
                    );

                return Array.from(
                    segmenter.segment(text),
                    item => item.segment
                );
            }

            return Array.from(text);
        }

        static #getLineHeight(
            style,
            fontSize
        ) {
            if (
                style.lineHeight === "normal"
            ) {
                return fontSize * 1.2;
            }

            const value =
                parseFloat(style.lineHeight);

            if (
                Number.isNaN(value)
            ) {
                return fontSize * 1.2;
            }

            if (
                !style.lineHeight.includes("px")
            ) {
                return value * fontSize;
            }

            return value;
        }

        static #getBaselineCorrection(
            style,
            fontSize,
            lineHeight
        ) {
            const extra =
                lineHeight - fontSize;

            return Math.max(
                0,
                extra / 2
            );
        }

        static #resolveTextAlign(
            align,
            direction
        ) {
            if (
                align === "start"
            ) {
                return direction === "rtl"
                    ? "right"
                    : "left";
            }

            if (
                align === "end"
            ) {
                return direction === "rtl"
                    ? "left"
                    : "right";
            }

            if (
                align === "justify"
            ) {
                return direction === "rtl"
                    ? "right"
                    : "left";
            }

            if (
                align === "match-parent"
            ) {
                return direction === "rtl"
                    ? "right"
                    : "left";
            }

            return align || (
                direction === "rtl"
                    ? "right"
                    : "left"
            );
        }

        static #parseLength(value) {
            if (
                !value ||
                value === "normal"
            ) {
                return 0;
            }

            const number =
                parseFloat(value);

            return Number.isNaN(number)
                ? 0
                : number;
        }

        static #renderBackground(
            ctx,
            element,
            rect,
            style,
            offsetX,
            offsetY
        ) {
            const x =
                rect.left - offsetX;

            const y =
                rect.top - offsetY;

            const radii =
                this.#getRadii(style);

            const backgroundColor =
                style.backgroundColor;

            if (
                backgroundColor &&
                backgroundColor !==
                    "transparent" &&
                backgroundColor !==
                    "rgba(0, 0, 0, 0)"
            ) {
                ctx.save();

                this.#roundedPath(
                    ctx,
                    x,
                    y,
                    rect.width,
                    rect.height,
                    radii
                );

                ctx.fillStyle =
                    backgroundColor;

                ctx.fill();

                ctx.restore();
            }

            const image =
                style.backgroundImage;

            if (
                image &&
                image !== "none"
            ) {
                const gradient =
                    this.#createGradient(
                        image,
                        rect
                    );

                if (gradient) {
                    ctx.save();

                    this.#roundedPath(
                        ctx,
                        x,
                        y,
                        rect.width,
                        rect.height,
                        radii
                    );

                    ctx.fillStyle =
                        gradient;

                    ctx.fill();

                    ctx.restore();
                }
            }
        }

        static #createGradient(
            value,
            rect
        ) {
            const linear =
                value.match(
                    /linear-gradient\((.*)\)/i
                );

            if (!linear) {
                return null;
            }

            const parts =
                this.#splitArguments(
                    linear[1]
                );

            if (
                parts.length < 2
            ) {
                return null;
            }

            let angle = 180;
            let start = 0;

            const first =
                parts[0].trim();

            if (
                first.includes("deg") ||
                first.startsWith("to ")
            ) {
                angle =
                    this.#gradientAngle(
                        first
                    );

                start = 1;
            }

            const stops =
                parts
                    .slice(start)
                    .map(part =>
                        this.#parseColorStop(
                            part
                        )
                    )
                    .filter(Boolean);

            if (
                stops.length < 2
            ) {
                return null;
            }

            const radians =
                (angle - 90) *
                Math.PI /
                180;

            const cx =
                rect.width / 2;

            const cy =
                rect.height / 2;

            const length =
                Math.abs(
                    rect.width *
                    Math.cos(radians)
                ) +
                Math.abs(
                    rect.height *
                    Math.sin(radians)
                );

            const x1 =
                cx -
                Math.cos(radians) *
                    length / 2;

            const y1 =
                cy -
                Math.sin(radians) *
                    length / 2;

            const x2 =
                cx +
                Math.cos(radians) *
                    length / 2;

            const y2 =
                cy +
                Math.sin(radians) *
                    length / 2;

            const temp =
                document.createElement(
                    "canvas"
                );

            const tempCtx =
                temp.getContext("2d");

            const gradient =
                tempCtx.createLinearGradient(
                    x1,
                    y1,
                    x2,
                    y2
                );

            stops.forEach(
                (stop, index) => {
                    const position =
                        stop.position !== null
                            ? stop.position
                            : index /
                                (stops.length - 1);

                    gradient.addColorStop(
                        Math.max(
                            0,
                            Math.min(
                                1,
                                position
                            )
                        ),
                        stop.color
                    );
                }
            );

            return gradient;
        }

        static #parseColorStop(value) {
            const match =
                value
                    .trim()
                    .match(
                        /^(.+?)(?:\s+(\d+(?:\.\d+)?)%)?$/
                    );

            if (!match) {
                return null;
            }

            return {
                color: match[1],
                position:
                    match[2] !== undefined
                        ? parseFloat(
                            match[2]
                        ) / 100
                        : null
            };
        }

        static #gradientAngle(value) {
            value = value.trim();

            if (
                value.includes("deg")
            ) {
                return parseFloat(value);
            }

            if (
                value === "to right"
            ) {
                return 90;
            }

            if (
                value === "to left"
            ) {
                return 270;
            }

            if (
                value === "to bottom"
            ) {
                return 180;
            }

            if (
                value === "to top"
            ) {
                return 0;
            }

            if (
                value.includes("bottom right")
            ) {
                return 135;
            }

            if (
                value.includes("bottom left")
            ) {
                return 225;
            }

            if (
                value.includes("top right")
            ) {
                return 45;
            }

            if (
                value.includes("top left")
            ) {
                return 315;
            }

            return 180;
        }

        static #splitArguments(value) {
            const result = [];

            let current = "";
            let depth = 0;

            for (const char of value) {
                if (char === "(") {
                    depth++;
                }

                if (char === ")") {
                    depth--;
                }

                if (
                    char === "," &&
                    depth === 0
                ) {
                    result.push(
                        current.trim()
                    );

                    current = "";
                } else {
                    current += char;
                }
            }

            if (current.trim()) {
                result.push(
                    current.trim()
                );
            }

            return result;
        }

        static #renderBorders(
            ctx,
            rect,
            style,
            offsetX,
            offsetY
        ) {
            const borders = [
                {
                    width:
                        parseFloat(
                            style.borderTopWidth
                        ),
                    color:
                        style.borderTopColor,
                    style:
                        style.borderTopStyle
                },
                {
                    width:
                        parseFloat(
                            style.borderRightWidth
                        ),
                    color:
                        style.borderRightColor,
                    style:
                        style.borderRightStyle
                },
                {
                    width:
                        parseFloat(
                            style.borderBottomWidth
                        ),
                    color:
                        style.borderBottomColor,
                    style:
                        style.borderBottomStyle
                },
                {
                    width:
                        parseFloat(
                            style.borderLeftWidth
                        ),
                    color:
                        style.borderLeftColor,
                    style:
                        style.borderLeftStyle
                }
            ];

            if (
                borders.every(
                    border =>
                        !border.width ||
                        border.style === "none"
                )
            ) {
                return;
            }

            const x =
                rect.left - offsetX;

            const y =
                rect.top - offsetY;

            const radii =
                this.#getRadii(style);

            ctx.save();

            this.#roundedPath(
                ctx,
                x,
                y,
                rect.width,
                rect.height,
                radii
            );

            for (const border of borders) {
                if (
                    !border.width ||
                    border.style === "none"
                ) {
                    continue;
                }

                ctx.lineWidth =
                    border.width;

                ctx.strokeStyle =
                    border.color;

                ctx.setLineDash(
                    this.#borderDash(
                        border.style,
                        border.width
                    )
                );

                ctx.stroke();

                break;
            }

            ctx.restore();
        }

        static #borderDash(
            style,
            width
        ) {
            if (style === "dashed") {
                return [
                    width * 3,
                    width * 2
                ];
            }

            if (style === "dotted") {
                return [
                    width,
                    width * 1.5
                ];
            }

            return [];
        }

        static #renderBoxShadow(
            ctx,
            element,
            rect,
            style,
            offsetX,
            offsetY
        ) {
            const shadow =
                style.boxShadow;

            if (
                !shadow ||
                shadow === "none"
            ) {
                return;
            }

            const shadows =
                this.#splitArguments(
                    shadow
                );

            for (const value of shadows) {
                const parsed =
                    this.#parseShadow(
                        value
                    );

                if (!parsed) {
                    continue;
                }

                ctx.save();

                ctx.shadowOffsetX =
                    parsed.x;

                ctx.shadowOffsetY =
                    parsed.y;

                ctx.shadowBlur =
                    parsed.blur;

                ctx.shadowColor =
                    parsed.color;

                ctx.fillStyle =
                    "rgba(0,0,0,0.001)";

                this.#roundedPath(
                    ctx,
                    rect.left - offsetX +
                        parsed.spread,
                    rect.top - offsetY +
                        parsed.spread,
                    rect.width -
                        parsed.spread * 2,
                    rect.height -
                        parsed.spread * 2,
                    this.#getRadii(style)
                );

                ctx.fill();

                ctx.restore();
            }
        }

        static #parseShadow(value) {
            const match =
                value.match(
                    /(-?\d+(?:\.\d+)?)px\s+(-?\d+(?:\.\d+)?)px(?:\s+(-?\d+(?:\.\d+)?)px)?(?:\s+(-?\d+(?:\.\d+)?)px)?\s+(.+)/
                );

            if (!match) {
                return null;
            }

            return {
                x:
                    parseFloat(match[1]),
                y:
                    parseFloat(match[2]),
                blur:
                    parseFloat(
                        match[3] || 0
                    ),
                spread:
                    parseFloat(
                        match[4] || 0
                    ),
                color:
                    match[5]
            };
        }

        static #applyTransform(
            ctx,
            element,
            rect,
            offsetX,
            offsetY
        ) {
            const style =
                getComputedStyle(element);

            if (
                !style.transform ||
                style.transform === "none"
            ) {
                return;
            }

            const matrix =
                new DOMMatrix(
                    style.transform
                );

            const origin =
                this.#parseTransformOrigin(
                    style.transformOrigin,
                    rect
                );

            ctx.translate(
                rect.left -
                    offsetX +
                    origin.x,
                rect.top -
                    offsetY +
                    origin.y
            );

            ctx.transform(
                matrix.a,
                matrix.b,
                matrix.c,
                matrix.d,
                matrix.e,
                matrix.f
            );

            ctx.translate(
                -origin.x,
                -origin.y
            );
        }

        static #parseTransformOrigin(
            value,
            rect
        ) {
            const parts =
                value
                    .split(/\s+/)
                    .map(
                        item =>
                            item.trim()
                    );

            const parse =
                (value, size) => {
                    if (
                        value.endsWith("%")
                    ) {
                        return (
                            parseFloat(value) /
                            100
                        ) * size;
                    }

                    const number =
                        parseFloat(value);

                    return Number.isNaN(number)
                        ? size / 2
                        : number;
                };

            return {
                x:
                    parse(
                        parts[0] || "50%",
                        rect.width
                    ),
                y:
                    parse(
                        parts[1] || "50%",
                        rect.height
                    )
            };
        }

        static #getRadii(style) {
            return {
                topLeft:
                    this.#parseRadius(
                        style.borderTopLeftRadius
                    ),
                topRight:
                    this.#parseRadius(
                        style.borderTopRightRadius
                    ),
                bottomRight:
                    this.#parseRadius(
                        style.borderBottomRightRadius
                    ),
                bottomLeft:
                    this.#parseRadius(
                        style.borderBottomLeftRadius
                    )
            };
        }

        static #parseRadius(value) {
            const number =
                parseFloat(value);

            return Number.isNaN(number)
                ? 0
                : number;
        }

        static #roundedPath(
            ctx,
            x,
            y,
            width,
            height,
            radii
        ) {
            const tl =
                Math.min(
                    radii.topLeft,
                    width / 2,
                    height / 2
                );

            const tr =
                Math.min(
                    radii.topRight,
                    width / 2,
                    height / 2
                );

            const br =
                Math.min(
                    radii.bottomRight,
                    width / 2,
                    height / 2
                );

            const bl =
                Math.min(
                    radii.bottomLeft,
                    width / 2,
                    height / 2
                );

            ctx.beginPath();

            ctx.moveTo(
                x + tl,
                y
            );

            ctx.lineTo(
                x + width - tr,
                y
            );

            ctx.quadraticCurveTo(
                x + width,
                y,
                x + width,
                y + tr
            );

            ctx.lineTo(
                x + width,
                y + height - br
            );

            ctx.quadraticCurveTo(
                x + width,
                y + height,
                x + width - br,
                y + height
            );

            ctx.lineTo(
                x + bl,
                y + height
            );

            ctx.quadraticCurveTo(
                x,
                y + height,
                x,
                y + height - bl
            );

            ctx.lineTo(
                x,
                y + tl
            );

            ctx.quadraticCurveTo(
                x,
                y,
                x + tl,
                y
            );

            ctx.closePath();
        }
    }

    global.DOMRander = DOMRander;

})(window);