import { useCallback, useEffect, useMemo, useState } from "react";

type AvailabilityItem = {
  id: string;
  name: string;
  nameAmharic: string;
  size?: string;
  isSoldOut: boolean;
  updatedAt?: string | null;
  updatedBy?: string | null;
  category: string;
};

type Filter = "All" | "Food" | "Drinks";

export default function StaffMenuAvailability() {
  const [items, setItems] = useState<AvailabilityItem[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/menu-availability", { credentials: "same-origin", cache: "no-store" });
      const data = await response.json() as { items?: AvailabilityItem[]; error?: string };
      if (response.status === 401) throw new Error("Your staff session has expired. Sign in again to manage availability.");
      if (!response.ok || !Array.isArray(data.items)) throw new Error(data.error || "Menu availability could not be loaded.");
      setItems(data.items);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Menu availability could not be loaded.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const startup = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(startup);
  }, [refresh]);

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return items.filter((item) => {
      const isFood = item.id.startsWith("food-");
      const matchesFilter = filter === "All" || (filter === "Food" ? isFood : !isFood);
      const text = `${item.name} ${item.nameAmharic} ${item.size ?? ""} ${item.category}`.toLocaleLowerCase();
      return matchesFilter && (!normalized || text.includes(normalized));
    });
  }, [filter, items, query]);

  async function toggle(item: AvailabilityItem) {
    const isSoldOut = !item.isSoldOut;
    const action = isSoldOut ? "mark as sold out" : "mark as available";
    if (!window.confirm(`${action[0].toUpperCase()}${action.slice(1)}: ${item.name}${item.size ? ` (${item.size})` : ""}? This affects new orders only; existing orders remain unchanged.`)) return;
    setBusyId(item.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/menu-availability", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, isSoldOut }),
      });
      const data = await response.json() as { item?: AvailabilityItem; error?: string };
      if (response.status === 401) throw new Error("Your staff session has expired. Sign in again to manage availability.");
      if (!response.ok) throw new Error(data.error || "Availability could not be updated.");
      setNotice(`${item.name}${item.size ? ` (${item.size})` : ""} is now ${isSoldOut ? "marked sold out" : "available"}.`);
      await refresh(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Availability could not be updated.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="staff-availability" aria-labelledby="availability-title">
      <header className="staff-availability__head">
        <div>
          <p className="tracking-eyebrow">MENU OPERATIONS</p>
          <h2 id="availability-title">Menu <em>availability.</em></h2>
          <p>Changes apply to new orders. Existing orders remain unchanged.</p>
        </div>
        <button type="button" className="staff-availability__refresh" onClick={() => void refresh(true)} disabled={refreshing || loading}>
          {refreshing ? "Refreshing…" : "Refresh list"}
        </button>
      </header>
      <p className="staff-availability__warning" role="note">Availability controls are shared with the staff password. Only owner-authorized staff should change menu availability.</p>
      <div className="staff-availability__filters">
        <label><span className="sr-only">Search menu items</span><input type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Search English / Amharic / size" /></label>
        <div role="group" aria-label="Filter menu items">
          {(["All", "Food", "Drinks"] as Filter[]).map((choice) => <button key={choice} type="button" className={filter === choice ? "is-active" : ""} aria-pressed={filter === choice} onClick={() => setFilter(choice)}>{choice}</button>)}
        </div>
        <span className="staff-availability__count">{visibleItems.length} of {items.length} options</span>
      </div>
      {error && <p className="checkout-error" role="alert">{error}</p>}
      {notice && <p className="staff-availability__notice" role="status">{notice}</p>}
      {loading ? <p className="staff-empty" role="status">Loading menu availability…</p> : items.length === 0 && !error ? <p className="staff-empty">No menu options were returned.</p> : visibleItems.length === 0 ? <p className="staff-empty">No options match this search or filter.</p> : (
        <div className="staff-availability__list">
          {visibleItems.map((item) => (
            <article className="staff-availability__item" key={item.id}>
              <div className="staff-availability__name"><span className="staff-availability__category">{item.category}</span><h3>{item.name}{item.size ? <span> · {item.size}</span> : null}</h3><p lang="am">{item.nameAmharic}</p>{item.updatedAt && <p className="staff-availability__meta">Updated {new Date(item.updatedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} by {item.updatedBy || "Cloud L staff"}</p>}</div>
              <div className="staff-availability__state"><span className={item.isSoldOut ? "is-sold-out" : "is-available"}>{item.isSoldOut ? "Sold out" : "Available"}</span><button type="button" role="switch" aria-checked={item.isSoldOut} aria-label={`${item.isSoldOut ? "Mark available" : "Mark sold out"}: ${item.name}${item.size ? `, ${item.size}` : ""}`} disabled={busyId !== ""} onClick={() => void toggle(item)}>{busyId === item.id ? "Saving…" : item.isSoldOut ? "Mark available" : "Mark sold out"}</button></div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
