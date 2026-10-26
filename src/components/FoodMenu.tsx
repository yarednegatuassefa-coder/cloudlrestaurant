import { useMemo, useState } from "react";
import type { OrderSelection } from "./orderTypes";

type Item = { en: string; am: string; price: string; breakfast?: boolean };
type Section = {
  id: string;
  eyebrow: string;
  title: string;
  am: string;
  description: string;
  note?: string;
  image: string;
  imageAlt: string;
  items: Item[];
};
type FoodMenuProps = {
  onAddToOrder?: (item: OrderSelection) => void;
  soldOutItemIds?: Set<string>;
};
type DishImage = { src: string; alt: string; illustrative: boolean };

const MENU_LAST_UPDATED = "21 October 2026";

function foodItemOrderId(sectionId: string, name: string) {
  const catalogName = sectionId === "american-special" ? name.replace(/^Special\s+/i, "") : name;
  const slug = catalogName.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `food-${sectionId}-${slug}`;
}

// The 22 generated entries from mapping.json are embedded here so this file
// works without a separate JSON import or TypeScript configuration change.
// Generated images are illustrative, not photographs of Cloud L's actual food.
const dishImages: Record<string, DishImage> = {
  Dulet: {
    src: "/assets/restaurant/dishes/dulet.webp",
    alt: "Illustrative image of Ethiopian dulet served in a small ceramic dish.",
    illustrative: true,
  },
  "Kuanta Firfir": {
    src: "/assets/restaurant/dishes/kuanta-firfir.webp",
    alt: "Illustrative image of kuanta firfir, injera mixed with dried meat.",
    illustrative: true,
  },
  "Tibs Firfir": {
    src: "/assets/restaurant/dishes/tibs-firfir.webp",
    alt: "Illustrative image of tibs firfir, tibs with injera.",
    illustrative: true,
  },
  "Enkulal Firfir": {
    src: "/assets/restaurant/dishes/enkulal-firfir.webp",
    alt: "Illustrative image of enkulal firfir, scrambled egg with injera.",
    illustrative: true,
  },
  "Bozena Shiro": {
    src: "/assets/restaurant/dishes/bozena-shiro.webp",
    alt: "Illustrative image of bozena shiro with meat.",
    illustrative: true,
  },
  Firfir: {
    src: "/assets/restaurant/dishes/firfir.webp",
    alt: "Illustrative image of plant-based Ethiopian firfir.",
    illustrative: true,
  },
  "Dirkosh Firfir": {
    src: "/assets/restaurant/dishes/dirkosh-firfir.webp",
    alt: "Illustrative image of fasting dirkosh firfir.",
    illustrative: true,
  },
  "Shiro Feses": {
    src: "/assets/restaurant/dishes/shiro-feses.webp",
    alt: "Illustrative image of plant-based shiro feses.",
    illustrative: true,
  },
  Tegabino: {
    src: "/assets/restaurant/dishes/tegabino.webp",
    alt: "Illustrative image of plant-based Ethiopian tegabino.",
    illustrative: true,
  },
  "Telba Fitfit": {
    src: "/assets/restaurant/dishes/telba-fitfit.webp",
    alt: "Illustrative image of plant-based telba fitfit.",
    illustrative: true,
  },
  "Shiro Fitfit": {
    src: "/assets/restaurant/dishes/shiro-fitfit.webp",
    alt: "Illustrative image of plant-based shiro fitfit.",
    illustrative: true,
  },
  "Rice with Vegetables": {
    src: "/assets/restaurant/dishes/rice-with-vegetables.webp",
    alt: "Illustrative image of fasting rice with vegetables.",
    illustrative: true,
  },
  "Macaroni with Tomato Sauce": {
    src: "/assets/restaurant/dishes/macaroni-with-tomato-sauce.webp",
    alt: "Illustrative image of macaroni with tomato sauce.",
    illustrative: true,
  },
  "Timatim Kurte (Tomato Salad)": {
    src: "/assets/restaurant/dishes/timatim-kurte-tomato-salad.webp",
    alt: "Illustrative image of Timatim Kurte tomato salad.",
    illustrative: true,
  },
  "Pasta with Tomato Sauce": {
    src: "/assets/restaurant/dishes/pasta-with-tomato-sauce.webp",
    alt: "Illustrative image of pasta with tomato sauce.",
    illustrative: true,
  },
  "Pasta with Vegetables": {
    src: "/assets/restaurant/dishes/pasta-with-vegetables.webp",
    alt: "Illustrative image of plant-based pasta with vegetables.",
    illustrative: true,
  },
  Chechebsa: {
    src: "/assets/restaurant/dishes/chechebsa.webp",
    alt: "Illustrative image of plant-based Ethiopian chechebsa.",
    illustrative: true,
  },
  Fatira: {
    src: "/assets/restaurant/dishes/fatira.webp",
    alt: "Illustrative image of plain fasting Ethiopian fatira.",
    illustrative: true,
  },
  "Cheese Pizza": {
    src: "/assets/restaurant/dishes/cheese-pizza.webp",
    alt: "Illustrative image of a plain cheese pizza.",
    illustrative: true,
  },
  "Margherita Pizza": {
    src: "/assets/restaurant/dishes/margherita-pizza.webp",
    alt: "Illustrative image of Margherita pizza with tomato, mozzarella, and basil.",
    illustrative: true,
  },
  "Tuna Pizza": {
    src: "/assets/restaurant/dishes/tuna-pizza.webp",
    alt: "Illustrative image of tuna pizza.",
    illustrative: true,
  },
  "French Fries": {
    src: "/assets/restaurant/dishes/french-fries.webp",
    alt: "Illustrative image of plain French fries.",
    illustrative: true,
  },

  // Keep these three existing dish photos in their original location.
  Beyaynetu: {
    src: "/assets/restaurant/dish-beyaynetu.webp",
    alt: "A vibrant Ethiopian fasting platter served on injera",
    illustrative: false,
  },
  Tibs: {
    src: "/assets/restaurant/dish-tibs.webp",
    alt: "Ethiopian tibs served in a traditional dish",
    illustrative: false,
  },
  "Special Pizza": {
    src: "/assets/restaurant/dish-special-pizza.webp",
    alt: "Cloud L special pizza",
    illustrative: false,
  },
};

const sections: Section[] = [
  {
    id: "non-fasting",
    eyebrow: "01 / Ethiopian table",
    title: "Ethiopian Non-Fasting Foods",
    am: "የፍስክ ምግቦች",
    description: "The deep, generous flavors of the Ethiopian table — seasoned, soulful, and meant to share.",
    image: "/assets/restaurant/nonfasting-platter.webp",
    imageAlt: "A colorful non-fasting Ethiopian platter served on injera",
    items: [
      { en: "Dulet", am: "ዱለት", price: "350" },
      { en: "Tibs", am: "ጥብስ", price: "500" },
      { en: "Kuanta Firfir", am: "ቋንጣ ፍርፍር", price: "350" },
      { en: "Tibs Firfir", am: "ጥብስ ፍርፍር", price: "350" },
      { en: "Pasta with Meat", am: "ፓስታ ከስጋ ጋር", price: "300" },
      { en: "Enkulal Firfir", am: "እንቁላል ፍርፍር", price: "280" },
      { en: "Enkulal Sils", am: "እንቁላል ስልስ", price: "260" },
      { en: "Chikina", am: "ጭቅና", price: "500" },
      { en: "Bozena Shiro", am: "ቦዘና ሽሮ", price: "300" },
      { en: "Macaroni with Meat", am: "ማካሮኒ ከስጋ ጋር", price: "300" },
      { en: "Kimsha Yefeski", am: "ቅምሻ የፍስክ", price: "300" },
      { en: "Special Fatira", am: "ስፔሻል ፋጢራ", price: "280", breakfast: true },
      { en: "Special Ful", am: "ስፔሻል ፉል", price: "300", breakfast: true },
      { en: "Fish Goulash", am: "የዓሳ ጉላሽ", price: "500" },
    ],
  },
  {
    id: "fasting",
    eyebrow: "02 / Plant-forward",
    title: "Ethiopian Fasting Foods",
    am: "የጾም ምግቦች",
    description: "Bright, vegetable-rich plates and comforting sauces that let every ingredient speak.",
    note: "Fasting = Plant-based / Vegan-friendly",
    image: "/assets/restaurant/fasting-platter.webp",
    imageAlt: "A vibrant Ethiopian fasting platter with vegetables and lentil stews",
    items: [
      { en: "Beyaynetu", am: "በያይነቱ", price: "450" },
      { en: "Firfir", am: "ፍርፍር", price: "250" },
      { en: "Dirkosh Firfir", am: "ድርቆሽ ፍርፍር", price: "350" },
      { en: "Shiro Feses", am: "ሽሮ ፈሰስ", price: "200" },
      { en: "Tegabino", am: "ተጋቢኖ", price: "250" },
      { en: "Telba Fitfit", am: "ተልባ ፍትፍት", price: "250" },
      { en: "Shiro Fitfit", am: "ሽሮ ፍትፍት", price: "250" },
      { en: "Ye Tsom Agelgil", am: "የጾም አገልግል", price: "700" },
      { en: "Rice with Vegetables", am: "ሩዝ ከአትክልት ጋር", price: "250" },
      { en: "Macaroni with Tomato Sauce", am: "ማካሮኒ በቲማቲም ሶስ", price: "300" },
      { en: "Timatim Kurte (Tomato Salad)", am: "ቲማቲም ቁርጥ", price: "250" },
      { en: "Pasta with Tomato Sauce", am: "ፓስታ በቲማቲም ሶስ", price: "220" },
      { en: "Pasta with Vegetables", am: "ፓስታ ከአትክልት ጋር", price: "250" },
      { en: "Salad", am: "ሰላጣ", price: "400" },
      { en: "Chechebsa", am: "ጨጨብሳ", price: "220", breakfast: true },
      { en: "Half-Half", am: "ሃፍ ሃፍ", price: "400" },
      { en: "Fatira", am: "ፈጢራ", price: "220", breakfast: true },
      { en: "Special Chechebsa", am: "ስፔሻል ጨጨብሳ", price: "250", breakfast: true },
      { en: "Kimsha", am: "ቅምሻ", price: "1,500" },
    ],
  },
  {
    id: "american",
    eyebrow: "03 / Familiar favorites",
    title: "American Foods",
    am: "አሜሪካዊ ምግቦች",
    description: "Crisp, comforting, and made to order — from loaded pizzas to the perfect club sandwich.",
    image: "/assets/restaurant/american-platter.webp",
    imageAlt: "A table of familiar American-style favorites at Cloud L",
    items: [
      { en: "Special Burger", am: "ስፔሻል በርገር", price: "500" },
      { en: "Special Pizza", am: "ስፔሻል ፒዛ", price: "700" },
      { en: "Sandwich", am: "ሳንድዊች", price: "300" },
      { en: "Club Sandwich", am: "ክለብ ሳንድዊች", price: "500" },
      { en: "Vegetable Pizza", am: "የአትክልት ፒዛ", price: "400" },
      { en: "Cheese Pizza", am: "ቺዝ ፒዛ", price: "500" },
      { en: "Margherita Pizza", am: "ማርጋሪታ ፒዛ", price: "500" },
      { en: "Tuna Pizza", am: "ቱና ፒዛ", price: "700" },
      { en: "Vegetable Sandwich", am: "የአትክልት ሳንድዊች", price: "200" },
      { en: "French Fries", am: "ፍሬንች ፍራይስ", price: "280" },
    ],
  },
];

const mutedNote = {
  margin: "0 0 12px",
  fontSize: "0.85rem",
  opacity: 0.75,
  letterSpacing: "0.02em",
} as const;

const breakfastTag = {
  display: "inline-block",
  marginLeft: "8px",
  padding: "1px 8px",
  border: "1px solid currentColor",
  borderRadius: "999px",
  fontSize: "0.65rem",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  opacity: 0.75,
  verticalAlign: "middle",
};

export default function FoodMenu({ onAddToOrder, soldOutItemIds = new Set<string>() }: FoodMenuProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleSections = useMemo(
    () => sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          `${item.en} ${item.am} ${item.price} ${item.breakfast ? "breakfast" : ""}`
            .toLocaleLowerCase()
            .includes(normalizedQuery),
        ),
      }))
      .filter((section) => section.items.length > 0),
    [normalizedQuery],
  );

  return (
    <section className="fm" id="food" aria-label="Food menu">
      <div className="fm__inner">
        <p style={mutedNote}>Menu last updated: {MENU_LAST_UPDATED} · All prices include VAT</p>
        <div className="fm__controls">
          <label className="fm__search-wrap">
            <span className="sr-only">Search food menu</span>
            <span className="fm__search-icon" aria-hidden="true">⌕</span>
            <input
              className="fm__search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Search 43 dishes / ምግቦችን ይፈልጉ"
            />
          </label>
          <nav className="fm__tabs" aria-label="Food menu categories">
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`}>
                {section.title.replace("Ethiopian ", "")}
              </a>
            ))}
          </nav>
        </div>
        <div className="fm__sections">
          {visibleSections.map((section) => (
            <section className="fm__category" key={section.id} id={section.id}>
              <div className="fm__visual">
                <img src={section.image} alt={section.imageAlt} loading="lazy" />
                <span>{section.eyebrow}</span>
              </div>
              <div className="fm__category-content">
                <p className="fm__eyebrow">{section.eyebrow}</p>
                <h2>{section.title}</h2>
                <p className="fm__amharic" lang="am">{section.am}</p>
                <p className="fm__description">{section.description}</p>
                {section.note && <p style={mutedNote}>{section.note}</p>}
                <div className="fm__grid">
                  {section.items.map((item) => {
                    const dishImage = dishImages[item.en];
                    const itemId = foodItemOrderId(section.id, item.en);
                    const isSoldOut = soldOutItemIds.has(itemId);
                    return (
                      <article className={`fm__item${isSoldOut ? " is-sold-out" : ""}`} key={item.en}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            minWidth: 0,
                            flex: "1 1 auto",
                          }}
                        >
                          {dishImage && (
                            <div
                              style={{
                                position: "relative",
                                flex: "0 0 auto",
                                width: "clamp(56px, 7vw, 76px)",
                                height: "clamp(42px, 5.25vw, 57px)",
                                overflow: "hidden",
                                borderRadius: "5px",
                                background: "#eee7dc",
                              }}
                            >
                              <img
                                src={dishImage.src}
                                alt={dishImage.alt}
                                loading="lazy"
                                decoding="async"
                                style={{
                                  display: "block",
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                              />
                              {dishImage.illustrative && (
                                <span
                                  aria-label="Illustrative image, not a photograph of the actual dish"
                                  style={{
                                    position: "absolute",
                                    left: "3px",
                                    bottom: "3px",
                                    padding: "2px 4px",
                                    borderRadius: "3px",
                                    background: "rgba(40, 42, 49, 0.9)",
                                    color: "#fffaf2",
                                    fontSize: "8px",
                                    lineHeight: 1.2,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  Illustrative
                                </span>
                              )}
                            </div>
                          )}
                          <div className="fm__item-name">
                            <strong>
                              {item.en}
                              {item.breakfast && <span style={breakfastTag}>Breakfast</span>}
                            </strong>
                            <span lang="am">{item.am}</span>
                            {isSoldOut && <span className="menu-sold-out">Sold out</span>}
                          </div>
                        </div>
                        <strong className="fm__price">
                          {item.price}<small> ETB</small>
                        </strong>
                        <button
                          className="fm__add"
                          type="button"
                          disabled={isSoldOut}
                          aria-label={isSoldOut ? `${item.en} sold out` : `Add ${item.en} to order`}
                          onClick={() => onAddToOrder?.({
                            id: itemId,
                            name: item.en,
                            nameAmharic: item.am,
                            price: Number(item.price.replaceAll(",", "")),
                          })}
                        >
                          <span aria-hidden="true">+</span>
                        </button>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>
          ))}
          {visibleSections.length === 0 && (
            <p className="fm__empty">No dishes found. Try another search.</p>
          )}
        </div>
      </div>
    </section>
  );
}
