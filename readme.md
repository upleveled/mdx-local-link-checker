# MDX Local Link Checker

A broken link checker for MDX and Markdown.

## Usage

```sh
mdx-local-link-checker [dir] [basepath] [ignorePattern]
```

## Examples

```sh
# Check the current directory with no ignore patterns
mdx-local-link-checker

# Check the src/pages folder, ignoring anything in a
# folder called "books" (at any depth)
mdx-local-link-checker src/pages src/pages "/books/**"

# Check the src/pages folder, ignoring anything in a
# folder called "books" or "slide-decks" (at any depth)
mdx-local-link-checker src/pages src/pages "/(books|slide-decks)/**"

# Check only the docs folder with the src/pages
# folder set to be the base path (for root-relative
# links such as "/docs/router")
mdx-local-link-checker src/pages/docs src/pages
```
