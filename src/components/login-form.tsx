"use client";

import { signIn } from "next-auth/react";
import { GalleryVerticalEndIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
} from "@/components/ui/field";
import { TelegramLoginButton } from "@/components/telegram-login-button";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-8 items-center justify-center rounded-md">
            <GalleryVerticalEndIcon className="size-6" />
          </div>
          <h1 className="text-xl font-bold">Consistent Trading</h1>
          <FieldDescription>
            Tizimga kirish uchun quyidagi usullardan birini tanlang
          </FieldDescription>
        </div>

        {/* Telegram Login Widget */}
        <Field className="flex justify-center">
          <TelegramLoginButton botName="consistent_trading_bot" />
        </Field>

        <div className="relative flex items-center justify-center text-xs uppercase text-muted-foreground my-1">
          <div className="w-full border-t border-border/60" />
          <span className="bg-background px-2 text-muted-foreground font-medium">yoki</span>
          <div className="w-full border-t border-border/60" />
        </div>

        {/* Google Login */}
        <Field>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => signIn("google", { callbackUrl: "/" })}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="mr-2 size-4">
              <path
                d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                fill="currentColor"
              />
            </svg>
            Google orqali davom etish
          </Button>
        </Field>
      </FieldGroup>

      <FieldDescription className="px-6 text-center text-xs">
        Davom etish orqali xizmat qoidalari va maxfiylik siyosatiga rozilik bildirasiz.
      </FieldDescription>
    </div>
  );
}
