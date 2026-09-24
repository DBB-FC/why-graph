# Security

## Reporting a vulnerability

Open a [private security advisory](https://github.com/DBB-FC/why-graph/security/advisories/new)
on this repository. Please do not open a public issue for a vulnerability.

Expect a first answer within a week. There is no bounty programme.

## Why it reads every note in the vault

The directory's automated review flags this plugin for **vault enumeration**, and the flag
is correct: the map asks Obsidian for the list of every markdown file and for the links
between them. A map of your notes cannot be drawn from a subset.

What that access is used for, and nothing else:

- the note's path, to place it in a layer and colour it by topic;
- its links, to draw the lines;
- its text, read on demand, to find the sentence where a link was written.

Everything stays in the vault. The plugin has no server and makes no network request for
any of it. Folders you exclude in the settings are never drawn. Notes reach an AI provider
only in the two cases described below, and only with a key you configured.

## What the plugin does with your data

- Your notes are read from the vault and stay there. The plugin has no server and no
  telemetry, and it makes no network request unless you use an AI feature.
- **Suggest a reason or a summary:** the one or two notes involved are sent to the AI
  provider **you** configured, with **your** key.
- **What's new** (off until you set a raw material folder and a wiki folder): new or changed
  material from that folder, plus the wiki pages it may belong to, is sent to your provider when
  you press *Find new items*. The panel tells you how many calls it will make **before** sending.
  If you turn on *Prepare new items when Obsidian opens*, the same happens in the background at
  startup, within a daily call limit you set. That exchange is between you and your provider.
- API keys are stored in Obsidian's per-device local storage, never in `data.json`, so
  they do not travel through Obsidian Sync, git or a backup.
- External links declared in the frontmatter are opened only if they use `http` or
  `https`; a `javascript:`, `file:` or `data:` URL in a note is ignored.
- The plugin writes to a note only after you press Approve, and only as one inserted line;
  existing text is never rewritten or deleted. *Loose clippings* moves root notes to a folder
  only when you press *File*, without editing them.
- To avoid sending the same material twice, the plugin keeps `ingesta.json` in its own folder:
  sizes and fingerprints of what was already sent, never the text.
