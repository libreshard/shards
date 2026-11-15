# Review policy

LibreShard keeps people safe with a closed list of keys per shard, approved on their PC: a shard
can't reach the internet, read files or run programs. The gallery adds a person who looked at the
shard before it's offered to everyone.

## What a review checks

- **It works:** it installs, opens on a tablet and does what its description says, with the program
  it's for.
- **The keys match what it does.** Every key is shown to people before they install it; a reviewer
  asks about anything unexpected. System shortcuts (the Windows key, Ctrl+Alt…) need a reason, and
  a shard with system shortcuts **and** enough keys to type text (letters and Enter) needs a very
  good one.
- **Honest name and description.** Nothing that pretends to be official or made by someone else.
  "SC MFD for LibreShard" is fine; see the [trademark policy](https://github.com/libreshard/libreshard/blob/main/TRADEMARKS.md).
- **A license is given**, and the author has the right to share everything in it: code, images,
  icons, fonts, sounds. Game fan kits and icon packs often allow personal use but not
  redistribution.
- **Nothing that tries to reach the network.** LibreShard blocks it anyway; trying is a bad sign.
- The entry matches the file (the checks do most of this).

Reviews aim to be done **within a week**. A new version gets the same review as the first one.

## Paid shards

A paid shard is listed with `"paid": true`, a `price` (text: "4 USD", "Pay what you want") and a
`buyUrl` (the page where it's sold) instead of `download`. LibreShard shows a "Paid" label and a
"Buy" button that opens that page; it never downloads a paid shard by itself. After buying, people
install the file the shop gives them, as usual.

- Give the reviewer a copy of the shard (a private link is fine). Its code may be minified; its
  manifest may not.
- Keep `version` and `keys` up to date with each release: LibreShard compares the installed
  version with the entry to tell buyers a new one is out, and links to your shop.
- A free demo may have its own entry.
- Paying gives no better place in the gallery.

## Removal

An entry is removed when its author asks, when it infringes someone's rights (including copies of a
paid shard shared without permission), or for a security problem. LibreShard never uninstalls
anything remotely: a removed shard stops being offered, and its card on the PC says it's no longer
in the gallery.

## Who reviews

For now, LibreShard's maintainer. To report a problem with a listed shard, open an issue here, or
write to hello@libreshard.com for anything private.
