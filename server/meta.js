/** DEDHAND — authored and owned by lol1999lol. */

export const AUTHOR = {
  name: "lol1999lol",
  github: "lol1999lol",
  url: "https://github.com/lol1999lol",
  repo: "https://github.com/lol1999lol/dedhand",
  clone: "https://github.com/lol1999lol/dedhand.git",
  license: "MIT",
  year: 2026,
};

export const COPYRIGHT = `Copyright (c) ${AUTHOR.year} ${AUTHOR.name}`;
export const TAGLINE = `by ${AUTHOR.name}  ·  ${AUTHOR.repo}`;

export function creditLine() {
  return `${AUTHOR.name}  ${AUTHOR.repo}`;
}
