const htmlInput = document.getElementById("htmlInput");
const cssInput = document.getElementById("cssInput");

const preview = document.getElementById("preview");
const output = document.getElementById("output");

const renderButton = document.getElementById("renderButton");
const saveButton = document.getElementById("saveButton");

let renderedCanvas = null;

function updatePreview() {
    preview.innerHTML = htmlInput.value;

    let oldStyle =
        document.getElementById("userStyles");

    if (oldStyle) {
        oldStyle.remove();
    }

    const style = document.createElement("style");

    style.id = "userStyles";
    style.textContent = cssInput.value;

    document.head.appendChild(style);
}

htmlInput.addEventListener(
    "input",
    updatePreview
);

cssInput.addEventListener(
    "input",
    updatePreview
);

renderButton.addEventListener(
    "click",
    async () => {
        try {
            updatePreview();

            output.innerHTML = "";

            renderedCanvas =
                await DOMRander.toCanvas(
                    preview,
                    {
                        scale: 2,
                        backgroundColor: null
                    }
                );

            output.appendChild(
                renderedCanvas
            );

        } catch (error) {
            console.error(error);

            output.innerHTML =
                `<pre class="error">${error.message}</pre>`;
        }
    }
);

saveButton.addEventListener(
    "click",
    async () => {
        if (!renderedCanvas) {
            await renderButton.click();
        }

        if (!renderedCanvas) return;

        const link =
            document.createElement("a");

        link.download =
            `DOMRander-${Date.now()}.png`;

        link.href =
            renderedCanvas.toDataURL(
                "image/png"
            );

        link.click();
    }
);

updatePreview();