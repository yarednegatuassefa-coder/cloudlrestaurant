import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { defaultPreparationSettings, getNewPendingOrderIds } from "@shared/order-utils";
import { ArrowLeft, BarChart3, BellRing, Check, ChefHat, CircleAlert, Clock3, Download, LoaderCircle, PackageSearch, Printer, RefreshCw, Save, UsersRound, Volume2, VolumeX } from "lucide-react";
import { useLocation } from "wouter";

const statusLabels = { pending: "Pending", confirmed: "Confirmed", preparing: "Preparing", ready: "Ready", completed: "Completed" } as const;
const statusSequence = ["pending", "confirmed", "preparing", "ready", "completed"] as const;
type OrderStatus = keyof typeof statusLabels;

function StaffDashboardContent() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const ordersQuery = trpc.orders.list.useQuery(undefined, { refetchInterval: 10000 });
  const prepSettingsQuery = trpc.prepSettings.get.useQuery();
  const analyticsQuery = trpc.analytics.summary.useQuery();
  const reservationsQuery = trpc.reservations.list.useQuery();
  const waitlistQuery = trpc.waitlist.list.useQuery();
  const menuControlsQuery = trpc.menuControls.list.useQuery();
  const inventoryQuery = trpc.inventory.list.useQuery();
  const updateStatus = trpc.orders.updateStatus.useMutation({ onSuccess: () => utils.orders.list.invalidate() });
  const updatePayment = trpc.orders.updatePayment.useMutation({ onSuccess: () => utils.orders.list.invalidate() });
  const updateSetting = trpc.prepSettings.update.useMutation({ onSuccess: () => utils.prepSettings.get.invalidate() });
  const updateMenuControl = trpc.menuControls.update.useMutation({ onSuccess: () => utils.menuControls.list.invalidate() });
  const updateInventory = trpc.inventory.update.useMutation({ onSuccess: () => utils.inventory.list.invalidate() });
  const [draftSettings, setDraftSettings] = useState<Record<string, { minMinutes: number; maxMinutes: number }>>({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [newOrderAlert, setNewOrderAlert] = useState<number | null>(null);
  const knownPendingIds = useRef<Set<number>>(new Set());
  const hasLoadedOrders = useRef(false);

  useEffect(() => {
    if (!prepSettingsQuery.data) return;
    setDraftSettings(Object.fromEntries(prepSettingsQuery.data.map((setting) => [setting.category, { minMinutes: setting.minMinutes, maxMinutes: setting.maxMinutes }])));
  }, [prepSettingsQuery.data]);

  useEffect(() => {
    if (!ordersQuery.data) return;
    const newIds = hasLoadedOrders.current ? getNewPendingOrderIds(ordersQuery.data, knownPendingIds.current) : [];
    if (newIds.length) {
      setNewOrderAlert(newIds[0]);
      if (soundEnabled) {
        try {
          const context = new window.AudioContext();
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.type = "sine";
          oscillator.frequency.value = 740;
          gain.gain.setValueAtTime(0.0001, context.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.24);
          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.start();
          oscillator.stop(context.currentTime + 0.24);
          window.setTimeout(() => void context.close(), 320);
        } catch {
          // Browsers may block audio until the staff member interacts with the page.
        }
      }
    }
    knownPendingIds.current = new Set(ordersQuery.data.filter((order) => order.status === "pending").map((order) => order.id));
    hasLoadedOrders.current = true;
  }, [ordersQuery.data, soundEnabled]);

  const orders = ordersQuery.data ?? [];
  const settings = prepSettingsQuery.data ?? defaultPreparationSettings;
  const analytics = analyticsQuery.data;
  const counts = useMemo(() => ({
    all: orders.length,
    pending: orders.filter((order) => order.status === "pending").length,
    confirmed: orders.filter((order) => order.status === "confirmed").length,
    preparing: orders.filter((order) => order.status === "preparing").length,
    ready: orders.filter((order) => order.status === "ready").length,
  }), [orders]);

  if (user && user.role !== "admin") return <div className="staff-denied"><CircleAlert size={22} /><h1>Staff access only</h1><p>{user.email || user.name || "This account"} is signed in, but it does not have restaurant staff permissions.</p><small className="staff-denied-note">Sign in with the Cloud L owner account, or ask the owner to promote this account to staff access.</small><button className="staff-secondary-button" onClick={() => setLocation("/")}><ArrowLeft size={15} /> Return to menu</button></div>;

  const parseItems = (raw: string) => { try { return JSON.parse(raw) as Array<{ en: string; qty: number; price: string }>; } catch { return []; } };
  const saveSettings = async () => {
    setSavingSettings(true);
    setSettingsSaved(false);
    try {
      await Promise.all(settings.map((setting) => {
        const draft = draftSettings[setting.category] ?? setting;
        return updateSetting.mutateAsync({ category: setting.category, minMinutes: Number(draft.minMinutes), maxMinutes: Number(draft.maxMinutes) });
      }));
      setSettingsSaved(true);
      window.setTimeout(() => setSettingsSaved(false), 2400);
    } finally { setSavingSettings(false); }
  };
  const updateDraft = (category: string, field: "minMinutes" | "maxMinutes", value: number) => setDraftSettings((current) => ({ ...current, [category]: { ...(current[category] ?? { minMinutes: 20, maxMinutes: 30 }), [field]: value } }));
  const exportOrders = () => {
    const header = ["Order", "Created", "Customer", "Phone", "Service", "Status", "Payment", "Total ETB"];
    const rows = orders.map((order) => [order.id, new Date(order.createdAt).toISOString(), order.customerName || "Guest", order.phoneNumber, order.serviceMode, order.status, order.paymentStatus, order.total]);
    const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `cloud-l-orders-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  return <div className="staff-page">
    <header className="staff-header"><div><span className="staff-kicker">Cloud L / Service desk</span><h1>Tonight’s orders.</h1><p>Review incoming requests and move each order through the kitchen.</p></div><div className="staff-header-actions"><button className="staff-secondary-button" onClick={() => setLocation("/")}><ArrowLeft size={15} /> Public menu</button><button className="staff-secondary-button" onClick={exportOrders} disabled={!orders.length}><Download size={15} /> Export CSV</button><button className={`staff-sound-toggle${soundEnabled ? " is-active" : ""}`} onClick={() => setSoundEnabled((current) => !current)} aria-pressed={soundEnabled} title={soundEnabled ? "Mute new-order sound" : "Enable new-order sound"}>{soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />} {soundEnabled ? "Sound on" : "Sound off"}</button><button className="staff-refresh" onClick={() => ordersQuery.refetch()} aria-label="Refresh orders"><RefreshCw size={16} /></button></div></header>
    <div className="staff-stats"><div><span>All orders</span><strong>{counts.all}</strong></div><div><span>Pending</span><strong>{counts.pending}</strong></div><div><span>Confirmed</span><strong>{counts.confirmed}</strong></div><div><span>Preparing</span><strong>{counts.preparing}</strong></div><div><span>Ready</span><strong>{counts.ready}</strong></div></div>
    <section className="staff-settings"><div className="staff-settings-copy"><span className="staff-kicker">Kitchen timing</span><h2>Preparation estimates.</h2><p>Set the range customers see after ordering. These ranges are used according to the dishes in each order.</p></div><div className="staff-settings-grid">{settings.map((setting) => { const draft = draftSettings[setting.category] ?? setting; return <div className="staff-setting-row" key={setting.category}><div><strong>{setting.label}</strong><small>{setting.category}</small></div><label><span>Min</span><input type="number" min="1" max="240" value={draft.minMinutes} onChange={(event) => updateDraft(setting.category, "minMinutes", Number(event.target.value))} /></label><span className="staff-setting-dash">—</span><label><span>Max</span><input type="number" min="1" max="240" value={draft.maxMinutes} onChange={(event) => updateDraft(setting.category, "maxMinutes", Number(event.target.value))} /></label><span className="staff-setting-unit">min</span></div>; })}</div><div className="staff-settings-actions"><button className="staff-save-button" onClick={saveSettings} disabled={savingSettings}>{savingSettings ? <LoaderCircle className="send-spinner" size={15} /> : settingsSaved ? <Check size={15} /> : <Save size={15} />}{savingSettings ? "Saving…" : settingsSaved ? "Saved" : "Save timing"}</button></div></section>
    {newOrderAlert && <div className="staff-new-order-alert" role="status"><BellRing size={18} /><span><strong>New order #{String(newOrderAlert).padStart(4, "0")}</strong><small>A pending request just arrived. Review it below.</small></span><button type="button" onClick={() => setNewOrderAlert(null)} aria-label="Dismiss new order alert"><Check size={15} /></button></div>}
    {ordersQuery.isLoading ? <div className="staff-empty"><LoaderCircle className="send-spinner" size={24} /><p>Loading today’s orders…</p></div> : orders.length === 0 ? <div className="staff-empty"><ChefHat size={25} /><h2>No orders yet</h2><p>New customer requests will appear here after they submit through WhatsApp or Telegram.</p></div> : <div className="staff-orders">{orders.map((order) => { const items = parseItems(order.items); return <article className={`staff-order staff-order--${order.status}`} key={order.id}><div className="staff-order-top"><div><span className="staff-order-id">Order #{String(order.id).padStart(4, "0")}</span><h2>{order.customerName || "Guest customer"}</h2><p>{order.phoneNumber} · {order.serviceMode}{order.tableNumber ? ` · Table ${order.tableNumber}` : ""}</p></div><div className={`staff-status staff-status--${order.status}`}><span />{statusLabels[order.status]}</div></div><div className="staff-order-body"><div className="staff-order-items">{items.map((item) => <div key={`${order.id}-${item.en}`}><span>{item.qty} × {item.en}</span><small>{item.price}</small></div>)}</div><div className="staff-order-meta">{order.prepEstimate && <div><Clock3 size={14} /><span>Customer estimate <strong>{order.prepEstimate}</strong></span></div>}{order.preferredTime && <div><Clock3 size={14} /><span>Requested for <strong>{order.preferredTime}</strong></span></div>}{order.specialInstructions && <div><CircleAlert size={14} /><span>{order.specialInstructions}</span></div>}<div className="staff-payment"><span>Payment <strong>{order.paymentStatus}</strong></span><button type="button" onClick={() => updatePayment.mutate({ id: order.id, paymentStatus: order.paymentStatus === "paid" ? "unpaid" : "paid" })}>{order.paymentStatus === "paid" ? "Mark unpaid" : "Mark paid"}</button></div><strong className="staff-total">{order.total.toLocaleString()} ETB</strong></div></div><div className="staff-order-actions"><span>Update status</span>{statusSequence.map((status) => <button key={status} className={order.status === status ? "active" : ""} disabled={updateStatus.isPending || order.status === status} onClick={() => updateStatus.mutate({ id: order.id, status })}>{order.status === status && <Check size={13} />}{statusLabels[status]}</button>)}<button className="staff-ticket-button" type="button" onClick={() => window.print()}><Printer size={13} /> Print ticket</button></div><time>{new Date(order.createdAt).toLocaleString([], { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}</time></article>; })}</div>}
    <section className="staff-ops-grid"><article className="staff-ops-card"><div className="staff-ops-heading"><BarChart3 size={18} /><div><span className="staff-kicker">Performance</span><h2>At a glance.</h2></div></div><div className="staff-mini-metrics"><div><strong>{analytics?.totalOrders ?? 0}</strong><span>orders</span></div><div><strong>{(analytics?.revenue ?? 0).toLocaleString()}</strong><span>revenue</span></div><div><strong>{reservationsQuery.data?.filter((item) => item.status === "pending").length ?? 0}</strong><span>reservation requests</span></div></div></article><article className="staff-ops-card"><div className="staff-ops-heading"><UsersRound size={18} /><div><span className="staff-kicker">Front of house</span><h2>Reservations & waitlist.</h2></div></div><p>{reservationsQuery.data?.length ?? 0} reservation requests · {waitlistQuery.data?.length ?? 0} waitlist entries.</p><div className="staff-inline-list">{(reservationsQuery.data ?? []).slice(0, 3).map((item) => <div key={item.id}><strong>{item.customerName}</strong><span>{item.reservationDate} · {item.reservationTime} · {item.guests} guests · {item.status}</span></div>)}</div></article><article className="staff-ops-card"><div className="staff-ops-heading"><PackageSearch size={18} /><div><span className="staff-kicker">Stock room</span><h2>Low inventory.</h2></div></div><div className="staff-inline-list">{(inventoryQuery.data ?? []).filter((item) => item.quantity <= item.lowThreshold).slice(0, 5).map((item) => <div key={item.itemKey}><strong>{item.label}</strong><span>{item.quantity} {item.unit} remaining</span></div>)}{(inventoryQuery.data ?? []).filter((item) => item.quantity <= item.lowThreshold).length === 0 && <p>No low-stock items recorded.</p>}</div></article></section>
    <section className="staff-ops-card staff-menu-controls"><div className="staff-ops-heading"><ChefHat size={18} /><div><span className="staff-kicker">Menu control</span><h2>Availability & specials.</h2></div></div><p>Use the controls to hide sold-out dishes or mark an item as a chef pick without editing the website.</p><div className="staff-menu-control-list">{(menuControlsQuery.data ?? []).slice(0, 30).map((item) => <div key={item.itemKey}><strong>{item.itemKey}</strong><span>{item.isAvailable ? "Available" : "Sold out"}</span><button type="button" onClick={() => updateMenuControl.mutate({ itemKey: item.itemKey, isAvailable: !item.isAvailable })}>{item.isAvailable ? "Mark sold out" : "Restore"}</button><button type="button" onClick={() => updateMenuControl.mutate({ itemKey: item.itemKey, isChefPick: !item.isChefPick })}>{item.isChefPick ? "Chef pick" : "Make chef pick"}</button></div>)}</div></section>
  </div>;
}

export default function StaffDashboard() {
  return <DashboardLayout><StaffDashboardContent /></DashboardLayout>;
}
