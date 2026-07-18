"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type MarketingHeaderLink = {
  active: boolean;
  href: string;
  label: string;
};

export function MarketingHeader({
  brandHref,
  loginHref,
  loginLabel,
  navItems,
  signupHref,
  signupLabel
}: {
  brandHref: string;
  loginHref: string;
  loginLabel: string;
  navItems: MarketingHeaderLink[];
  signupHref: string;
  signupLabel: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="marketing-header">
      <Link className="marketing-brand" href={brandHref} onClick={closeMenu}>
        <Image
          alt="ATHVEXA"
          height={152}
          priority
          sizes="(max-width: 767px) 132px, 160px"
          src="/brand/athvexa-nav-logo.png"
          width={941}
        />
      </Link>

      <nav aria-label="Marketing navigation" className="marketing-nav">
        {navItems.map((item) => (
          <Link
            aria-current={item.active ? "page" : undefined}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="marketing-header__actions">
        <Link className="marketing-login" href={loginHref}>
          {loginLabel}
        </Link>
        <Link className="marketing-button marketing-button--header" href={signupHref}>
          {signupLabel}
        </Link>
        <button
          aria-controls="marketing-mobile-menu"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="marketing-menu-button"
          onClick={() => setMenuOpen((open) => !open)}
          type="button"
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div
        className="marketing-mobile-menu"
        data-open={menuOpen ? "true" : "false"}
        id="marketing-mobile-menu"
      >
        <nav aria-label="Mobile marketing navigation">
          {navItems.map((item) => (
            <Link
              aria-current={item.active ? "page" : undefined}
              href={item.href}
              key={item.href}
              onClick={closeMenu}
            >
              {item.label}
            </Link>
          ))}
          <Link className="marketing-mobile-login" href={loginHref} onClick={closeMenu}>
            {loginLabel}
          </Link>
          <Link className="marketing-button" href={signupHref} onClick={closeMenu}>
            {signupLabel}
          </Link>
        </nav>
      </div>
    </header>
  );
}
