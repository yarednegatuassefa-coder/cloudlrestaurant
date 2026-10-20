import type { CartLine } from "./orderTypes";

type OrderCartProps = {
  items: CartLine[];
  itemCount: number;
  subtotal: number;
  isOpen: boolean;
  whatsappHref?: string;
  onOpen: () => void;
  onClose: () => void;
  onSetQuantity: (id: string, quantity: number) => void;
};

const formatMoney = (value: number) => value.toLocaleString("en-US");

export default function OrderCart({
  items,
  itemCount,
  subtotal,
  isOpen,
  whatsappHref,
  onOpen,
  onClose,
  onSetQuantity,
}: OrderCartProps) {
  return (
    <>
      <button
        className="order-cart-trigger"
        type="button"
        aria-haspopup="dialog"
        aria-controls="order-cart-panel"
        aria-expanded={isOpen}
        onClick={onOpen}
      >
        <span>{itemCount ? `Your order · ${itemCount}` : "Start an order"}</span>
        {itemCount > 0 && <strong>{formatMoney(subtotal)} ETB</strong>}
      </button>

      {isOpen && (
        <>
          <button
            className="order-cart-scrim"
            type="button"
            aria-label="Close order panel"
            onClick={onClose}
          />
          <aside
            className="order-cart-panel"
            id="order-cart-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-cart-title"
          >
            <header className="order-cart__header">
              <div>
                <p className="order-cart__eyebrow">CLOUD L · ORDER REQUEST</p>
                <h2 id="order-cart-title">Your order</h2>
              </div>
              <button className="order-cart__close" type="button" onClick={onClose} aria-label="Close order panel">
                ×
              </button>
            </header>

            {items.length === 0 ? (
              <p className="order-cart__empty">Your order is empty. Add food or drinks from the menu to begin.</p>
            ) : (
              <>
                <ul className="order-cart__items">
                  {items.map((item) => (
                    <li className="order-cart__item" key={item.id}>
                      <div className="order-cart__item-copy">
                        <strong>{item.name}{item.size ? ` · ${item.size}` : ""}</strong>
                        {item.nameAmharic && <span lang="am">{item.nameAmharic}</span>}
                        <small>{formatMoney(item.price)} ETB each</small>
                      </div>
                      <div className="order-cart__quantity" aria-label={`Quantity for ${item.name}`}>
                        <button
                          type="button"
                          aria-label={`Remove one ${item.name}`}
                          onClick={() => onSetQuantity(item.id, item.quantity - 1)}
                        >
                          −
                        </button>
                        <span aria-live="polite">{item.quantity}</span>
                        <button
                          type="button"
                          aria-label={`Add one ${item.name}`}
                          onClick={() => onSetQuantity(item.id, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                      <strong className="order-cart__line-total">
                        {formatMoney(item.price * item.quantity)} ETB
                      </strong>
                    </li>
                  ))}
                </ul>

                <div className="order-cart__subtotal">
                  <span>Menu subtotal</span>
                  <strong>{formatMoney(subtotal)} ETB</strong>
                </div>
                <p className="order-cart__notice">
                  This opens a draft message in WhatsApp. Your request is sent only when you tap Send. Cloud L will confirm availability and the final amount.
                </p>
                {whatsappHref ? (
                  <a className="order-cart__whatsapp" href={whatsappHref} target="_blank" rel="noreferrer" onClick={onClose}>
                    Continue on WhatsApp <span aria-hidden="true">↗</span>
                  </a>
                ) : (
                  <button className="order-cart__whatsapp" type="button" disabled>
                    Continue on WhatsApp
                  </button>
                )}
              </>
            )}
          </aside>
        </>
      )}
    </>
  );
}
