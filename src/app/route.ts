import { readFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

const APP_ORIGIN = "https://app.athvexa.com";

function withAppAuthLinks(html: string) {
  return html
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

export async function GET() {
  const filePath = path.join(process.cwd(), "marketing-site", "index.html");
  const html = await readFile(filePath, "utf8");

  return new Response(withAppAuthLinks(html), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
