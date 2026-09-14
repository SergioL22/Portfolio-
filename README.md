# Sergio Portfolio

Static site with an AI chat hero that answers questions about Sergio "Sergio"
Lozano. The chat runs through a Vercel serverless function so the Anthropic
API key stays server-side.

## Structure

```
index.html         the page
styles.css          design
script.js           chat frontend logic
api/chat.js         serverless function — calls the Anthropic API
data/knowledge.js   everything the AI is allowed to say about Sergio (edit this to update facts)
```

## Deploy on Vercel

1. Push this folder to a GitHub repo.
2. Go to vercel.com, "Add New Project," import the repo. No build settings
   needed — Vercel auto-detects the static site plus the `/api` folder.
3. In the project's Settings > Environment Variables, add:
   - `ANTHROPIC_API_KEY` = your Anthropic API key (from console.anthropic.com)
4. Deploy. That's it — `/api/chat` is live at `yourdomain.com/api/chat`.

## Local testing

`vercel dev` (from the Vercel CLI) will run both the static site and the
`/api` function locally with the same environment variable.

## Updating what the AI knows

Edit `data/knowledge.js` only — it's a plain string used as the system
prompt. No other file needs to change when your resume/projects update.

## Notes

- The rate limiter in `api/chat.js` is in-memory and resets on cold start —
  it's a soft speed bump against casual abuse, not real protection. If this
  gets real traffic, consider Vercel's Edge Config or a proper rate-limit
  service (e.g. Upstash) keyed on IP.
- `max_tokens` is capped at 500 per reply and history is capped at the last
  16 messages, both to control API cost.
- Swap the model string in `api/chat.js` if you want a different Claude model.
