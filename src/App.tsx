import FoodMenu from "./components/FoodMenu";
import DrinksMenu from "./components/DrinksMenu";
import "./site.css";

const mapSearchUrl = "https://maps.app.goo.gl/nCn3gBFXxHHfqp3k9";

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

function App() {
  return (
    <main id="top" className="cloudl-site">
      <section className="hero-shell" aria-label="Cloud L Restaurant introduction">
        <header className="site-nav">
          <a className="site-brand" href="#top" aria-label="Cloud L Restaurant home">
            <img src="/assets/restaurant/cloud-l-logo.svg" alt="Cloud L Restaurant" />
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
            <p className="hero-lede">Find Cloud L Restaurant in Kebena, Addis Ababa for Ethiopian injera platters, fasting-friendly dishes, tibs, and familiar favorites.</p>
            <div className="hero-buttons">
              <a className="button button--copper" href="#food">Explore the menu <span aria-hidden="true">↘</span></a>
              <a className="button button--ghost" href={mapSearchUrl} target="_blank" rel="noreferrer">Find us in Kebena <span aria-hidden="true">↗</span></a>
            </div>
            <div className="hero-proof" aria-label="Restaurant highlights">
              <span><i>✳</i>43 dishes</span>
              <span><i>◉</i>Fasting-friendly</span>
              <span><i>✦</i>Made to share</span>
            </div>
          </div>
          <div className="hero-visual">
            <img className="hero-food" src="/assets/restaurant/hero-ethiopian.webp" alt="A generous Ethiopian platter of colorful stews and injera" />
            <div className="hero-note"><small>Today at Cloud L</small><strong>Come hungry.<br />Leave lighter.<span>✦</span></strong></div>
            <div className="hours-card"><small>Open daily</small><strong>◷ &nbsp;7:00 — 20:30</strong><span>⌖ &nbsp;Queen Elizabeth II St · Kebena</span></div>
          </div>
        </div>
        <div className="hero-footerline"><span>Cloud L Restaurant</span><i /> <span>Kebena · Addis Ababa · Ethiopia</span></div>
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
          <img src="/assets/restaurant/coffee-dessert.webp" alt="A traditional Ethiopian coffee moment at Cloud L" />
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
                  <img src={dish.image} alt={dish.alt} loading="lazy" />
                  <span className="featured-number">{dish.number}</span>
                </div>
                <div className="featured-details">
                  <p>{dish.label}</p>
                  <div><div><h3>{dish.name}</h3><span lang="am">{dish.amharic}</span></div><strong>{dish.price}<small> ETB</small></strong></div>
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

      <FoodMenu />
      <DrinksMenu currencySuffix="ETB" />

      <section className="visit-section" id="visit">
        <div className="visit-inner content-wrap">
          <div>
            <p className="eyebrow eyebrow--light"><span />Bring someone</p>
            <h2>Good food is<br /><em>better together.</em></h2>
            <p>Find Cloud L on Queen Elizabeth II Street in Kebena, Addis Ababa. Use address code 2QJF+XR2 for map directions.</p>
          </div>
          <div className="visit-card">
            <img src="/assets/restaurant/cloud-l-logo.svg" alt="Cloud L Restaurant" />
            <span>2QJF+XR2 · Queen Elizabeth II Street<br />Kebena, Addis Ababa, Ethiopia</span>
            <div className="visit-links">
              <a href="tel:+251901120012">Call us <span>↗</span></a>
              <a href="https://wa.me/251901120012" target="_blank" rel="noreferrer">WhatsApp <span>↗</span></a>
              <a href={mapSearchUrl} target="_blank" rel="noreferrer">Get directions <span>↗</span></a>
            </div>
          </div>
        </div>
        <footer className="site-footer content-wrap"><span>© Cloud L Restaurant</span><a href="#top">Back to the top ↑</a><span>Made for Addis, with love</span></footer>
      </section>
    </main>
  );
}

export default App;
