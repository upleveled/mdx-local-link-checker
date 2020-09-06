#!/usr/bin/env node

if (/--help|-h/.test(process.argv[2])) {
  console.log(`mdx-local-link-checker ${require('./package.json').version}

Usage: mdx-local-link-checker [dir] [basepath] [ignorePattern]

Examples:

# Check the current directory with no ignore patterns
mdx-local-link-checker

# Check the src/pages folder, ignoring anything in a
# folder called "books" (at any depth)
mdx-local-link-checker src/pages src/pages "/books/**"

# Check only the docs folder with the src/pages
# folder set to be the base path (for root-relative
# links such as "/docs/router")
mdx-local-link-checker src/pages/docs src/pages
`);
  process.exit(0);
}

const fs = require('fs');
const path = require('path');
const walkSync = require('walk-sync');
const mdx = require('@mdx-js/mdx');
const remove = require('unist-util-remove');
const slugPlugin = require('remark-slug');
const { isMatch } = require('nanomatch');

function remarkRemoveCodeNodes() {
  return function transformer(tree) {
    remove(tree, 'code');
  };
}

function removeMarkdownCodeBlocks(markdown) {
  return markdown.replace(/```[\s\S]+?```/g, '');
}

const cache = {};
let exitCode = 0;

const dir = process.argv[2] || '.';
const basepath = process.argv[3] || '.';
const ignorePattern = process.argv[4];

const filePaths = walkSync(dir, { directories: false });

function fillCache(markdownOrJsx, filePath, filePathAbs) {
  markdownOrJsx.replace(
    /\s+(?:(?:"(?:id|name)":\s*)|(?:(?:id|name)=))"([^"]+)"/g,
    (_, match) => {
      if (match && match.match) {
        cache[filePathAbs].ids[match] = true;
      }
    },
  );

  markdownOrJsx.replace(
    /\s+(?:(?:"(?:href|to|src)":\s*)|(?:(?:href|to|src)=))"([^"]+)"/g,
    (_, match) => {
      if (match && match.match) {
        if (
          !match.match(
            /(^https?:\/\/)|(^#)|(^[^:]+:.*)|(\.mdx?(#[a-zA-Z0-9._,-]*)?$)/,
          )
        ) {
          if (match.match(/\/$/)) {
            match += 'index.mdx';
          } else if (match.match(/\/#[^/]+$/)) {
            match = match.replace(/(\/)(#[^/]+)$/, '$1index.mdx$2');
          }
        }

        if (match.match(/^https?:\/\//)) {
          cache[filePathAbs].externalLinks.push(match);
        } else if (match.match(/^[^:]+:.*/)) {
          // ignore links such as "mailto:" or "javascript:"
        } else {
          let absolute;

          const isAnchorLink = match.match(/^#/);
          const isRootRelativeLink = match.match(/^\//);

          if (isAnchorLink) {
            match = filePath + match;
            absolute = path.resolve(path.join(match));
          } else if (isRootRelativeLink) {
            absolute = path.resolve(path.join(basepath, match));
          } else {
            const [, filePathBase] = filePath.match(/^(.+\/)[^/]+$/);
            absolute = path.resolve(filePathBase + '/' + match);
          }

          cache[filePathAbs].internalLinks.push({
            original: match,
            absolute,
          });
        }
      }
    },
  );
}

function readFileIntoCache(filePath) {
  const filePathAbs = path.resolve(filePath);
  const fileExt = filePath.split('.').pop();

  if (!fileExt || !['mdx', 'md'].includes(fileExt)) {
    return;
  }

  const markdown = removeMarkdownCodeBlocks(
    fs.readFileSync(filePathAbs).toString(),
  );

  let jsx = '';

  try {
    jsx = mdx.sync(markdown, {
      remarkPlugins: [slugPlugin, remarkRemoveCodeNodes],
    });
  } catch (e) {
    // Fail if there was an error parsing a mdx/md file
    if (fileExt === 'mdx' || fileExt === 'md') {
      console.error('Unable to parse mdx to jsx: ' + filePath);
      throw e;
    }
  }

  if (!cache[filePathAbs]) {
    cache[filePathAbs] = {
      filePath,
      filePathAbs,
      externalLinks: [],
      internalLinks: [],
      ids: {},
    };
  }

  fillCache(jsx, filePath, filePathAbs);
  fillCache(markdown, filePath, filePathAbs);
}

filePaths.forEach((relativePath) => {
  const filePath = path.join(dir, relativePath);
  readFileIntoCache(filePath);
});

const errors = [];

for (const file in cache) {
  const { internalLinks, filePathAbs } = cache[file];

  // eslint-disable-next-line no-loop-func
  internalLinks.forEach((link) => {
    if (ignorePattern && isMatch(link.original, ignorePattern)) return;

    const [targetFile, targetId] = link.absolute.split('#');

    if (!cache[targetFile]) {
      if (fs.existsSync(targetFile)) {
        readFileIntoCache(targetFile);
      } else {
        exitCode = 1;

        const message = `Link is broken: '${link.absolute}' in file ${filePathAbs}`;

        if (!errors.includes(message)) {
          errors.push(message);
          console.error(message);
        }

        return;
      }
    }

    if (targetId && (!cache[targetFile] || !cache[targetFile].ids[targetId])) {
      console.warn(
        `Anchor of link is broken: '${link.original}' in file ${filePathAbs}`,
      );
    }
  });
}

process.exit(exitCode);
