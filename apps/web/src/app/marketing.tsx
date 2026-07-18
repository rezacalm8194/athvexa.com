import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { sessionCookieName } from "@fpp/auth";
import { getDirection, resolveLocale, type SupportedLocale } from "@fpp/i18n";

type MarketingPageKey =
  | "home"
  | "features"
  | "how-it-works"
  | "pricing"
  | "about"
  | "contact"
  | "privacy"
  | "terms"
  | "security";

type MarketingSearchParams = Promise<{ lang?: string }>;

const navItems = [
  ["features", "Features"],
  ["how-it-works", "How It Works"],
  ["pricing", "Pricing"]
] as const;

const pageCopy: Record<
  SupportedLocale,
  {
    nav: {
      login: string;
      start: string;
    };
    home: {
      title: string;
      subtitle: string;
      primary: string;
      secondary: string;
    };
    sections: Record<MarketingPageKey, { title: string; body: string }>;
  }
> = {
  en: {
    nav: {
      login: "Login",
      start: "Start Free"
    },
    home: {
      title: "Football performance, organized for every player.",
      subtitle:
        "Plan training, track wellness, guide habits, and keep players moving even when the connection drops.",
      primary: "Start Free",
      secondary: "See How It Works"
    },
    sections: {
      home: {
        title: "Coach from today, not from scattered notes.",
        body: "A focused operating system for daily player development."
      },
      features: {
        title: "Features built around daily execution",
        body:
          "Today dashboards, routines, training plans, habits, goals, wellness checks, pain signals, attendance, tasks, reports, and offline sync."
      },
      "how-it-works": {
        title: "How it works",
        body:
          "Create a workspace, invite your players, publish plans, collect daily check-ins, and review attention-priority signals before the next session."
      },
      pricing: {
        title: "Pricing foundations",
        body:
          "Trial, Coach, Pro, and Club plans are planned for the platform stage. The MVP focuses first on the coaching workflow."
      },
      about: {
        title: "About",
        body:
          "Built for coaches who need structure, clarity, and consistent follow-through across individual players and teams."
      },
      contact: {
        title: "Contact",
        body: "Use this page as the future home for sales, support, and partnership contact options."
      },
      privacy: {
        title: "Privacy",
        body:
          "The platform is designed around workspace isolation, controlled access, secure sessions, and careful handling of player data."
      },
      terms: {
        title: "Terms",
        body:
          "Terms will define acceptable use, account responsibilities, service limitations, and subscription rules before launch."
      },
      security: {
        title: "Security",
        body:
          "Secure database sessions, backend authorization, audit logs, tenant isolation, and offline sync safeguards are core design requirements."
      }
    }
  },
  fa: {
    nav: {
      login: "ورود",
      start: "شروع رایگان"
    },
    home: {
      title: "عملکرد فوتبالی، منظم برای هر بازیکن.",
      subtitle:
        "تمرین، سلامتی، عادت‌ها و هدف‌ها را مدیریت کن و حتی با اینترنت ضعیف هم کار روزانه را ادامه بده.",
      primary: "شروع رایگان",
      secondary: "روش کار"
    },
    sections: {
      home: {
        title: "مربیگری از امروز، نه از یادداشت‌های پراکنده.",
        body: "یک سیستم متمرکز برای رشد روزانه بازیکنان."
      },
      features: {
        title: "قابلیت‌ها برای اجرای روزانه",
        body:
          "داشبورد امروز، روتین، برنامه تمرین، عادت، هدف، wellness، درد، حضور، وظایف، گزارش و sync آفلاین."
      },
      "how-it-works": {
        title: "روش کار",
        body:
          "فضای کاری بساز، بازیکن‌ها را دعوت کن، برنامه منتشر کن، check-in روزانه بگیر و موارد نیازمند توجه را ببین."
      },
      pricing: {
        title: "پایه قیمت‌گذاری",
        body: "پلن‌های Trial، Coach، Pro و Club برای مرحله پلتفرم برنامه‌ریزی شده‌اند."
      },
      about: {
        title: "درباره",
        body: "برای مربی‌هایی که ساختار، وضوح و پیگیری مداوم برای بازیکنان و تیم‌ها می‌خواهند."
      },
      contact: {
        title: "تماس",
        body: "این صفحه محل آینده برای فروش، پشتیبانی و همکاری خواهد بود."
      },
      privacy: {
        title: "حریم خصوصی",
        body: "طراحی بر جداسازی workspace، دسترسی کنترل‌شده، session امن و حفاظت داده بازیکن استوار است."
      },
      terms: {
        title: "شرایط",
        body: "شرایط استفاده، مسئولیت حساب، محدودیت سرویس و قوانین اشتراک پیش از انتشار تکمیل می‌شود."
      },
      security: {
        title: "امنیت",
        body: "session امن، authorization سمت سرور، audit log، tenant isolation و sync امن از نیازمندی‌های اصلی هستند."
      }
    }
  },
  ar: {
    nav: {
      login: "تسجيل الدخول",
      start: "ابدأ مجاناً"
    },
    home: {
      title: "أداء كرة القدم، منظم لكل لاعب.",
      subtitle:
        "خطط التدريب، تابع الجاهزية، وجّه العادات والأهداف، واستمر حتى عند ضعف الاتصال.",
      primary: "ابدأ مجاناً",
      secondary: "كيف يعمل"
    },
    sections: {
      home: {
        title: "درّب من اليوم، لا من ملاحظات متفرقة.",
        body: "نظام مركز لتطوير اللاعبين يومياً."
      },
      features: {
        title: "ميزات مبنية للتنفيذ اليومي",
        body:
          "لوحة اليوم، الروتين، خطط التدريب، العادات، الأهداف، فحوص الجاهزية، الألم، الحضور، المهام، التقارير والمزامنة دون اتصال."
      },
      "how-it-works": {
        title: "كيف يعمل",
        body:
          "أنشئ مساحة عمل، ادع اللاعبين، انشر الخطط، اجمع الفحوص اليومية وراجع إشارات الأولوية."
      },
      pricing: {
        title: "أساس التسعير",
        body: "خطط Trial وCoach وPro وClub مخططة لمرحلة المنصة."
      },
      about: {
        title: "حول المنتج",
        body: "مصمم للمدربين الذين يحتاجون إلى هيكل ووضوح ومتابعة مستمرة."
      },
      contact: {
        title: "تواصل",
        body: "هذه الصفحة ستكون لاحقاً لقنوات المبيعات والدعم والشراكات."
      },
      privacy: {
        title: "الخصوصية",
        body: "يعتمد التصميم على عزل مساحات العمل، التحكم في الوصول، الجلسات الآمنة وحماية بيانات اللاعبين."
      },
      terms: {
        title: "الشروط",
        body: "ستحدد الشروط الاستخدام المقبول ومسؤوليات الحساب وحدود الخدمة وقواعد الاشتراك."
      },
      security: {
        title: "الأمان",
        body: "الجلسات الآمنة، التفويض الخلفي، سجلات التدقيق، عزل المستأجر والمزامنة الآمنة متطلبات أساسية."
      }
    }
  }
};

export async function getMarketingContext(searchParams: MarketingSearchParams) {
  const params = await searchParams;
  const locale = resolveLocale({ userLocale: params.lang });
  const copy = pageCopy[locale];
  const cookieStore = await cookies();
  const hasSession = Boolean(cookieStore.get(sessionCookieName));
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "/onboarding";

  return {
    locale,
    dir: getDirection(locale),
    copy,
    hasSession,
    loginHref: hasSession ? appUrl : withLocale("/login", locale),
    signupHref: hasSession ? appUrl : withLocale("/signup", locale)
  };
}

function withLocale(path: string, locale: SupportedLocale) {
  return locale === "en" ? path : `${path}?lang=${locale}`;
}

function marketingHref(page: MarketingPageKey, locale: SupportedLocale) {
  const path = page === "home" ? "/" : `/${page}`;
  return withLocale(path, locale);
}

export function MarketingShell({
  context,
  activePage,
  children
}: {
  context: Awaited<ReturnType<typeof getMarketingContext>>;
  activePage: MarketingPageKey;
  children: ReactNode;
}) {
  return (
    <main className="marketing" data-theme="dark" dir={context.dir}>
      <header className="marketing-header">
        <Link className="marketing-brand" href={marketingHref("home", context.locale)}>
          <Image
            alt=""
            height={34}
            priority
            src="/brand/athvexa-icon-192.png"
            width={34}
          />
          <span>ATHVEXA</span>
        </Link>
        <nav aria-label="Marketing navigation">
          {navItems.map(([key, label]) => (
            <Link
              aria-current={activePage === key ? "page" : undefined}
              href={marketingHref(key, context.locale)}
              key={key}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="marketing-header__actions">
          <Link href={context.loginHref}>{context.copy.nav.login}</Link>
          <Link className="marketing-button" href={context.signupHref}>
            {context.copy.nav.start}
          </Link>
        </div>
      </header>
      {children}
      <footer className="marketing-footer">
        <Image alt="ATHVEXA" height={54} src="/brand/athvexa-logo.png" width={220} />
        <nav aria-label="Footer navigation">
          {(["about", "contact", "privacy", "terms", "security"] as const).map((page) => (
            <Link href={marketingHref(page, context.locale)} key={page}>
              {context.copy.sections[page].title}
            </Link>
          ))}
        </nav>
      </footer>
    </main>
  );
}

export function MarketingHero({
  context
}: {
  context: Awaited<ReturnType<typeof getMarketingContext>>;
}) {
  return (
    <section className="marketing-hero">
      <Image
        alt=""
        fill
        priority
        sizes="100vw"
        src="/marketing/coach-performance-hero.png"
      />
      <div className="marketing-hero__content">
        <p className="ui-eyebrow">ATHVEXA</p>
        <h1>{context.copy.home.title}</h1>
        <p>{context.copy.home.subtitle}</p>
        <div className="marketing-hero__actions">
          <Link className="marketing-button" href={context.signupHref}>
            {context.copy.home.primary}
          </Link>
          <Link href={marketingHref("how-it-works", context.locale)}>{context.copy.home.secondary}</Link>
        </div>
      </div>
    </section>
  );
}

export function MarketingSection({
  context,
  page
}: {
  context: Awaited<ReturnType<typeof getMarketingContext>>;
  page: MarketingPageKey;
}) {
  const section = context.copy.sections[page];

  return (
    <section className="marketing-section">
      <div className="marketing-section__inner">
        <p className="ui-eyebrow">{page.replaceAll("-", " ")}</p>
        <h1>{section.title}</h1>
        <p>{section.body}</p>
        <div className="marketing-feature-grid">
          <article>
            <strong>Plan</strong>
            <span>Training, routines, goals, and weekly structure.</span>
          </article>
          <article>
            <strong>Track</strong>
            <span>Wellness, habits, attendance, pain signals, and progress.</span>
          </article>
          <article>
            <strong>Act</strong>
            <span>Priority attention, tasks, messages, and reports.</span>
          </article>
        </div>
      </div>
    </section>
  );
}
