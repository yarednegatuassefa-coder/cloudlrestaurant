import { useMemo, useState } from "react";
import type { OrderSelection } from "./orderTypes";

type Item = { en: string; am: string; price: string };
type Section = {
  id: string;
  eyebrow: string;
  title: string;
  am: string;
  description: string;
  image: string;
  imageAlt: string;
  items: Item[];
};

type FoodMenuProps = {
  onAddToOrder?: (item: OrderSelection) => void;
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
      { en: "Special Fatira", am: "ስፔሻል ፋጢራ", price: "280" },
      { en: "Special Ful", am: "ስፔሻል ፉል", price: "300" },
      { en: "Fish Goulash", am: "የዓሳ ጉላሽ", price: "500" },
    ],
  },
  {
    id: "fasting",
    eyebrow: "02 / Plant-forward",
    title: "Ethiopian Fasting Foods",
    am: "የጾም ምግቦች",
    description: "Bright, vegetable-rich plates and comforting sauces that let every ingredient speak.",
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
      { en: "Chechebsa", am: "ጨጨብሳ", price: "220" },
      { en: "Half-Half", am: "ሃፍ ሃፍ", price: "400" },
      { en: "Fatira", am: "ፈጢራ", price: "220" },
      { en: "Special Chechebsa", am: "ስፔሻል ጨጨብሳ", price: "250" },
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

export default function FoodMenu({ onAddToOrder }: FoodMenuProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleSections = useMemo(
    () => sections.map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        `${item.en} ${item.am} ${item.price}`.toLocaleLowerCase().includes(normalizedQuery),
      ),
    })).filter((section) => section.items.length > 0),
    [normalizedQuery],
  );

  return (
    <section className="fm" id="food" aria-label="Food menu">
      <div className="fm__inner">
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
            {sections.map((section) => <a key={section.id} href={`#${section.id}`}>{section.title.replace("Ethiopian ", "")}</a>)}
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
                <div className="fm__grid">
                  {section.items.map((item) => (
                    <article className="fm__item" key={item.en}>
                      <div className="fm__item-name"><strong>{item.en}</strong><span lang="am">{item.am}</span></div>
                      <strong className="fm__price">{item.price}<small> ETB</small></strong>
                      <button
                        className="fm__add"
                        type="button"
                        aria-label={`Add ${item.en} to order`}
                        onClick={() => onAddToOrder?.({
                          id: `food-${section.id}-${item.en.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
                          name: item.en,
                          nameAmharic: item.am,
                          price: Number(item.price.replaceAll(",", "")),
                        })}
                      >
                        <span aria-hidden="true">+</span>
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          ))}
          {visibleSections.length === 0 && <p className="fm__empty">No dishes found. Try another search.</p>}
        </div>
      </div>
    </section>
  );
}
