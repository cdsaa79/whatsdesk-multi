# Contributing to WhatsDesk Multi

Thanks for helping improve WhatsDesk Multi.

## Project Direction

WhatsDesk Multi is a free, source-available macOS app for managing multiple WhatsApp Web sessions with lightweight local CRM features. Personal use, business use, and internal company use are allowed. Resale, paid hosting, paid rebranding, or charging others for the app itself is not allowed.

Please keep contributions aligned with:

- Local-first privacy
- No message scraping beyond visible, user-opened WhatsApp Web context
- No spam automation
- No hidden WhatsApp API access
- No features designed to bypass WhatsApp or Meta protections
- Clean macOS UI with minimal clutter

## Development

```bash
npm install
npm start
```

Check syntax:

```bash
npm run check
```

Package macOS:

```bash
npm run package:mac
```

## Pull Request Guidelines

- Keep changes focused.
- Explain the user-facing behavior changed.
- Include screenshots or screen recordings for UI changes, with private WhatsApp data redacted.
- Do not commit `node_modules/`, `dist/`, personal app data, or real chat screenshots.
- Avoid large refactors unless they directly support the issue being solved.

## License

By contributing, you agree that your contribution is licensed under the same BSD 3-Clause with Commons Clause license as the project.
