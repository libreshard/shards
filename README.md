# LibreShard gallery

The shards listed in [LibreShard](https://libreshard.com)'s gallery: in the app (**Shards → Explore
the gallery**) and on [libreshard.com/gallery](https://libreshard.com/gallery/).

Each shard has one entry here, `shards/<id>.json`, with what the gallery shows and where its file
is. **The file stays with its author** (a GitHub release, your own site): the entry pins its sha256,
so LibreShard only installs the exact file that was reviewed. Every change is a pull request, and
every pull request is reviewed (see [POLICY.md](POLICY.md)).

## Publish your shard

1. Finish your shard and try it in LibreShard ([how to make a shard](https://libreshard.com/docs/create-a-shard/)).
   Set `license`, `url` and `minAppVersion` in its `manifest.json`.
2. Publish its `.libreshard` file somewhere it will stay, with an `https://` address that downloads
   the file directly. A GitHub release asset is a good choice. Use a new address for every version
   (a release per version), so an entry never points to a file that changed.
3. Fork this repository and add `shards/<id>.json` (the shard's `id`):

   ```json
   {
     "id": "my-shard",
     "name": "My shard",
     "author": "Your name",
     "description": "One line about what it does, up to 160 characters",
     "icon": "🎛️",
     "version": "1.0.0",
     "minAppVersion": "0.5.0",
     "license": "MIT",
     "url": "https://github.com/you/my-shard",
     "tags": ["streaming"],
     "screenshot": "screenshots/my-shard.png",
     "keys": ["ctrl+s", "f13"],
     "apps": ["obs"],
     "download": {
       "url": "https://github.com/you/my-shard/releases/download/v1.0.0/my-shard-1.0.0.libreshard",
       "sha256": "…",
       "size": 12345
     }
   }
   ```

4. Optionally add a screenshot, `screenshots/<id>.png` (or `.webp`, `.jpg`), up to 500 KB, of the
   shard on a tablet.
5. Open a pull request. The checks run by themselves; then a maintainer reviews the shard.

To publish a new version, open a pull request that changes `version`, `keys` if they changed, and
`download`. LibreShard tells people who installed the shard from the gallery (or the same shard by
the same author) that a new version is out, and shows what changed before updating.

### The fields

| Field | Required | What it is |
|---|---|---|
| `id`, `name`, `author`, `version`, `icon`, `minAppVersion`, `license` | yes (`icon`, `minAppVersion` no) | The same as in the shard's `manifest.json`. `license` is required here: an SPDX identifier (`MIT`, `GPL-3.0-or-later`…) or `LicenseRef-Proprietary`. |
| `description` | yes | One line, up to 160 characters. |
| `url` | no | The shard's page: its repository or your site. `https://` only. |
| `tags` | yes | One to three of `games`, `streaming`, `creative`, `video`, `audio`, `office`, `development`, `desktop`, `accessibility`, `other`. |
| `screenshot` | no | `screenshots/<id>.png`, `.webp` or `.jpg`, up to 500 KB. |
| `keys` | yes | Exactly the manifest's `permissions.keys`: the gallery shows them before anyone downloads the shard. |
| `apps` | if the manifest has them | Exactly the manifest's `apps`. |
| `download` | yes, for free shards | `url` (`https://`, downloads the file directly), `sha256` (from `sha256sum`, or `Get-FileHash` on Windows, in lowercase) and `size` in bytes. |
| `paid`, `price`, `buyUrl` | for paid shards | See "Paid shards" in [POLICY.md](POLICY.md). |

The checks compare the entry with the downloaded file: sha256 and size, LibreShard's own install
checks, and `id`, `name`, `author`, `version`, `icon`, `minAppVersion`, `license`, `keys` and `apps`
against its manifest. Run them yourself with `node tools/check.mjs` (fields only), or with
`--download` and `LIBRESHARD_DIR` pointing at a checkout of the LibreShard app with `npm ci` done.

## License

The tools in this repository are under the [Apache License 2.0](LICENSE). By submitting an entry you
agree that its text may be published in the gallery, in the app and on libreshard.com, and that its
screenshot may be shown there; both stay yours otherwise. Each shard has its own license, given in
its entry.
