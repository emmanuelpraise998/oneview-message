# ONEVIEW — One-time-view message website

A small full-stack app for creating a private link to a text message, optionally with one image. The first successful open consumes the message; subsequent opens return an unavailable response.

## Requirements
- Node.js 20+
- npm

## Run locally
```bash
npm install
npm start
```
Open http://localhost:3000.

## Deploy
Deploy to a Node.js host that supports persistent disk storage. The app stores its SQLite database at `data/oneview.sqlite` and uploaded images in `data/uploads/`; these directories must persist across restarts. Set:
- `PORT` (optional; defaults to 3000)
- `BASE_URL` (recommended; your public origin, e.g. `https://your-domain.example`, with no trailing slash)

For production, use HTTPS and ensure the host provides a persistent volume. Do not deploy this to a serverless host with ephemeral filesystem storage unless you replace SQLite/local uploads with managed database/object storage.

## Privacy and limitations
- Message access is claimed in a SQLite transaction to prevent concurrent double-viewing.
- The stored message is deleted after a successful retrieval, and its uploaded picture is deleted when served.
- The browser fetches the message once and uses `textContent` to render the text.
- This is a starter implementation, not a hardened secure-messaging service. The server necessarily sees the message and image; it is not end-to-end encrypted. The recipient could screenshot, photograph, or save the content. Network/server backups, logs, or host snapshots may retain data. Add rate limiting, operational logging policy, malware scanning, and managed storage/security controls before production use.
- The recipient’s first link visit consumes the message, including if their connection fails after the server claims it. Share only with the intended recipient.

## Accepted image types
JPEG, PNG, WEBP, GIF. Maximum size: 5 MB.


## Added in the latest update
- Sender-side preview panel for text and selected image before link creation.
- WhatsApp share link after creating a message.
- Basic browser deterrents against right-click/context-menu and dragging images.
- Note: these browser deterrents do **not** block screenshots. Reliable screenshot blocking requires a native Android app and still cannot stop photographing the screen with another device.

## Personalized draft content
The landing page is prefilled with the user's supplied message and supplied image (Adun Mi photo). The “Include the attached picture” checkbox controls whether the bundled image is attached to the generated one-time link. Sender preview displays the text and picture.
