"use client";

import { forwardRef, useId, useState, type InputHTMLAttributes } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/icons";
import { t, type Locale } from "@/lib/i18n";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  locale: Locale;
};

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { locale, className, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        id={inputId}
        ref={ref}
        type={visible ? "text" : "password"}
        className={`input-field pe-12 ${className ?? ""}`}
      />
      <button
        type="button"
        className="absolute inset-y-0 end-0 flex min-w-11 items-center justify-center px-3 text-smoke-3 transition-colors hover:text-white"
        onClick={() => setVisible((current) => !current)}
        aria-pressed={visible}
        aria-controls={inputId}
        aria-label={visible ? t(locale, "auth.hidePassword") : t(locale, "auth.showPassword")}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
});

export default PasswordInput;
