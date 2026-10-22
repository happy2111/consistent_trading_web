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
  Layers,
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchUserProfile,
  updateUserProfile,
  fetchOverallStatistics,
  fetchTaskTemplates,
  fetchReportHistory,
} from "@/lib/api";
import { groupTemplatesIntoPlans } from "@/lib/plan-utils";
import { PlanBalanceChart } from "@/components/dashboard/plan-balance-chart";
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

  // 2. Fetch all-time trader statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["overallStatistics", userId],
    queryFn: () => fetchOverallStatistics(userId),
    enabled: Boolean(userId),
  });

  // 3. Fetch task templates for plan series
  const { data: templates = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: () => fetchTaskTemplates(false),
  });

  const plans = React.useMemo(() => {
    return groupTemplatesIntoPlans(templates);
  }, [templates]);

  // Selected plan state for Balans Dinamikasi
  const [selectedPlanId, setSelectedPlanId] = React.useState<string>("");

  React.useEffect(() => {
    if (plans.length > 0 && !selectedPlanId) {
      const currentPlan = plans.find((p) => p.isCurrent) || plans[0];
      setSelectedPlanId(currentPlan.id);
    } else if (plans.length > 0 && !plans.some((p) => p.id === selectedPlanId)) {
      setSelectedPlanId(plans[0].id);
    }
  }, [plans, selectedPlanId]);

  const selectedPlan = React.useMemo(() => {
    return plans.find((p) => p.id === selectedPlanId) || plans[0] || null;
  }, [plans, selectedPlanId]);

  // 4. Fetch user's reports history for Balans Dinamikasi
  const { data: reports = [] } = useQuery({
    queryKey: ["history", userId],
    queryFn: () => fetchReportHistory(userId),
    enabled: Boolean(userId),
  });

  const planReports = React.useMemo(() => {
    if (!selectedPlan) return reports;
    return reports.filter((r) => {
      const rDate = r.date.split("T")[0];
      return rDate >= selectedPlan.startDate && rDate <= selectedPlan.endDate;
    });
  }, [reports, selectedPlan]);

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

  const initials =
    fullName
      .split(" ")
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "TR";

  return (
    <div className="space-y-6 pb-12">
      <PageHeader title="Mening Profilim" />

      {/* 1. Clean Profile Card (No useless gradient background) */}
      <Card className="border border-border/80 shadow-xs">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
            {/* User Identity */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
              <Avatar className="size-16 sm:size-20 border-2 border-border shadow-xs shrink-0">
                {user?.image ? (
                  <AvatarImage src={user.image} alt={fullName} />
                ) : null}
                <AvatarFallback className="bg-gradient-to-tr from-purple-600 to-indigo-600 text-xl font-bold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-foreground">
                    {userLoading ? <Skeleton className="h-6 w-36" /> : fullName}
                  </h2>

                  {/* Sleek inline verification checkmark */}
                  {user?.verified && (
                    <span
                      title="Tasdiqlangan hisob (Verified)"
                      className="inline-flex items-center text-emerald-500"
                    >
                      <CheckCircle2 className="size-4.5 fill-emerald-500/15" />
                    </span>
                  )}

                  <Badge
                    variant="secondary"
                    className={`text-[10px] uppercase font-bold ${
                      role === "ADMIN"
                        ? "bg-purple-500/15 text-purple-600 border-purple-500/20"
                        : "bg-emerald-500/15 text-emerald-600 border-emerald-500/20"
                    }`}
                  >
                    {role === "ADMIN" ? "Admin" : "Trader"}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {user?.username && (
                    <span className="font-mono text-foreground/80">
                      @{user.username}
                    </span>
                  )}
                  {user?.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="size-3 text-muted-foreground" />
                      {user.email}
                    </span>
                  )}
                  {user?.createdAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3 text-muted-foreground" />
                      A&apos;zo: {format(new Date(user.createdAt), "dd.MM.yyyy")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Compact Action Controls */}
            <div className="flex items-center gap-1.5 shrink-0 self-center sm:self-start">
              {/* Theme toggle icon button */}
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                title={theme === "dark" ? "Yorug' mavzuga o'tish" : "Qorong'i mavzuga o'tish"}
                className="size-8"
              >
                {theme === "dark" ? (
                  <Sun className="size-4 text-amber-500" />
                ) : (
                  <Moon className="size-4 text-purple-500" />
                )}
              </Button>

              {/* Telegram Bot link icon button */}
              <Button
                type="button"
                variant="outline"
                size="icon"
                render={
                  <a
                    href="https://t.me/ConsistentTradingBot"
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
                title="Telegram Botga o'tish"
                className="size-8"
              >
                <Send className="size-4 text-sky-500" />
              </Button>

              {/* Edit Profile button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(true)}
                className="h-8 gap-1.5 text-xs shadow-xs"
              >
                <Edit3 className="size-3.5" />
                Tahrirlash
              </Button>

              {/* Sign out button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="h-8 gap-1 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
              >
                <LogOut className="size-3.5" />
                Chiqish
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Savdo Statistikasi (Performance Metrics - Clean Title, No useless description) */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="pb-3 pt-4 px-4 sm:px-6 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Award className="size-4.5 text-emerald-500" />
            Savdo Statistikasi
          </CardTitle>
          <Badge variant="outline" className="text-xs font-mono">
            {stats?.totalDays ?? 0} kun
          </Badge>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          {statsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-18 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Win Rate */}
              <div className="rounded-xl border bg-card p-3 space-y-1">
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

              {/* Sof Foyda (Net PnL) */}
              <div className="rounded-xl border bg-card p-3 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                  <span>Sof Foyda (Net)</span>
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

              {/* Faol Kunlar */}
              <div className="rounded-xl border bg-card p-3 space-y-1">
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

              {/* Risk Buzilishi */}
              <div className="rounded-xl border bg-card p-3 space-y-1">
                <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                  <span>Risk Intizomi</span>
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
                    ? "Limit buzilmagan"
                    : "Limitdan oshgan kunlar"}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Balans Dinamikasi (Exactly as on Asosiy) */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="pb-2 pt-4 px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <TrendingUp className="size-4.5 text-emerald-500" />
            Balans Dinamikasi
          </CardTitle>

          {/* Plan Selector Dropdown if multiple plans */}
          {plans.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Reja:</span>
              <Select
                value={selectedPlanId}
                onValueChange={(val: any) => setSelectedPlanId(val ? String(val) : "")}
              >
                <SelectTrigger className="h-8 w-[170px] text-xs">
                  <SelectValue placeholder="Rejani tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.title} {p.isCurrent ? "(Hozirgi)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>
        <CardContent className="px-2 sm:px-6 pb-4">
          {selectedPlan ? (
            <PlanBalanceChart plan={selectedPlan} reports={planReports} />
          ) : (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed text-xs text-muted-foreground">
              Reja ma&apos;lumotlari topilmadi
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Pasport va Hujjat Ma'lumotlari (Clean, non-duplicate, no system ID) */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="pb-2 pt-4 px-4 sm:px-6">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <IdCard className="size-4 text-purple-600" />
            Hujjat Ma&apos;lumotlari
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border bg-muted/20 p-3">
              <span className="text-[11px] text-muted-foreground">Hujjat raqami</span>
              <p className="font-mono font-semibold text-sm text-foreground mt-0.5">
                {user?.documentNumber || "—"}
              </p>
            </div>

            <div className="rounded-xl border bg-muted/20 p-3">
              <span className="text-[11px] text-muted-foreground">JSHSHIR (PINFL)</span>
              <p className="font-mono font-semibold text-sm text-foreground mt-0.5">
                {user?.jshshir || "—"}
              </p>
            </div>

            <div className="rounded-xl border bg-muted/20 p-3 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-muted-foreground">Verifikatsiya</span>
                <p className="font-semibold text-sm text-foreground mt-0.5">
                  {user?.verified ? "Tasdiqlangan" : "Kutilmoqda"}
                </p>
              </div>
              {user?.verified ? (
                <ShieldCheck className="size-5 text-emerald-500" />
              ) : (
                <ShieldAlert className="size-5 text-amber-500" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Edit3 className="size-4 text-emerald-600" />
              Profil ma&apos;lumotlarini tahrirlash
            </DialogTitle>
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
                placeholder="Ismingiz"
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
                placeholder="Familiyangiz"
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
                placeholder="masalan: trader_pro"
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
