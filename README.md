# Cataclysm: Cleanwater Bomb Guide

This is the searchable web guide for
[Cataclysm: Cleanwater Bomb](https://github.com/CrimsonCrossBunker/Cataclysm-Cleanwater-Bomb).
It is published at
[crimsoncrossbunker.github.io/CCB-GUIDE](https://crimsoncrossbunker.github.io/CCB-GUIDE/).

The guide is a static Svelte/Vite progressive web app. Game JSON and game
translations are generated from Cleanwater Bomb releases in the separate
[CCB-GUIDE-DATA](https://github.com/CrimsonCrossBunker/CCB-GUIDE-DATA)
repository. Both repositories update and deploy through GitHub Actions.

## Development

```sh
yarn install --frozen-lockfile
yarn dev
```

Run validation and create a production build with:

```sh
yarn validate
yarn build
```

The production site is hosted below the `/CCB-GUIDE/` GitHub Pages base path.

## Attribution and license

This project is a modified edition of
[nornagon/cdda-guide](https://github.com/nornagon/cdda-guide), originally
created and maintained by [nornagon](https://github.com/nornagon), with
contributions from the upstream community. The full upstream and data
attribution is recorded in [ATTRIBUTION.md](ATTRIBUTION.md).

The guide source remains licensed under
[GNU GPL version 3 only](LICENSE). Modified source is made available in this
public repository as required by that license.
