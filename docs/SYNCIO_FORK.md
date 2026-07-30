# SYNCIO Companion fork

SYNCIO Companion is a fork of
[Universal Trakt Scrobbler](https://github.com/trakt-tools/universal-trakt-scrobbler),
created by the `trakt-tools` contributors and distributed under the MIT license.

The fork keeps the original service adapters and credits intact. Its separate purpose is to connect
streaming-platform activity to a user's self-hosted SYNCIO Worker without requiring another Trakt
community-app connection.

SYNCIO Companion `0.1.0` currently derives from Universal Trakt Scrobbler `0.7.4`. The independent
version makes it clear which project's release is installed without disguising the upstream
lineage.

## Privacy boundary

- The extension never reads browser navigation history.
- Service account, viewing-history and playback requests happen locally in the browser while the
  user is signed in to that service.
- Cookies, authorization headers and raw service responses never enter the SYNCIO payload.
- The Worker accepts only a strict normalized media-observation contract and rejects unknown fields.
- Worker requests use a dedicated client with omitted credentials and no referrer.
- Pairing tokens remain in extension-local storage. The Worker stores only their hashes.
- Initial history import is read-only until the user reviews and confirms it.

## Upstream relationship

- `upstream` tracks `trakt-tools/universal-trakt-scrobbler`.
- `origin` tracks `giaaaacomo/SYNCIO-companion`.
- SYNCIO-specific work lives on the `syncio` branch while the integration is experimental.
- Upstream releases are fetched and merged deliberately, with service-adapter conflicts kept
  separate from SYNCIO transport changes whenever possible.

To prepare an upstream update:

```bash
git fetch upstream
git checkout syncio
git merge --no-commit upstream/master
```

Review and test service adapters separately from the SYNCIO bridge before completing the merge.

## Development disclosure

The SYNCIO-specific integration is developed with substantial AI-assisted, conversational coding.
That is one reason it lives in a fork instead of being presented as hand-written upstream work.
Human review, type checks and browser tests remain required before releases.
