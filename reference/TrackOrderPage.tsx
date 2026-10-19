import { LoaderCircle, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

export default function TrackOrderPage() {
  const [phone, setPhone] = useState("");
  const [lookupPhone, setLookupPhone] = useState<string | null>(null);
  const historyInput = useMemo(() => ({ phoneNumber: lookupPhone ?? "0000000" }), [lookupPhone]);
  const history = trpc.orders.history.useQuery(historyInput, { enabled: Boolean(lookupPhone) });
  const valid = phone.replace(/\D/g, "").length >= 7;
  return <main className="track-page"><div className="track-shell"><Link href="/" className="info-back">← Back to Cloud L</Link><section className="track-hero"><span className="eyebrow"><span className="eyebrow-dot" />Cloud L / Order tracker</span><h1>Follow your order.</h1><p>Enter the phone number used at checkout to see the latest status and preparation estimate.</p><form className="track-form" onSubmit={(event) => { event.preventDefault(); if (valid) setLookupPhone(phone.trim()); }}><label><span>Phone number</span><input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+251 9xx xxx xxx" /></label><button className="button button--terracotta" disabled={!valid || history.isFetching}>{history.isFetching ? <LoaderCircle className="send-spinner" size={16} /> : <Search size={16} />} {history.isFetching ? "Checking…" : "Check status"}</button></form></section>{lookupPhone && <section className="track-results">{history.isFetching ? <p>Checking Cloud L records…</p> : history.data?.length ? history.data.map((order) => <article className="track-order" key={order.id}><div><span className="staff-order-id">Order #{String(order.id).padStart(4, "0")}</span><h2>{order.status}</h2><p>{new Date(order.createdAt).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p></div><div><strong>{order.prepEstimate || "Estimate pending"}</strong><span>{order.total.toLocaleString()} ETB</span></div></article>) : <p>No recent orders found for that phone number.</p>}</section>}<footer className="track-footer"><span>Cloud L Restaurant · Addis Ababa · +251 901 120 012</span><Link href="/privacy">Privacy</Link></footer></div></main>;
}
