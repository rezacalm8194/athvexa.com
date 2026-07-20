import { readFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

function withAppAuthLinks(html: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.athvexa.com";
  return html
    .replace(/href="#" onclick="openAuth\('login'\)"/g, 'href="/login"')
    .replace(/href="#" onclick="openAuth\('register'\)"/g, 'href="/register"')
    .replace(/href="#" onclick="toggleMobile\(\); openAuth\('login'\)"/g, 'href="/login"')
    .replace(/href="#" onclick="toggleMobile\(\); openAuth\('register'\)"/g, 'href="/register"')
    .replace(
      /function openAuth\(tab\) \{[\s\S]*?\n\}/,
      `function openAuth(tab) {
  window.location.href = tab === 'register' ? '/register' : '/login';
}`
    )
    .replace(
      /function goToApp\(\) \{[\s\S]*?\n\}/,
      `function goToApp() {
  window.location.href = '${appUrl}/dashboard';
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
