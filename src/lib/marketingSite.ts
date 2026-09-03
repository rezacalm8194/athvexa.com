import { readFile } from "fs/promises";
import path from "path";

const APP_ORIGIN = "https://app.athvexa.com";
export type MarketingLocale = "en" | "fa";
type Messages = Record<string, string>;

function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split(";").map((part) => {
      const [key, ...rest] = part.trim().split("=");
      return [key, rest.join("=")];
    })
  );
}

export function detectMarketingLocale(request: Request): MarketingLocale {
  const cookies = parseCookies(request.headers.get("cookie"));
  const cookieLocale = cookies.NEXT_LOCALE;
  if (cookieLocale === "fa" || cookieLocale === "en") return cookieLocale;

  const acceptLanguage = request.headers.get("accept-language") ?? "";
  const primary = acceptLanguage.split(",")[0]?.trim().toLowerCase() ?? "";
  if (primary.startsWith("fa")) return "fa";

  return "en";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function applyI18nToHtml(html: string, locale: MarketingLocale, messages: Messages): string {
  const dir = locale === "fa" ? "rtl" : "ltr";

  html = html.replace(/<html[^>]*>/, `<html lang="${locale}" dir="${dir}">`);

  if (messages["meta.title"]) {
    html = html.replace(/<title[^>]*>[^<]*<\/title>/, `<title>${escapeHtml(messages["meta.title"])}</title>`);
  }

  html = html.replace(
    /(<([a-zA-Z][\w-]*)([^>]*)\sdata-i18n-html="([^"]+)"([^>]*)>)([\s\S]*?)(<\/\2>)/g,
    (match, open, _tag, _before, key, _after, _content, close) => {
      const msg = messages[key];
      if (msg === undefined) return match;
      return `${open}${msg}${close}`;
    }
  );

  html = html.replace(
    /(<([a-zA-Z][\w-]*)([^>]*)\sdata-i18n="([^"]+)"([^>]*)>)([^<]*?)(<\/\2>)/g,
    (match, open, _tag, _before, key, _after, _content, close) => {
      const msg = messages[key];
      if (msg === undefined) return match;
      return `${open}${escapeHtml(msg)}${close}`;
    }
  );

  html = html.replace(/\sdata-i18n-placeholder="([^"]+)"([^>]*)/g, (match, key, rest) => {
    const msg = messages[key];
    if (msg === undefined) return match;
    const escaped = escapeHtml(msg);
    if (/placeholder="[^"]*"/.test(rest)) {
      return ` data-i18n-placeholder="${key}"${rest.replace(/placeholder="[^"]*"/, `placeholder="${escaped}"`)}`;
    }
    return ` data-i18n-placeholder="${key}" placeholder="${escaped}"${rest}`;
  });

  html = html.replace(/\sdata-i18n-aria-label="([^"]+)"([^>]*)/g, (match, key, rest) => {
    const msg = messages[key];
    if (msg === undefined) return match;
    const escaped = escapeHtml(msg);
    if (/aria-label="[^"]*"/.test(rest)) {
      return ` data-i18n-aria-label="${key}"${rest.replace(/aria-label="[^"]*"/, `aria-label="${escaped}"`)}`;
    }
    return ` data-i18n-aria-label="${key}" aria-label="${escaped}"${rest}`;
  });

  return html;
}

function injectLocaleAssets(html: string, locale: MarketingLocale, messages: Messages): string {
  const messagesJson = JSON.stringify(messages).replace(/</g, "\\u003c");
  const localeScript = `<script>window.__ATHVEXA_LOCALE__="${locale}";window.__ATHVEXA_MESSAGES__=${messagesJson};</script>`;

  const toggleScript = `<script>
(function(){
  function applyClientI18n(){
    var m=window.__ATHVEXA_MESSAGES__||{};
    document.querySelectorAll('[data-i18n]').forEach(function(el){
      var k=el.getAttribute('data-i18n');
      if(m[k]!=null) el.textContent=m[k];
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function(el){
      var k=el.getAttribute('data-i18n-html');
      if(m[k]!=null) el.innerHTML=m[k];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el){
      var k=el.getAttribute('data-i18n-placeholder');
      if(m[k]!=null) el.placeholder=m[k];
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach(function(el){
      var k=el.getAttribute('data-i18n-aria-label');
      if(m[k]!=null) el.setAttribute('aria-label',m[k]);
    });
  }
  applyClientI18n();
  document.querySelectorAll('[data-set-locale]').forEach(function(btn){
    btn.addEventListener('click',function(){
      var loc=btn.getAttribute('data-set-locale');
      if(!loc||loc===window.__ATHVEXA_LOCALE__) return;
      document.cookie='NEXT_LOCALE='+loc+'; path=/; max-age=31536000; samesite=lax';
      location.reload();
    });
  });
  document.querySelectorAll('.lang-btn').forEach(function(btn){
    var loc=btn.getAttribute('data-set-locale');
    if(loc===window.__ATHVEXA_LOCALE__) btn.classList.add('active');
  });
})();
</script>`;

  let out = html.replace("</head>", `${localeScript}\n</head>`);

  if (locale === "fa") {
    out = out.replace(
      "</head>",
      '<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">\n</head>'
    );
  }

  out = out.replace("</body>", `${toggleScript}\n</body>`);

  return out;
}

function withAppAuthLinks(html: string) {
  return html
    .replace(/href="\/login"/g, `href="${APP_ORIGIN}/login"`)
    .replace(/href="\/register"/g, `href="${APP_ORIGIN}/register"`)
    .replace(/href="#" onclick="openAuth\('login'\)"/g, `href="${APP_ORIGIN}/login"`)
    .replace(/href="#" onclick="openAuth\('register'\)"/g, `href="${APP_ORIGIN}/register"`)
    .replace(/href="#" onclick="toggleMobile\(\); openAuth\('login'\)"/g, `href="${APP_ORIGIN}/login"`)
    .replace(/href="#" onclick="toggleMobile\(\); openAuth\('register'\)"/g, `href="${APP_ORIGIN}/register"`)
    .replace(
      /function openAuth\(tab\) \{[\s\S]*?\n\}/,
      `function openAuth(tab) {
  window.location.href = tab === 'register' ? '${APP_ORIGIN}/register' : '${APP_ORIGIN}/login';
}`
    )
    .replace(
      /function goToApp\(\) \{[\s\S]*?\n\}/,
      `function goToApp() {
  window.location.href = '${APP_ORIGIN}/dashboard';
}`
    );
}

export async function renderMarketingHtml(request: Request): Promise<string> {
  const baseDir = path.join(process.cwd(), "marketing-site");
  const [htmlRaw, localesRaw] = await Promise.all([
    readFile(path.join(baseDir, "index.html"), "utf8"),
    readFile(path.join(baseDir, "locales.json"), "utf8"),
  ]);

  const locales = JSON.parse(localesRaw) as Record<MarketingLocale, Messages>;
  const locale = detectMarketingLocale(request);
  const messages = locales[locale] ?? locales.en;

  let html = withAppAuthLinks(htmlRaw);
  html = applyI18nToHtml(html, locale, messages);
  html = injectLocaleAssets(html, locale, messages);
  return html;
}

export function marketingHtmlResponse(html: string) {
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Locale comes from Cookie / Accept-Language — must not share one cache entry.
      "cache-control": "private, no-store",
      Vary: "Cookie, Accept-Language",
    },
  });
}
