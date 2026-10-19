import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import DrinksMenu, { type DrinkOrderSelection } from "@/components/DrinksMenu";
import { defaultPreparationSettings, getOrderPreparationEstimate, getPreparationEstimate } from "@shared/order-utils";
import {
  ArrowDownRight,
  ArrowUpRight,
  Accessibility,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardCopy,
  Clock3,
  FileDown,
  Heart,
  Globe2,
  Leaf,
  LoaderCircle,
  MapPin,
  Menu as MenuIcon,
  MessageCircle,
  Minus,
  Navigation,
  Plus,
  RotateCcw,
  Phone,
  ScanLine,
  Search,
  Send as SendIcon,
  ShoppingBag,
  Sparkles,
  Star,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";

const assets = {
  logo: "/manus-storage/cloud-l-trading-logo-horizontal_b7e0ec52.svg",
  hero: "/manus-storage/ethiopian-detail_8e35d62d.jpg",
  american: "/manus-storage/american-platter_6f21f082.jpg",
  nonFasting: "/manus-storage/nonfasting-platter_2c7a4554.jpg",
  fasting: "/manus-storage/fasting-platter_f39d1c0a.jpg",
  coffee: "/manus-storage/coffee-dessert_cfe3c893.jpg",
  qr: "/manus-storage/qr-cloud-l-table_284ff3da.png",
  pdf: "/manus-storage/cloud-l-menu-readable_7182cd8e.pdf",
  tibs: "/manus-storage/dish-tibs_262e7c6a.jpg",
  beyaynetu: "/manus-storage/dish-beyaynetu_9ca75561.jpg",
  specialPizza: "/manus-storage/dish-special-pizza_8d9340e8.jpg",
  specialBurger: "/manus-storage/dish-special-burger_8d5517a2.jpg",
  chechebsa: "/manus-storage/dish-chechebsa_4a17003e.jpg",
  shiroFeses: "/manus-storage/dish-shiro-feses_a5dea518.jpg",
  dulet: "/manus-storage/dish-dulet_8b20a3ce.jpg",
  specialFatira: "/manus-storage/dish-special-fatira_b2e5c88e.jpg",
  pastaMeat: "/manus-storage/dish-pasta-meat_a29d198a.jpg",
  shiroFitfit: "/manus-storage/dish-shiro-fitfit_909c45e8.jpg",
  frenchFries: "/manus-storage/dish-french-fries_450387f8.jpg",
};

const drinkImageUrls: Partial<Record<string, string>> = {
  soda: "/manus-storage/soda_a0037657.jpg",
  ambo: "/manus-storage/ambo_0d844a27.jpg",
  tea: "/manus-storage/tea_5a13e9dd.jpg",
  "peanut-tea": "/manus-storage/peanut-tea_87ac995d.jpg",
  "keshir-ginger-tea": "/manus-storage/keshir-ginger-tea_edd20e0b.jpg",
  "special-tea": "/manus-storage/special-tea_4bc7e2f7.jpg",
  "lemon-tea": "/manus-storage/lemon-tea_614fc5e3.jpg",
  macchiato: "/manus-storage/macchiato_6e3264a6.jpg",
  coffee: "/manus-storage/coffee_f3528d87.jpg",
  spiris: "/manus-storage/spiris_f81d3a90.jpg",
  cappuccino: "/manus-storage/cappuccino_132da624.jpg",
  milk: "/manus-storage/milk_b1a2965a.jpg",
  "draft-beer": "/manus-storage/draft-beer_1501fa9c.jpg",
  beer: "/manus-storage/beer_73e612ff.jpg",
  "special-beer": "/manus-storage/special-beer_d8be5575.jpg",
  "wine-category": "/manus-storage/wine-category_5512d398.jpg",
};

const mapUrl = "https://maps.app.goo.gl/nCn3gBFXxHHfqp3k9";
const phoneUrl = "tel:+251901120012";
const whatsappUrl = "https://wa.me/251901120012";
const telegramContactUrl = "https://t.me/+251901120012";

type MenuItem = { en: string; am: string; price: string; category: string };
type MenuSection = { id: string; eyebrow: string; title: string; am: string; description: string; image: string; accent: string; items: MenuItem[] };

const menuSections: MenuSection[] = [
  {
    id: "american",
    eyebrow: "03 / Familiar favorites",
    title: "American Foods",
    am: "አሜሪካዊ ምግቦች",
    description: "Crisp, comforting, and made to order — from loaded pizzas to the perfect club sandwich.",
    image: assets.american,
    accent: "ember",
    items: [
      ["Special Burger", "ስፔሻል በርገር", "500"],
      ["Special Pizza", "ስፔሻል ፒዛ", "700"],
      ["Sandwich", "ሳንድዊች", "300"],
      ["Club Sandwich", "ክለብ ሳንድዊች", "500"],
      ["Vegetable Pizza", "የአትክልት ፒዛ", "400"],
      ["Cheese Pizza", "ቺዝ ፒዛ", "500"],
      ["Margherita Pizza", "ማርጋሪታ ፒዛ", "500"],
      ["Tuna Pizza", "ቱና ፒዛ", "700"],
      ["Vegetable Sandwich", "የአትክልት ሳንድዊች", "200"],
      ["French Fries", "ፍሬንች ፍራይስ", "280"],
    ].map(([en, am, price]) => ({ en, am, price, category: "american" })),
  },
  {
    id: "non-fasting",
    eyebrow: "01 / Ethiopian table",
    title: "Ethiopian Non-Fasting Foods",
    am: "የፍስክ ምግቦች",
    description: "The deep, generous flavors of the Ethiopian table — seasoned, soulful, and meant to share.",
    image: assets.nonFasting,
    accent: "gold",
    items: [
      ["Dulet", "ዱለት", "350"],
      ["Tibs", "ጥብስ", "500"],
      ["Kuanta Firfir", "ቋንጣ ፍርፍር", "350"],
      ["Tibs Firfir", "ጥብስ ፍርፍር", "350"],
      ["Pasta with Meat", "ፓስታ ከስጋ ጋር", "300"],
      ["Enkulal Firfir", "እንቁላል ፍርፍር", "280"],
      ["Enkulal Sils", "እንቁላል ስልስ", "260"],
      ["Chikina", "ጭቅና", "500"],
      ["Bozena Shiro", "ቦዘና ሽሮ", "300"],
      ["Macaroni with Meat", "ማካሮኒ ከስጋ ጋር", "300"],
      ["Kimsha Yefeski", "ቅምሻ የፍስክ", "300"],
      ["Special Fatira", "ስፔሻል ፋጢራ", "280"],
      ["Special Ful", "ስፔሻል ፉል", "300"],
      ["Fish Goulash", "የዓሳ ጉላሽ", "500"],
    ].map(([en, am, price]) => ({ en, am, price, category: "non-fasting" })),
  },
  {
    id: "fasting",
    eyebrow: "02 / Plant-forward",
    title: "Ethiopian Fasting Foods",
    am: "የጾም ምግቦች",
    description: "Bright, vegetable-rich plates and comforting sauces that let every ingredient speak.",
    image: assets.fasting,
    accent: "sage",
    items: [
      ["Beyaynetu", "በያይነቱ", "450"],
      ["Firfir", "ፍርፍር", "250"],
      ["Dirkosh Firfir", "ድርቆሽ ፍርፍር", "350"],
      ["Shiro Feses", "ሽሮ ፈሰስ", "200"],
      ["Tegabino", "ተጋቢኖ", "250"],
      ["Telba Fitfit", "ተልባ ፍትፍት", "250"],
      ["Shiro Fitfit", "ሽሮ ፍትፍት", "250"],
      ["Ye Tsom Agelgil", "የጾም አገልግል", "700"],
      ["Rice with Vegetables", "ሩዝ ከአትክልት ጋር", "250"],
      ["Macaroni with Tomato Sauce", "ማካሮኒ በቲማቲም ሶስ", "300"],
      ["Timatim Kurte (Tomato Salad)", "ቲማቲም ቁርጥ", "250"],
      ["Pasta with Tomato Sauce", "ፓስታ በቲማቲም ሶስ", "220"],
      ["Pasta with Vegetables", "ፓስታ ከአትክልት ጋር", "250"],
      ["Salad", "ሰላጣ", "400"],
      ["Chechebsa", "ጨጨብሳ", "220"],
      ["Half-Half", "ሃፍ ሃፍ", "400"],
      ["Fatira", "ፈጢራ", "220"],
      ["Special Chechebsa", "ስፔሻል ጨጨብሳ", "250"],
      ["Kimsha", "ቅምሻ", "1,500"],
    ].map(([en, am, price]) => ({ en, am, price, category: "fasting" })),
  },
];

const orderedMenuSections = [menuSections[1], menuSections[2], menuSections[0]];
const orderStatusSteps = [
  { key: "pending", label: "Pending", detail: "Request received" },
  { key: "confirmed", label: "Confirmed", detail: "Cloud L confirmed" },
  { key: "preparing", label: "Preparing", detail: "Kitchen started" },
  { key: "ready", label: "Ready", detail: "Come collect" },
  { key: "completed", label: "Completed", detail: "Order closed" },
] as const;

const featured = [
  { label: "Guest favorite", name: "Beyaynetu", am: "በያይነቱ", price: "450", image: assets.fasting, tone: "light" },
  { label: "House classic", name: "Tibs", am: "ጥብስ", price: "500", image: assets.nonFasting, tone: "dark" },
  { label: "For the table", name: "Special Pizza", am: "ስፔሻል ፒዛ", price: "700", image: assets.american, tone: "light" },
];

const itemMeta: Record<string, { vegetarian?: boolean; breakfast?: boolean; spicy?: boolean; allergens?: string; popular?: boolean }> = {
  "Special Burger": { allergens: "wheat, dairy, egg", popular: true },
  "Special Pizza": { allergens: "wheat, dairy", popular: true },
  Sandwich: { allergens: "wheat, dairy", breakfast: true },
  "Club Sandwich": { allergens: "wheat, dairy, egg", popular: true },
  "Vegetable Pizza": { vegetarian: true, allergens: "wheat, dairy" },
  "Cheese Pizza": { vegetarian: true, allergens: "wheat, dairy" },
  "Margherita Pizza": { vegetarian: true, allergens: "wheat, dairy" },
  "Special Fatira": { allergens: "wheat, egg", breakfast: true },
  "Special Ful": { vegetarian: true, breakfast: true },
  "Vegetable Sandwich": { vegetarian: true, allergens: "wheat" },
  "French Fries": { vegetarian: true, allergens: "may contain wheat", popular: true },
  Dulet: { allergens: "meat", spicy: true, popular: true },
  Tibs: { allergens: "meat", spicy: true, popular: true },
  "Pasta with Meat": { allergens: "wheat, meat" },
  "Bozena Shiro": { allergens: "legumes", spicy: true },
  Beyaynetu: { vegetarian: true, popular: true },
  "Shiro Feses": { vegetarian: true, allergens: "legumes", popular: true },
  Tegabino: { vegetarian: true, allergens: "legumes" },
  "Shiro Fitfit": { vegetarian: true, allergens: "legumes" },
  Salad: { vegetarian: true, allergens: "none" },
  Chechebsa: { vegetarian: true, allergens: "wheat", breakfast: true },
  Fatira: { vegetarian: true, allergens: "wheat", breakfast: true },
};

const dishPhotos: Record<string, string> = {
  "Special Burger": assets.specialBurger,
  Tibs: assets.tibs,
  Beyaynetu: assets.beyaynetu,
  "Special Pizza": assets.specialPizza,
  Chechebsa: assets.chechebsa,
  "Shiro Feses": assets.shiroFeses,
  Dulet: assets.dulet,
  "Special Fatira": assets.specialFatira,
  "Pasta with Meat": assets.pastaMeat,
  "Shiro Fitfit": assets.shiroFitfit,
  "French Fries": assets.frenchFries,
};

const chefPickNames = new Set(Object.keys(dishPhotos));



function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <a href="#top" className={`brand-lockup ${compact ? "brand-lockup--compact" : ""}`} aria-label="Cloud L Restaurant home">
      <span className="brand-mark"><img src={assets.logo} alt="Cloud L Trading P.L.C. logo" /></span>
    </a>
  );
}

function SectionTitle({ kicker, title, am, body, align = "left" }: { kicker: string; title: string; am?: string; body?: string; align?: "left" | "center" }) {
  return (
    <div className={`section-intro section-intro--${align}`}>
      <div className="eyebrow"><span className="eyebrow-dot" />{kicker}</div>
      <h2>{title} {am && <em>{am}</em>}</h2>
      {body && <p>{body}</p>}
    </div>
  );
}

export default function Home() {
  const createOrder = trpc.orders.create.useMutation();
  const createReservation = trpc.reservations.create.useMutation();
  const createWaitlist = trpc.waitlist.create.useMutation();
  const prepSettingsQuery = trpc.prepSettings.get.useQuery();
  const menuControlsQuery = trpc.menuControls.list.useQuery();
  const [historyPhone, setHistoryPhone] = useState("");
  const historyQuery = trpc.orders.history.useQuery({ phoneNumber: historyPhone }, { enabled: false });
  const prepSettings = prepSettingsQuery.data ?? defaultPreparationSettings;
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cart, setCart] = useState<Record<string, { item: MenuItem; qty: number }>>({});
  const [orderOpen, setOrderOpen] = useState(false);
  const [sendingChannel, setSendingChannel] = useState<"whatsapp" | "telegram" | null>(null);
  const [sendFallback, setSendFallback] = useState<string | null>(null);
  const [copiedOrder, setCopiedOrder] = useState(false);
  const [messagePreview, setMessagePreview] = useState<"whatsapp" | "telegram" | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [serviceMode, setServiceMode] = useState<"Dine-in" | "Takeaway" | "Delivery">("Dine-in");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [orderStatus, setOrderStatus] = useState<(typeof orderStatusSteps)[number]["key"]>("pending");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [estimatedPreparation, setEstimatedPreparation] = useState(() => getPreparationEstimate(1));
  const [businessOpen, setBusinessOpen] = useState(true);
  const [tableWelcome, setTableWelcome] = useState(false);
  const [activePreview, setActivePreview] = useState<string | null>(null);
  const [lightboxItem, setLightboxItem] = useState<{ en: string; am: string; photo: string; dietary?: string; spice?: string } | null>(null);
  const [chefPicksOnly, setChefPicksOnly] = useState(false);
  const [language, setLanguage] = useState<"en" | "am">("en");
  const [dietaryFilter, setDietaryFilter] = useState<"all" | "vegetarian" | "fasting" | "breakfast" | "spicy">("all");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [cookieChoice, setCookieChoice] = useState<boolean | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [guestCount, setGuestCount] = useState(2);
  const [tip, setTip] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "telebirr" | "cbe-birr" | "hello-cash">("cash");
  const [notifyWhenReady, setNotifyWhenReady] = useState(true);
  const [reservationName, setReservationName] = useState("");
  const [reservationPhone, setReservationPhone] = useState("");
  const [reservationDate, setReservationDate] = useState("");
  const [reservationTime, setReservationTime] = useState("");
  const [reservationGuests, setReservationGuests] = useState(2);
  const [reservationNotes, setReservationNotes] = useState("");
  const [reservationMessage, setReservationMessage] = useState<string | null>(null);
  const [waitlistName, setWaitlistName] = useState("");
  const [waitlistPhone, setWaitlistPhone] = useState("");
  const [waitlistGuests, setWaitlistGuests] = useState(2);
  const [waitlistMessage, setWaitlistMessage] = useState<string | null>(null);
  const [orderCountdown, setOrderCountdown] = useState(0);
  const normalizedQuery = query.trim().toLowerCase();
  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((total, entry) => total + entry.qty, 0);
  const cartSubtotal = cartItems.reduce((total, entry) => total + Number(entry.item.price.replace(",", "")) * entry.qty, 0);
  const deliveryFee = serviceMode === "Delivery" ? 100 : 0;
  const cartTotal = cartSubtotal + deliveryFee + tip;
  const hasDrink = cartItems.some(({ item }) => item.category === "drinks");
  const pairingOptions = useMemo(() => {
    const foods = cartItems.filter(({ item }) => item.category !== "drinks");
    if (foods.length === 0) return [
      { name: "Coffee", am: "ቡና", price: "60", reason: "A gentle start" },
      { name: "Tea", am: "ሻይ", price: "40", reason: "Warm and familiar" },
      { name: "Ambo", am: "አምቦ ውሃ", price: "50", reason: "A crisp table pour" },
    ];
    const categories = new Set(foods.map(({ item }) => item.category));
    const names = new Set(foods.map(({ item }) => item.en));
    if (names.has("Tibs") || names.has("Dulet") || categories.has("non-fasting")) {
      return [
        { name: "Draft Beer", am: "ድራፍት ቢራ", price: "65", reason: "Bright with rich flavors" },
        { name: "Special Beer", am: "ልዩ ቢራ", price: "150", reason: "A fuller pour for the table" },
        { name: "Ambo", am: "አምቦ ውሃ", price: "50", reason: "Clean and refreshing" },
      ];
    }
    if (categories.has("fasting")) {
      return [
        { name: "Lemon Tea", am: "የሎሚ ሻይ", price: "60", reason: "Bright with vegetable plates" },
        { name: "Tea", am: "ሻይ", price: "40", reason: "A gentle finish" },
        { name: "Ambo", am: "አምቦ ውሃ", price: "50", reason: "Clean and refreshing" },
      ];
    }
    return [
      { name: "Soda", am: "ሶዳ", price: "70", reason: "A lively pairing" },
      { name: "Coffee", am: "ቡና", price: "60", reason: "Finish on a local note" },
      { name: "Ambo", am: "አምቦ ውሃ", price: "50", reason: "Clean and refreshing" },
    ];
  }, [cartItems]);
  const phoneValid = phoneNumber.trim().replace(/\D/g, "").length >= 7;
  const historyPhoneValid = historyPhone.trim().replace(/\D/g, "").length >= 7;
  const text = (en: string, am: string) => language === "am" ? am : en;
  const displayPrice = (price: string | number) => `${Number(String(price).replace(/,/g, "")).toLocaleString()} ETB`;
  const menuControlMap = useMemo(() => new Map((menuControlsQuery.data ?? []).map((control) => [control.itemKey, control])), [menuControlsQuery.data]);
  const filteredSections = useMemo(() => orderedMenuSections.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      const meta = itemMeta[item.en] ?? {};
      const dietaryMatch = dietaryFilter === "all" || (dietaryFilter === "fasting" ? section.id === "fasting" : dietaryFilter === "vegetarian" ? Boolean(meta.vegetarian) : dietaryFilter === "breakfast" ? Boolean(meta.breakfast) : Boolean(meta.spicy));
      const control = menuControlMap.get(item.en);
      return dietaryMatch && (!chefPicksOnly || chefPickNames.has(item.en) || control?.isChefPick) && (!normalizedQuery || `${item.en} ${item.am}`.toLowerCase().includes(normalizedQuery));
    }),
  })).filter((section) => section.items.length > 0), [normalizedQuery, chefPicksOnly, dietaryFilter, menuControlMap]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const revealNodes = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
    revealNodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [filteredSections.length]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setTableWelcome(params.has("from") || params.has("table") || params.has("qr"));
  }, []);

  useEffect(() => {
    const handleReturn = () => {
      if (document.visibilityState !== "visible" || !sessionStorage.getItem("cloud-l-order-sent")) return;
      sessionStorage.removeItem("cloud-l-order-sent");
      setOrderConfirmed(true);
    };
    window.addEventListener("pageshow", handleReturn);
    document.addEventListener("visibilitychange", handleReturn);
    return () => { window.removeEventListener("pageshow", handleReturn); document.removeEventListener("visibilitychange", handleReturn); };
  }, []);

  useEffect(() => {
    const checkHours = () => {
      const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Addis_Ababa", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
      const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
      const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
      const current = hour * 60 + minute;
      setBusinessOpen(current >= 7 * 60 && current <= 20 * 60 + 30);
    };
    checkHours();
    const timer = window.setInterval(checkHours, 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!lightboxItem) return;
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setLightboxItem(null); };
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", handleKeyDown); document.body.style.overflow = previousOverflow; };
  }, [lightboxItem]);

  useEffect(() => {
    try {
      setFavorites(JSON.parse(localStorage.getItem("cloud-l-favorites") || "[]"));
      setLargeText(localStorage.getItem("cloud-l-large-text") === "1");
      setHighContrast(localStorage.getItem("cloud-l-high-contrast") === "1");
      setCookieChoice(localStorage.getItem("cloud-l-cookie-choice") === "1");
    } catch { /* local storage may be unavailable in private browsing */ }
  }, []);

  useEffect(() => {
    localStorage.setItem("cloud-l-favorites", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    document.documentElement.classList.toggle("large-text-mode", largeText);
    localStorage.setItem("cloud-l-large-text", largeText ? "1" : "0");
  }, [largeText]);

  useEffect(() => {
    document.documentElement.classList.toggle("high-contrast-mode", highContrast);
    localStorage.setItem("cloud-l-high-contrast", highContrast ? "1" : "0");
  }, [highContrast]);

  useEffect(() => {
    if (!orderConfirmed || estimatedPreparation === "") return;
    const minutes = Number(estimatedPreparation.match(/\d+/)?.[0] ?? 0);
    setOrderCountdown(minutes * 60);
    const timer = window.setInterval(() => setOrderCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [orderConfirmed, estimatedPreparation]);

  useEffect(() => {
    if (!historyQuery.isFetched || !historyPhoneValid) return;
    const timer = window.setInterval(() => { void historyQuery.refetch(); }, 15000);
    return () => window.clearInterval(timer);
  }, [historyQuery.isFetched, historyPhoneValid]);

  const saveFeedback = (rating: number) => { setFeedbackRating(rating); setFeedbackSaved(true); localStorage.setItem("cloud-l-last-rating", String(rating)); };
  const closeMobile = () => setMobileOpen(false);
  const toggleFavorite = (name: string) => setFavorites((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
  const reorderHistoryItems = (raw: string) => {
    try {
      const parsed = JSON.parse(raw) as Array<{ en: string; am?: string; price?: string; qty: number; category?: string }>;
      setCart((current) => {
        const next = { ...current };
        parsed.forEach((item) => { if (item.price) next[item.en] = { item: { en: item.en, am: item.am || item.en, price: item.price, category: item.category || "reordered" }, qty: (next[item.en]?.qty || 0) + item.qty }; });
        return next;
      });
      setOrderOpen(true);
    } catch { setSendFallback("That order could not be loaded for reorder."); }
  };
  const submitReservation = async () => {
    setReservationMessage(null);
    try { await createReservation.mutateAsync({ customerName: reservationName.trim(), phoneNumber: reservationPhone.trim(), reservationDate, reservationTime, guests: reservationGuests, notes: reservationNotes.trim() || undefined }); setReservationMessage("Reservation request received. Cloud L will confirm by phone."); } catch { setReservationMessage("Please check the details and try again."); }
  };
  const submitWaitlist = async () => {
    setWaitlistMessage(null);
    try { await createWaitlist.mutateAsync({ customerName: waitlistName.trim(), phoneNumber: waitlistPhone.trim(), guests: waitlistGuests }); setWaitlistMessage("You are on the waitlist. Cloud L will contact you when a table opens."); } catch { setWaitlistMessage("Please check the details and try again."); }
  };
  const addToOrder = (item: MenuItem) => setCart((current) => ({ ...current, [item.en]: { item, qty: (current[item.en]?.qty ?? 0) + 1 } }));
  const addDrinkToOrder = (drink: DrinkOrderSelection) => {
    const name = drink.size ? `${drink.name} (${drink.size})` : drink.name;
    addToOrder({ en: name, am: drink.nameAmharic, price: drink.price.toLocaleString("en-US"), category: "drinks" });
  };
  const addUpsellDrink = (name: string, am: string, price: string) => addToOrder({ en: name, am, price, category: "drinks" });
  const changeQuantity = (name: string, delta: number) => setCart((current) => {
    const entry = current[name];
    if (!entry) return current;
    const qty = entry.qty + delta;
    if (qty <= 0) {
      const next = { ...current };
      delete next[name];
      return next;
    }
    return { ...current, [name]: { ...entry, qty } };
  });
  const orderMessage = () => {
    const lines = cartItems.map(({ item, qty }) => `• ${qty} × ${item.en} (${item.am}) — ${displayPrice(item.price)}`);
    const details = [`Customer: ${customerName.trim() || "Not provided"}`, `Phone: ${phoneNumber.trim()}`, `Guests: ${guestCount}`, `Order type: ${serviceMode}`];
    if (serviceMode === "Dine-in") details.push(`Table: ${tableNumber.trim() || "Not provided"}`);
    if (serviceMode === "Delivery") details.push(`Delivery address: ${deliveryAddress.trim() || "Not provided"}`);
    if (preferredTime) details.push(`Preferred time: ${preferredTime}`);
    const notes = specialInstructions.trim() ? `\n\nSpecial instructions / allergy notes:\n${specialInstructions.trim()}` : "";
    if (deliveryFee) details.push(`Delivery fee: ${deliveryFee}`);
    details.push(`Payment: ${paymentMethod === "cbe-birr" ? "CBE Birr" : paymentMethod === "telebirr" ? "Telebirr" : "Cash"}`);
    if (tip) details.push(`Tip: ${displayPrice(tip)}`);
    details.push(`Notify me when ready: ${notifyWhenReady ? "Yes" : "No"}`);
    return `Hello Cloud L Restaurant!\n\n${details.join("\n")}\n\nI would like to order:\n${lines.join("\n")}\n\nEstimated total: ${displayPrice(cartTotal)}${notes}\n\nPlease confirm availability and the final total. Thank you!`;
  };
  const submitOrder = async (channel: "whatsapp" | "telegram", url: string) => {
    if (!phoneValid || createOrder.isPending) return;
    try {
      const code = `CL-${Date.now().toString(36).toUpperCase()}`;
      await createOrder.mutateAsync({
        customerName: customerName.trim() || undefined,
        phoneNumber: phoneNumber.trim(),
        serviceMode,
        tableNumber: serviceMode === "Dine-in" ? tableNumber.trim() || undefined : undefined,
        deliveryAddress: serviceMode === "Delivery" ? deliveryAddress.trim() || undefined : undefined,
        preferredTime: preferredTime || undefined,
        specialInstructions: specialInstructions.trim() || undefined,
        guests: guestCount,
        deliveryFee,
        tip,
        confirmationCode: code,
        paymentMethod,
        notifyWhenReady,
        items: JSON.stringify(cartItems.map(({ item, qty }) => ({ en: item.en, am: item.am, price: item.price, category: item.category, qty }))),
        total: cartTotal,
        prepEstimate: getOrderPreparationEstimate(cartItems.map(({ item, qty }) => ({ category: item.category, qty })), prepSettings),
      });
      setConfirmationCode(code);
      setEstimatedPreparation(getOrderPreparationEstimate(cartItems.map(({ item, qty }) => ({ category: item.category, qty })), prepSettings));
      openMessenger(channel, url);
    } catch {
      setSendFallback("We could not save your order yet. Please try again or use the phone number below.");
    }
  };
  const sendWhatsAppOrder = () => submitOrder("whatsapp", `${whatsappUrl}?text=${encodeURIComponent(orderMessage())}`);
  const sendTelegramOrder = () => submitOrder("telegram", `https://t.me/share/url?url=${encodeURIComponent(telegramContactUrl)}&text=${encodeURIComponent(orderMessage())}`);
  const copyOrder = async () => {
    await navigator.clipboard?.writeText(orderMessage());
    setCopiedOrder(true);
    window.setTimeout(() => setCopiedOrder(false), 2200);
  };
  const lookupOrderHistory = () => {
    if (!historyPhoneValid || historyQuery.isFetching) return;
    historyQuery.refetch();
  };
  const historyItems = (raw: string) => {
    try {
      return (JSON.parse(raw) as Array<{ en: string; qty: number }>).map((item) => `${item.qty} × ${item.en}`).join(", ");
    } catch {
      return "Order details unavailable";
    }
  };
  const openMessenger = (channel: "whatsapp" | "telegram", url: string) => {
    if (sendingChannel || createOrder.isPending) return;
    setSendFallback(null);
    setMessagePreview(channel);
    setSendingChannel(channel);
    setOrderStatus("pending");
    sessionStorage.setItem("cloud-l-order-sent", "1");
    const popup = window.open(url, "_blank", "noopener,noreferrer");
    if (!popup) setSendFallback(`The ${channel === "whatsapp" ? "WhatsApp" : "Telegram"} window was blocked. Use the web link below or copy your order.`);
    window.setTimeout(() => setSendingChannel(null), 650);
  };

  return (
    <div className="site-shell" id="top" lang={language}>
      <header className={`site-header ${mobileOpen ? "site-header--open" : ""}`}>
        <div className="container header-inner">
          <Logo compact />
              <nav className="desktop-nav" aria-label="Primary navigation">
                <a href="#story">Our table</a>
                <a href="#menu">Menu</a>
                <a href="#drinks">Drinks / መጠጦች</a>
                <a href="#visit">Visit us</a>
              </nav>
          <div className="header-actions">
            <a className="header-phone" href={phoneUrl}><Phone size={15} /> <span>+251 901 120 012</span></a>
            <button className="language-toggle" type="button" onClick={() => setLanguage((current) => current === "en" ? "am" : "en")} aria-label={text("Switch to Amharic", "ወደ እንግሊዝኛ ቀይር")}><Globe2 size={14} /> {language === "en" ? "አማ" : "EN"}</button>
            <a className="button button--small button--ink" href="#menu">{text("View menu", "ምናሌ ይመልከቱ")} <ArrowUpRight size={15} /></a>
            <button className="mobile-toggle" aria-label={mobileOpen ? "Close menu" : "Open menu"} onClick={() => setMobileOpen((open) => !open)}>{mobileOpen ? <X /> : <MenuIcon />}</button>
          </div>
        </div>
        {mobileOpen && <nav className="mobile-nav"><a href="#story" onClick={closeMobile}>{text("Our table", "የእኛ ጠረጴዛ")}</a><a href="#menu" onClick={closeMobile}>{text("Menu", "ምናሌ")}</a><a href="#drinks" onClick={closeMobile}>{text("Drinks / መጠጦች", "መጠጦች / Drinks")}</a><a href="#visit" onClick={closeMobile}>{text("Visit us", "ይጎብኙን")}</a><a href={whatsappUrl} target="_blank" rel="noreferrer" onClick={closeMobile}>WhatsApp us <ArrowUpRight size={14} /></a></nav>}
      </header>

      {tableWelcome && <div className="table-welcome" role="status"><span className="table-welcome-icon"><ScanLine size={16} /></span><span><strong>Welcome to Cloud L</strong><small>Your table menu is ready — browse, choose, and order when you’re ready.</small></span><button onClick={() => setTableWelcome(false)} aria-label="Dismiss welcome message"><X size={15} /></button></div>}

      <main>
        <section className="hero-section" aria-labelledby="hero-title">
          <div className="hero-noise" />
          <div className="container hero-grid">
            <div className="hero-copy">
              <div className="hero-kicker"><span className="hero-kicker-line" />{text("A table for every mood", "ለእያንዳንዱ ስሜት ጠረጴዛ")}</div>
              <h1 id="hero-title">Good food.<br /><span>Good feeling.</span></h1>
              <p className="hero-lead">{text("A warm Addis table where Ethiopian soul food and familiar favorites meet over generous plates.", "የኢትዮጵያ ጣዕምና የምንወዳቸው ምግቦች በልግስና በተሞላ ጠረጴዛ የሚገናኙበት የአዲስ ሰላምታ።")}</p>
              <div className="hero-ctas"><a className="button button--terracotta" href="#menu">{text("Explore the menu", "ምናሌውን ይመልከቱ")} <ArrowDownRight size={17} /></a><a className="text-link text-link--light" href={mapUrl} target="_blank" rel="noreferrer">{text("Find us in Addis", "በአዲስ ይጎብኙን")} <MapPin size={15} /></a></div>
              <div className="hero-meta"><span><span className="meta-icon"><UtensilsCrossed size={15} /></span>43 dishes</span><span><span className="meta-icon"><Leaf size={15} /></span>Fasting-friendly</span><span><span className="meta-icon"><Star size={15} /></span>Made to share</span></div>
            </div>
            <div className="hero-visual">
              <div className="hero-image-frame"><img src={assets.hero} alt="Colorful Ethiopian dishes served on a shared table" fetchPriority="high" decoding="async" /></div>
              <div className="hero-float-card hero-float-card--top"><span className="float-card-label">Today at Cloud L</span><strong>Come hungry.<br />Leave lighter.</strong><span className="float-card-mark">✦</span></div>
              <div className="hero-float-card hero-float-card--bottom"><span className="mini-label">Open daily</span><span className="mini-time"><Clock3 size={14} /> 7:00 — 20:30</span><span className="mini-location"><MapPin size={14} /> Queen Elizabeth II Street</span></div>
              <span className="hero-orbit hero-orbit--one" /><span className="hero-orbit hero-orbit--two" />
            </div>
          </div>
          <div className="hero-bottom-bar"><div className="container hero-bottom-inner"><span>Cloud L Restaurant</span><span className="hero-bottom-rule" /><span>Queen Elizabeth II Street · Addis Ababa</span><a href={whatsappUrl} target="_blank" rel="noreferrer">Chat on WhatsApp <ArrowUpRight size={14} /></a></div></div>
        </section>

        <section className="story-section" id="story">
            <div className="container story-grid scroll-reveal" data-reveal>
            <div className="story-aside"><div className="vertical-label">THE CLOUD L FEELING</div><div className="story-aside-number">01<span>/03</span></div></div>
            <div className="story-copy"><SectionTitle kicker="A generous kind of welcome" title="Your neighborhood table, with a little more feeling." am="እንኳን ደህና መጡ" body="Cloud L is a simple idea: bring people together around food that feels familiar, vibrant, and full of care. Start with a plate of tibs, share the pizza, finish with something warm." /><div className="story-signature"><span className="signature-line" /><span>Made for Addis, with love</span></div></div>
            <div className="story-photo"><img src={assets.coffee} alt="Ethiopian coffee moment at Cloud L" loading="lazy" decoding="async" /><div className="photo-caption"><span>Slow moments</span><span>Fast plates</span></div></div>
          </div>
        </section>

        <section className="featured-section" aria-labelledby="featured-title">
          <div className="container"><div className="featured-top scroll-reveal" data-reveal><SectionTitle kicker="Start here" title="The Cloud L shortlist" am="የቀኑ ምርጥ" /><a className="text-link" href="#menu">See the full menu <ArrowUpRight size={15} /></a></div><div className="featured-grid">{featured.map((item, index) => <article className={`featured-card featured-card--${item.tone} scroll-reveal scroll-reveal--delay-${index + 1}`} data-reveal key={item.name}><div className="featured-image"><img src={item.image} alt={item.name} loading="lazy" decoding="async" /><span className="featured-index">0{index + 1}</span></div><div className="featured-content"><span className="card-label">{item.label}</span><h3>{item.name}</h3><p>{item.am}</p><div className="featured-price"><span>{displayPrice(item.price)}</span></div></div></article>)}</div></div>
        </section>

        <section className="menu-section" id="menu" aria-labelledby="menu-title">
          <div className="container menu-container">
            <div className="menu-header"><div><div className="eyebrow"><span className="eyebrow-dot" />{text("The full table", "ሙሉ ጠረጴዛ")}</div><h2 id="menu-title">{text("Choose your mood.", "የሚወዱትን ይምረጡ።")}</h2><p>{text("Every item is shown in English and Amharic. Prices are exactly as verified.", "እያንዳንዱ ምግብ በእንግሊዝኛና በአማርኛ ቀርቧል። ዋጋዎቹ በተረጋገጡት መሠረት ናቸው።")}</p><small className="menu-meta-note">Last updated 02 October 2026 · Prices in ETB · VAT included where applicable · Fasting = plant-based / vegan-friendly</small></div><div className="menu-tools"><div className="menu-access-tools"><button className={`accessibility-toggle ${largeText ? "is-active" : ""}`} type="button" onClick={() => setLargeText((value) => !value)} aria-pressed={largeText}><Accessibility size={15} /> {text("Large text", "ትልቅ ጽሑፍ")}</button><button className={`chef-picks-toggle ${dietaryFilter === "vegetarian" ? "chef-picks-toggle--active" : ""}`} type="button" onClick={() => setDietaryFilter((value) => value === "vegetarian" ? "all" : "vegetarian")} aria-pressed={dietaryFilter === "vegetarian"}>Vegetarian</button><button className={`chef-picks-toggle ${dietaryFilter === "fasting" ? "chef-picks-toggle--active" : ""}`} type="button" onClick={() => setDietaryFilter((value) => value === "fasting" ? "all" : "fasting")} aria-pressed={dietaryFilter === "fasting"}>Fasting</button><button className={`chef-picks-toggle ${dietaryFilter === "breakfast" ? "chef-picks-toggle--active" : ""}`} type="button" onClick={() => setDietaryFilter((value) => value === "breakfast" ? "all" : "breakfast")} aria-pressed={dietaryFilter === "breakfast"}>Breakfast</button><button className={`chef-picks-toggle ${dietaryFilter === "spicy" ? "chef-picks-toggle--active" : ""}`} onClick={() => setDietaryFilter((value) => value === "spicy" ? "all" : "spicy")} aria-pressed={dietaryFilter === "spicy"}>Spicy</button></div><label className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text("Search the menu", "ምናሌውን ይፈልጉ")} aria-label={text("Search the menu", "ምናሌውን ይፈልጉ")} />{query && <button onClick={() => setQuery("")} aria-label="Clear search"><X size={15} /></button>}</label><button className={`chef-picks-toggle ${chefPicksOnly ? "chef-picks-toggle--active" : ""}`} onClick={() => setChefPicksOnly((active) => !active)} aria-pressed={chefPicksOnly}><Star size={14} /> {text("Chef’s picks", "የሼፉ ምርጫ")}</button><a className="download-link" href={assets.pdf} target="_blank" rel="noreferrer"><FileDown size={16} /> {text("Print full menu", "ሙሉ ምናሌ ያትሙ")}</a></div></div>
            <div className="menu-tabs" role="tablist" aria-label="Menu categories"><a href="#non-fasting"><span>01</span>{text("Non-fasting", "የፍስክ ምግቦች")}</a><a href="#fasting"><span>02</span>{text("Fasting", "የጾም")}</a><a href="#american"><span>03</span>{text("American", "አሜሪካዊ")}</a></div>
              <div className="menu-sections">{filteredSections.map((section, sectionIndex) => <article className={`menu-category menu-category--${section.accent} scroll-reveal scroll-reveal--delay-${sectionIndex + 1}`} data-reveal id={section.id} key={section.id}><div className="category-intro"><div className="category-image"><img src={section.image} alt="" loading="lazy" decoding="async" /><span className="category-index">{section.eyebrow.split(" ")[0]}</span></div><div className="category-copy"><span className="category-eyebrow">{section.eyebrow.replace(/^\S+\s/, "")}</span><h3>{language === "en" ? section.title : section.am}</h3><div className="category-amharic">{language === "en" ? section.am : section.title}</div><p>{section.description}{section.id === "fasting" ? " Fasting = plant-based / vegan-friendly." : ""}</p></div></div><div className="menu-list">{section.items.map((item) => { const photo = dishPhotos[item.en]; const soldOut = menuControlMap.get(item.en)?.isAvailable === false; const isPreviewOpen = activePreview === item.en; const dietary = section.id === "fasting" ? "Fasting" : undefined; const previewData = photo ? { en: item.en, am: item.am, photo, dietary } : null; return <div className={`menu-row ${photo ? "menu-row--photo" : ""} ${soldOut ? "menu-row--sold-out" : ""}`} key={item.en} onMouseEnter={() => photo && setActivePreview(item.en)} onMouseLeave={() => photo && setActivePreview(null)} onFocus={() => photo && setActivePreview(item.en)} onClick={(event) => { if (!photo || (event.target as HTMLElement).closest("button")) return; setActivePreview(isPreviewOpen ? null : item.en); }} onKeyDown={(event) => { if (photo && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setActivePreview(isPreviewOpen ? null : item.en); } }} tabIndex={photo ? 0 : undefined} aria-expanded={photo ? isPreviewOpen : undefined}><div className="menu-name"><strong>{language === "en" ? item.en : item.am}</strong><span>{language === "en" ? item.am : item.en}</span></div><div className="menu-dots" /><div className="menu-price">{soldOut ? "Sold out" : displayPrice(item.price)}</div><div className="dish-tags">{dietary && <span className="dish-tag dish-tag--dietary">{dietary}</span>}{itemMeta[item.en]?.breakfast && <span className="dish-tag dish-tag--breakfast">Breakfast</span>}{itemMeta[item.en]?.spicy && <span className="dish-tag dish-tag--spicy">Spicy</span>}{itemMeta[item.en]?.vegetarian && <span className="dish-tag dish-tag--dietary">Vegetarian</span>}{itemMeta[item.en]?.allergens && <span className="allergen-icons" aria-label={`Allergens: ${itemMeta[item.en]?.allergens}`}>{itemMeta[item.en]?.allergens?.split(",").slice(0, 3).map((allergen) => <span className="allergen-icon" title={allergen.trim()} key={allergen}>{allergen.trim().charAt(0).toUpperCase()}</span>)}</span>}</div>{photo && <span className="photo-hint">View dish</span>}<button className={`favorite-item ${favorites.includes(item.en) ? "is-favorite" : ""}`} type="button" onClick={(event) => { event.stopPropagation(); toggleFavorite(item.en); }} aria-label={`${favorites.includes(item.en) ? "Remove" : "Add"} ${item.en} ${favorites.includes(item.en) ? "from" : "to"} favorites`}><Heart size={13} fill={favorites.includes(item.en) ? "currentColor" : "none"} /></button><button className={`add-item ${cart[item.en] ? "add-item--added" : ""}`} onClick={() => !soldOut && addToOrder(item)} disabled={soldOut} aria-label={soldOut ? `${item.en} is sold out` : `Add ${item.en} to order`}>{cart[item.en] ? <><span>{cart[item.en].qty}</span><Plus size={12} /></> : <Plus size={14} />}</button>{photo && isPreviewOpen && previewData && <div className="dish-preview"><button className="dish-preview-trigger" onClick={(event) => { event.stopPropagation(); setLightboxItem(previewData); }} aria-label={`View larger photo of ${item.en}`}><img src={photo} alt={`${item.en} — ${item.am}`} loading="lazy" decoding="async" /><span>View larger</span></button></div>}</div>; })}</div></article>)}</div>
            {filteredSections.length === 0 && <div className="empty-menu"><Sparkles size={20} /><h3>No dish found.</h3><p>Try searching in English or Amharic.</p><button className="text-link" onClick={() => setQuery("")}>Reset search <ArrowUpRight size={15} /></button></div>}
            </div>
          </section>
          <DrinksMenu imageUrlById={drinkImageUrls} language={language} currencySuffix="ETB" onAddToOrder={addDrinkToOrder} />

        {lightboxItem && <div className="dish-lightbox" role="dialog" aria-modal="true" aria-label={`${lightboxItem.en} photo`} onClick={() => setLightboxItem(null)}><div className="dish-lightbox-panel" onClick={(event) => event.stopPropagation()}><button className="dish-lightbox-close" onClick={() => setLightboxItem(null)} aria-label="Close dish photo"><X size={20} /></button><img src={lightboxItem.photo} alt={`${lightboxItem.en} — ${lightboxItem.am}`} /><div className="dish-lightbox-caption"><div><strong>{lightboxItem.en}</strong><span>{lightboxItem.am}</span></div><div className="dish-lightbox-tags">{lightboxItem.dietary && <span className="dish-tag dish-tag--dietary">{lightboxItem.dietary}</span>}</div></div></div></div>}
        {cartCount > 0 && <div className="order-tray"><div className="order-tray-copy"><span className="order-tray-icon"><ShoppingBag size={16} /></span><span><strong>{cartCount} {cartCount === 1 ? "item" : "items"} ready</strong><small>{displayPrice(cartTotal)} · tap to review</small></span></div><button className="button button--terracotta button--small" onClick={() => setOrderOpen(true)}>Review order <ArrowUpRight size={14} /></button></div>}
        {orderConfirmed && <div className="order-confirmation-overlay" role="dialog" aria-modal="true" aria-labelledby="confirmation-title"><div className="order-confirmation-card"><span className="confirmation-check"><CheckCircle2 size={28} /></span><span className="eyebrow"><span className="eyebrow-dot" />Thank you</span><h2 id="confirmation-title">Your order is ready to send.</h2>{confirmationCode && <div className="confirmation-code"><span>Confirmation</span><strong>{confirmationCode}</strong></div>}<p>Your messenger should have opened with the order details. Please tap <strong>Send</strong> in WhatsApp or Telegram to complete the request.</p><div className="confirmation-summary"><span>{cartCount} {cartCount === 1 ? "item" : "items"}</span><strong>{displayPrice(cartTotal)}</strong></div><div className="prep-estimate"><Clock3 size={16} /><span><strong>Estimated preparation</strong><small>{estimatedPreparation} from order confirmation{orderCountdown > 0 ? ` · ${Math.floor(orderCountdown / 60)}:${String(orderCountdown % 60).padStart(2, "0")} remaining` : ""}</small></span></div><div className="status-tracker" aria-label="Order status"><div className="status-track-line" />{orderStatusSteps.map((step, index) => { const currentIndex = orderStatusSteps.findIndex((entry) => entry.key === orderStatus); return <div className={`status-step ${index === currentIndex ? "status-step--active" : index < currentIndex ? "status-step--done" : ""}`} key={step.key}><span>{index + 1}</span><strong>{step.label}</strong><small>{step.detail}</small></div>; })}</div><p className="status-note">Your order starts as <strong>Pending</strong>. Cloud L can update the status as the kitchen confirms and completes your request.</p><div className="feedback-card"><div><strong>How was the Cloud L experience?</strong><small>Your one-tap rating helps the team improve.</small></div><div className="feedback-stars" role="group" aria-label="Rate your experience">{[1,2,3,4,5].map((rating) => <button type="button" key={rating} className={feedbackRating && rating <= feedbackRating ? "is-selected" : ""} onClick={() => saveFeedback(rating)} aria-label={`Rate ${rating} out of 5`}>★</button>)}</div>{feedbackSaved && <small className="feedback-thanks">Thank you — your feedback was saved on this device.</small>}</div><div className="loyalty-cue"><span>Cloud L table card</span><strong>{Math.min(5, Number(localStorage.getItem("cloud-l-stamps") || 0) + 1)} / 5 visits</strong><small>Keep your next confirmation number for the team.</small></div><button className="button button--terracotta" onClick={() => setOrderConfirmed(false)}>Back to Cloud L <ArrowUpRight size={15} /></button><small>Cloud L will confirm availability and the final total.</small></div></div>}
        {orderOpen && <div className="order-overlay" role="dialog" aria-modal="true" aria-labelledby="order-title" onClick={() => setOrderOpen(false)}><div className="order-panel" onClick={(event) => event.stopPropagation()}><div className="order-panel-head"><div><span className="eyebrow"><span className="eyebrow-dot" />Your Cloud L order</span><h2 id="order-title">Ready to share.</h2><p>Review the exact message below, then open WhatsApp or Telegram.</p></div><button className="order-close" onClick={() => setOrderOpen(false)} aria-label="Close order"><X size={19} /></button></div><div className="order-details-form"><div className="order-form-heading">Order details <span>optional, but helpful</span></div><div className="order-form-grid order-form-grid--identity"><label><span>Your name</span><input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="e.g. Lidia" /></label><label><span>Phone number <b>required</b></span><input type="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="+251 9xx xxx xxx" aria-invalid={phoneNumber.length > 0 && !phoneValid} /></label></div>{phoneNumber.length > 0 && !phoneValid && <small className="field-warning">Enter a valid phone number so Cloud L can confirm your order.</small>}<div className="order-form-grid"><label><span>Guests</span><input type="number" min="1" max="30" value={guestCount} onChange={(event) => setGuestCount(Math.max(1, Number(event.target.value)))} /></label><label><span>Tip</span><select value={tip} onChange={(event) => setTip(Number(event.target.value))}><option value="0">No tip</option><option value="50">50</option><option value="100">100</option><option value="200">200</option></select></label></div><div className="order-form-grid"><label><span>Order type</span><select value={serviceMode} onChange={(event) => setServiceMode(event.target.value as "Dine-in" | "Takeaway" | "Delivery")}><option>Dine-in</option><option>Takeaway</option><option>Delivery</option></select></label>{serviceMode === "Dine-in" ? <label><span>Table number</span><input value={tableNumber} onChange={(event) => setTableNumber(event.target.value)} placeholder="e.g. 4" /></label> : serviceMode === "Delivery" ? <label><span>Delivery address</span><input value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} placeholder="Area and street" /></label> : <div />}</div><label className="order-form-wide"><span>Preferred pickup or delivery time</span><input type="time" value={preferredTime} onChange={(event) => setPreferredTime(event.target.value)} /></label><label className="order-form-wide"><span>Special instructions or allergy notes</span><textarea value={specialInstructions} onChange={(event) => setSpecialInstructions(event.target.value)} placeholder="e.g. No onions, peanut allergy, extra sauce" rows={3} /></label><div className="payment-choice"><label><span>Payment method</span><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as "cash" | "telebirr" | "cbe-birr" | "hello-cash")}><option value="cash">Cash on collection / delivery</option><option value="telebirr">Telebirr</option><option value="cbe-birr">CBE Birr</option><option value="hello-cash">HelloCash</option></select></label><small>{paymentMethod === "cash" ? "Pay the Cloud L team when your order is collected or delivered." : `Cloud L will confirm the current ${paymentMethod === "telebirr" ? "Telebirr" : paymentMethod === "cbe-birr" ? "CBE Birr" : "HelloCash"} account details in the messenger.`}</small><ol className="payment-steps"><li>Confirm the exact total shown below.</li><li>For mobile payment, ask Cloud L for the current account number in the messenger.</li><li>Send the payment screenshot or transaction ID; staff will confirm the order.</li></ol></div><label className="notify-toggle"><input type="checkbox" checked={notifyWhenReady} onChange={(event) => setNotifyWhenReady(event.target.checked)} /><span>Notify me when my order is ready</span></label><p className="policy-note">Cancellation: please contact Cloud L before preparation begins. Refunds, where applicable, are confirmed by the restaurant after reviewing the order.</p></div>{!hasDrink && <div className="order-upsell"><div><strong>{text("Pair your table", "ጠረጴዛዎን ያሟሉ")}</strong><small>{text("Thoughtful drink pairings based on what you selected.", "በመረጧቸው ምግቦች ላይ የተመሰረቱ የመጠጥ ጥምረቶች።")}</small></div><div className="order-upsell-actions">{pairingOptions.map((pairing) => <button type="button" key={pairing.name} onClick={() => addUpsellDrink(pairing.name, pairing.am, pairing.price)}><span className="upsell-name">+ {pairing.name}</span><span className="upsell-reason">{text(pairing.reason, pairing.reason === "Bright with rich flavors" ? "ከጣዕም ያላቸው ምግቦች ጋር" : pairing.reason === "Bright with vegetable plates" ? "ከአትክልት ምግቦች ጋር" : pairing.reason === "A fuller pour for the table" ? "ለጠረጴዛው የተሞላ ጣዕም" : pairing.reason === "Finish on a local note" ? "በአካባቢያዊ ጣዕም ይጨርሱ" : pairing.reason === "A lively pairing" ? "ሕያው ጥምረት" : pairing.reason === "A gentle finish" ? "ለስላሳ መጨረሻ" : pairing.reason === "Clean and refreshing" ? "ንጹህና አዲስ ስሜት" : pairing.reason === "Warm and familiar" ? "ሞቅ ያለና የሚታወቅ" : "ለጠረጴዛው የተመረጠ")}</span><span className="upsell-price">{displayPrice(pairing.price)}</span></button>)}</div></div>}{!businessOpen && <div className="hours-warning"><Clock3 size={16} /><span><strong>Ordering outside open hours</strong><small>Cloud L is open daily from 7:00 to 20:30 Addis Ababa time. You can still send your request, and the restaurant will confirm it when open.</small></span></div>}<div className="order-items">{cartItems.map(({ item, qty }) => <div className="order-item" key={item.en}><div><strong>{item.en}</strong><span>{item.am} · {displayPrice(item.price)}</span></div><div className="quantity-control"><button onClick={() => changeQuantity(item.en, -1)} aria-label={`Decrease ${item.en}`}><Minus size={13} /></button><b>{qty}</b><button onClick={() => changeQuantity(item.en, 1)} aria-label={`Increase ${item.en}`}><Plus size={13} /></button></div></div>)}</div><div className="order-total"><span>Estimated total<small className="total-breakdown">Food {displayPrice(cartSubtotal)}{deliveryFee ? ` · Delivery ${displayPrice(deliveryFee)}` : ""}{tip ? ` · Tip ${displayPrice(tip)}` : ""}</small></span><strong>{displayPrice(cartTotal)}</strong></div><div className="messenger-actions"><a className="button button--call" href={phoneUrl}><Phone size={18} /> Call to order</a><button className="button button--whatsapp" disabled={!!sendingChannel || createOrder.isPending || !phoneValid} onClick={sendWhatsAppOrder}>{createOrder.isPending ? <LoaderCircle className="send-spinner" size={18} /> : sendingChannel === "whatsapp" ? <LoaderCircle className="send-spinner" size={18} /> : <MessageCircle size={18} />} {createOrder.isPending ? "Saving order…" : sendingChannel === "whatsapp" ? "Opening WhatsApp…" : "WhatsApp"} {!sendingChannel && <ArrowUpRight size={15} />}</button><button className="button button--telegram" disabled={!!sendingChannel || createOrder.isPending || !phoneValid} onClick={sendTelegramOrder}>{createOrder.isPending ? <LoaderCircle className="send-spinner" size={18} /> : sendingChannel === "telegram" ? <LoaderCircle className="send-spinner" size={18} /> : <SendIcon size={18} />} {createOrder.isPending ? "Saving order…" : sendingChannel === "telegram" ? "Opening Telegram…" : "Telegram"} {!sendingChannel && <ArrowUpRight size={15} />}</button></div>{createOrder.isPending && <div className="order-submit-loading" role="status"><LoaderCircle className="send-spinner" size={17} /><span>Saving your order securely before opening the messenger…</span></div>}{messagePreview && <div className="message-preview"><div className="message-preview-head"><span>Message preview</span><button onClick={copyOrder}>{copiedOrder ? <CheckCircle2 size={13} /> : <ClipboardCopy size={13} />} {copiedOrder ? "Copied" : "Copy"}</button></div><pre>{orderMessage()}</pre><small>{messagePreview === "whatsapp" ? "WhatsApp will open this message for Cloud L." : "Telegram will open the share screen with this message ready to send."}</small></div>}{sendingChannel && <div className="send-confirmation"><span className="send-confirmation-icon"><LoaderCircle className="send-spinner" size={16} /></span><span><strong>Opening {sendingChannel === "whatsapp" ? "WhatsApp" : "Telegram"}</strong><small>Your order preview remains here so you can verify what was sent.</small></span></div>}{sendFallback && <div className="send-fallback" role="alert"><CheckCircle2 size={17} /><span><strong>Still with us?</strong><small>{sendFallback}</small><div className="fallback-links"><a href={`${whatsappUrl}?text=${encodeURIComponent(orderMessage())}`} target="_blank" rel="noreferrer">Open WhatsApp web</a><a href={`https://t.me/share/url?url=${encodeURIComponent(telegramContactUrl)}&text=${encodeURIComponent(orderMessage())}`} target="_blank" rel="noreferrer">Open Telegram web</a><button onClick={copyOrder}>{copiedOrder ? <CheckCircle2 size={13} /> : <ClipboardCopy size={13} />} {copiedOrder ? "Copied" : "Copy order"}</button></div></span></div>}<span className="order-note">Cloud L will confirm availability, final total, and collection or delivery details.</span></div></div>}

        <section className="visit-section" id="visit" aria-labelledby="visit-title">
          <div className="container order-history-card scroll-reveal" data-reveal>
            <div><span className="eyebrow"><span className="eyebrow-dot" />Your Cloud L orders</span><h2>Track a recent order.</h2><p>Enter the same phone number used at checkout to see the latest status and kitchen estimate.</p><a className="text-link" href="/track">Open full order tracker <ArrowUpRight size={14} /></a></div>
            <div className="order-history-form"><label><span>Phone number</span><input type="tel" value={historyPhone} onChange={(event) => setHistoryPhone(event.target.value)} placeholder="+251 9xx xxx xxx" /></label><button className="button button--terracotta" onClick={lookupOrderHistory} disabled={!historyPhoneValid || historyQuery.isFetching}>{historyQuery.isFetching ? <LoaderCircle className="send-spinner" size={16} /> : <Search size={16} />} {historyQuery.isFetching ? "Checking…" : "Check status"}</button></div>
            {historyQuery.isFetched && <div className="order-history-results">{historyQuery.data?.length ? historyQuery.data.map((order) => (<article className="order-history-item" key={order.id}><div><strong>Order #{String(order.id).padStart(4, "0")}</strong><span>{new Date(order.createdAt).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span><small>{historyItems(order.items)}</small></div><div><b className={`history-status history-status--${order.status}`}>{order.status}</b><span>{order.prepEstimate || "Estimate pending"}</span><strong>{displayPrice(order.total)}</strong><button className="history-reorder-button" type="button" onClick={() => reorderHistoryItems(order.items)}><RotateCcw size={13} /> Reorder</button></div></article>)) : <p className="order-history-empty">No recent orders found for that number.</p>}</div>}
          </div>
          <div className="container booking-grid scroll-reveal" data-reveal><section className="booking-card"><div className="eyebrow"><CalendarDays size={14} /> Reserve a table</div><h2>Save your seat.</h2><p>Send a reservation request and Cloud L will confirm by phone.</p><div className="booking-fields"><input value={reservationName} onChange={(event) => setReservationName(event.target.value)} placeholder="Your name" aria-label="Reservation name" /><input value={reservationPhone} onChange={(event) => setReservationPhone(event.target.value)} placeholder="Phone number" aria-label="Reservation phone" /><input type="date" value={reservationDate} onChange={(event) => setReservationDate(event.target.value)} aria-label="Reservation date" /><input type="time" value={reservationTime} onChange={(event) => setReservationTime(event.target.value)} aria-label="Reservation time" /><label><Users size={14} /><input type="number" min="1" max="30" value={reservationGuests} onChange={(event) => setReservationGuests(Math.max(1, Number(event.target.value)))} aria-label="Number of guests" /></label><input value={reservationNotes} onChange={(event) => setReservationNotes(event.target.value)} placeholder="Notes (optional)" aria-label="Reservation notes" /></div><button className="button button--terracotta" type="button" disabled={createReservation.isPending || !reservationName.trim() || !reservationPhone.trim() || !reservationDate || !reservationTime} onClick={submitReservation}>{createReservation.isPending ? "Sending…" : "Request reservation"}</button>{reservationMessage && <small className="booking-message">{reservationMessage}</small>}</section><section className="booking-card booking-card--quiet"><div className="eyebrow"><Clock3 size={14} /> Busy tonight?</div><h2>Join the waitlist.</h2><p>Leave your number and party size; we will call if a table opens.</p><div className="booking-fields"><input value={waitlistName} onChange={(event) => setWaitlistName(event.target.value)} placeholder="Your name" aria-label="Waitlist name" /><input value={waitlistPhone} onChange={(event) => setWaitlistPhone(event.target.value)} placeholder="Phone number" aria-label="Waitlist phone" /><input type="number" min="1" max="30" value={waitlistGuests} onChange={(event) => setWaitlistGuests(Math.max(1, Number(event.target.value)))} aria-label="Waitlist guests" /></div><button className="button button--outline-light" type="button" disabled={createWaitlist.isPending || !waitlistName.trim() || !waitlistPhone.trim()} onClick={submitWaitlist}>{createWaitlist.isPending ? "Joining…" : "Join waitlist"}</button>{waitlistMessage && <small className="booking-message">{waitlistMessage}</small>}</section></div>
          <div className="container visit-grid scroll-reveal" data-reveal><div className="visit-copy"><div className="eyebrow eyebrow--light"><span className="eyebrow-dot" />Save your seat at the table</div><h2 id="visit-title">Find us.<br /><em>Bring someone.</em></h2><p>We are on Queen Elizabeth II Street in Addis Ababa — easy to find, easier to stay awhile.</p><div className="visit-actions"><a className="button button--terracotta" href={mapUrl} target="_blank" rel="noreferrer"><Navigation size={16} /> Open in Maps <ArrowUpRight size={15} /></a><a className="button button--outline-light" href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle size={16} /> WhatsApp us</a><a className="button button--outline-light" href={telegramContactUrl} target="_blank" rel="noreferrer"><SendIcon size={16} /> Telegram us</a></div></div><div className="visit-card"><div className="visit-card-top"><span className="card-label">Cloud L Restaurant</span><span className="visit-dot" /></div><div className="visit-details"><div><MapPin size={18} /><span>Queen Elizabeth II Street<br />Addis Ababa, Ethiopia</span></div><div><Phone size={18} /><a href={phoneUrl}>+251 901 120 012</a></div><div><Clock3 size={18} /><span>Open daily · 7:00 — 20:30</span></div></div><div className="qr-panel"><img src={assets.qr} alt="QR code for Cloud L digital menu" loading="lazy" decoding="async" /><div><span className="card-label">Take the menu with you</span><strong>Scan for the<br />digital menu.</strong><span className="qr-arrow"><ScanLine size={18} /></span></div></div></div></div>
        </section>
      </main>

      {cookieChoice === null && <aside className="cookie-consent" role="dialog" aria-label="Privacy choices"><div><strong>Cloud L uses essential storage.</strong><p>We use local storage for favorites, accessibility settings, and your consent choice. Order details are sent only when you choose WhatsApp or Telegram.</p></div><div className="cookie-actions"><button type="button" onClick={() => { localStorage.setItem("cloud-l-cookie-choice", "1"); setCookieChoice(true); }}>Allow</button><a href="/privacy">Read privacy</a></div></aside>}<footer className="site-footer"><div className="container footer-inner"><Logo /><div className="footer-mid"><span>American favorites · Ethiopian flavors</span><span>© {new Date().getFullYear()} Cloud L Restaurant</span><span className="footer-links"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/accessibility">Accessibility</a></span></div><a className="back-top" href="#top">Back to top <ArrowUpRight size={15} /></a></div></footer>
    </div>
  );
}
