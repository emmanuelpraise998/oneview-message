const loading = document.querySelector("#loading");
const content = document.querySelector("#message-content");
const unavailable = document.querySelector("#unavailable");
const token = location.pathname.split("/").pop();
(async () => {
  try {
    const response = await fetch(`/api/messages/${encodeURIComponent(token)}`, { cache: "no-store" });
    const data = await response.json();
    loading.hidden = true;
    if (!response.ok) {
      document.querySelector("#unavailable-text").textContent = data.error || "This message is unavailable.";
      unavailable.hidden = false;
      return;
    }
    // Render text as text, never as HTML.
    document.querySelector("#message-text").textContent = data.message;
    const image = document.querySelector("#message-image");
    if (data.image) { image.src = data.image; image.hidden = false; }
    content.hidden = false;
  } catch (_) {
    loading.hidden = true;
    unavailable.hidden = false;
  }
})();
