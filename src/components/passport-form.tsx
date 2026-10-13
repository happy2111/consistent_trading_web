"use client";

import { useSession } from "next-auth/react";
import { ImagePlusIcon, RefreshCwIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type Preview = {
  front?: string;
  back?: string;
};

function localizeError(raw: string): string {
  return raw
    .replace(
      /Resolution too low \((\d+)x(\d+)\), need at least (\d+)x(\d+)/gi,
      "Слишком низкое разрешение ($1×$2). Нужно минимум $3×$4",
    )
    .replace(
      /Image too blurry \(score=([\d.]+), min=([\d.]+)\)/gi,
      "Фото размыто (чёткость $1, нужно ≥ $2). Переснимите ближе и при хорошем свете",
    )
    .replace(
      /Valid Uzbekistan JSHSHIR \(14-digit PINFL\) was not found on the ID images/gi,
      "Не найден валидный JSHSHIR (ПИНФЛ, 14 цифр). Снимите лицевую сторону и оборот с MRZ чётко, без бликов",
    )
    .replace(/Passport validation failed/gi, "Проверка паспорта не пройдена")
    .replace(/Passport files rejected/gi, "Файлы отклонены")
    .replace(/^front:\s*/i, "Лицевая сторона: ")
    .replace(/^back:\s*/i, "Оборотная сторона: ")
    .replace(/Unsupported mime type:.*/gi, "Неподдерживаемый формат файла (JPG/PNG/WEBP)")
    .replace(/File too large.*/gi, "Файл слишком большой (макс. 8 МБ)")
    .replace(/File too small.*/gi, "Файл слишком маленький");
}

function parseApiErrors(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  const nested =
    root.message && typeof root.message === "object"
      ? (root.message as Record<string, unknown>)
      : root;

  const list = nested.errors;
  if (Array.isArray(list)) {
    return list.map((e) => localizeError(String(e)));
  }

  if (typeof nested.message === "string") {
    return [localizeError(nested.message)];
  }
  if (typeof root.message === "string") {
    return [localizeError(root.message)];
  }
  return [];
}

function UploadCard({
  label,
  hint,
  previewUrl,
  fileName,
  inputRef,
  onPick,
}: {
  label: string;
  hint: string;
  previewUrl?: string;
  fileName?: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPick: (file: File | null) => void;
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          onPick(file);
          // allow selecting the same file again after replace
          e.target.value = "";
        }}
      />

      {previewUrl ? (
        <div className="relative overflow-hidden rounded-xl border bg-muted/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={label}
            className="max-h-48 w-full object-contain"
          />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-background/90 p-2 backdrop-blur">
            <span className="truncate text-xs text-muted-foreground">
              {fileName}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => inputRef.current?.click()}
            >
              <RefreshCwIcon className="size-3.5" />
              Заменить
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center transition-colors hover:bg-muted/40"
        >
          <ImagePlusIcon className="size-6 text-muted-foreground" />
          <span className="text-sm font-medium">{hint}</span>
          <span className="text-xs text-muted-foreground">
            JPG / PNG · лучше ≥ 640×320
          </span>
        </button>
      )}
    </Field>
  );
}

export function PassportForm() {
  const { data: session, update } = useSession();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview>({});
  const [saving, setSaving] = useState(false);
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!session?.user?.name) return;
    const parts = session.user.name.trim().split(/\s+/);
    setFirstName((prev) => prev || parts[0] || "");
    setLastName((prev) => prev || parts.slice(1).join(" "));
  }, [session?.user?.name]);

  function onPick(side: "front" | "back", file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Нужен файл изображения (JPG/PNG/WEBP)");
      return;
    }

    const url = URL.createObjectURL(file);
    if (side === "front") {
      if (preview.front) URL.revokeObjectURL(preview.front);
      setFrontFile(file);
      setPreview((p) => ({ ...p, front: url }));
      toast.success("Лицевая сторона загружена — можно заменить в любой момент");
    } else {
      if (preview.back) URL.revokeObjectURL(preview.back);
      setBackFile(file);
      setPreview((p) => ({ ...p, back: url }));
      toast.success("Оборотная сторона загружена — можно заменить в любой момент");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Укажите имя и фамилию");
      return;
    }
    if (!frontFile || !backFile) {
      toast.error("Загрузите обе стороны паспорта / ID-карты");
      return;
    }

    setSaving(true);
    const toastId = toast.loading("Проверяем документ…");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) throw new Error("API URL не настроен");

      const form = new FormData();
      form.append("googleId", session?.user?.googleId ?? "");
      form.append("email", session?.user?.email ?? "");
      form.append("firstName", firstName.trim());
      form.append("lastName", lastName.trim());
      form.append("passportFront", frontFile);
      form.append("passportBack", backFile);

      const res = await fetch(`${apiUrl}/api/users/passport`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const text = await res.text();
        let errors: string[] = [];
        try {
          errors = parseApiErrors(JSON.parse(text));
        } catch {
          errors = [localizeError(text || "Ошибка сохранения")];
        }

        toast.error("Проверка не пройдена", {
          id: toastId,
          description: errors[0] ?? "Попробуйте другое фото",
          duration: 8000,
        });

        for (const err of errors.slice(1)) {
          toast.error(err, { duration: 7000 });
        }
        return;
      }

      await update();
      toast.success("Документ принят", { id: toastId });
      window.location.href = "/dashboard";
    } catch (err) {
      toast.error((err as Error).message || "Не удалось сохранить", {
        id: toastId,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <FieldGroup>
        <div className="flex flex-col gap-1 text-center">
          <h1 className="text-xl font-bold">Паспортные данные</h1>
          <FieldDescription>
            ID-карта Узбекистана: front + back. После загрузки фото можно
            заменить кнопкой «Заменить».
          </FieldDescription>
        </div>

        <Field>
          <FieldLabel htmlFor="firstName">First name</FieldLabel>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Имя"
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="lastName">Last name</FieldLabel>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Фамилия"
            required
          />
        </Field>

        <UploadCard
          label="Passport front (лицевая)"
          hint="Загрузить лицевую сторону"
          previewUrl={preview.front}
          fileName={frontFile?.name}
          inputRef={frontRef}
          onPick={(f) => onPick("front", f)}
        />

        <UploadCard
          label="Passport back (оборот / MRZ)"
          hint="Загрузить оборотную сторону"
          previewUrl={preview.back}
          fileName={backFile?.name}
          inputRef={backRef}
          onPick={(f) => onPick("back", f)}
        />

        <Field>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Проверка…" : "Сохранить и продолжить"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
