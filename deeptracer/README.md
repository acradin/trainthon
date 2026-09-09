# deeptracer

App directory for [DeepTracer](https://github.com/acradin/trainthon).

**Remember what your agents already found.**

Product docs and the public README live at the repo root: [../README.md](../README.md).

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and register Claude, GPT, and Cursor desktop agents on this machine.

Session logs (`~/.claude`, `~/.codex`, `~/.cursor`) are read only while this server runs on the same computer.

## Env

`./.env.local` (do not commit):

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6-luna
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Without Supabase, traces live in `~/.deeptracer`.

## Scripts

```bash
npm run dev
npm run build
npm run lint
```
