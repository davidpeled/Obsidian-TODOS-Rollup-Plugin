# Contributing

Thanks for helping improve TODOs rollup. Bug reports, ideas and pull requests are all welcome.

## Reporting bugs and suggesting features

Open an issue using one of the templates. For bugs, include your Obsidian version, platform (desktop or mobile) and steps to reproduce.

## Development setup

You need Node.js 22.6 or newer.

```sh
npm install
npm run dev          # rebuilds main.js on every change
npm start            # browser demo with a sample vault
```

To try the plugin in Obsidian, see [Installing into a local vault](README.md#installing-into-a-local-vault). Use a test vault, not your real one.

## Before you open a pull request

```sh
npm run check        # lint, typecheck and tests
npm run build        # production build
```

CI runs the same commands. Please also:

- Keep changes focused. One fix or feature per pull request.
- Add or update tests for behaviour changes.
- Update `README.md` and `CHANGELOG.md` when user-visible behaviour changes.
- Don't commit `main.js` or `demo-dist/`. They are build output.
- Don't edit `manifest.json` or `versions.json` by hand. Releases do that.

## Releasing (maintainers)

1. Update `CHANGELOG.md`.
2. Run `npm version <x.y.z>`. It updates `package.json`, `manifest.json` and `versions.json` and creates a commit and tag.
3. Push the commit and the tag (`git push --follow-tags`). The tag must be exactly the version, with no `v` prefix, as Obsidian requires.
4. The Release workflow builds the plugin and attaches `main.js`, `manifest.json` and `styles.css` to a GitHub release.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
