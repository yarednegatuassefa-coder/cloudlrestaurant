import { useState } from "react";
import type { CartLine } from "./orderTypes";
import CheckoutForm from "./CheckoutForm";

type OrderCartProps = {
  items: CartLine[];
  itemCount: number;
  subtotal: number;
  isOpen: boolean;
  whatsappHref?: string;
  onOpen: () => void;
  onClose: () => void;
  onSetQuantity: (id: string, quantity: number) => void;
  onOrderPlaced: () => void;
};

const formatMoney = (value: number) => value.toLocaleString("en-US");

export default function OrderCart({ items, itemCount, subtotal, isOpen, whatsappHref, onOpen, onClose, onSetQuantity, onOrderPlaced }: OrderCartProps) {
  const [receipt, setReceipt] = useState<{ reference: string; trackingUrl: string } | null>(null);
  return (
    <>
      <button className="order-cart-trigger" type="button" aria-haspopup="dialog" aria-controls="order-cart-panel" aria-expanded={isOpen} onClick={() => { setReceipt(null); onOpen(); }}>
        <span>{itemCount ? `Your order · ${itemCount}` : "Start an order"}</span>
        {itemCount > 0 && <strong>{formatMoney(subtotal)} ETB</strong>}
      </button>
      {isOpen && <>
        <button className="order-cart-scrim" type="button" aria-label="Close order panel" onClick={onClose} />
        <aside className="order-cart-panel" id="order-cart-panel" role="dialog" aria-modal="true" aria-labelledby="order-cart-title">
          <header className="order-cart__header"><div><p className="order-cart__eyebrow">CLOUD L · ORDER REQUEST</p><h2 id="order-cart-title">{receipt ? "Request received" : "Your order"}</h2></div><button className="order-cart__close" type="button" onClick={onClose} aria-label="Close order panel">×</button></header>
          {receipt ? <section className="order-receipt" aria-live="polite"><p className="order-receipt__eyebrow">SAVED SECURELY · AWAITING STAFF REVIEW</p><h3>Your request is in.</h3><p>Cloud L will confirm availability and any delivery charge before preparing your order.</p><div className="order-receipt__reference"><small>YOUR ORDER REFERENCE</small><strong>{receipt.reference}</strong></div><a className="order-cart__whatsapp checkout-primary" href={receipt.trackingUrl}>Track your order <span aria-hidden="true">→</span></a><p className="checkout-privacy">Keep this private tracking link. Your reference alone is not enough to view order details.</p></section> : items.length === 0 ? <p className="order-cart__empty">Your order is empty. Add food or drinks from the menu to begin.</p> : <>
            <ul className="order-cart__items">{items.map((item) => <li className="order-cart__item" key={item.id}><div className="order-cart__item-copy"><strong>{item.name}{item.size ? ` · ${item.size}` : ""}</strong>{item.nameAmharic && <span lang="am">{item.nameAmharic}</span>}<small>{formatMoney(item.price)} ETB each</small></div><div className="order-cart__quantity" aria-label={`Quantity for ${item.name}`}><button type="button" aria-label={`Remove one ${item.name}`} onClick={() => onSetQuantity(item.id, item.quantity - 1)}>−</button><span aria-live="polite">{item.quantity}</span><button type="button" aria-label={`Add one ${item.name}`} onClick={() => onSetQuantity(item.id, item.quantity + 1)}>+</button></div><strong className="order-cart__line-total">{formatMoney(item.price * item.quantity)} ETB</strong></li>)}</ul>
            <div className="order-cart__subtotal"><span>Menu subtotal</span><strong>{formatMoney(subtotal)} ETB</strong></div>
            <CheckoutForm items={items} subtotal={subtotal} onPlaced={(trackingUrl, reference) => { onOrderPlaced(); setReceipt({ trackingUrl, reference }); }} />
            {whatsappHref && <div className="checkout-whatsapp-fallback"><p>Prefer to request your order in chat?</p><a href={whatsappHref} target="_blank" rel="noreferrer">Continue with WhatsApp <span aria-hidden="true">↗</span></a></div>}
          </>}
        </aside>
      </>}
    </>
  );
}
