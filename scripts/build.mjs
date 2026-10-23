// Static publisher: content/guides/*.md  ->  guides/index.html + guides/<slug>/index.html
// Also regenerates sitemap.xml. Run with `npm run build`, then commit the output.
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { marked } from 'marked';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'content', 'guides');
const OUT = join(ROOT, 'guides');
const SITE = 'https://where2charge.4abnc.com';
const APP_URL = 'https://app.where2charge.4abnc.com';
const DEFAULT_IMAGE = `${SITE}/og-image.jpg`;
const WORDS_PER_MIN = 200;
const REQUIRED = ['title', 'date', 'description'];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const iso = (d) => (d instanceof Date ? d.toISOString() : String(d)).slice(0, 10);
const abs = (p) => (!p ? DEFAULT_IMAGE : /^https?:\/\//.test(p) ? p : `${SITE}/${String(p).replace(/^\//, '')}`);
const longDate = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

// ---------- load content ----------
const articles = [];
for (const file of existsSync(SRC) ? readdirSync(SRC) : []) {
  if (!/\.(md|mdx)$/.test(file) || file.startsWith('_')) continue;
  const { data, content } = matter(readFileSync(join(SRC, file), 'utf8'));
  if (data.draft === true) continue;
  const missing = REQUIRED.filter((k) => !data[k]);
  if (missing.length) throw new Error(`${file}: missing frontmatter field(s): ${missing.join(', ')}`);
  const slug = data.slug || basename(file).replace(/\.(md|mdx)$/, '');
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) throw new Error(`${file}: slug "${slug}" must be lowercase letters, numbers and hyphens`);
  const words = content.trim().split(/\s+/).length;
  articles.push({
    slug,
    title: String(data.title),
    date: iso(data.date),
    updated: data.updated ? iso(data.updated) : iso(data.date),
    description: String(data.description),
    keyword: data.keyword ? String(data.keyword) : '',
    author: data.author ? String(data.author) : 'Where2Charge Team',
    cover: data.cover || '',
    minutes: Math.max(1, Math.round(words / WORDS_PER_MIN)),
    // app-store links in article bodies get rel=nofollow, matching the rest of the site
    html: marked.parse(content, { gfm: true }).replace(/<a href="(https:\/\/(?:play\.google\.com|apps\.apple\.com)[^"]*)"/g, '<a rel="nofollow noopener" target="_blank" href="$1"'),
  });
}
const slugs = new Set();
for (const a of articles) {
  if (slugs.has(a.slug)) throw new Error(`Duplicate slug: ${a.slug}`);
  slugs.add(a.slug);
}
articles.sort((a, b) => (a.date < b.date ? 1 : -1));

// ---------- shared layout ----------
const head = ({ title, description, url, image, type = 'website', extra = '' }) => `<!DOCTYPE html>
<html lang="en-SG">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="theme-color" content="#0f172a">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="${type}">
  <meta property="og:site_name" content="Where2Charge">
  <meta property="og:locale" content="en_SG">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:image" content="${image}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${image}">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-high-contrast.png">
  <link rel="stylesheet" href="/guides.css">
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-66145CF3RP"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-66145CF3RP');
  </script>${extra}
</head>`;

const header = `<header class="g-header">
  <nav aria-label="Main" class="g-wrap g-header-in">
    <a href="/" class="g-brand"><img src="/logo.png" alt="" width="36" height="36"><span>Where<b>2</b>Charge</span></a>
    <a href="${APP_URL}" target="_blank" rel="noopener" class="g-pill">Open the map<span class="g-sr"> (opens the web app in a new tab)</span></a>
  </nav>
</header>`;

const footer = `<footer class="g-footer">
  <div class="g-wrap g-footer-in">
    <div>
      <p class="g-footer-strong">Where2Charge Powered by <a href="https://4abnc.com">4ABnC</a></p>
      <p>© 2026 Where2Charge. All rights reserved.</p>
    </div>
    <nav aria-label="Footer" class="g-footer-cols">
      <div><p class="g-footer-h">Resources</p><a href="/guides">Guides</a></div>
      <div><p class="g-footer-h">Product</p><a href="${APP_URL}" target="_blank" rel="noopener">Open the web app</a><a href="/for-charge-point-operators.html">For operators</a></div>
      <div><p class="g-footer-h">Legal</p><a href="/privacy.html">Privacy Policy</a></div>
    </nav>
  </div>
</footer>`;

const page = (headHtml, body) => `${headHtml}
<body>
<a href="#main" class="g-sr g-skip">Skip to content</a>
${header}
${body}
${footer}
</body>
</html>
`;

// ---------- pages ----------
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const cta = `<aside class="g-cta" aria-labelledby="cta-title">
  <h2 id="cta-title">Rates mean nothing if the charger is occupied. Check live HDB lot availability before you drive.</h2>
  <a href="${APP_URL}" target="_blank" rel="noopener" class="g-btn"
     onclick="gtag('event', 'click', {'event_category': 'App_Open', 'event_label': 'Guide CTA'});">Launch Live Map<span class="g-sr"> (opens the web app in a new tab)</span></a>
  <p>Free to use. No sign-up needed to browse.</p>
</aside>`;

for (const a of articles) {
  const url = `${SITE}/guides/${a.slug}`;
  const image = abs(a.cover);
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    description: a.description,
    image: [image],
    datePublished: a.date,
    dateModified: a.updated,
    author: { '@type': 'Person', name: a.author },
    publisher: { '@type': 'Organization', name: 'Where2Charge', logo: { '@type': 'ImageObject', url: `${SITE}/logo.png` } },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    ...(a.keyword ? { keywords: a.keyword } : {}),
  };
  const extra = `\n  <meta property="article:published_time" content="${a.date}">\n  <meta property="article:modified_time" content="${a.updated}">\n  <meta property="article:author" content="${esc(a.author)}">\n  <script type="application/ld+json">\n${JSON.stringify(ld, null, 2).replace(/</g, '\\u003c')}\n  </script>`;
  const body = `<main id="main" class="g-wrap g-article-wrap">
  <article class="g-article">
    <p class="g-crumb"><a href="/guides">← All guides</a></p>
    <h1>${esc(a.title)}</h1>
    <p class="g-meta">By ${esc(a.author)} · <time datetime="${a.date}">${longDate(a.date)}</time> · ${a.minutes} min read</p>
    ${a.cover ? `<img class="g-cover" src="${esc(a.cover)}" alt="" width="1200" height="630">` : ''}
    <div class="g-prose">
${a.html}
    </div>
    ${cta}
  </article>
</main>`;
  const dir = join(OUT, a.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), page(head({ title: `${a.title} | Where2Charge`, description: a.description, url, image, type: 'article', extra }), body));
}

const cards = articles.map((a) => `    <li class="g-card">
      <a href="/guides/${a.slug}">
        ${a.cover ? `<img src="${esc(a.cover)}" alt="" width="600" height="315" loading="lazy">` : ''}
        <div class="g-card-body">
          <p class="g-card-meta"><time datetime="${a.date}">${longDate(a.date)}</time> · ${a.minutes} min read</p>
          <h2>${esc(a.title)}</h2>
          <p>${esc(a.description)}</p>
        </div>
      </a>
    </li>`).join('\n');
const indexBody = `<main id="main" class="g-wrap">
  <section class="g-index-head">
    <h1>EV charging guides for Singapore</h1>
    <p>Rates, availability and tips for EV drivers, plus product updates.</p>
  </section>
  ${articles.length ? `<ul class="g-grid">\n${cards}\n  </ul>` : '<p class="g-empty">New guides are on the way.</p>'}
</main>`;
const indexLd = `\n  <script type="application/ld+json">\n${JSON.stringify({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'EV charging guides for Singapore', url: `${SITE}/guides` }, null, 2)}\n  </script>`;
writeFileSync(join(OUT, 'index.html'), page(head({ title: 'EV Charging Guides for Singapore | Where2Charge', description: 'Guides on EV charging rates, charger availability and tips for drivers in Singapore, plus Where2Charge release notes.', url: `${SITE}/guides`, image: DEFAULT_IMAGE, extra: indexLd }), indexBody));

// ---------- sitemap: keep non-guide entries, regenerate guide entries ----------
const smPath = join(ROOT, 'sitemap.xml');
const existing = [...readFileSync(smPath, 'utf8').matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*(?:<lastmod>([^<]+)<\/lastmod>)?\s*<\/url>/g)]
  .map((m) => ({ loc: m[1], lastmod: m[2] }))
  .filter((u) => !u.loc.startsWith(`${SITE}/guides`));
const latest = articles.length ? articles.map((a) => a.updated).sort().pop() : '';
const entries = [...existing, ...(articles.length ? [{ loc: `${SITE}/guides`, lastmod: latest }] : []), ...articles.map((a) => ({ loc: `${SITE}/guides/${a.slug}`, lastmod: a.updated }))];
writeFileSync(smPath, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map((u) => `  <url>\n    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}\n  </url>`).join('\n')}\n</urlset>\n`);

console.log(`Built ${articles.length} article(s) -> guides/`);
