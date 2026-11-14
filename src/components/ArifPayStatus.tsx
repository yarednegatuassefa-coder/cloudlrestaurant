import "./ArifPayStatus.css";

type Props = { variant: "hero" | "checkout" };

export default function ArifPayStatus({ variant }: Props) {
  if (variant === "hero") {
    return (
      <div className="arifpay-teaser">
        <img src="/assets/partners/arifpay-mark.jpg" alt="" width={28} height={28} />
        <span className="arifpay-teaser__copy">
          <strong>ArifPay</strong>
          <small>Cashless payments · coming soon</small>
        </span>
        <span className="arifpay-teaser__status">Soon</span>
      </div>
    );
  }

  return (
    <aside className="arifpay-panel" aria-labelledby="arifpay-panel-title">
      <div className="arifpay-panel__top">
        <div className="arifpay-panel__brand">
          <img src="/assets/partners/arifpay-mark.jpg" alt="" width={42} height={42} loading="lazy" />
          <div>
            <span className="arifpay-panel__eyebrow">A new way to settle</span>
            <h3 id="arifpay-panel-title">ArifPay</h3>
          </div>
        </div>
        <span className="arifpay-panel__badge">Coming soon</span>
      </div>
      <p className="arifpay-panel__description">
        Cashless payments through participating banks and Telebirr are planned. We’ll enable this option only after Cloud L’s merchant onboarding and API access are complete.
      </p>
      <div className="arifpay-panel__footer">
        <span className="arifpay-panel__channels">Banks <i aria-hidden="true">·</i> Telebirr</span>
        <span className="arifpay-panel__availability">Not available to pay yet</span>
      </div>
    </aside>
  );
}
