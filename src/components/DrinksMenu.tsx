import { useMemo, useState } from "react";
import "./DrinksMenu.css";

export type DrinkCategory =
  | "Soft drinks & bottled water"
  | "Tea & infusions"
  | "Coffee & milk drinks"
  | "Beer"
  | "Wine";

export type DrinkVariant = {
  id: string;
  size: string;
  price: number;
};

export type DrinkMenuItem = {
  id: string;
  name: string;
  /** Draft Amharic name/transliteration; verify against Cloud L's preferred spelling before publishing. */
  nameAmharic: string;
  category: DrinkCategory;
  price?: number;
  variants?: DrinkVariant[];
  /** Wine subheading; not a claim about grape, appellation, or origin. */
  subsection?: "Named selections" | "Reserve & international bottles";
  imageSrc?: string;
  imageAlt?: string;
  description?: string;
};

export type DrinkOrderSelection = {
  id: string;
  /** Source menu item ID before an optional size suffix. */
  menuItemId: string;
  name: string;
  nameAmharic: string;
  category: DrinkCategory;
  price: number;
  size?: string;
};

export const DRINK_MENU_ITEMS: DrinkMenuItem[] = [
  {
    id: "soda",
    name: "Soda",
    nameAmharic: "ሶዳ",
    category: "Soft drinks & bottled water",
    price: 70,
    imageSrc: "/assets/drinks/soda.jpg",
    imageAlt: "Chilled sparkling soda in a clear glass",
  },
  {
    id: "ambo",
    name: "Ambo",
    nameAmharic: "አምቦ ውሃ",
    category: "Soft drinks & bottled water",
    price: 50,
    imageSrc: "/assets/drinks/ambo.jpg",
    imageAlt: "Sparkling mineral water in a clear bottle and glass",
  },

  {
    id: "tea",
    name: "Tea",
    nameAmharic: "ሻይ",
    category: "Tea & infusions",
    price: 40,
    imageSrc: "/assets/drinks/tea.jpg",
    imageAlt: "Traditional black tea in a clear glass cup",
  },
  {
    id: "peanut-tea",
    name: "Peanut Tea",
    nameAmharic: "የኦቾሎኒ ሻይ",
    category: "Tea & infusions",
    price: 70,
    imageSrc: "/assets/drinks/peanut-tea.jpg",
    imageAlt: "Tea served with roasted peanuts on the side",
  },
  {
    id: "keshir-ginger-tea",
    name: "Keshir Ginger Tea",
    nameAmharic: "ቀሽር ሻይ",
    category: "Tea & infusions",
    price: 60,
    imageSrc: "/assets/drinks/keshir-ginger-tea.jpg",
    imageAlt: "Amber ginger tea with fresh ginger on the saucer",
  },
  {
    id: "special-tea",
    name: "Special Tea",
    nameAmharic: "ልዩ ሻይ",
    category: "Tea & infusions",
    price: 90,
    imageSrc: "/assets/drinks/special-tea.jpg",
    imageAlt: "A cup of spiced special tea",
  },
  {
    id: "lemon-tea",
    name: "Lemon Tea",
    nameAmharic: "የሎሚ ሻይ",
    category: "Tea & infusions",
    price: 60,
    imageSrc: "/assets/drinks/lemon-tea.jpg",
    imageAlt: "Hot tea served with a slice of lemon",
  },

  {
    id: "macchiato",
    name: "Macchiato",
    nameAmharic: "ማኪያቶ",
    category: "Coffee & milk drinks",
    price: 70,
    imageSrc: "/assets/drinks/macchiato.jpg",
    imageAlt: "Ethiopian macchiato with steamed milk in a small glass cup",
  },
  {
    id: "coffee",
    name: "Coffee",
    nameAmharic: "ቡና",
    category: "Coffee & milk drinks",
    price: 60,
    imageSrc: "/assets/drinks/coffee.jpg",
    imageAlt: "Rich black Ethiopian coffee in a small cup",
  },
  {
    id: "spiris",
    name: "Spiris",
    nameAmharic: "ስፕሪስ",
    category: "Coffee & milk drinks",
    price: 60,
    imageSrc: "/assets/drinks/spiris.jpg",
    imageAlt: "Layered Ethiopian Spiris with tea below and coffee above",
    description: "A 50/50 mix of black tea and strong coffee, traditionally served sweetened.",
  },
  {
    id: "cappuccino",
    name: "Cappuccino",
    nameAmharic: "ካፑቺኖ",
    category: "Coffee & milk drinks",
    price: 130,
    imageSrc: "/assets/drinks/cappuccino.jpg",
    imageAlt: "Cappuccino with simple latte art in a ceramic cup",
  },
  {
    id: "milk",
    name: "Milk",
    nameAmharic: "ወተት",
    category: "Coffee & milk drinks",
    price: 80,
    imageSrc: "/assets/drinks/milk.jpg",
    imageAlt: "A glass of fresh milk",
  },

  {
    id: "draft-beer",
    name: "Draft Beer",
    nameAmharic: "ድራፍት ቢራ",
    category: "Beer",
    price: 65,
    imageSrc: "/assets/drinks/draft-beer.jpg",
    imageAlt: "Freshly poured amber draft beer with a foamy head",
  },
  {
    id: "beer",
    name: "Beer",
    nameAmharic: "ቢራ",
    category: "Beer",
    price: 110,
    imageSrc: "/assets/drinks/beer.jpg",
    imageAlt: "A chilled unbranded beer bottle beside a glass of lager",
  },
  {
    id: "special-beer",
    name: "Special Beer",
    nameAmharic: "ልዩ ቢራ",
    category: "Beer",
    price: 150,
    imageSrc: "/assets/drinks/special-beer.jpg",
    imageAlt: "Golden special beer in a stemmed glass",
  },

  {
    id: "gebeta-wine",
    name: "Gebeta Wine",
    nameAmharic: "ገበታ ወይን",
    category: "Wine",
    subsection: "Named selections",
    price: 2000,
  },
  {
    id: "qine-wine",
    name: "Q'ine Wine",
    nameAmharic: "ቅኔ ወይን",
    category: "Wine",
    subsection: "Named selections",
    price: 2200,
  },
  {
    id: "guder-wine",
    name: "Guder Wine",
    nameAmharic: "ጉደር ወይን",
    category: "Wine",
    subsection: "Named selections",
    price: 1000,
  },
  {
    id: "geez-wine",
    name: "Ge'ez Wine",
    nameAmharic: "ግዕዝ ወይን",
    category: "Wine",
    subsection: "Named selections",
    price: 2200,
  },
  {
    id: "bg-reserve-cabernet-sauvignon",
    name: "Barton & Guestier (B&G) Reserve Cabernet Sauvignon",
    nameAmharic: "ባርተን እና ጌስቲየር ሪዘርቭ ካበርኔ ሶቪኞን",
    category: "Wine",
    subsection: "Reserve & international bottles",
    price: 5500,
  },
  {
    id: "mary-taylor-wine",
    name: "Mary Taylor Wine",
    nameAmharic: "ሜሪ ቴይለር ወይን",
    category: "Wine",
    subsection: "Reserve & international bottles",
    variants: [
      { id: "3l", size: "3 L", price: 5500 },
      { id: "5l", size: "5 L", price: 8500 },
    ],
  },
];

const CATEGORY_META: { id: DrinkCategory; nameAmharic: string }[] = [
  { id: "Soft drinks & bottled water", nameAmharic: "ለስላሳ መጠጦች እና የታሸገ ውሃ" },
  { id: "Tea & infusions", nameAmharic: "ሻይ እና ቅመማ መጠጦች" },
  { id: "Coffee & milk drinks", nameAmharic: "ቡና እና የወተት መጠጦች" },
  { id: "Beer", nameAmharic: "ቢራ" },
  { id: "Wine", nameAmharic: "ወይን" },
];

type CategoryFilter = "All drinks" | DrinkCategory;

export type DrinksMenuProps = {
  /** Connect to the site's existing cart/order handler; this component never submits an order itself. */
  onAddToOrder?: (item: DrinkOrderSelection) => void;
  /** Optional currency label, e.g. "ETB". Defaults to no suffix. */
  currencySuffix?: string;
  /** Map drink IDs plus `wine-category` to WebDev-managed image URLs. */
  imageUrlById?: Partial<Record<string, string>>;
};

const formatPrice = (price: number, currencySuffix: string) =>
  `${price.toLocaleString("en-US")}${currencySuffix ? ` ${currencySuffix}` : ""}`;

export default function DrinksMenu({
  onAddToOrder,
  currencySuffix = "",
  imageUrlById = {},
}: DrinksMenuProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("All drinks");
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const normalizedQuery = query.trim().toLocaleLowerCase();

  const visibleItems = useMemo(
    () =>
      DRINK_MENU_ITEMS.filter((item) => {
        const matchesCategory = activeCategory === "All drinks" || item.category === activeCategory;
        const searchableText = [
          item.name,
          item.nameAmharic,
          item.category,
          item.subsection ?? "",
          ...(item.variants ?? []).map((variant) => variant.size),
          item.description ?? "",
        ]
          .join(" ")
          .toLocaleLowerCase();
        return matchesCategory && (!normalizedQuery || searchableText.includes(normalizedQuery));
      }),
    [activeCategory, normalizedQuery],
  );

  const visibleCategories = CATEGORY_META.filter(({ id }) =>
    visibleItems.some((item) => item.category === id),
  );

  const selectVariant = (itemId: string, variantId: string) => {
    setSelectedVariants((current) => ({ ...current, [itemId]: variantId }));
  };

  const selectedVariant = (item: DrinkMenuItem) => {
    if (!item.variants?.length) return undefined;
    return (
      item.variants.find((variant) => variant.id === selectedVariants[item.id]) ?? item.variants[0]
    );
  };

  const addItem = (item: DrinkMenuItem) => {
    const variant = selectedVariant(item);
    const price = variant?.price ?? item.price;
    if (!onAddToOrder || price === undefined) return;
    onAddToOrder({
      id: variant ? `${item.id}-${variant.id}` : item.id,
      menuItemId: item.id,
      name: item.name,
      nameAmharic: item.nameAmharic,
      category: item.category,
      price,
      ...(variant ? { size: variant.size } : {}),
    });
  };

  return (
    <section className="drinks-menu" id="drinks" aria-labelledby="drinks-menu-title">
      <div className="drinks-menu__inner">
        <header className="drinks-menu__header">
          <p className="drinks-menu__eyebrow">CLOUD L RESTAURANT · ADDIS ABABA</p>
          <div className="drinks-menu__heading-row">
            <div>
              <h2 className="drinks-menu__title" id="drinks-menu-title">
                Drinks <span>menu</span>
              </h2>
              <p className="drinks-menu__title-amharic" lang="am">የመጠጥ ምናሌ</p>
              <p className="drinks-menu__intro">
                A thoughtful pour for every table—from local tea and coffee to wine by the bottle.
              </p>
            </div>
            <p className="drinks-menu__count" aria-live="polite">
              {visibleItems.length} {visibleItems.length === 1 ? "drink" : "drinks"}
            </p>
          </div>
        </header>

        <div className="drinks-menu__controls">
          <label className="drinks-menu__search-wrap">
            <span className="drinks-menu__sr-only">Search drinks / መጠጦችን ይፈልጉ</span>
            <input
              className="drinks-menu__search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Search drinks / መጠጦችን ይፈልጉ"
            />
          </label>

          <div className="drinks-menu__filters" role="group" aria-label="Filter drinks by category">
            {(["All drinks", ...CATEGORY_META.map(({ id }) => id)] as CategoryFilter[]).map(
              (category) => {
                const meta = CATEGORY_META.find((entry) => entry.id === category);
                return (
                  <button
                    className={`drinks-menu__filter${activeCategory === category ? " is-active" : ""}`}
                    type="button"
                    key={category}
                    aria-pressed={activeCategory === category}
                    onClick={() => setActiveCategory(category)}
                  >
                    <span>{category}</span>
                    {meta && <span className="drinks-menu__filter-amharic" lang="am">{meta.nameAmharic}</span>}
                  </button>
                );
              },
            )}
          </div>
        </div>

        {visibleItems.length === 0 ? (
          <p className="drinks-menu__empty" role="status">
            No drinks match that search. / በዚህ ፍለጋ የሚመሳሰሉ መጠጦች የሉም።
          </p>
        ) : (
          <div className="drinks-menu__sections">
            {visibleCategories.map(({ id, nameAmharic }) => {
              const categoryItems = visibleItems.filter((item) => item.category === id);
              const subgroups =
                id === "Wine"
                  ? (["Named selections", "Reserve & international bottles"] as const)
                  : ([undefined] as const);
              return (
                <section
                  className="drinks-menu__category"
                  key={id}
                  aria-labelledby={`drinks-category-${id.replace(/&/g, "and").replace(/\s+/g, "-")}`}
                >
                  <div className="drinks-menu__category-heading">
                    <div>
                      <h3 id={`drinks-category-${id.replace(/&/g, "and").replace(/\s+/g, "-")}`}>
                        {id}
                      </h3>
                      <p className="drinks-menu__category-amharic" lang="am">{nameAmharic}</p>
                    </div>
                    {id === "Wine" ? (
                      <img
                        className="drinks-menu__wine-visual"
                        src={imageUrlById["wine-category"] ?? "/assets/drinks/wine-category.jpg"}
                        alt="Two unbranded wine glasses, one red and one white"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span aria-hidden="true" />
                    )}
                  </div>

                  {subgroups.map((subgroup) => {
                    const subgroupItems = categoryItems.filter((item) =>
                      subgroup ? item.subsection === subgroup : !item.subsection,
                    );
                    if (subgroupItems.length === 0) return null;
                    return (
                      <div className="drinks-menu__subgroup" key={subgroup ?? "items"}>
                        {subgroup && <p className="drinks-menu__subheading">{subgroup}</p>}
                        <div className="drinks-menu__grid">
                          {subgroupItems.map((item) => {
                            const variant = selectedVariant(item);
                            const displayedPrice = variant?.price ?? item.price ?? 0;
                            return (
                              <article
                                className={`drinks-menu__card${item.category === "Wine" ? " drinks-menu__card--text-only" : ""}`}
                                key={item.id}
                              >
                                {item.imageSrc && (
                                  <div className="drinks-menu__photo">
                                    <img
                                      src={imageUrlById[item.id] ?? item.imageSrc}
                                      alt={`${item.imageAlt ?? item.name} / ${item.name} — ${item.nameAmharic}`}
                                      loading="lazy"
                                      decoding="async"
                                    />
                                  </div>
                                )}
                                <div className="drinks-menu__card-body">
                                  <div className="drinks-menu__card-heading">
                                    <div className="drinks-menu__card-copy">
                                      <h4 className="drinks-menu__item-name">{item.name}</h4>
                                      <p className="drinks-menu__amharic" lang="am">{item.nameAmharic}</p>
                                    </div>
                                  </div>
                                  {item.description && (
                                    <p className="drinks-menu__description">{item.description}</p>
                                  )}
                                  {item.variants && (
                                    <div className="drinks-menu__variants" role="group" aria-label="Select wine size">
                                      {item.variants.map((option) => (
                                        <button
                                          className={`drinks-menu__variant${variant?.id === option.id ? " is-active" : ""}`}
                                          type="button"
                                          key={option.id}
                                          aria-pressed={variant?.id === option.id}
                                          onClick={() => selectVariant(item.id, option.id)}
                                        >
                                          <span>{option.size}</span>
                                          <span>{formatPrice(option.price, currencySuffix)}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  <div className="drinks-menu__card-footer">
                                    <p className="drinks-menu__price">
                                      {formatPrice(displayedPrice, currencySuffix)}
                                      {variant && <span className="drinks-menu__price-size"> / {variant.size}</span>}
                                    </p>
                                    {onAddToOrder && (
                                      <button
                                        className="drinks-menu__add"
                                        type="button"
                                        onClick={() => addItem(item)}
                                        aria-label={`Add ${item.name}${variant ? ` ${variant.size}` : ""} to order`}
                                      >
                                        Add to order
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
