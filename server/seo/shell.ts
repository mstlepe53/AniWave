export const SITE_NAME = 'StreamVault';
export const DEFAULT_IMAGE = '/og-image.jpg';

export function siteUrl() {
  return (process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://streamvault.app').replace(/\/$/, '');
}

export function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function absoluteUrl(req: any): string;
export function absoluteUrl(path: string): string;
export function absoluteUrl(reqOrPath: any): string {
  if (typeof reqOrPath === 'string') {
    const p = reqOrPath;
    if (p.startsWith('http')) return p;
    return `${siteUrl()}${p.startsWith('/') ? p : `/${p}`}`;
  }
  // Express request object
  const path = reqOrPath.originalUrl || reqOrPath.url || '/';
  return `${siteUrl()}${path}`;
}

function baseSchemas() {
  const origin = siteUrl();
  return [
    {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${origin}/#organization`,
          name: SITE_NAME,
          url: origin,
          logo: absoluteUrl(DEFAULT_IMAGE),
        },
        {
          '@type': 'WebSite',
          '@id': `${origin}/#website`,
          url: origin,
          name: SITE_NAME,
          description: 'Stream movies and TV shows online free in HD. Powered by TMDB.',
          publisher: { '@id': `${origin}/#organization` },
          potentialAction: {
            '@type': 'SearchAction',
            target: `${origin}/search?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        },
      ],
    },
  ];
}

function styles() {
  return `
    :root{color-scheme:light dark}*{box-sizing:border-box}body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif;background:#f4f4f5;color:#111827}a{color:inherit;text-decoration:none}.top{height:64px;background:#fff;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;padding:0 24px;position:sticky;top:0;z-index:10}.brand{display:flex;align-items:center;gap:12px;font-weight:900;font-size:22px}.mark{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#2563eb,#7c3aed);display:grid;place-items:center;color:white;font-size:18px}.nav{display:flex;gap:20px;color:#4b5563;font-weight:700;font-size:14px}.wrap{max-width:1280px;margin:0 auto;padding:28px 18px}h1{font-size:clamp(28px,5vw,48px);line-height:1.1;margin:0 0 16px;font-weight:900}h2{font-size:22px;margin:0 0 14px}.detail{background:#111827;color:white;border-radius:24px;overflow:hidden;display:grid;grid-template-columns:minmax(180px,260px) 1fr;gap:28px;padding:28px}.poster{width:100%;border-radius:16px;aspect-ratio:2/3;object-fit:cover;background:#1f2937}.tagline{color:#9ca3af;font-style:italic;margin:0 0 12px}.meta{color:#9ca3af;font-size:14px;margin:0 0 16px}.btn{display:inline-flex;align-items:center;gap:8px;border-radius:999px;padding:13px 24px;font-weight:800;background:#2563eb;color:white;margin-top:16px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:16px;margin-top:16px}.card{background:white;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;transition:transform .2s}.card:hover{transform:translateY(-2px)}.thumb{width:100%;aspect-ratio:3/4;object-fit:cover;background:#e5e7eb}.card-body{padding:10px}.card-title{font-weight:800;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.muted{font-size:11px;color:#9ca3af;margin-top:2px}.section{margin-top:40px}.footer{margin-top:60px;padding:28px 24px;background:#111827;color:#9ca3af;font-size:13px}.footer-inner{max-width:1280px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px}@media(max-width:640px){.detail{grid-template-columns:1fr}.poster{max-width:160px;margin:0 auto}}
  `;
}

export function renderShell(options: {
  title: string;
  description: string;
  url: string;
  body: string;
  image?: string;
  type?: string;
  jsonLd?: object | object[];
  keywords?: string;
  noIndex?: boolean;
}) {
  const origin = siteUrl();
  const canonical = options.url.startsWith('http') ? options.url : absoluteUrl(options.url);
  const title = options.title.includes(SITE_NAME) ? options.title : `${options.title} | ${SITE_NAME}`;
  const image = options.image && options.image.startsWith('http') ? options.image : absoluteUrl(DEFAULT_IMAGE);
  const schemas = [...baseSchemas(), ...(options.jsonLd ? (Array.isArray(options.jsonLd) ? options.jsonLd : [options.jsonLd]) : [])];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(options.description)}" />
  ${options.keywords ? `<meta name="keywords" content="${escapeHtml(options.keywords)}" />` : ''}
  <meta name="robots" content="${options.noIndex ? 'noindex,follow' : 'index,follow,max-image-preview:large,max-snippet:-1'}" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <link rel="sitemap" type="application/xml" href="${origin}/sitemap.xml" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <meta name="theme-color" content="#2563eb" />
  <meta property="og:type" content="${escapeHtml(options.type || 'website')}" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(options.description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:url" content="${escapeHtml(canonical)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(options.description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
  <link rel="preconnect" href="https://image.tmdb.org" crossorigin />
  <link rel="preconnect" href="https://api.themoviedb.org" crossorigin />
  <style>${styles()}</style>
  ${schemas.map(s => `<script type="application/ld+json">${JSON.stringify(s).replace(/</g, '\\u003c')}</script>`).join('\n  ')}
</head>
<body>
  <div id="root">
    <header class="top">
      <a class="brand" href="/"><span class="mark">&#9654;</span><span>Stream<b>Vault</b></span></a>
      <nav class="nav">
        <a href="/trending-movies">Trending</a>
        <a href="/popular-movies">Movies</a>
        <a href="/popular-tv">TV Shows</a>
        <a href="/genres">Genres</a>
        <a href="/search">Search</a>
      </nav>
    </header>
    <div class="wrap">${options.body}</div>
    <footer class="footer"><div class="footer-inner"><strong>${SITE_NAME}</strong><nav class="nav"><a href="/popular-movies">Popular Movies</a><a href="/popular-tv">Popular TV</a><a href="/trending-movies">Trending</a><a href="/genres">Genres</a></nav></div></footer>
  </div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;
}

export function breadcrumbSchema(items: { name: string; path?: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.path ? absoluteUrl(item.path) : undefined,
    })),
  };
}
