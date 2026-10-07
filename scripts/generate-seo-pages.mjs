import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://rzdqohedzsgcmhcdhlri.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "sb_publishable_mErWmopCWbRtyq764qh1_A_rZitmXJZ";
const SITE = "https://ilyaviktorovih.github.io/dim-sad-instrument";
const ROOT = process.cwd();
const PRODUCTS_DIR = join(ROOT, "products");

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  Accept: "application/json"
};

async function api(path, params = {}) {
  const url = new URL(SUPABASE_URL + "/rest/v1/" + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

function esc(value = "") {
  return String(value)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function text(value = "") {
  return String(value).replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&").replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'").replace(/\s+/g, " ").trim();
}

function description(value, fallback) {
  const clean = text(value);
  return (clean || fallback).slice(0, 155);
}

function formatPrice(value) {
  return Number(value || 0).toLocaleString("uk-UA", { maximumFractionDigits: 2 });
}

function productPage(p, images) {
  const url = `${SITE}/products/${p.id}.html`;
  const name = text(p.name) || "Товар";
  const desc = description(p.description, `${name} — купити в магазині «Дім Сад Інструмент» з доставкою по Україні.`);
  const imageList = (images.length ? images : (p.image ? [p.image] : [])).filter(Boolean).slice(0, 8);
  const available = p.available !== false;
  const price = Number(p.price || 0);
  const oldPrice = Number(p.old_price || 0);
  const category = text(p.category) || "Товари";
  const imageHtml = imageList.length
    ? imageList.map((src, i) => `<img src="${esc(src)}" alt="${esc(name)} — фото ${i + 1}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}>`).join("")
    : '<div class="noimg" aria-label="Фото товару відсутнє">📦</div>';
  const offer = {
    "@type": "Offer",
    "url": url,
    "priceCurrency": "UAH",
    "price": price,
    "availability": available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    "itemCondition": "https://schema.org/NewCondition"
  };
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": url + "#product",
    "name": name,
    "description": text(p.description) || desc,
    "image": imageList,
    "sku": String(p.id),
    "category": category,
    "offers": offer
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {"@type":"ListItem","position":1,"name":"Головна","item":SITE + "/"},
      {"@type":"ListItem","position":2,"name":category,"item":SITE + "/#products"},
      {"@type":"ListItem","position":3,"name":name,"item":url}
    ]
  };
  return `<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc((name + " — Дім Сад Інструмент").slice(0, 70))}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
<link rel="canonical" href="${url}">
<meta property="og:type" content="product">
<meta property="og:locale" content="uk_UA">
<meta property="og:site_name" content="Дім Сад Інструмент">
<meta property="og:title" content="${esc(name)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
${imageList[0] ? `<meta property="og:image" content="${esc(imageList[0])}">` : ""}
<script type="application/ld+json">${JSON.stringify(productSchema)}</script>
<script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>
<style>
*{box-sizing:border-box}body{margin:0;background:#f7faf8;color:#17352a;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}
header{background:#fff;border-bottom:1px solid #e2ebe6;padding:14px 20px;position:sticky;top:0;z-index:5}
nav{max-width:1100px;margin:auto;display:flex;justify-content:space-between;align-items:center;gap:12px}.brand{font-weight:900;font-size:19px}.brand span{color:#117a43}
main{max-width:1100px;margin:auto;padding:28px 18px 55px}.crumbs{font-size:13px;color:#69766f;margin:0 0 18px}.crumbs a{color:#117a43;text-decoration:none}
.card{background:#fff;border:1px solid #e2ebe6;border-radius:24px;padding:22px;display:grid;grid-template-columns:1.05fr .95fr;gap:30px;box-shadow:0 12px 35px rgba(23,53,42,.06)}
.gallery{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.gallery img{width:100%;height:300px;object-fit:contain;background:#f5f8f6;border-radius:16px;padding:10px}.noimg{height:300px;display:grid;place-items:center;background:#f5f8f6;border-radius:16px;font-size:70px}
h1{font-size:clamp(28px,4vw,44px);line-height:1.08;margin:0 0 14px}.category{color:#68766f;font-size:14px}.price{font-size:30px;font-weight:900;margin:20px 0 8px}.old{text-decoration:line-through;color:#888;font-size:16px;margin-right:8px}.stock{font-weight:800;color:#117a43;margin:8px 0 18px}.out{color:#c62828}.description{line-height:1.7;color:#4f5e57;white-space:pre-line;margin:20px 0}.buy{display:inline-block;background:#117a43;color:#fff;text-decoration:none;font-weight:900;padding:15px 22px;border-radius:13px}.back{display:inline-block;margin-left:8px;color:#117a43;text-decoration:none;font-weight:800}.info{margin-top:18px;padding:14px 16px;background:#f6faf7;border-radius:13px;color:#596760;font-size:13px;line-height:1.55}
@media(max-width:760px){.card{grid-template-columns:1fr;padding:15px}.gallery{grid-template-columns:1fr 1fr}.gallery img,.noimg{height:210px}main{padding:20px 12px 40px}}
</style>
</head>
<body>
<header><nav><div class="brand">🏠 <span>Дім Сад Інструмент</span></div><a class="back" href="${SITE}/">До каталогу</a></nav></header>
<main>
<div class="crumbs"><a href="${SITE}/">Головна</a> › <a href="${SITE}/#products">${esc(category)}</a> › ${esc(name)}</div>
<article class="card">
<section><div class="gallery">${imageHtml}</div></section>
<section>
<div class="category">${esc(category)}</div>
<h1>${esc(name)}</h1>
<div class="price">${oldPrice > price ? `<span class="old">${formatPrice(oldPrice)} грн</span>` : ""}${formatPrice(price)} грн</div>
<div class="${available ? "stock" : "stock out"}">${available ? "✓ В наявності" : "✕ Немає в наявності"}</div>
<div class="description">${esc(text(p.description) || "Опис товару уточнюється.")}</div>
<a class="buy" href="${SITE}/?product=${encodeURIComponent(p.id)}">🛒 Замовити товар</a>
<a class="back" href="${SITE}/">← Назад до магазину</a>
<div class="info">🚚 Доставка по Україні. Актуальна ціна та наявність показуються на сайті. Перед відправленням замовлення перевіряється.</div>
</section>
</article>
</main>
</body>
</html>`;
}

await rm(PRODUCTS_DIR, { recursive: true, force: true });
await mkdir(PRODUCTS_DIR, { recursive: true });

const products = [];
for (let from = 0; ; from += 1000) {
  const rows = await api("products", {
    select: "id,name,price,description,image,category,available,is_hit,old_price,discount,stock_quantity",
    available: "eq.true",
    order: "id.desc",
    limit: "1000",
    offset: String(from)
  });
  products.push(...rows);
  if (rows.length < 1000) break;
}

const imageMap = new Map();
for (let i = 0; i < products.length; i += 200) {
  const ids = products.slice(i, i + 200).map(p => p.id).join(",");
  const rows = await api("product_images", {
    select: "product_id,image_url,sort_order",
    product_id: `in.(${ids})`,
    order: "sort_order.asc"
  });
  for (const row of rows) {
    if (!row.image_url) continue;
    if (!imageMap.has(String(row.product_id))) imageMap.set(String(row.product_id), []);
    imageMap.get(String(row.product_id)).push(row.image_url);
  }
}

for (const p of products) {
  await writeFile(join(PRODUCTS_DIR, `${p.id}.html`), productPage(p, imageMap.get(String(p.id)) || []), "utf8");
}

const urls = [SITE + "/"];
for (const p of products) urls.push(`${SITE}/products/${p.id}.html`);
const now = new Date().toISOString().slice(0,10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u}</loc><lastmod>${now}</lastmod></url>`).join("\n")}
</urlset>
`;
await writeFile(join(ROOT, "sitemap.xml"), sitemap, "utf8");
console.log(`Generated ${products.length} product pages and ${urls.length} sitemap URLs.`);
