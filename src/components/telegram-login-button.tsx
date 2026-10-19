"use client";

import * as React from "react";
import { signIn } from "next-auth/react";

interface TelegramLoginButtonProps {
  botName?: string;
  className?: string;
}

export function TelegramLoginButton({
  botName = "consistent_trading_bot",
  className,
}: TelegramLoginButtonProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    // Define global callback for Telegram widget
    (window as any).onTelegramAuth = async (user: any) => {
      setIsLoading(true);
      setError(null);
      try {
        const res: any = await signIn("telegram", {
          ...user,
          redirect: false,
          callbackUrl: "/",
        });

        if (res?.error) {
          setError("Telegram orqali kirishda xatolik yuz berdi");
          setIsLoading(false);
        } else if (res?.url) {
          window.location.href = res.url;
        } else {
          window.location.href = "/";
        }
      } catch (err: any) {
        console.error("Telegram login error:", err);
        setError("Tizimga kirishda xatolik yuz berdi");
        setIsLoading(false);
      }
    };

    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botName);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "10");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");

    containerRef.current.appendChild(script);

    return () => {
      delete (window as any).onTelegramAuth;
    };
  }, [botName]);

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <div
        ref={containerRef}
        className={className || "flex justify-center min-h-[44px] items-center w-full"}
      />
      {isLoading && (
        <span className="text-xs text-muted-foreground animate-pulse">
          Telegram orqali kirilmoqda...
        </span>
      )}
      {error && (
        <span className="text-xs text-destructive text-center">{error}</span>
      )}
    </div>
  );
}
