import { lazy, Suspense, useEffect, useSyncExternalStore, useState } from "react";
import FoodMenu from "./components/FoodMenu";
import DrinksMenu from "./components/DrinksMenu";
import OrderCart from "./components/OrderCart";
import type { CartLine, OrderSelection } from "./components/orderTypes";
import { getFavoriteIdsSnapshot, getServerFavoriteIdsSnapshot, subscribeToFavoriteIds, toggleFavoriteId } from "./components/favoritesStore";
import { responsiveImageProps } from "./components/responsiveImageProps";
import "./site.css";

const OrderTrackingPage = lazy(() => import("./components/OrderTrackingPage"));
const StaffOrders = lazy(() => import("./components/StaffOrders"));

const mapSearchUrl = "https://www.google.com/maps/dir/?api=1&destination=2QJF%2BXR2%2C%20Kebena%2C%20Addis%20Ababa%2C%20Ethiopia";
const cartStorageKey = "cloudl-order-cart-v1";
const whatsappNumber = "251901120012";
const emptyCart: CartLine[] = [];
let cartSnapshot = emptyCart;
let cartInitialized = false;
const cartSubscribers = new Set<() => void>();

const routeLoadingFallback = (
  <div className="route-loading" role="status" aria-live="polite">
    Loading your Cloud L page / የCloud L ገጽዎን በመጫን ላይ…
  </div>
);

const featured = [
  {
    number: "01",
    label: "Guest favorite",
    name: "Beyaynetu",
    amharic: "በያይነቱ",
    price: "450",
    image: "/assets/restaurant/dish-beyaynetu.webp",
    alt: "Colorful Ethiopian fasting platter with a variety of vegetable stews",
  },
  {
    number: "02",
    label: "House classic",
    name: "Tibs",
    amharic: "ጥብስ",
    price: "500",
    image: "/assets/restaurant/dish-tibs.webp",
    alt: "A rich Ethiopian tibs dish served fresh",
  },
  {
    number: "03",
    label: "For the table",
    name: "Special Pizza",
    amharic: "ስፔሻል ፒዛ",
    price: "700",
    image: "/assets/restaurant/dish-special-pizza.webp",
    alt: "Cloud L special pizza ready to share",
  },
];

function isCartLine(value: unknown): value is CartLine {
  if (typeof value !== "object" || value === null) return false;
  const line = value as Record<string, unknown>;
  return typeof line.id === "string"
    && typeof line.name === "string"
    && typeof line.nameAmharic === "string"
    && typeof line.price === "number"
    && Number.isFinite(line.price)
    && typeof line.quantity === "number"
    && Number.isInteger(line.quantity)
    && line.quantity > 0
    && (line.size === undefined || typeof line.size === "string");
}

function parseCart(value: string | null): CartLine[] {
  if (!value) return emptyCart;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(isCartLine) : emptyCart;
  } catch {
    return emptyCart;
  }
}

function getCartSnapshot() {
  return cartSnapshot;
}

function getServerCartSnapshot() {
  return emptyCart;
}

function subscribeToCart(listener: () => void) {
  cartSubscribers.add(listener);
  if (!cartInitialized) {
    cartInitialized = true;
    try {
      cartSnapshot = parseCart(window.localStorage.getItem(cartStorageKey));
    } catch {
      cartSnapshot = emptyCart;
    }
    listener();
  }
  return () => cartSubscribers.delete(listener);
}

function updateCart(update: (current: CartLine[]) => CartLine[]) {
  cartSnapshot = update(cartSnapshot);
  try {
    window.localStorage.setItem(cartStorageKey, JSON.stringify(cartSnapshot));
  } catch {
    // The cart remains usable for this page view if browser storage is unavailable.
  }
  cartSubscribers.forEach((listener) => listener());
}

const formatMoney = (value: number) => value.toLocaleString("en-US");

function App() {
  const cart = useSyncExternalStore(subscribeToCart, getCartSnapshot, getServerCartSnapshot);
  const favoriteIds = useSyncExternalStore(subscribeToFavoriteIds, getFavoriteIdsSnapshot, getServerFavoriteIdsSnapshot);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartNotice, setCartNotice] = useState("");
  const [trackingToken, setTrackingToken] = useState("");
  const [editDraft, setEditDraft] = useState<CartLine[]>([]);
  const [editingOrderToken, setEditingOrderToken] = useState("");
  const [editingOrderReference, setEditingOrderReference] = useState("");
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [staffMode, setStaffMode] = useState(false);
  const [soldOutItemIds, setSoldOutItemIds] = useState<Set<string>>(() => new Set());
  const [navScrolled, setNavScrolled] = useState(false);

  useEffect(() => {
    let active = true;
    const refreshAvailability = async () => {
      try {
        const response = await fetch("/api/menu-availability", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json() as { soldOutItemIds?: unknown };
        if (active && Array.isArray(data.soldOutItemIds) && data.soldOutItemIds.every((id) => typeof id === "string")) {
          setSoldOutItemIds(new Set(data.soldOutItemIds));
        }
      } catch { /* Availability is advisory; order validation remains authoritative. */ }
    };
    void refreshAvailability();
    const timer = window.setInterval(() => void refreshAvailability(), 30_000);
    window.addEventListener("focus", refreshAvailability);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", refreshAvailability); };
  }, []);

  useEffect(() => {
    const updateNav = () => setNavScrolled(window.scrollY > 24);
    updateNav();
    window.addEventListener("scroll", updateNav, { passive: true });
    return () => window.removeEventListener("scroll", updateNav);
  }, []);

  useEffect(() => {
    const readTrackingToken = () => {
      const match = window.location.hash.match(/^#track\/([A-Za-z0-9_-]{40,50})$/);
      setTrackingToken(match?.[1] ?? "");
      setStaffMode(window.location.hash === "#staff");
    };
    readTrackingToken();
    window.addEventListener("hashchange", readTrackingToken);
    return () => window.removeEventListener("hashchange", readTrackingToken);
  }, []);

  const addToCart = (selection: OrderSelection) => {
    const current = editingOrderToken ? editDraft : cart;
    const existing = current.find((line) => line.id === selection.id);
    if (existing && existing.quantity >= 10) { setEditError("The maximum is 10 portions per menu item."); return; }
    if (!existing && current.length >= 30) { setEditError("A request can contain up to 30 different menu items."); return; }
    const next = existing
      ? current.map((line) => line.id === selection.id ? { ...line, quantity: line.quantity + 1 } : line)
      : [...current, { ...selection, quantity: 1 }];
    if (editingOrderToken) setEditDraft(next);
    else updateCart(() => next);
    setEditError("");
    setCartOpen(true);
  };

  const setQuantity = (id: string, quantity: number) => {
    const current = editingOrderToken ? editDraft : cart;
    const boundedQuantity = Math.min(quantity, 10);
    const next = boundedQuantity < 1
      ? current.filter((line) => line.id !== id)
      : current.map((line) => line.id === id ? { ...line, quantity: boundedQuantity } : line);
    if (editingOrderToken) setEditDraft(next);
    else updateCart(() => next);
    setEditError(quantity > 10 ? "The maximum is 10 portions per menu item." : "");
  };

  const reorderFromOrder = (items: CartLine[], warnings: string[]) => {
    if (items.length === 0) return false;
    if (cart.length > 0 && !window.confirm("Your cart already has items. Replace it with the items from this previous order?")) return false;
    updateCart(() => items);
    const warningText = warnings.length ? `Not added or adjusted: ${warnings.join(", ")}. ` : "";
    setCartNotice(`${warningText}Today's menu prices apply. Review current availability and your order details before sending a new request.`);
    window.location.hash = "#food";
    setCartOpen(true);
    return true;
  };

  const beginOrderEdit = (items: CartLine[], warnings: string[], token: string, reference: string) => {
    setEditDraft(items.map((item) => ({ ...item })));
    setEditingOrderToken(token);
    setEditingOrderReference(reference);
    setEditError("");
    const warningText = warnings.length ? `Removed from this edit because they are no longer on today's menu: ${warnings.join(", ")}. ` : "";
    setCartNotice(`${warningText}Your saved cart stays separate. Current prices and availability will be checked when you save.`);
    window.location.hash = "#food";
    setCartOpen(true);
    return true;
  };

  const finishOrderEdit = (token: string) => {
    setEditDraft([]);
    setEditingOrderToken("");
    setEditingOrderReference("");
    setEditError("");
    setSavingEdit(false);
    setCartOpen(false);
    setCartNotice(cart.length ? "Your saved cart was kept separate from the edited request." : "");
    window.location.hash = `#track/${token}`;
  };

  const cancelOrderEdit = () => {
    if (!editingOrderToken) return;
    const token = editingOrderToken;
    finishOrderEdit(token);
  };

  const saveOrderEdit = async () => {
    if (!editingOrderToken) return;
    if (!editDraft.length) { setEditError("Add at least one menu item before saving."); return; }
    setSavingEdit(true);
    setEditError("");
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "edit", token: editingOrderToken, items: editDraft.map(({ id, quantity }) => ({ id, quantity })) }),
      });
      const data = await response.json() as { code?: unknown; error?: unknown };
      if (!response.ok) {
        if (response.status === 409 && data.code === "order_not_editable") {
          finishOrderEdit(editingOrderToken);
          return;
        }
        setEditError(typeof data.error === "string" ? data.error : "We could not save those changes. Please try again.");
        return;
      }
      finishOrderEdit(editingOrderToken);
    } catch {
      setEditError("We could not reach Cloud L. Your request is unchanged; please try again.");
    } finally {
      setSavingEdit(false);
    }
  };

  const visibleCart = editingOrderToken ? editDraft : cart;
  const itemCount = visibleCart.reduce((total, item) => total + item.quantity, 0);
  const subtotal = visibleCart.reduce((total, item) => total + item.price * item.quantity, 0);
  const whatsappMessage = [
    "Hello Cloud L, I would like to request this order:",
    ...visibleCart.map((item) => `${item.quantity} × ${item.name}${item.size ? ` (${item.size})` : ""} — ${formatMoney(item.price * item.quantity)} ETB`),
    `Menu subtotal: ${formatMoney(subtotal)} ETB`,
    "Please confirm availability and the final amount before preparing. Thank you.",
  ].join("\n");
  const whatsappHref = visibleCart.length && !editingOrderToken
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`
    : undefined;

  if (trackingToken) {
    return (
      <Suspense fallback={routeLoadingFallback}>
        <OrderTrackingPage token={trackingToken} onReorder={reorderFromOrder} onEditOrder={beginOrderEdit} />
      </Suspense>
    );
  }
  if (staffMode) {
    return (
      <Suspense fallback={routeLoadingFallback}>
        <StaffOrders />
      </Suspense>
    );
  }

  return (
    <div className="cloudl-app">
      <main id="top" className="cloudl-site">
        <section className="hero-shell" aria-label="Cloud L introduction">
          <header className={`site-nav${navScrolled ? " is-scrolled" : ""}`}>
            <a className="site-brand" href="#top" aria-label="Cloud L home">
              <img src="/assets/restaurant/cloud-l-logo.svg" alt="Cloud L" />
            </a>
            <nav className="desktop-nav" aria-label="Main navigation">
              <a href="#story">Our table</a>
              <a href="#food">Menu</a>
              <a href="#drinks">Drinks / መጠጦች</a>
              <a href="#visit">Visit us</a>
            </nav>
            <div className="nav-actions">
              <a className="nav-phone" href="tel:+251901120012">+251 901 120 012</a>
              <a className="nav-cta" href="#food">View menu <span aria-hidden="true">↘</span></a>
            </div>
            <a className="mobile-nav-cta" href="#food">Menu <span aria-hidden="true">↘</span></a>
          </header>

          <div className="hero-content">
            <div className="hero-copy">
              <p className="eyebrow eyebrow--light"><span />A table for every mood</p>
              <h1>Ethiopian<br /><em>food for Addis.</em></h1>
              <p className="hero-lede">Find Cloud L in Kebena, Addis Ababa for Ethiopian injera platters, fasting-friendly dishes, tibs, and familiar favorites.</p>
              <div className="hero-buttons">
                <a className="button button--copper" href="#food">Explore the menu <span aria-hidden="true">↘</span></a>
                <a className="button button--ghost" href={mapSearchUrl} target="_blank" rel="noreferrer" aria-label="Get directions to Cloud L in Kebena, Addis Ababa">Get directions <span aria-hidden="true">↗</span></a>
              </div>
              <div className="hero-proof" aria-label="Restaurant highlights">
                <span><i>✳</i>43 dishes</span>
                <span><i>◉</i>Fasting-friendly</span>
                <span><i>✦</i>Made to share</span>
              </div>
            </div>
            <div className="hero-visual">
              <img className="hero-food" src="/assets/restaurant/hero-ethiopian.webp" {...responsiveImageProps("/assets/restaurant/hero-ethiopian.webp", [480, 960], "(max-width: 650px) calc(100vw - 80px), (max-width: 1200px) 42vw, 438px")} alt="A generous Ethiopian platter of colorful stews and injera" fetchPriority="high" decoding="async" />
              <div className="hero-note"><small>Today at Cloud L</small><strong>Come hungry.<br />Leave lighter.<span>✦</span></strong></div>
              <div className="hours-card"><small>Open daily</small><strong>◷ &nbsp;7:00 — 21:00</strong><span>⌖ &nbsp;Queen Elizabeth II St · Kebena</span></div>
            </div>
          </div>
          <div className="hero-footerline"><span>Cloud L</span><i /> <span>Kebena · Addis Ababa · Ethiopia</span></div>
        </section>

        <section className="story-section content-wrap" id="story">
          <div className="story-rail">The Cloud L feeling</div>
          <div className="story-copy">
            <p className="eyebrow"><span />A generous kind of welcome</p>
            <h2>Your neighborhood table,<br />with a little more feeling.<br /><em>እንኳን ደህና መጡ</em></h2>
            <p className="story-text">At our table in Kebena, Addis Ababa, Ethiopian cooking brings people together over food that feels familiar, vibrant, and full of care. Start with injera and tibs, share a fasting platter or pizza, and finish with something warm.</p>
            <p className="story-signoff">Made for Addis, with love <span>✦</span></p>
          </div>
          <figure className="story-photo-wrap">
            <img src="/assets/restaurant/coffee-dessert.webp" {...responsiveImageProps("/assets/restaurant/coffee-dessert.webp", [480, 960], "(max-width: 680px) 92vw, 38vw")} alt="A traditional Ethiopian coffee moment at Cloud L" loading="lazy" decoding="async" />
            <figcaption><span>Slow moments</span><i /> <span>Fast plates</span></figcaption>
          </figure>
        </section>

        <section className="shortlist-section" aria-labelledby="shortlist-title">
          <div className="content-wrap shortlist-inner">
            <div className="shortlist-heading">
              <div>
                <p className="eyebrow"><span />Start here</p>
                <h2 id="shortlist-title">The Cloud L <em>shortlist</em></h2>
                <p>የቀኑ ምርጥ · A few favorites to begin with.</p>
              </div>
              <a className="text-link" href="#food">See the full menu <span aria-hidden="true">↘</span></a>
            </div>
            <div className="featured-grid">
              {featured.map((dish) => (
                <article className="featured-card" key={dish.number}>
                  <div className="featured-photo">
                    <img src={dish.image} {...responsiveImageProps(dish.image, [480, 960], "(max-width: 680px) calc(100vw - 36px), (max-width: 760px) 46vw, 32vw")} alt={dish.alt} loading="lazy" decoding="async" />
                    <span className="featured-number">{dish.number}</span>
                    <span className="featured-image-caption">Cloud L · Signature selection</span>
                  </div>
                  <div className="featured-details">
                    <p>{dish.label}</p>
                    <div className="featured-details__main"><div><h3>{dish.name}</h3><span lang="am">{dish.amharic}</span></div><strong>{dish.price}<small> ETB</small></strong></div>
                    <button
                      className="featured-add"
                      type="button"
                      disabled={soldOutItemIds.has(dish.name === "Beyaynetu" ? "food-fasting-beyaynetu" : dish.name === "Tibs" ? "food-non-fasting-tibs" : "food-american-special-pizza")}
                      onClick={() => addToCart({
                        id: dish.name === "Beyaynetu" ? "food-fasting-beyaynetu" : dish.name === "Tibs" ? "food-non-fasting-tibs" : "food-american-special-pizza",
                        name: dish.name,
                        nameAmharic: dish.amharic,
                        price: Number(dish.price),
                      })}
                    >
                      {soldOutItemIds.has(dish.name === "Beyaynetu" ? "food-fasting-beyaynetu" : dish.name === "Tibs" ? "food-non-fasting-tibs" : "food-american-special-pizza") ? "Currently unavailable" : "Add to order"} <span aria-hidden="true">↗</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="menu-intro content-wrap" aria-labelledby="menu-intro-title">
          <div>
            <p className="eyebrow"><span />The full table</p>
            <h2 id="menu-intro-title">Choose your <em>mood.</em></h2>
          </div>
          <p>43 dishes, shown in English and Amharic.<br />Prices in ETB · Fasting choices are plant-based.</p>
        </section>

        <FoodMenu onAddToOrder={addToCart} soldOutItemIds={soldOutItemIds} favoriteIds={favoriteIds} onToggleFavorite={toggleFavoriteId} />
        <DrinksMenu currencySuffix="ETB" onAddToOrder={addToCart} soldOutItemIds={soldOutItemIds} favoriteIds={favoriteIds} onToggleFavorite={toggleFavoriteId} />

        <section className="visit-section" id="visit">
          <div className="visit-inner content-wrap">
            <div>
              <p className="eyebrow eyebrow--light"><span />Bring someone</p>
              <h2>Good food is<br /><em>better together.</em></h2>
              <p>Find our table on Queen Elizabeth II Street in Kebena, Addis Ababa. Tap for turn-by-turn directions.</p>
            </div>
            <div className="visit-card">
              <img src="/assets/restaurant/cloud-l-logo.svg" alt="Cloud L" />
              <span>Queen Elizabeth II Street<br />Kebena · Addis Ababa · Ethiopia</span>
              <div className="visit-links">
                <a href="tel:+251901120012">Call us <span>↗</span></a>
                <a href="https://wa.me/251901120012" target="_blank" rel="noreferrer">WhatsApp <span>↗</span></a>
                <a href={mapSearchUrl} target="_blank" rel="noreferrer" aria-label="Get directions to Cloud L in Kebena, Addis Ababa">Get directions <span>↗</span></a>
              </div>
            </div>
          </div>
          <footer className="site-footer content-wrap"><span>© Cloud L</span><a href="#top">Back to the top ↑</a><span>Made for Addis, with love</span></footer>
        </section>
      </main>

      <OrderCart
        items={visibleCart}
        itemCount={itemCount}
        subtotal={subtotal}
        notice={cartNotice}
        isOpen={cartOpen}
        whatsappHref={whatsappHref}
        isEditingOrder={Boolean(editingOrderToken)}
        editingOrderReference={editingOrderReference}
        editError={editError}
        isSavingEdit={savingEdit}
        onOrderPlaced={() => updateCart(() => emptyCart)}
        onOpen={() => setCartOpen(true)}
        onClose={() => setCartOpen(false)}
        onDismissNotice={() => setCartNotice("")}
        onSetQuantity={setQuantity}
        onSaveOrderEdit={saveOrderEdit}
        onCancelOrderEdit={cancelOrderEdit}
      />
    </div>
  );
}

export default App;
