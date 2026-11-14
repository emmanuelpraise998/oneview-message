const form = document.querySelector("#create-form");
const message = document.querySelector("#message");
const imageInput = document.querySelector("#image");
const result = document.querySelector("#result");
const errorBox = document.querySelector("#error");
const fileName = document.querySelector("#file-name");
message.addEventListener("input", () => {
  document.querySelector("#count").textContent = `${message.value.length} / 5000`;
  document.querySelector("#preview-text").textContent = message.value || "Your message will appear here…";
});
const previewPanel = document.querySelector("#preview-panel");
document.querySelector("#preview-button").addEventListener("click", () => {
  document.querySelector("#preview-text").textContent = message.value || "Your message will appear here…";
  const selected = imageInput.files[0];
  const previewImage = document.querySelector("#preview-image");
  if (selected) {
    previewImage.src = URL.createObjectURL(selected);
    previewImage.hidden = false;
  } else if (document.querySelector("#use-preset-image").checked) {
    previewImage.src = "/assets/adun-mi-photo.jpeg";
    previewImage.hidden = false;
  } else {
    previewImage.removeAttribute("src");
    previewImage.hidden = true;
  }
  previewPanel.hidden = false;
  previewPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
});
document.querySelector("#close-preview").addEventListener("click", () => previewPanel.hidden = true);

document.querySelector("#pick-image").addEventListener("click", () => imageInput.click());
imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  fileName.hidden = !file;
  fileName.textContent = file ? `Attached: ${file.name}` : "";
});
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorBox.hidden = true;
  const button = form.querySelector(".primary");
  button.disabled = true;
  button.innerHTML = '<span>Creating your link…</span><span>◌</span>';
  const data = new FormData(form);
  data.set("usePresetImage", document.querySelector("#use-preset-image").checked ? "true" : "false");
  try {
    const response = await fetch("/api/messages", { method: "POST", body: data });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Could not create link.");
    document.querySelector("#share-link").value = payload.link;
    document.querySelector("#whatsapp-share").href = `https://wa.me/?text=${encodeURIComponent("Here’s a private one-time message for you: " + payload.link)}`;
    form.hidden = true;
    result.hidden = false;
  } catch (error) {
    errorBox.textContent = error.message;
    errorBox.hidden = false;
  } finally {
    button.disabled = false;
    button.innerHTML = '<span>Create private link</span><span>↗</span>';
  }
});
document.querySelector("#copy").addEventListener("click", async () => {
  const input = document.querySelector("#share-link");
  try { await navigator.clipboard.writeText(input.value); }
  catch (_) { input.select(); document.execCommand("copy"); }
  document.querySelector("#copy").textContent = "COPIED ✓";
});
document.querySelector("#create-another").addEventListener("click", () => {
  form.reset(); form.hidden = false; result.hidden = true; fileName.hidden = true; previewPanel.hidden = true;
  document.querySelector("#count").textContent = "0 / 5000";
  document.querySelector("#copy").textContent = "COPY";
});

// Browser deterrents only: web pages cannot reliably block screenshots.
document.addEventListener("contextmenu", (event) => event.preventDefault());
document.addEventListener("dragstart", (event) => {
  if (event.target && event.target.tagName === "IMG") event.preventDefault();
});
