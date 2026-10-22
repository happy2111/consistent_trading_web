"use client";

import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Image as ImageIcon,
  KeyRound,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import {
  AdminUser,
  adminCreateUser,
  adminDeleteUser,
  adminToggleVerification,
  adminUpdateRole,
  adminUpdateUser,
  fetchAdminUsers,
} from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface AdminUsersClientProps {
  currentAdminId: string;
}

export function AdminUsersClient({ currentAdminId }: AdminUsersClientProps) {
  const queryClient = useQueryClient();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<"ALL" | "ADMIN" | "USER">("ALL");
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | "VERIFIED" | "PENDING">("ALL");

  // Profile View Sheet state
  const [selectedUserForProfile, setSelectedUserForProfile] = React.useState<AdminUser | null>(null);
  const [isProfileSheetOpen, setIsProfileSheetOpen] = React.useState(false);

  // Create / Edit User Dialog state
  const [isFormDialogOpen, setIsFormDialogOpen] = React.useState(false);
  const [formMode, setFormMode] = React.useState<"CREATE" | "EDIT">("CREATE");
  const [selectedUserForEdit, setSelectedUserForEdit] = React.useState<AdminUser | null>(null);

  // Form Fields
  const [formFirstName, setFormFirstName] = React.useState("");
  const [formLastName, setFormLastName] = React.useState("");
  const [formUsername, setFormUsername] = React.useState("");
  const [formEmail, setFormEmail] = React.useState("");
  const [formTelegramId, setFormTelegramId] = React.useState("");
  const [formRole, setFormRole] = React.useState<"ADMIN" | "USER">("USER");
  const [formVerified, setFormVerified] = React.useState(false);

  // Delete Confirm Dialog state
  const [userToDelete, setUserToDelete] = React.useState<AdminUser | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  // Image lightbox state (for passport inspection)
  const [previewImage, setPreviewImage] = React.useState<{ url: string; title: string } | null>(null);

  // 1. Fetch Users Query
  const {
    data: users = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<AdminUser[]>({
    queryKey: ["adminUsers"],
    queryFn: fetchAdminUsers,
    staleTime: 1000 * 30,
  });

  // 2. Toggle Verification Mutation
  const toggleVerificationMutation = useMutation({
    mutationFn: ({ id, verified }: { id: string; verified: boolean }) =>
      adminToggleVerification(id, verified),
    onMutate: async ({ id, verified }) => {
      await queryClient.cancelQueries({ queryKey: ["adminUsers"] });
      const previousUsers = queryClient.getQueryData<AdminUser[]>(["adminUsers"]);

      queryClient.setQueryData<AdminUser[]>(["adminUsers"], (old) =>
        (old || []).map((u) => (u.id === id ? { ...u, verified } : u)),
      );

      if (selectedUserForProfile?.id === id) {
        setSelectedUserForProfile((prev) => (prev ? { ...prev, verified } : null));
      }

      return { previousUsers };
    },
    onError: (err, variables, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(["adminUsers"], context.previousUsers);
      }
      toast.error("Holatni o'zgartirishda xatolik yuz berdi");
    },
    onSuccess: (data) => {
      toast.success(
        data.verified
          ? `${data.firstName || data.username || "Foydalanuvchi"} tasdiqlandi (Verified)`
          : "Foydalanuvchi tasdiqlanmagan holatga o'tkazildi",
      );
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    },
  });

  // 3. Update Role Mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: "ADMIN" | "USER" }) =>
      adminUpdateRole(id, role),
    onMutate: async ({ id, role }) => {
      await queryClient.cancelQueries({ queryKey: ["adminUsers"] });
      const previousUsers = queryClient.getQueryData<AdminUser[]>(["adminUsers"]);

      queryClient.setQueryData<AdminUser[]>(["adminUsers"], (old) =>
        (old || []).map((u) => (u.id === id ? { ...u, role } : u)),
      );

      if (selectedUserForProfile?.id === id) {
        setSelectedUserForProfile((prev) => (prev ? { ...prev, role } : null));
      }

      return { previousUsers };
    },
    onError: (err, variables, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(["adminUsers"], context.previousUsers);
      }
      toast.error("Rolni o'zgartirishda xatolik yuz berdi");
    },
    onSuccess: (data) => {
      toast.success(`Foydalanuvchi roli ${data.role} ga yangilandi`);
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    },
  });

  // 4. Create User Mutation
  const createUserMutation = useMutation({
    mutationFn: adminCreateUser,
    onSuccess: () => {
      toast.success("Yangi foydalanuvchi muvaffaqiyatli yaratildi");
      setIsFormDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Foydalanuvchi yaratishda xatolik yuz berdi",
      );
    },
  });

  // 5. Update User Mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      adminUpdateUser(id, payload),
    onSuccess: (data) => {
      toast.success("Foydalanuvchi ma'lumotlari yangilandi");
      setIsFormDialogOpen(false);
      if (selectedUserForProfile?.id === data.id) {
        setSelectedUserForProfile(data);
      }
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Ma'lumotlarni saqlashda xatolik yuz berdi",
      );
    },
  });

  // 6. Delete User Mutation
  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => adminDeleteUser(id),
    onSuccess: (_, deletedId) => {
      toast.success("Foydalanuvchi muvaffaqiyatli o'chirildi");
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      if (selectedUserForProfile?.id === deletedId) {
        setIsProfileSheetOpen(false);
        setSelectedUserForProfile(null);
      }
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Foydalanuvchini o'chirishda xatolik yuz berdi",
      );
    },
  });

  const resetForm = () => {
    setFormFirstName("");
    setFormLastName("");
    setFormUsername("");
    setFormEmail("");
    setFormTelegramId("");
    setFormRole("USER");
    setFormVerified(false);
    setSelectedUserForEdit(null);
  };

  const handleOpenCreateDialog = () => {
    resetForm();
    setFormMode("CREATE");
    setIsFormDialogOpen(true);
  };

  const handleOpenEditDialog = (user: AdminUser) => {
    setSelectedUserForEdit(user);
    setFormFirstName(user.firstName || "");
    setFormLastName(user.lastName || "");
    setFormUsername(user.username || "");
    setFormEmail(user.email || "");
    setFormTelegramId(user.telegramId ? String(user.telegramId) : "");
    setFormRole(user.role);
    setFormVerified(user.verified);
    setFormMode("EDIT");
    setIsFormDialogOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      firstName: formFirstName.trim() || undefined,
      lastName: formLastName.trim() || undefined,
      username: formUsername.trim() || undefined,
      email: formEmail.trim() || undefined,
      telegramId: formTelegramId.trim() || undefined,
      role: formRole,
      verified: formVerified,
    };

    if (formMode === "CREATE") {
      createUserMutation.mutate(payload);
    } else if (selectedUserForEdit) {
      updateUserMutation.mutate({
        id: selectedUserForEdit.id,
        payload,
      });
    }
  };

  const handleOpenProfileSheet = (user: AdminUser) => {
    setSelectedUserForProfile(user);
    setIsProfileSheetOpen(true);
  };

  // Filtered Users List
  const filteredUsers = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return users.filter((u) => {
      // Role filter
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false;

      // Status filter
      if (statusFilter === "VERIFIED" && !u.verified) return false;
      if (statusFilter === "PENDING" && u.verified) return false;

      // Search query filter
      if (!q) return true;
      const fullName = `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase();
      const username = (u.username || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const tgId = u.telegramId ? String(u.telegramId) : "";
      const docNum = (u.documentNumber || "").toLowerCase();
      const jshshir = (u.jshshir || "").toLowerCase();

      return (
        fullName.includes(q) ||
        username.includes(q) ||
        email.includes(q) ||
        tgId.includes(q) ||
        docNum.includes(q) ||
        jshshir.includes(q)
      );
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Statistics counters
  const totalCount = users.length;
  const verifiedCount = users.filter((u) => u.verified).length;
  const pendingCount = users.filter((u) => !u.verified).length;
  const adminCount = users.filter((u) => u.role === "ADMIN").length;

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="size-6 text-amber-500" />
            Foydalanuvchilar boshqaruvi
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Ro&apos;yxatdan o&apos;tgan treyderlarni ko&apos;rish, verifikatsiyadan o&apos;tkazish va tahrirlash
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="gap-1.5 text-xs h-9"
          >
            <RefreshCw className={`size-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            Yangilash
          </Button>

          <Button
            onClick={handleOpenCreateDialog}
            size="sm"
            className="gap-1.5 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            <Plus className="size-4" />
            Yangi foydalanuvchi
          </Button>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3.5 sm:p-4 rounded-xl border border-border/60 bg-card/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Jami Treyderlar</span>
            <Users className="size-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold mt-1 text-foreground">{totalCount}</div>
        </Card>

        <Card className="p-3.5 sm:p-4 rounded-xl border border-border/60 bg-card/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-500 uppercase">Tasdiqlangan</span>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold mt-1 text-emerald-500">{verifiedCount}</div>
        </Card>

        <Card className="p-3.5 sm:p-4 rounded-xl border border-border/60 bg-card/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-500 uppercase">Kutilmoqda</span>
            <Clock className="size-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold mt-1 text-amber-500">{pendingCount}</div>
        </Card>

        <Card className="p-3.5 sm:p-4 rounded-xl border border-border/60 bg-card/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-500 uppercase">Administratorlar</span>
            <Shield className="size-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold mt-1 text-purple-500">{adminCount}</div>
        </Card>
      </div>

      {/* Search & Filter Toolbar */}
      <Card className="p-3 sm:p-4 rounded-2xl border border-border/60 bg-card/60 shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Ism, username, email, telegram ID bo'yicha qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs sm:text-sm bg-background/80"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Role Filter */}
            <Select
              value={roleFilter}
              onValueChange={(val: any) => setRoleFilter(val)}
            >
              <SelectTrigger className="w-36 h-9 text-xs font-medium bg-background/80">
                <SelectValue placeholder="Rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">Barcha rollar</SelectItem>
                <SelectItem value="USER" className="text-xs">Faqat USER</SelectItem>
                <SelectItem value="ADMIN" className="text-xs">Faqat ADMIN</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(val: any) => setStatusFilter(val)}
            >
              <SelectTrigger className="w-40 h-9 text-xs font-medium bg-background/80">
                <SelectValue placeholder="Holat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">Barcha holatlar</SelectItem>
                <SelectItem value="VERIFIED" className="text-xs">Tasdiqlangan</SelectItem>
                <SelectItem value="PENDING" className="text-xs">Kutilmoqda</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Users Table Card */}
      <Card className="rounded-2xl border border-border/60 bg-card/60 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[280px] text-xs">Foydalanuvchi</TableHead>
                <TableHead className="text-xs">Aloqa / ID</TableHead>
                <TableHead className="text-xs w-[130px]">Rol</TableHead>
                <TableHead className="text-xs w-[170px]">Verifikatsiya</TableHead>
                <TableHead className="text-xs hidden md:table-cell w-[130px]">Sana</TableHead>
                <TableHead className="text-right text-xs w-[120px]">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(6)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6} className="h-14 animate-pulse">
                      <div className="h-5 bg-muted/40 rounded w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Users className="size-8 stroke-1 text-muted-foreground/60" />
                      <p className="text-sm font-medium">Foydalanuvchilar topilmadi</p>
                      {searchQuery && (
                        <p className="text-xs text-muted-foreground">
                          Qidiruv so&apos;rovini o&apos;zgartirib ko&apos;ring
                        </p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  const fullName =
                    `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
                    user.username ||
                    "Noma'lum";

                  const isCurrentUser = user.id === currentAdminId;

                  return (
                    <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                      {/* 1. User Name & Avatar */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9 rounded-full border border-border/60">
                            {user.image && <AvatarImage src={user.image} alt={fullName} />}
                            <AvatarFallback className="bg-gradient-to-tr from-purple-600 to-indigo-600 text-xs font-bold text-white">
                              {fullName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => handleOpenProfileSheet(user)}
                              className="font-semibold text-xs sm:text-sm text-foreground hover:text-primary hover:underline text-left truncate block max-w-[200px]"
                              title={fullName}
                            >
                              {fullName}
                            </button>
                            <span className="text-[11px] text-muted-foreground block truncate">
                              {user.username ? `@${user.username}` : user.email || "Username yo'q"}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* 2. Contact & IDs */}
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          {user.email && (
                            <div className="text-muted-foreground truncate max-w-[180px]">
                              {user.email}
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {user.telegramId && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-blue-500/10 text-blue-500 border-blue-500/30">
                                TG: {String(user.telegramId)}
                              </Badge>
                            )}
                            {user.googleId && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-red-500/10 text-red-500 border-red-500/30">
                                Google
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* 3. Role */}
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(newRole) => {
                            if (newRole) {
                              updateRoleMutation.mutate({
                                id: user.id,
                                role: newRole as "ADMIN" | "USER",
                              });
                            }
                          }}
                          disabled={isCurrentUser}
                        >
                          <SelectTrigger className="h-7 text-[11px] font-semibold w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USER" className="text-xs">USER</SelectItem>
                            <SelectItem value="ADMIN" className="text-xs text-purple-600 font-bold">ADMIN</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* 4. Verification Toggle */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={user.verified}
                            onCheckedChange={(checked) =>
                              toggleVerificationMutation.mutate({
                                id: user.id,
                                verified: Boolean(checked),
                              })
                            }
                            title={user.verified ? "Tasdiqlangan" : "Tasdiqlanmagan"}
                          />
                          <Badge
                            variant={user.verified ? "default" : "outline"}
                            className={`text-[10px] py-0.5 px-2 font-semibold ${
                              user.verified
                                ? "bg-emerald-600 text-white hover:bg-emerald-600"
                                : "text-amber-500 border-amber-500/30"
                            }`}
                          >
                            {user.verified ? "Tasdiqlangan" : "Kutilmoqda"}
                          </Badge>
                        </div>
                      </TableCell>

                      {/* 5. Date */}
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {user.createdAt ? format(new Date(user.createdAt), "dd.MM.yyyy") : "—"}
                      </TableCell>

                      {/* 6. Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenProfileSheet(user)}
                            className="size-8 text-muted-foreground hover:text-foreground"
                            title="Profilni ko'rish (View Profile)"
                          >
                            <Eye className="size-4" />
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 text-muted-foreground hover:text-foreground"
                                >
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              }
                            />
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel className="text-xs">Amallar</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => handleOpenProfileSheet(user)}
                                className="text-xs gap-2 cursor-pointer"
                              >
                                <Eye className="size-3.5 text-blue-500" />
                                <span>Tezkor ko&apos;rish (Drawer)</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                render={<Link href={`/profile?userId=${user.id}`} />}
                                className="text-xs gap-2 cursor-pointer"
                              >
                                <ExternalLink className="size-3.5 text-indigo-500" />
                                <span>Profil sahifasiga o&apos;tish</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => handleOpenEditDialog(user)}
                                className="text-xs gap-2 cursor-pointer"
                              >
                                <Pencil className="size-3.5 text-amber-500" />
                                <span>Tahrirlash</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() =>
                                  toggleVerificationMutation.mutate({
                                    id: user.id,
                                    verified: !user.verified,
                                  })
                                }
                                className="text-xs gap-2 cursor-pointer"
                              >
                                <UserCheck className="size-3.5 text-emerald-500" />
                                <span>{user.verified ? "Tasdiqni bekor qilish" : "Tasdiqlash"}</span>
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => {
                                  setUserToDelete(user);
                                  setIsDeleteDialogOpen(true);
                                }}
                                disabled={isCurrentUser}
                                className="text-xs gap-2 cursor-pointer text-rose-500 focus:bg-rose-500/10 focus:text-rose-600"
                              >
                                <Trash2 className="size-3.5" />
                                <span>O&apos;chirish</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* =========================================================================
          PROFILE & DOCUMENTS DETAILS SHEET (DRAWER)
         ========================================================================= */}
      <Sheet open={isProfileSheetOpen} onOpenChange={setIsProfileSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-background">
          {selectedUserForProfile && (
            <>
              <SheetHeader className="p-5 border-b border-border/60 bg-muted/20">
                <div className="flex items-center gap-3">
                  <Avatar className="size-14 rounded-2xl border border-border">
                    {selectedUserForProfile.image && (
                      <AvatarImage
                        src={selectedUserForProfile.image}
                        alt={selectedUserForProfile.firstName || "User"}
                      />
                    )}
                    <AvatarFallback className="bg-gradient-to-tr from-purple-600 to-indigo-600 text-lg font-bold text-white rounded-2xl">
                      {(selectedUserForProfile.firstName || "U").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <SheetTitle className="text-base font-bold truncate">
                      {`${selectedUserForProfile.firstName || ""} ${selectedUserForProfile.lastName || ""}`.trim() ||
                        selectedUserForProfile.username ||
                        "Foydalanuvchi"}
                    </SheetTitle>
                    <SheetDescription className="text-xs truncate">
                      {selectedUserForProfile.email || `@${selectedUserForProfile.username || "treyder"}`}
                    </SheetDescription>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge
                        variant={selectedUserForProfile.verified ? "default" : "outline"}
                        className={`text-[10px] py-0 px-2 font-semibold ${
                          selectedUserForProfile.verified
                            ? "bg-emerald-600 text-white"
                            : "text-amber-500 border-amber-500/40"
                        }`}
                      >
                        {selectedUserForProfile.verified ? "Tasdiqlangan" : "Kutilmoqda"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                        {selectedUserForProfile.role}
                      </Badge>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              {/* Sheet Body Scrollable */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Quick Toggle Controls */}
                <div className="rounded-xl border border-border/60 bg-card p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-foreground">Verifikatsiya holati</div>
                      <div className="text-[11px] text-muted-foreground">
                        Foydalanuvchiga to&apos;liq kirish huquqini berish
                      </div>
                    </div>
                    <Switch
                      checked={selectedUserForProfile.verified}
                      onCheckedChange={(checked) =>
                        toggleVerificationMutation.mutate({
                          id: selectedUserForProfile.id,
                          verified: Boolean(checked),
                        })
                      }
                    />
                  </div>

                  <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-foreground">Foydalanuvchi roli</div>
                      <div className="text-[11px] text-muted-foreground">ADMIN yoki USER huquqi</div>
                    </div>
                    <Select
                      value={selectedUserForProfile.role}
                      onValueChange={(newRole) => {
                        if (newRole) {
                          updateRoleMutation.mutate({
                            id: selectedUserForProfile.id,
                            role: newRole as "ADMIN" | "USER",
                          });
                        }
                      }}
                      disabled={selectedUserForProfile.id === currentAdminId}
                    >
                      <SelectTrigger className="h-8 w-28 text-xs font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USER" className="text-xs">USER</SelectItem>
                        <SelectItem value="ADMIN" className="text-xs text-purple-600 font-bold">ADMIN</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Account Details */}
                <div className="rounded-xl border border-border/60 bg-card p-3.5 space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <FileText className="size-3.5" />
                    Asosiy Ma&apos;lumotlar
                  </h4>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground text-[11px]">ID:</span>
                      <p className="font-mono text-[10px] truncate text-foreground" title={selectedUserForProfile.id}>
                        {selectedUserForProfile.id}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[11px]">Telegram ID:</span>
                      <p className="font-semibold text-foreground">
                        {selectedUserForProfile.telegramId ? String(selectedUserForProfile.telegramId) : "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[11px]">Email:</span>
                      <p className="font-medium text-foreground truncate" title={selectedUserForProfile.email || ""}>
                        {selectedUserForProfile.email || "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[11px]">Username:</span>
                      <p className="font-medium text-foreground">
                        {selectedUserForProfile.username ? `@${selectedUserForProfile.username}` : "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[11px]">JSHSHIR (PINFL):</span>
                      <p className="font-mono text-foreground">{selectedUserForProfile.jshshir || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[11px]">Pasport Seriya:</span>
                      <p className="font-mono text-foreground">{selectedUserForProfile.documentNumber || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Passport Documents Verification */}
                <div className="rounded-xl border border-border/60 bg-card p-3.5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <ImageIcon className="size-3.5" />
                    Pasport rasmlari (Verification Documents)
                  </h4>

                  {selectedUserForProfile.passportFrontUrl || selectedUserForProfile.passportBackUrl ? (
                    <div className="grid grid-cols-2 gap-3">
                      {/* Front Photo */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-medium text-muted-foreground">Old tomoni (Front)</span>
                        {selectedUserForProfile.passportFrontUrl ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewImage({
                                url: selectedUserForProfile.passportFrontUrl!,
                                title: "Pasport Old Tomoni",
                              })
                            }
                            className="relative aspect-video w-full rounded-lg border border-border overflow-hidden bg-black/40 hover:opacity-90 transition-opacity group"
                          >
                            <img
                              src={selectedUserForProfile.passportFrontUrl}
                              alt="Passport Front"
                              className="size-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="size-5 text-white" />
                            </div>
                          </button>
                        ) : (
                          <div className="aspect-video w-full rounded-lg border border-dashed border-border/60 flex items-center justify-center text-xs text-muted-foreground">
                            Yuklanmagan
                          </div>
                        )}
                      </div>

                      {/* Back Photo */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-medium text-muted-foreground">Orqa tomoni (Back)</span>
                        {selectedUserForProfile.passportBackUrl ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewImage({
                                url: selectedUserForProfile.passportBackUrl!,
                                title: "Pasport Orqa Tomoni",
                              })
                            }
                            className="relative aspect-video w-full rounded-lg border border-border overflow-hidden bg-black/40 hover:opacity-90 transition-opacity group"
                          >
                            <img
                              src={selectedUserForProfile.passportBackUrl}
                              alt="Passport Back"
                              className="size-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="size-5 text-white" />
                            </div>
                          </button>
                        ) : (
                          <div className="aspect-video w-full rounded-lg border border-dashed border-border/60 flex items-center justify-center text-xs text-muted-foreground">
                            Yuklanmagan
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg bg-muted/20 border border-dashed border-border text-center text-xs text-muted-foreground">
                      Foydalanuvchi pasport rasmlarini hali yuklamagan
                    </div>
                  )}
                </div>

                {/* Action buttons inside drawer */}
                <div className="space-y-2 pt-2">
                  <Link
                    href={`/profile?userId=${selectedUserForProfile.id}`}
                    className="inline-flex items-center justify-center gap-1.5 w-full rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs h-9 transition-colors shadow-xs"
                  >
                    <ExternalLink className="size-3.5" />
                    Profil sahifasi va savdo statistikasi
                  </Link>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => {
                        handleOpenEditDialog(selectedUserForProfile);
                        setIsProfileSheetOpen(false);
                      }}
                      variant="outline"
                      className="flex-1 text-xs gap-1.5"
                    >
                      <Pencil className="size-3.5" />
                      Tahrirlash
                    </Button>

                    <Button
                      onClick={() => {
                        setUserToDelete(selectedUserForProfile);
                        setIsDeleteDialogOpen(true);
                        setIsProfileSheetOpen(false);
                      }}
                      disabled={selectedUserForProfile.id === currentAdminId}
                      variant="destructive"
                      className="flex-1 text-xs gap-1.5"
                    >
                      <Trash2 className="size-3.5" />
                      O&apos;chirish
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* =========================================================================
          CREATE / EDIT USER DIALOG
         ========================================================================= */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {formMode === "CREATE" ? "Yangi foydalanuvchi qo'shish" : "Foydalanuvchini tahrirlash"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Treyder ma&apos;lumotlarini to&apos;ldiring va saqlang
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitForm} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Ism (First Name)</Label>
                <Input
                  value={formFirstName}
                  onChange={(e) => setFormFirstName(e.target.value)}
                  placeholder="Ali"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Familiya (Last Name)</Label>
                <Input
                  value={formLastName}
                  onChange={(e) => setFormLastName(e.target.value)}
                  placeholder="Valiyev"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Username</Label>
                <Input
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="alitrader"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Telegram ID</Label>
                <Input
                  value={formTelegramId}
                  onChange={(e) => setFormTelegramId(e.target.value)}
                  placeholder="123456789"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="ali@example.com"
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <Label className="text-xs">Rol</Label>
                <Select
                  value={formRole}
                  onValueChange={(val: any) => setFormRole(val)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER" className="text-xs">USER</SelectItem>
                    <SelectItem value="ADMIN" className="text-xs text-purple-600 font-bold">ADMIN</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Tasdiqlash (Verified)</Label>
                <div className="flex items-center gap-2 h-8">
                  <Switch
                    checked={formVerified}
                    onCheckedChange={(c) => setFormVerified(Boolean(c))}
                  />
                  <span className="text-xs font-medium text-muted-foreground">
                    {formVerified ? "Tasdiqlangan" : "Kutilmoqda"}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsFormDialogOpen(false)}
                className="text-xs"
              >
                Bekor qilish
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createUserMutation.isPending || updateUserMutation.isPending}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {formMode === "CREATE" ? "Yaratish" : "Saqlash"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          DELETE CONFIRM DIALOG
         ========================================================================= */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-500">
              <ShieldAlert className="size-5" />
              Foydalanuvchini o&apos;chirish
            </DialogTitle>
            <DialogDescription className="text-xs">
              Haqiqatan ham ushbu foydalanuvchini va uning barcha hisobotlarini butunlay o&apos;chirib tashlamoqchimisiz?
              {userToDelete && (
                <span className="font-semibold block text-foreground mt-2">
                  {userToDelete.firstName || userToDelete.username || userToDelete.id}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="text-xs"
            >
              Bekor qilish
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={deleteUserMutation.isPending}
              onClick={() => userToDelete && deleteUserMutation.mutate(userToDelete.id)}
              className="text-xs"
            >
              O&apos;chirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          PASSPORT IMAGE LIGHTBOX MODAL
         ========================================================================= */}
      {previewImage && (
        <Dialog open={Boolean(previewImage)} onOpenChange={() => setPreviewImage(null)}>
          <DialogContent className="sm:max-w-3xl p-3 bg-black/95 border-border">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-sm font-semibold text-white">
                {previewImage.title}
              </DialogTitle>
            </DialogHeader>
            <div className="relative max-h-[80vh] overflow-hidden flex items-center justify-center">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[75vh] w-auto object-contain rounded-lg"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
