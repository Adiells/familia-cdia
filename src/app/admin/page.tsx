"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Inbox,
  Loader2,
  Lock,
  LogOut,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/components/layout/cn";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import {
  AdminRequestCard,
  type AdminRequestStatus,
  type AdminSponsorshipRequest,
} from "@/components/admin/AdminRequestCard";
import { getApiBaseUrl } from "@/lib/api";

const ADMIN_TOKEN_STORAGE_KEY = "cdia-admin-token";

type StatusFilter = AdminRequestStatus | "all";

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: "pending", label: "Pendentes" },
  { id: "approved", label: "Aprovadas" },
  { id: "rejected", label: "Rejeitadas" },
  { id: "all", label: "Todas" },
];

function readStoredToken(): string | null {
  try {
    const raw = sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
    return raw && raw.trim() ? raw.trim() : null;
  } catch {
    return null;
  }
}

function writeStoredToken(token: string | null) {
  try {
    if (token) {
      sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota / privacy mode failures.
  }
}

async function readJsonSafe(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const parsed: unknown = await response.json();
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

export default function AdminPage() {
  const [sessionReady, setSessionReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Login form state
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Moderation dashboard state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [requests, setRequests] = useState<AdminSponsorshipRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setToken(readStoredToken());
      setSessionReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleUnauthorized = useCallback((message = "Sessão expirada ou inválida. Entre novamente.") => {
    writeStoredToken(null);
    setToken(null);
    setRequests([]);
    setDashboardError(null);
    setFeedback(null);
    setLoginError(message);
  }, []);

  const loadRequests = useCallback(
    async (authToken: string, status: StatusFilter) => {
      setLoadingRequests(true);
      setDashboardError(null);
      try {
        const apiBase = getApiBaseUrl();
        const response = await fetch(
          `${apiBase}/api/admin/requests?status=${encodeURIComponent(status)}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
            cache: "no-store",
          },
        );

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        const data = await readJsonSafe(response);
        if (!response.ok) {
          const message =
            typeof data?.error === "string"
              ? data.error
              : `Erro ao carregar solicitações (HTTP ${response.status}).`;
          setDashboardError(message);
          return;
        }

        const list = Array.isArray(data?.requests)
          ? (data.requests as AdminSponsorshipRequest[])
          : [];
        setRequests(list);
      } catch {
        setDashboardError(
          "Não foi possível conectar ao servidor da API. Verifique se o backend está online.",
        );
      } finally {
        setLoadingRequests(false);
      }
    },
    [handleUnauthorized],
  );

  useEffect(() => {
    if (!token) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      void loadRequests(token, statusFilter);
    });
    return () => {
      active = false;
    };
  }, [token, statusFilter, loadRequests]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!password.trim() || loginLoading) return;

    setLoginLoading(true);
    setLoginError(null);

    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/api/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const data = await readJsonSafe(response);

      if (response.status === 401) {
        setLoginError(
          typeof data?.error === "string" ? data.error : "Senha inválida.",
        );
        return;
      }
      if (response.status === 429) {
        setLoginError(
          typeof data?.error === "string"
            ? data.error
            : "Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.",
        );
        return;
      }
      if (response.status === 503) {
        setLoginError(
          typeof data?.error === "string"
            ? data.error
            : "Moderação indisponível no servidor.",
        );
        return;
      }
      if (!response.ok || typeof data?.token !== "string" || !data.token.trim()) {
        setLoginError(
          typeof data?.error === "string"
            ? data.error
            : "Falha ao autenticar no servidor.",
        );
        return;
      }

      const nextToken = data.token.trim();
      writeStoredToken(nextToken);
      setPassword("");
      setShowPassword(false);
      setFeedback(null);
      setToken(nextToken);
    } catch {
      setLoginError(
        "Servidor offline ou inacessível. Verifique a conexão e tente novamente.",
      );
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    writeStoredToken(null);
    setToken(null);
    setRequests([]);
    setPassword("");
    setLoginError(null);
    setDashboardError(null);
    setFeedback(null);
  };

  const handleReview = async (
    id: string,
    decision: "approved" | "rejected",
    reviewerNotes: string,
  ) => {
    if (!token) return;

    setReviewingId(id);
    setDashboardError(null);
    setFeedback(null);

    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/api/admin/requests/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id,
          decision,
          ...(reviewerNotes ? { reviewerNotes } : {}),
        }),
      });

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await readJsonSafe(response);
      if (response.status === 404 || response.status === 409) {
        setDashboardError(
          typeof data?.error === "string"
            ? data.error
            : "Esta solicitação já foi revisada ou não foi encontrada.",
        );
        await loadRequests(token, statusFilter);
        return;
      }

      if (!response.ok) {
        setDashboardError(
          typeof data?.error === "string"
            ? data.error
            : `Não foi possível registrar a revisão (HTTP ${response.status}).`,
        );
        return;
      }

      setFeedback(
        decision === "approved"
          ? "Solicitação aprovada e publicada na árvore."
          : "Solicitação rejeitada.",
      );
      await loadRequests(token, statusFilter);
    } catch {
      setDashboardError(
        "Erro de rede ao enviar a revisão. Verifique se o backend está online.",
      );
    } finally {
      setReviewingId(null);
    }
  };

  if (!sessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="glass-card flex items-center gap-2.5 px-5 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Carregando painel...
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="glass-header sticky top-0 z-40 w-full">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar para a árvore
            </Link>
            <ThemeToggle className="h-10 w-10" />
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center p-4">
          <section className="glass-card w-full max-w-md p-6 sm:p-8">
            <div className="mb-6 flex flex-col items-center text-center">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-600 ring-1 ring-sky-500/25 dark:text-sky-400">
                <Lock className="h-5 w-5" />
              </span>
              <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
                Moderação — Família CDIA
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Acesso restrito aos mantenedores para revisão de apadrinhamentos.
              </p>
            </div>

            <form onSubmit={(event) => void handleLogin(event)} className="space-y-4">
              <div>
                <label
                  htmlFor="admin-password"
                  className="mb-1.5 block text-xs font-semibold text-foreground"
                >
                  Senha administrativa
                </label>
                <div className="relative">
                  <input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    autoFocus
                    required
                    disabled={loginLoading}
                    placeholder="Digite a senha de moderação"
                    className="min-h-11 w-full rounded-lg border border-border-subtle bg-surface py-2.5 pl-3.5 pr-11 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-rose-500/35 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-700 dark:text-rose-300"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading || !password.trim()}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-500/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loginLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Entrar"
                )}
              </button>
            </form>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="glass-header sticky top-0 z-40 w-full">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-3 sm:h-16 sm:gap-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 ring-1 ring-sky-500/25 dark:text-sky-400">
              <ShieldCheck className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0 leading-tight">
              <h1 className="truncate font-display text-sm font-bold tracking-tight sm:text-base">
                Moderação de Solicitações
              </h1>
              <p className="text-[11px] text-muted-foreground">Família CDIA • Admin</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/"
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border-subtle bg-surface px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Voltar para a árvore</span>
              <span className="sm:hidden">Árvore</span>
            </Link>

            <button
              type="button"
              onClick={() => void loadRequests(token, statusFilter)}
              disabled={loadingRequests}
              aria-label="Atualizar lista"
              title="Atualizar"
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border-subtle bg-surface px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-60"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loadingRequests && "animate-spin")} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>

            <ThemeToggle className="h-10 w-10" />

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-rose-500/35 bg-rose-500/10 px-3 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-500/20 dark:text-rose-300"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-3 py-5 sm:px-6 sm:py-6">
        {/* Status filter tabs */}
        <div
          role="tablist"
          aria-label="Filtrar solicitações por status"
          className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border-subtle bg-surface p-1.5"
        >
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setFeedback(null);
                  setStatusFilter(tab.id);
                }}
                className={cn(
                  "inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  active
                    ? "bg-sky-500/15 text-sky-700 ring-1 ring-sky-500/35 dark:text-sky-300"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {tab.label}
                {active && !loadingRequests && (
                  <span className="rounded-full bg-sky-500/20 px-1.5 py-0.5 text-[10px] tabular-nums">
                    {requests.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Feedback / Error banners */}
        {feedback && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-800 dark:text-emerald-300"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {dashboardError && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-700 dark:text-rose-300"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{dashboardError}</span>
          </div>
        )}

        {/* Request list */}
        {loadingRequests && requests.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center gap-2 py-14 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>Carregando solicitações...</span>
          </div>
        ) : requests.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center gap-2 py-14 text-center">
            <Inbox className="h-8 w-8 text-muted-foreground/70" />
            <p className="text-sm font-semibold text-foreground">
              Nenhuma solicitação encontrada
            </p>
            <p className="text-xs text-muted-foreground">
              Não há registros para o filtro selecionado no momento.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <AdminRequestCard
                key={request.id}
                request={request}
                onReview={handleReview}
                isReviewing={reviewingId === request.id}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
