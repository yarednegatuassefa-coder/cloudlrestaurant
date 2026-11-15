import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { CartLine } from "./orderTypes";
const CheckoutForm = lazy(() => import("./CheckoutForm"));

type OrderCartProps = {
  items: CartLine[];
  itemCount: number;
  subtotal: number;
  isOpen: boolean;
  notice?: string;
  whatsappHref?: string;
  isEditingOrder?: boolean;
  editingOrderReference?: string;
  editError?: string;
  isSavingEdit?: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSetQuantity: (id: string, quantity: number) => void;
  onOrderPlaced: () => void;
  onDismissNotice?: () => void;
  onSaveOrderEdit?: () => void;
  onCancelOrderEdit?: () => void;
};

const formatMoney = (value: number) => value.toLocaleString("en-US");

export default function OrderCart({
  items,
  itemCount,
  subtotal,
  isOpen,
  notice,
  whatsappHref,
  isEditingOrder = false,
  editingOrderReference = "",
  editError = "",
  isSavingEdit = false,
  onOpen,
  onClose,
  onSetQuantity,
  onOrderPlaced,
  onDismissNotice,
  onSaveOrderEdit,
  onCancelOrderEdit,
}: OrderCartProps) {
  const [receipt, setReceipt] = useState<{ reference: string; trackingUrl: string } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )).filter((element) => element.getAttribute("aria-hidden") !== "true");
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
      else triggerRef.current?.focus();
    };
  }, [isOpen]);

  return (
    <>
      <button ref={triggerRef} className="order-cart-trigger" type="button" aria-haspopup="dialog" aria-controls="order-cart-panel" aria-expanded={isOpen} onClick={() => { setReceipt(null); onOpen(); }}>
        <span>{isEditingOrder ? `Editing · ${itemCount}` : itemCount ? `Your order · ${itemCount}` : "Start an order"}</span>
        {itemCount > 0 && <strong>{formatMoney(subtotal)} ETB</strong>}
      </button>
      {isOpen && <>
        <button className="order-cart-scrim" type="button" aria-label="Close order panel" onClick={onClose} />
        <aside ref={panelRef} tabIndex={-1} className="order-cart-panel" id="order-cart-panel" role="dialog" aria-modal="true" aria-labelledby="order-cart-title">
          <header className="order-cart__header">
            <div><p className="order-cart__eyebrow">CLOUD L · ORDER REQUEST</p><h2 id="order-cart-title">{receipt ? "Request received" : isEditingOrder ? `Edit request${editingOrderReference ? ` · ${editingOrderReference}` : ""}` : "Your order"}</h2></div>
            <button ref={closeButtonRef} className="order-cart__close" type="button" onClick={onClose} aria-label="Close order panel">×</button>
          </header>
          {receipt ? <section className="order-receipt" aria-live="polite">
            <p className="order-receipt__eyebrow">SAVED SECURELY · AWAITING STAFF REVIEW</p>
            <h3>Your request is in.</h3>
            <p>Cloud L will confirm availability and any delivery charge before preparing your order.</p>
            <div className="order-receipt__reference"><small>YOUR ORDER REFERENCE</small><strong>{receipt.reference}</strong></div>
            <a className="order-cart__whatsapp checkout-primary" href={receipt.trackingUrl}>Track your order <span aria-hidden="true">→</span></a>
            <p className="checkout-privacy">Keep this private tracking link. Your reference alone is not enough to view order details.</p>
          </section> : items.length === 0 && !isEditingOrder ? <p className="order-cart__empty">Your order is empty. Add food or drinks from the menu to begin.</p> : <>
            {notice && <div className="order-cart__reorder-notice" role="status"><p>{notice}</p>{onDismissNotice && <button type="button" onClick={onDismissNotice} aria-label="Dismiss reorder notice">×</button>}</div>}
            {editError && <p className="order-edit__error" role="alert">{editError}</p>}
            {items.length === 0 ? <p className="order-cart__empty order-edit__empty">Add at least one menu item before saving. <a href="#food" onClick={onClose}>Return to the menu</a>.</p> : <ul className="order-cart__items">{items.map((item) => <li className="order-cart__item" key={item.id}>
              <div className="order-cart__item-copy">
                <strong>{item.name}{item.size ? ` · ${item.size}` : ""}</strong>
                {item.nameAmharic && <span lang="am">{item.nameAmharic}</span>}
                <small>{formatMoney(item.price)} ETB each</small>
              </div>
              <div className="order-cart__quantity" aria-label={`Quantity for ${item.name}`}>
                <button type="button" aria-label={`Remove one ${item.name}`} onClick={() => onSetQuantity(item.id, item.quantity - 1)}>−</button>
                <span aria-live="polite">{item.quantity}</span>
                <button type="button" aria-label={`Add one ${item.name}`} disabled={item.quantity >= 10} onClick={() => onSetQuantity(item.id, item.quantity + 1)}>+</button>
              </div>
              <strong className="order-cart__line-total">{formatMoney(item.price * item.quantity)} ETB</strong>
            </li>)}</ul>}
            {items.length > 0 && <div className="order-cart__subtotal"><span>Menu subtotal</span><strong>{formatMoney(subtotal)} ETB</strong></div>}
            {isEditingOrder ? <div className="order-edit__actions">
              <button className="checkout-primary" type="button" disabled={isSavingEdit || items.length === 0} onClick={onSaveOrderEdit}>{isSavingEdit ? "Saving your changes…" : "Save changes to request"}</button>
              <button className="order-edit__cancel" type="button" disabled={isSavingEdit} onClick={onCancelOrderEdit}>Cancel editing</button>
              <p className="checkout-privacy">This edits the existing request only. No new payment or order will be submitted.</p>
            </div> : items.length > 0 && <>
              <Suspense fallback={<p className="checkout-note" role="status">Loading secure checkout / የክፍያ መረጃን በመጫን ላይ…</p>}>
                <CheckoutForm items={items} subtotal={subtotal} onPlaced={(trackingUrl, reference) => { onOrderPlaced(); setReceipt({ trackingUrl, reference }); }} />
              </Suspense>
              {whatsappHref && <div className="checkout-whatsapp-fallback"><p>Prefer to request your order in chat?</p><a href={whatsappHref} target="_blank" rel="noreferrer">Continue with WhatsApp <span aria-hidden="true">↗</span></a></div>}
            </>}
          </>}
        </aside>
      </>}
    </>
  );
}
