# Contributing to PlrForge

Thank you for helping improve PlrForge. Contributions of code, tests, documentation, compatibility research, and reproducible bug reports are welcome.

## Before opening an issue

- Search existing issues for the same problem.
- Confirm that the character's player-file version appears in the [compatibility matrix](docs/COMPATIBILITY.md).
- Close Terraria and reproduce the issue with the latest available PlrForge build.
- Record the operating system, PlrForge version, detected player-file version, expected result, actual result, and exact error message.

Do not attach a personal `.plr` file to a public issue. Player files can contain character names, world identifiers, and other personal gameplay data. If a minimal fixture is necessary, first create a disposable character and remove any identifying content.

## Development setup

Prerequisites:

- Node.js 22
- Rust stable
- .NET 8 SDK
- The platform dependencies from the [Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/)

Install dependencies and start the desktop app:

```sh
npm ci
npm run metadata:build
npm run desktop:dev
```

Use `npm run dev` for the browser-only demo. The browser preview cannot open native player files.

## Testing

Run the relevant checks before opening a pull request. The complete local quality gate is:

```sh
npm test
npm run build
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --locked --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --locked --manifest-path src-tauri/Cargo.toml
node script/release.mjs verify
```

Changes to player parsing or writing should include focused Rust coverage. Interface changes should include React tests for the affected workflow. Documentation-only changes do not need unrelated implementation tests.

An optional supported-format regression test can use a disposable local fixture:

```sh
PLRFORGE_FIXTURE=/absolute/path/to/disposable.plr \
  cargo test --manifest-path src-tauri/Cargo.toml external_fixture -- --nocapture
```

Never use a live Steam Cloud character as a test fixture, and never commit player files to the repository.

## Pull requests

Keep each pull request focused and explain:

- the user-facing problem being solved;
- the chosen approach and important tradeoffs;
- the checks that were run;
- any compatibility, migration, or save-safety implications.

For visual changes, include before-and-after screenshots at the same viewport size. For save-format support, include the exact Terraria player-file version and evidence that no-edit round trips remain byte-identical.

## Save-format requirements

PlrForge treats character data conservatively. A new or changed codec must:

- support an exact player-file version rather than a guessed range;
- reject truncated, malformed, and unknown structures before writing;
- preserve unsupported and untouched bytes;
- validate the complete edited model;
- create and verify a staged save before replacing the source;
- include no-edit and mutation regression coverage.

Heuristic scanning is not accepted in the write path. Unsupported versions must remain readable only to the extent needed to display a clear compatibility message.

## Licensing

By contributing, you agree that your contribution will be licensed under the repository's [MIT License](LICENSE). Do not add Terraria assets, extracted proprietary game data, or third-party material without compatible licensing and attribution.
