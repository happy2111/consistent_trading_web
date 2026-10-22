"use client";

import * as React from "react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import {
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  IdCard,
  LogOut,
  Mail,
  Moon,
  Percent,
  Save,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sun,
  TrendingDown,
  TrendingUp,
  User as UserIcon,
  XCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchUserProfile,
  updateUserProfile,
  fetchOverallStatistics,
  UserProfile,
} from "@/lib/api";
import { PageHeader } from "@/components/page-header";

interface ProfileClientProps {
  userId: string;
  role: "ADMIN" | "USER";
}

export function ProfileClient({ userId, role }: ProfileClientProps) {
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();

  // 1. Fetch user data
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["userProfile", userId],
    queryFn: () => fetchUserProfile(userId),
    enabled: Boolean(userId),
  });

  // 2. Fetch all-time trader statistics (unique to this user)
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["overallStatistics", userId],
    queryFn: () => fetchOverallStatistics(userId),
    enabled: Boolean(userId),
  });

  // Edit modal state
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editFirstName, setEditFirstName] = React.useState("");
  const [editLastName, setEditLastName] = React.useState("");
  const [editUsername, setEditUsername] = React.useState("");

  React.useEffect(() => {
    if (user) {
      setEditFirstName(user.firstName || "");
      setEditLastName(user.lastName || "");
      setEditUsername(user.username || "");
    }
  }, [user]);

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: (data: { firstName?: string; lastName?: string; username?: string }) =>
      updateUserProfile(userId, data),
    onSuccess: (updated) => {
      toast.success("Profil muvaffaqiyatli yangilandi!");
      queryClient.setQueryData(["userProfile", userId], updated);
      setIsEditOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Profilni yangilashda xatolik yuz berdi");
    },
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      firstName: editFirstName,
      lastName: editLastName,
      username: editUsername,
    });
  };

  const fullName =
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
    user?.username ||
    "Trader";

  const initials = fullName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "TR";

  return (
    <div className="space-y-6 pb-12">
      <PageHeader title="Mening Profilim" />

      {/* Main Profile Header Card */}
      <Card className="overflow-hidden border border-border/80 shadow-xs">
        <div className="h-24 sm:h-32 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 relative" />
        <CardContent className="relative pt-0 sm:pt-0 pb-6 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between -mt-12 sm:-mt-16 gap-4 mb-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
              <Avatar className="size-24 sm:size-28 border-4 border-background shadow-md">
                {user?.image ? (
                  <AvatarImage src={user.image} alt={fullName} />
                ) : null}
                <AvatarFallback className="bg-gradient-to-tr from-purple-600 to-indigo-600 text-2xl font-bold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-1">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                    {userLoading ? <Skeleton className="h-7 w-40" /> : fullName}
                  </h2>
                  <Badge
                    variant="secondary"
                    className={
                      role === "ADMIN"
                        ? "bg-purple-500/15 text-purple-600 font-bold border-purple-500/20"
                        : "bg-emerald-500/15 text-emerald-600 font-bold border-emerald-500/20"
                    }
                  >
                    {role === "ADMIN" ? "Admin" : "Trader"}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-muted-foreground">
                  {user?.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="size-3.5" />
                      {user.email}
                    </span>
                  )}
                  {user?.telegramId && (
                    <span className="flex items-center gap-1 font-mono">
                      <Send className="size-3.5 text-sky-500" />
                      TG: {String(user.telegramId)}
                    </span>
                  )}
                  {user?.createdAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3.5" />
                      A&apos;zo: {format(new Date(user.createdAt), "dd.MM.yyyy")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditOpen(true)}
              className="gap-1.5 text-xs shadow-xs"
            >
              <Edit3 className="size-3.5" />
              Tahrirlash
            </Button>
          </div>

          <Separator className="my-4" />

          {/* Verification Status Banner */}
          <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-3 sm:p-4">
            <div className="flex items-center gap-3">
              {user?.verified ? (
                <div className="rounded-full bg-emerald-500/15 p-2 text-emerald-600">
                  <ShieldCheck className="size-5" />
                </div>
              ) : (
                <div className="rounded-full bg-amber-500/15 p-2 text-amber-600">
                  <ShieldAlert className="size-5" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {user?.verified
                    ? "Shaxsiy hisob to'liq tasdiqlangan (Verified)"
                    : "Shaxs tasdiqlanmagan"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user?.verified
                    ? "Pasport ma'lumotlari muvaffaqiyatli tekshirildi"
                    : "Onboarding orqali pasport ma'lumotlarini tasdiqlang"}
                </p>
              </div>
            </div>

            <Badge
              variant="outline"
              className={
                user?.verified
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-600 border-amber-500/30"
              }
            >
              {user?.verified ? "Tasdiqlangan" : "Kutilmoqda"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Trader Personal Statistics Card */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Award className="size-5 text-emerald-500" />
                Shaxsiy Savdo Statistikasi (Performance)
              </CardTitle>
              <CardDescription className="text-xs">
                Sizning barcha topshirilgan checkoutlaringiz asosidagi umumiy natijalar
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              {stats?.totalDays ?? 0} ta kun
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {/* Win Rate */}
              <div className="rounded-xl border bg-card p-3 sm:p-4 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                  <span>Win Rate</span>
                  <Percent className="size-3.5 text-emerald-500" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-foreground">
                  {stats?.winRate ?? 0}%
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {stats?.winCount ?? 0} g&apos;alaba / {stats?.stopLossCount ?? 0} stop
                </p>
              </div>

              {/* Net PnL (Umumiy hisob) */}
              <div className="rounded-xl border bg-card p-3 sm:p-4 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                  <span>Sof Foyda (Net PnL)</span>
                  {(stats?.umumiyHisob ?? 0) >= 0 ? (
                    <TrendingUp className="size-3.5 text-emerald-500" />
                  ) : (
                    <TrendingDown className="size-3.5 text-rose-500" />
                  )}
                </div>
                <div
                  className={`text-xl sm:text-2xl font-black ${
                    (stats?.umumiyHisob ?? 0) >= 0
                      ? "text-emerald-500"
                      : "text-rose-500"
                  }`}
                >
                  {(stats?.umumiyHisob ?? 0) >= 0 ? "+" : ""}$
                  {stats?.umumiyHisob ?? 0}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  +{stats?.umumiyFoyda ?? 0} / -{stats?.umumiyZarar ?? 0}
                </p>
              </div>

              {/* Savdo kunlari */}
              <div className="rounded-xl border bg-card p-3 sm:p-4 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                  <span>Faol Kunlar</span>
                  <Clock className="size-3.5 text-purple-500" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-foreground">
                  {stats?.totalDays ?? 0} kun
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {stats?.breakevenCount ?? 0} ta breakeven kun
                </p>
              </div>

              {/* Risk buzilishi */}
              <div className="rounded-xl border bg-card p-3 sm:p-4 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                  <span>Risk Limit Buzilishi</span>
                  <ShieldAlert className="size-3.5 text-rose-500" />
                </div>
                <div
                  className={`text-xl sm:text-2xl font-black ${
                    (stats?.riskViolations ?? 0) > 0
                      ? "text-rose-500"
                      : "text-emerald-500"
                  }`}
                >
                  {stats?.riskViolations ?? 0} marta
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {(stats?.riskViolations ?? 0) === 0
                    ? "Intizom a'lo darajada"
                    : "Limitdan oshgan kunlar"}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Details & Passport Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <IdCard className="size-4 text-purple-600" />
              Pasport va Shaxs Ma&apos;lumotlari
            </CardTitle>
            <CardDescription className="text-xs">
              Verifikatsiyadan o&apos;tgan shaxsiy identifikatorlar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Ism va Familiya:</span>
              <span className="font-semibold text-foreground">{fullName}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Username:</span>
              <span className="font-semibold text-foreground font-mono">
                {user?.username ? `@${user.username}` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Hujjat raqami:</span>
              <span className="font-semibold text-foreground font-mono">
                {user?.documentNumber || "—"}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">JSHSHIR (PINFL):</span>
              <span className="font-semibold text-foreground font-mono">
                {user?.jshshir || "—"}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-muted-foreground">Tizimdagi ID:</span>
              <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[200px]">
                {user?.id}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Settings & Preferences Card */}
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sun className="size-4 text-amber-500" />
              Sozlamalar va Tizim
            </CardTitle>
            <CardDescription className="text-xs">
              Mavzu tanlash, bildirishnomalar va chiqish
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-3">
              <div className="flex items-center gap-2.5">
                {theme === "dark" ? (
                  <Moon className="size-4 text-purple-400" />
                ) : (
                  <Sun className="size-4 text-amber-500" />
                )}
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Mavzu: {theme === "dark" ? "Qorong'i (Dark)" : "Yorug' (Light)"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Interfeys ko&apos;rinishini almashtirish
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="h-7 text-xs font-bold"
              >
                {theme === "dark" ? "Light ga o'tish" : "Dark ga o'tish"}
              </Button>
            </div>

            {/* Telegram Bot Link */}
            <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-3">
              <div className="flex items-center gap-2.5">
                <Send className="size-4 text-sky-500" />
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Telegram Bot
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Kunlik eslatmalar va kechki checkout
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                render={
                  <a
                    href="https://t.me/ConsistentTradingBot"
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
                className="h-7 text-xs gap-1"
              >
                Botga o&apos;tish <ExternalLink className="size-3" />
              </Button>
            </div>

            {/* Logout Button */}
            <div className="pt-2">
              <Button
                type="button"
                variant="destructive"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full h-9 gap-2 text-xs font-semibold"
              >
                <LogOut className="size-4" />
                Tizimdan chiqish (Log out)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Edit3 className="size-4 text-emerald-600" />
              Profil ma&apos;lumotlarini tahrirlash
            </DialogTitle>
            <DialogDescription className="text-xs">
              Ism, familiya va username ma&apos;lumotlaringizni yangilang
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProfile} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="editFirstName" className="text-xs">
                Ism
              </Label>
              <Input
                id="editFirstName"
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
                placeholder="Masalan: Sardor"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editLastName" className="text-xs">
                Familiya
              </Label>
              <Input
                id="editLastName"
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
                placeholder="Masalan: Karimov"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editUsername" className="text-xs">
                Username (@)
              </Label>
              <Input
                id="editUsername"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                placeholder="Masalan: sardor_trader"
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(false)}
                className="h-8 text-xs"
              >
                Bekor qilish
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={updateMutation.isPending}
                className="h-8 gap-1.5 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
              >
                <Save className="size-3.5" />
                {updateMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
