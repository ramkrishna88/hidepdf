import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.SMOKE_PORT || 3847);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function fail(message) {
  failures.push(message);
  console.error('FAIL', message);
}

function request({ host, proto, urlPath, accept }) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: PORT,
      path: urlPath,
      method: 'GET',
      headers: {
        Host: host,
        'X-Forwarded-Proto': proto,
        Accept: accept
      }
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('utf8')
        });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function canonical(html) {
  const tags = html.match(/<link\b[^>]*>/gi) || [];
  for (const tag of tags) {
    if (!/rel=["']canonical["']/i.test(tag)) continue;
    const href = tag.match(/href=["']([^"']+)["']/i);
    return href ? href[1] : null;
  }
  return null;
}

function hasAdsense(html) {
  const metas = html.match(/<meta\b[^>]*>/gi) || [];
  return metas.some((tag) => (
    /name=["']google-adsense-account["']/i.test(tag)
    && /content=["']ca-pub-1210860150241703["']/i.test(tag)
  ));
}

function robotsNoindex(html) {
  const metas = html.match(/<meta\b[^>]*>/gi) || [];
  return metas.some((tag) => /name=["'](?:robots|googlebot)["']/i.test(tag) && /noindex/i.test(tag));
}

function sliceBalanced(html, startPattern, tag) {
  const start = html.search(startPattern);
  if (start < 0) return '';
  const re = new RegExp(`</?${tag}\\b[^>]*>`, 'gi');
  re.lastIndex = start;
  let depth = 0;
  let match;
  while ((match = re.exec(html))) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return html.slice(start, match.index + match[0].length);
  }
  return '';
}

function wordCount(chunk) {
  const text = chunk
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ');
  return text.trim().split(/\s+/).filter(Boolean).length;
}

async function waitForServer() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const health = await request({
        host: '127.0.0.1',
        proto: 'http',
        urlPath: '/v1/health',
        accept: 'application/json'
      });
      if (health.status === 200 && health.body.includes('HidePDF Content')) return;
    } catch {
      // server still booting
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('server did not become healthy');
}

function assertRedirect(res, location, label) {
  if (res.status !== 301) fail(`${label} status ${res.status}`);
  if (res.headers.location !== location) fail(`${label} location ${res.headers.location} expected ${location}`);
}

const child = spawn(path.join(root, 'node_modules', '.bin', 'tsx'), ['src/server.ts'], {
  cwd: root,
  env: { ...process.env, PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe']
});
let logs = '';
child.stdout.on('data', (chunk) => { logs += chunk; });
child.stderr.on('data', (chunk) => { logs += chunk; });

try {
  await waitForServer();

  const sitemap = await request({
    host: '127.0.0.1',
    proto: 'http',
    urlPath: '/sitemap.xml',
    accept: 'application/xml,text/xml'
  });
  if (sitemap.status !== 200) fail(`sitemap status ${sitemap.status}`);
  if (/<loc>[^<]*\/home\/?<|hidepdfcontent.com\/home</.test(sitemap.body)) fail('sitemap still lists /home');

  const locs = [...sitemap.body.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map((match) => match[1].trim());
  const lastmods = [...sitemap.body.matchAll(/<lastmod>\s*([^<]+)\s*<\/lastmod>/g)].map((match) => match[1].trim());
  if (locs.length < 10) fail(`sitemap has ${locs.length} urls`);
  if (lastmods.length !== locs.length) fail(`lastmod count ${lastmods.length} != loc count ${locs.length}`);
  for (const lastmod of lastmods) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(lastmod)) fail(`bad lastmod ${lastmod}`);
  }

  const guideSlugs = [
    'how-to-redact-a-pdf',
    'why-black-boxes-dont-hide-pdf-text',
    'remove-personal-data-from-pdfs',
    'redact-scanned-pdfs-with-ocr',
    'check-a-pdf-is-really-redacted',
    'remove-metadata-from-pdfs',
    'share-bank-statements-safely',
    'share-payslips-safely'
  ];
  for (const slug of guideSlugs) {
    const loc = `https://hidepdfcontent.com/guides/${slug}`;
    if (!locs.includes(loc)) fail(`sitemap missing ${loc}`);
  }
  for (const required of ['https://hidepdfcontent.com/', 'https://hidepdfcontent.com/guides', 'https://hidepdfcontent.com/how-it-works', 'https://hidepdfcontent.com/faq', 'https://hidepdfcontent.com/about', 'https://hidepdfcontent.com/privacy', 'https://hidepdfcontent.com/terms', 'https://hidepdfcontent.com/contact', 'https://hidepdfcontent.com/docs']) {
    if (!locs.includes(required)) fail(`sitemap missing ${required}`);
  }

  for (const loc of locs) {
    const { pathname } = new URL(loc);
    const page = await request({
      host: '127.0.0.1',
      proto: 'http',
      urlPath: pathname,
      accept: 'text/html,application/xhtml+xml'
    });
    const problems = [];
    if (page.status !== 200) problems.push(`status ${page.status}`);
    if (canonical(page.body) !== loc) problems.push(`canonical ${canonical(page.body)}`);
    if (!hasAdsense(page.body)) problems.push('missing AdSense meta');
    if (robotsNoindex(page.body)) problems.push('noindex');
    if (/noindex/i.test(String(page.headers['x-robots-tag'] || ''))) problems.push('X-Robots-Tag noindex');
    if (!page.body.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1210860150241703')) {
      problems.push('missing adsbygoogle script');
    }
    if (!page.body.includes('>How it works<') || !page.body.includes('>FAQ<')) {
      problems.push('missing nav tabs');
    }
    if (pathname === '/') {
      const words = wordCount(
        (page.body.match(/<section class="hero"[\s\S]*?<\/section>/i) || [''])[0]
        + (page.body.match(/<section class="home-copy"[\s\S]*?<\/section>/i) || [''])[0]
      );
      console.log(`words / ${words}`);
      if (words < 150 || words > 250) problems.push(`home words ${words}`);
      if (page.body.includes('FAQPage')) problems.push('home still has FAQPage');
      if (page.body.includes('mailto:hello@hidepdfcontent.com')) problems.push('home has contact email');
    }
    if (pathname === '/faq' && !page.body.includes('FAQPage')) problems.push('faq missing FAQPage');
    if (pathname === '/faq' && !page.body.includes('<details')) problems.push('faq missing details');
    if (pathname.startsWith('/guides/') && pathname !== '/guides/') {
      let main = sliceBalanced(page.body, /<main\b/, 'main');
      main = main.replace(/<nav class="toc"[\s\S]*?<\/nav>/i, ' ');
      main = main.replace(/<aside class="related"[\s\S]*?<\/aside>/i, ' ');
      const words = wordCount(main);
      console.log(`words ${pathname} ${words}`);
      if (words < 900 || words > 1300) problems.push(`guide words ${words}`);
    }
    if (problems.length) fail(`${loc} ${problems.join('; ')}`);
    else console.log('ok', pathname);
  }

  const home = await request({ host: '127.0.0.1', proto: 'http', urlPath: '/home', accept: 'text/html' });
  assertRedirect(home, '/', '/home');
  const homeHtml = await request({ host: '127.0.0.1', proto: 'http', urlPath: '/home.html', accept: 'text/html' });
  assertRedirect(homeHtml, '/', '/home.html');
  const aboutHtml = await request({ host: '127.0.0.1', proto: 'http', urlPath: '/about.html', accept: 'text/html' });
  assertRedirect(aboutHtml, '/about', '/about.html');

  const www = await request({
    host: 'www.hidepdfcontent.com',
    proto: 'https',
    urlPath: '/guides?x=1',
    accept: 'text/html'
  });
  assertRedirect(www, 'https://hidepdfcontent.com/guides?x=1', 'www');

  const httpRedirect = await request({
    host: 'hidepdfcontent.com',
    proto: 'http',
    urlPath: '/privacy',
    accept: 'text/html'
  });
  assertRedirect(httpRedirect, 'https://hidepdfcontent.com/privacy', 'http');

  const ads = await request({
    host: 'hidepdfcontent.com',
    proto: 'https',
    urlPath: '/ads.txt',
    accept: 'text/plain'
  });
  if (ads.status !== 200) fail(`ads.txt apex status ${ads.status}`);
  if (ads.headers.location) fail(`ads.txt apex redirected to ${ads.headers.location}`);
  if (!ads.body.includes('google.com, pub-1210860150241703, DIRECT, f08c47fec0942fa0')) fail('ads.txt body changed');

  const adsHttp = await request({
    host: 'hidepdfcontent.com',
    proto: 'http',
    urlPath: '/ads.txt',
    accept: 'text/plain'
  });
  assertRedirect(adsHttp, 'https://hidepdfcontent.com/ads.txt', 'http ads.txt');

  const html404 = await request({
    host: '127.0.0.1',
    proto: 'http',
    urlPath: '/this-page-is-missing',
    accept: 'text/html,application/xhtml+xml'
  });
  if (html404.status !== 404) fail(`html 404 status ${html404.status}`);
  if (!/text\/html/i.test(String(html404.headers['content-type'] || ''))) fail(`html 404 type ${html404.headers['content-type']}`);
  if (!html404.body.includes('<h1>That page is not here</h1>')) fail('html 404 body');
  if (!hasAdsense(html404.body)) fail('html 404 missing AdSense meta');

  const api404 = await request({
    host: '127.0.0.1',
    proto: 'http',
    urlPath: '/v1/missing',
    accept: 'text/html,application/xhtml+xml'
  });
  if (api404.status !== 404) fail(`api 404 status ${api404.status}`);
  if (api404.body.includes('<html')) fail('api 404 returned HTML');
  const apiBody = JSON.parse(api404.body);
  if (apiBody.error_code !== 'NOT_FOUND') fail(`api 404 body ${api404.body}`);

  const json404 = await request({
    host: '127.0.0.1',
    proto: 'http',
    urlPath: '/not-a-page',
    accept: 'application/json'
  });
  if (json404.status !== 404) fail(`json 404 status ${json404.status}`);
  if (json404.body.includes('<html')) fail('json accept returned HTML');

  if (failures.length) {
    console.error(`smoke failed (${failures.length})`);
    process.exitCode = 1;
  } else {
    console.log(`smoke passed (${locs.length} sitemap urls)`);
  }
} catch (error) {
  console.error(logs.slice(-4000));
  console.error(error);
  process.exitCode = 1;
} finally {
  child.kill('SIGTERM');
  setTimeout(() => {
    child.kill('SIGKILL');
    process.exit(process.exitCode || 0);
  }, 1500);
}
