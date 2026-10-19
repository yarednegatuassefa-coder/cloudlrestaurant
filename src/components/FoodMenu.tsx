type Item = { en: string; am: string; price: string };
type Section = { id: string; title: string; am: string; description: string; items: Item[] };

const toItems = (rows: string[][]): Item[] =>
  rows.map(([en, am, price]) => ({ en, am, price }));

const sections: Section[] = [
  {
    id: "non-fasting",
    title: "Ethiopian Non-Fasting Foods",
    am: "የፍስክ ምግቦች",
    description:
      "The deep, generous flavors of the Ethiopian table — seasoned, soulful, and meant to share.",
    items: toItems([
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
    ]),
  },
  {
    id: "fasting",
    title: "Ethiopian Fasting Foods",
    am: "የጾም ምግቦች",
    description:
      "Bright, vegetable-rich plates and comforting sauces that let every ingredient speak.",
    items: toItems([
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
    ]),
  },
  {
    id: "american",
    title: "American Foods",
    am: "አሜሪካዊ ምግቦች",
    description:
      "Crisp, comforting, and made to order — from loaded pizzas to the perfect club sandwich.",
    items: toItems([
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
    ]),
  },
];

const css = `
.fm { max-width: 960px; margin: 0 auto; padding: 24px 16px; font-family: system-ui, sans-serif; color: #1f2a44; }
.fm h2 { font-size: 28px; margin: 0 0 4px; }
.fm .am { color: #c9724b; font-size: 20px; margin: 0 0 8px; }
.fm .desc { color: #5a6479; margin: 0 0 16px; }
.fm section { margin-bottom: 40px; }
.fm .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
.fm .card { background: #fdf1e8; border: 1px solid #f1d3bf; border-radius: 12px; padding: 14px 16px; display: flex; justify-content: space-between; gap: 12px; }
.fm .name { font-weight: 600; }
.fm .name-am { color: #5a6479; font-size: 14px; }
.fm .price { font-weight: 700; white-space: nowrap; color: #1f2a44; }
`;

export default function FoodMenu() {
  return (
    <div className="fm" id="food">
      <style>{css}</style>
      {sections.map((s) => (
        <section key={s.id} id={s.id}>
          <h2>{s.title}</h2>
          <p className="am">{s.am}</p>
          <p className="desc">{s.description}</p>
          <div className="grid">
            {s.items.map((item) => (
              <div className="card" key={item.en}>
                <div>
                  <div className="name">{item.en}</div>
                  <div className="name-am">{item.am}</div>
                </div>
                <div className="price">{item.price} ETB</div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}