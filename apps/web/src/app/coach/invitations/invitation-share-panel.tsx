"use client";

import { useState } from "react";

export function InvitationSharePanel({
  email,
  inviteLink,
  role
}: {
  email: string;
  inviteLink: string;
  role: string;
}) {
  const [copied, setCopied] = useState(false);
  const shareText = `ATHVEXA invitation for ${email} as ${role}: ${inviteLink}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(
    `ATHVEXA invitation for ${email} as ${role}`
  )}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  async function copyLink() {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="invitation-share" aria-label="Created invitation link">
      <div>
        <p className="ui-eyebrow">Ready to send</p>
        <h2>Share this invitation link</h2>
        <span>
          {email} · {role}
        </span>
      </div>
      <input className="ui-input" readOnly value={inviteLink} />
      <div className="invitation-share__actions">
        <button className="ui-button ui-button--secondary" onClick={copyLink} type="button">
          {copied ? "Copied" : "Copy link"}
        </button>
        <a className="ui-button ui-button--secondary" href={telegramUrl} rel="noreferrer" target="_blank">
          Telegram
        </a>
        <a className="ui-button ui-button--secondary" href={whatsappUrl} rel="noreferrer" target="_blank">
          WhatsApp
        </a>
      </div>
    </section>
  );
}
