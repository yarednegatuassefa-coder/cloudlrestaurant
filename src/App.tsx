import FoodMenu from "./components/FoodMenu";
import DrinksMenu from "./components/DrinksMenu";

function App() {
  return (
    <div>
      <header
        style={{
          padding: "24px 16px",
          fontFamily: "system-ui, sans-serif",
          background: "#1f2a44",
          color: "#fdf1e8",
          textAlign: "center",
        }}
      >
        <h1 style={{ margin: 0 }}>Cloud L Restaurant</h1>
        <p style={{ margin: "8px 0 0" }}>
          <a href="#food" style={{ color: "#f6d7c3", margin: "0 8px" }}>Food</a>
          <a href="#drinks" style={{ color: "#f6d7c3", margin: "0 8px" }}>Drinks / መጠጦች</a>
          <a href="tel:+251901120012" style={{ color: "#f6d7c3", margin: "0 8px" }}>Call</a>
          <a href="https://wa.me/251901120012" style={{ color: "#f6d7c3", margin: "0 8px" }}>WhatsApp</a>
        </p>
      </header>
      <FoodMenu />
      <div id="drinks">
        <DrinksMenu />
      </div>
    </div>
  );
}

export default App;