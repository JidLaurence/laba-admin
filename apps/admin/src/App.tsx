import React, { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
  Wallet,
  Droplets as Water,
  X,
} from "lucide-react";
import { Button } from "./components/ui/button";
type Store = {
  id: string;
  name: string;
  ownerName: string;
  email: string;
  phone?: string;
  subscriptionUntil: string | null;
  revision: number;
  createdAt: string;
};
type Renewal = {
  at: string;
  until: string;
  amount: number;
  method: string;
  reference: string;
  note: string;
};
type Summary = {
  total: number;
  active: number;
  expiring: number;
  inactive: number;
};
const API = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
const money = (n: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    n / 100,
  );
const format = (v: string | null, time = false) =>
  v
    ? new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium",
        ...(time ? { timeStyle: "short" as const } : {}),
        timeZone: "Asia/Manila",
      }).format(new Date(v))
    : "Not activated";
const status = (s: Store) =>
  !s.subscriptionUntil
    ? "Pending"
    : new Date(s.subscriptionUntil).getTime() <= Date.now()
      ? "Expired"
      : new Date(s.subscriptionUntil).getTime() < Date.now() + 7 * 86400000
        ? "Expiring soon"
        : "Active";
export default function App() {
  const [token, setToken] = useState(""),
    [adminName, setAdminName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [stores, setStores] = useState<Store[]>([]),
    [summary, setSummary] = useState<Summary>({
      total: 0,
      active: 0,
      expiring: 0,
      inactive: 0,
    }),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("All stores"),
    [page, setPage] = useState("overview"),
    [selected, setSelected] = useState<Store | null>(null),
    [history, setHistory] = useState<Renewal[]>([]),
    [until, setUntil] = useState(""),
    [amount, setAmount] = useState(""),
    [method, setMethod] = useState("Cash"),
    [reference, setReference] = useState(""),
    [note, setNote] = useState("");
  const requestId = useRef(0);
  const initials = adminName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  async function api<T>(
    path: string,
    body?: unknown,
    auth = token,
  ): Promise<T> {
    const res = await fetch(API + path, {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    if (res.status === 401 && auth) {
      setToken("");
      setSelected(null);
    }
    if (!res.ok) throw new Error(data.error ?? "Unable to reach the server.");
    return data;
  }
  async function load(auth = token) {
    setError("");
    try {
      const [list, stats] = await Promise.all([
        api<{ stores: Store[] }>("/admin/stores", undefined, auth),
        api<Summary>("/admin/summary", undefined, auth),
      ]);
      setStores(list.stores);
      setSummary(stats);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function signin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await api<{ token: string; name: string }>("/admin/login", {
        email,
        password,
      });
      setToken(result.token);
      setAdminName(result.name);
      setPassword("");
      await load(result.token);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function openStore(store: Store) {
    setSelected(store);
    setUntil("");
    setAmount("");
    setReference("");
    setNote("");
    setMethod("Cash");
    setHistory([]);
    setError("");
    const id = ++requestId.current;
      try {
        const h = await api<{ renewals: Renewal[] }>(
          `/admin/stores/${store.id}/renewals`,
        );
        if (id === requestId.current) setHistory(h.renewals.slice().reverse());
      } catch (e) {
        setError((e as Error).message);
      }
  }
  async function renew(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || busy) return;
    setBusy(true);
    setError("");
    try {
      const date = new Date(`${until}:00+08:00`);
      const cents = Math.round(Number(amount) * 100);
      if (!Number.isFinite(cents) || cents <= 0)
        throw new Error("Enter the amount received.");
      if (
        Number.isNaN(date.getTime()) ||
        date.getTime() <= Date.now() ||
        date.getTime() <= new Date(selected.subscriptionUntil ?? 0).getTime()
      )
        throw new Error(
          "Choose an expiry later than today and the current expiry.",
        );
      if (method === "Bank transfer" && !reference.trim())
        throw new Error("Enter the transfer reference.");
        await api(`/admin/stores/${selected.id}/subscription`, {
          until: date.toISOString(),
          revision: selected.revision,
          method,
          amount: cents,
          reference,
          note,
        });
        await load();
      setToast(
        `${selected.name} is active until ${format(date.toISOString(), true)}.`,
      );
      setSelected(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const visible = stores.filter(
    (s) =>
      (filter === "All stores" || status(s) === filter || (filter === "Active" && status(s) === "Expiring soon")) &&
      `${s.id} ${s.name} ${s.ownerName} ${s.email}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  if (!token)
    return (
      <main className="login-page">
        <div className="login-story">
          <Brand />
          <div>
            <span className="eyebrow light">
              THE BUSINESS BEHIND THE BUBBLES
            </span>
            <h1>
              A little clarity.
              <br />A lighter day.
            </h1>
            <p>Keep every laundry shop moving, one subscription at a time.</p>
            <div className="orbit">
              <Water size={100} strokeWidth={0.8} />
              <div className="orbit-tag">
                <ShieldCheck size={18} /> Owner access, thoughtfully managed
              </div>
            </div>
          </div>
          <small>Laba platform administration</small>
        </div>
        <div className="login-form">
          <span className="eyebrow">WELCOME BACK</span>
          <h2>
            Your shops.
            <br />
            One workspace.
          </h2>
          <p>Sign in to manage store subscriptions.</p>
          <form onSubmit={signin}>
            <label>
              Email address
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                placeholder="admin@yourcompany.com"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Enter your password"
              />
            </label>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <Button disabled={busy} type="submit" className="w-full">
              {busy ? "Signing in…" : "Sign in to administration"}
              <ArrowRight size={17} />
            </Button>
          </form>
          <p className="login-note">
            <ShieldCheck size={16} /> Accounts are created by the platform
            operator.
          </p>
        </div>
      </main>
    );
  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <Brand />
        <div className="workspace">
          <div className="workspace-icon">
            <Building2 size={20} />
          </div>
          <div>
            <b>Laba workspace</b>
            <small>Platform administrator</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <span className="nav-label">WORKSPACE</span>
        <button
          className={page === "overview" ? "active" : ""}
          onClick={() => setPage("overview")}
        >
          <LayoutDashboard size={18} /> Overview
        </button>
        <button
          className={page === "stores" ? "active" : ""}
          onClick={() => setPage("stores")}
        >
          <Building2 size={18} /> Laundry stores <span>{stores.length}</span>
        </button>
        <button
          className={page === "guide" ? "active" : ""}
          onClick={() => setPage("guide")}
        >
          <ShieldCheck size={18} /> Subscription guide
        </button>
        <div className="sidebar-note">
          <div className="note-icon">
            <Sparkles size={20} />
          </div>
          <b>A smoother day for every shop.</b>
          <p>Keep access current so owners can focus on their next load.</p>
        </div>
        <div className="profile">
          <div className="avatar">{initials}</div>
          <div>
            <b>{adminName}</b>
            <small>Platform management</small>
          </div>
          <button
            aria-label="Sign out"
            onClick={() => {
              setToken("");
              setAdminName("");
              setStores([]);
              setSelected(null);
              setToast("");
              setError("");
            }}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>
            Workspace <span className="slash">/</span>{" "}
            <b>
              {page === "stores"
                ? "Laundry stores"
                : page === "guide"
                  ? "Subscription guide"
                  : "Overview"}
            </b>
          </span>
          <div className="topbar-actions">
            <span className="time-tag">
              <CalendarDays size={15} />
              {new Intl.DateTimeFormat("en-PH", {
                month: "short",
                day: "numeric",
                year: "numeric",
                timeZone: "Asia/Manila",
              }).format(new Date())}
            </span>
            <div className="avatar small">{initials}</div>
          </div>
        </header>
        <main className="main-content">
          {toast && (
            <div role="status" className="success">
              <Check size={18} />
              {toast}
              <button
                aria-label="Dismiss notification"
                onClick={() => setToast("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {error && !selected && (
            <div role="alert" className="error">
              {error}
            </div>
          )}
          {page === "guide" ? (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">HOW ACCESS WORKS</span>
                  <h1>
                    Simple subscriptions.
                    <br />
                    Clear responsibilities.
                  </h1>
                </div>
              </div>
              <div className="guide-grid">
                {[
                  [
                    "01",
                    "Owner creates a store",
                    "Laundry shop owners register in the Expo mobile app. New stores begin with no active subscription.",
                  ],
                  [
                    "02",
                    "You confirm payment",
                    "Receive cash or bank transfer outside Laba, then record the actual amount, method, and reference. No checkout or automatic charge is included.",
                  ],
                  [
                    "03",
                    "Set the exact expiry",
                    "Open a store, choose the new date and time in Manila time, and activate access. Renewals are saved with an audit history.",
                  ],
                  [
                    "04",
                    "Owner reconnects",
                    "The mobile app checks the signed subscription online. Expo Go requires a new check after restart or backgrounding. Previously exported data can be restored without changing the subscription.",
                  ],
                ].map(([n, title, body]) => (
                  <article className="guide-card" key={n}>
                    <span>{n}</span>
                    <h2>{title}</h2>
                    <p>{body}</p>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">A LITTLE CLARITY FOR YOUR DAY</span>
                  <h1>
                    {page === "stores"
                      ? "Your laundry stores."
                      : "Good things are in the wash."}
                  </h1>
                  <p>
                    {page === "stores"
                      ? "Manage access for every owner in your network."
                      : "Here’s what’s happening across your laundry shops."}
                  </p>
                </div>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => void load()}
                >
                  <Clock3 size={16} /> Refresh overview
                </Button>
              </div>
              {page === "overview" && (
                <>
                  <div className="stat-grid">
                    {[
                      {
                        label: "Total laundry stores",
                        value: summary.total,
                        icon: Building2,
                        note: "Registered on the mobile app",
                        color: "mint",
                      },
                      {
                        label: "Active subscriptions",
                        value: summary.active,
                        icon: ShieldCheck,
                        note: "Ready for business",
                        color: "green",
                      },
                      {
                        label: "Expiring in 7 days",
                        value: summary.expiring,
                        icon: Clock3,
                        note: "A good time to follow up",
                        color: "amber",
                      },
                      {
                        label: "Needs activation",
                        value: summary.inactive,
                        icon: Wallet,
                        note: "Pending or expired",
                        color: "purple",
                      },
                    ].map((x) => (
                      <article className="stat-card" key={x.label}>
                        <div className="stat-label">
                          {x.label}
                          <span className={`stat-icon ${x.color}`}>
                            <x.icon size={18} />
                          </span>
                        </div>
                        <strong>{String(x.value).padStart(2, "0")}</strong>
                        <small>{x.note}</small>
                      </article>
                    ))}
                  </div>
                  <div className="attention-banner">
                    <div className="attention-icon">
                      <CalendarDays size={25} />
                    </div>
                    <div>
                      <b>A little attention goes a long way.</b>
                      <p>
                        {summary.expiring}{" "}
                        {summary.expiring === 1 ? "store is" : "stores are"}{" "}
                        approaching renewal. Keep their next laundry day running
                        smoothly.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFilter("Expiring soon");
                        setPage("stores");
                      }}
                    >
                      Review renewals <ArrowRight size={15} />
                    </Button>
                  </div>
                </>
              )}
              <section className="stores-panel">
                <div className="panel-heading">
                  <div>
                    <h2>
                      Laundry stores <span>{stores.length}</span>
                    </h2>
                    <p>
                      People, shops, and the subscriptions that keep them going.
                    </p>
                  </div>
                  <div className="offline-note">
                    <span /> Subscription dates are server-controlled
                  </div>
                </div>
                <div className="table-toolbar">
                  <div className="tabs">
                    {[
                      "All stores",
                      "Active",
                      "Expiring soon",
                      "Pending",
                      "Expired",
                    ].map((f) => (
                      <button
                        key={f}
                        className={filter === f ? "selected" : ""}
                        onClick={() => setFilter(f)}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <label className="search">
                    <Search size={16} />
                    <input
                      aria-label="Search stores"
                      placeholder="Search stores, shop codes or owners…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>LAUNDRY STORE</th>
                        <th>OWNER</th>
                        <th>SUBSCRIPTION</th>
                        <th>
                          ACTIVE UNTIL <span>· PHT</span>
                        </th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((store, i) => (
                        <tr key={store.id}>
                          <td>
                            <div className="store-name">
                              <div className={`store-avatar tone-${i % 4}`}>
                                <Water size={20} />
                              </div>
                              <div>
                                <b>{store.name}</b>
                                <small>
                                  Store #{store.id.slice(-6).toUpperCase()}
                                </small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <b className="owner-name">{store.ownerName || 'Users stored on phone'}</b>
                            <small>{store.email || `Shop code: ${store.id}`}</small>
                          </td>
                          <td>
                            <span
                              className={`status status-${status(store).toLowerCase().replace(" ", "-")}`}
                            >
                              <i />
                              {status(store)}
                            </span>
                          </td>
                          <td className="date-cell">
                            {format(store.subscriptionUntil)}
                          </td>
                          <td>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void openStore(store)}
                            >
                              {store.subscriptionUntil ? "Manage" : "Activate"}
                              <ArrowUpRight size={15} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!visible.length && (
                    <div className="empty-state">
                      <Building2 size={36} />
                      <h3>No stores found</h3>
                      <p>
                        {stores.length
                          ? "Try another name or filter."
                          : "Stores appear here when owners sign up in the mobile app."}
                      </p>
                    </div>
                  )}
                </div>
                <div className="table-footer">
                  <span>
                    Showing {visible.length} of {stores.length} stores{" "}
                    {stores.length === 500 ? "· first 500 records" : ""}
                  </span>
                  <span>Made for the people behind the clean clothes.</span>
                </div>
              </section>
              <div className="bottom-note">
                <ShieldCheck size={16} />
                <span>
                  Payments are recorded manually. Subscription changes are kept
                  in each store’s history.
                </span>
                <a
                  href={import.meta.env.VITE_MARKETING_URL ?? "http://localhost:5174"}
                  target="_blank"
                  rel="noreferrer"
                >
                  Visit Laba <ArrowUpRight size={14} />
                </a>
              </div>
            </>
          )}
        </main>
      </div>
      <Dialog.Root
        open={!!selected}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setSelected(null);
            setError("");
            requestId.current++;
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content">
            <Dialog.Title>Manage subscription</Dialog.Title>
            <Dialog.Description>
              {selected?.name} · Set the date through which this shop can
              operate.
            </Dialog.Description>
            <Dialog.Close
              className="dialog-close"
              aria-label="Close"
              disabled={busy}
            >
              <X size={20} />
            </Dialog.Close>
            <div className="current-expiry">
              <CalendarDays size={19} />
              <div>
                <small>CURRENT EXPIRY · MANILA TIME</small>
                <b>{format(selected?.subscriptionUntil ?? null, true)}</b>
              </div>
            </div>
            <form onSubmit={renew}>
              <div className="renewal-shortcuts">
                {[30, 90, 365].map((days) => (
                  <Button
                    key={days}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const base = Math.max(
                        Date.now(),
                        new Date(selected?.subscriptionUntil ?? 0).getTime(),
                      );
                      const end = new Date(base + days * 86400000);
                      setUntil(
                        new Intl.DateTimeFormat("sv-SE", {
                          timeZone: "Asia/Manila",
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })
                          .format(end)
                          .replace(" ", "T"),
                      );
                    }}
                  >
                    +{days} days
                  </Button>
                ))}
              </div>
              <label>
                New expiry date & time · Manila (UTC+8)
                <input
                  type="datetime-local"
                  required
                  value={until}
                  onChange={(e) => setUntil(e.target.value)}
                />
              </label>
              <div className="form-columns">
                <label>
                  Payment received (₱)
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </label>
                <label>
                  Payment method
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                  >
                    <option>Cash</option>
                    <option>Bank transfer</option>
                  </select>
                </label>
              </div>
              <label>
                Reference {method === "Cash" ? "(optional)" : "(required)"}
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  required={method === "Bank transfer"}
                  maxLength={120}
                  placeholder="Bank reference or receipt number"
                />
              </label>
              <label>
                Internal note (optional)
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  placeholder="Payment details for your records"
                />
              </label>
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Saving…" : "Save payment & extend access"}
                <ArrowRight size={16} />
              </Button>
              <p className="form-note">
                The owner needs to reconnect to receive the new subscription.
                This records payment already received.
              </p>
            </form>
            {history.length > 0 && (
              <div className="renewal-history">
                <h3>Renewal history</h3>
                {history.map((h, i) => (
                  <div key={i}>
                    <b>
                      {money(h.amount)} · {h.method}
                    </b>
                    <small>
                      {format(h.at, true)} → {format(h.until, true)}
                    </small>
                    <small>
                      {h.reference} {h.note}
                    </small>
                  </div>
                ))}
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
function Brand() {
  return (
    <a href="/" className="brand" aria-label="Laba home">
      <span>
        <Water size={23} />
      </span>
      laba<b>.</b>
      <small>ADMIN</small>
    </a>
  );
}
