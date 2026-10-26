import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

type PaymentType = "cash" | "manual_transfer";
type Method = {
  id: string;
  label: string;
  payment_type: PaymentType;
  is_enabled: boolean;
  bank_name: string | null;
  recipient_name: string | null;
  phone_number: string | null;
  account_number: string | null;
  merchant_id: string | null;
  instructions: string | null;
  qr_code_data_url?: string | null;
};
type Change = {
  id: number;
  method_id: string;
  method_label: string;
  action: "create" | "edit" | "toggle";
  created_at: string;
  changed_by: string | null;
  summary: string;
};
type Fields = {
  label: string;
  bank_name: string;
  recipient_name: string;
  phone_number: string;
  account_number: string;
  merchant_id: string;
  instructions: string;
  qr_code_data_url: string;
};
type SettingsResponse = {
  methods?: Method[];
  changes?: Change[];
  error?: string;
};

const emptyFields: Fields = {
  label: "",
  bank_name: "",
  recipient_name: "",
  phone_number: "",
  account_number: "",
  merchant_id: "",
  instructions: "",
  qr_code_data_url: "",
};
const fieldLimits: Partial<Record<keyof Fields, number>> = {
  label: 120,
  bank_name: 120,
  recipient_name: 120,
  phone_number: 40,
  account_number: 80,
  merchant_id: 80,
  instructions: 1000,
};

function fieldsFrom(method: Method): Fields {
  return {
    label: method.label,
    bank_name: method.bank_name || "",
    recipient_name: method.recipient_name || "",
    phone_number: method.phone_number || "",
    account_number: method.account_number || "",
    merchant_id: method.merchant_id || "",
    instructions: method.instructions || "",
    qr_code_data_url: method.qr_code_data_url || "",
  };
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function StaffPaymentSettings() {
  const [methods, setMethods] = useState<Method[]>([]);
  const [changes, setChanges] = useState<Change[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [qrReading, setQrReading] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Fields>(emptyFields);
  const [qrFileName, setQrFileName] = useState("");
  const [hadQr, setHadQr] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/payment-methods", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = (await response.json()) as SettingsResponse;
      if (!response.ok) {
        throw new Error(data.error || "Payment settings unavailable.");
      }
      setMethods(data.methods || []);
      setChanges(data.changes || []);
      setError("");
    } catch (cause) {
      setError(errorMessage(cause, "Payment settings unavailable."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function startEdit(method: Method) {
    setEditing(method.id);
    setForm(fieldsFrom(method));
    setQrFileName("");
    setHadQr(Boolean(method.qr_code_data_url));
  }

  function startAdd() {
    setEditing("new");
    setForm(emptyFields);
    setQrFileName("");
    setHadQr(false);
  }

  function cancel() {
    setEditing(null);
    setForm(emptyFields);
    setQrFileName("");
    setHadQr(false);
  }

  function selectQr(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("QR upload must be PNG, JPEG, or WebP.");
      input.value = "";
      return;
    }
    if (file.size > 400 * 1024) {
      setError("QR image must be 400 KiB or smaller.");
      input.value = "";
      return;
    }

    const reader = new FileReader();
    setQrReading(true);
    setQrFileName(file.name);
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setForm((current) => ({ ...current, qr_code_data_url: reader.result as string }));
        setError("");
      } else {
        setError("Could not read that QR image.");
        setQrFileName("");
      }
      setQrReading(false);
    };
    reader.onerror = () => {
      setError("Could not read that QR image.");
      setQrFileName("");
      setQrReading(false);
    };
    reader.readAsDataURL(file);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || qrReading) return;

    const currentMethod = methods.find((method) => method.id === editing);
    if (currentMethod?.is_enabled) {
      const confirmed = window.confirm(
        "This enabled destination will change for new orders immediately. Existing order instructions stay unchanged. Continue only after independently checking that the new receiving details belong to Cloud L.",
      );
      if (!confirmed) return;
    }

    setBusy(true);
    setError("");
    try {
      const { qr_code_data_url: qrData, ...details } = form;
      const payload: Record<string, string | boolean> =
        editing === "new"
          ? { ...details }
          : { action: "update", id: editing, ...details };
      const hasNewQr = Boolean(qrFileName && qrData.startsWith("data:image/"));

      if (hasNewQr) {
        payload.qr_code_data_url = qrData;
      } else if (editing !== "new" && hadQr && !qrData) {
        payload.remove_qr = true;
      }

      const response = await fetch("/api/admin/payment-methods", {
        method: editing === "new" ? "POST" : "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Could not save destination.");
      }
      cancel();
      await load();
    } catch (cause) {
      setError(errorMessage(cause, "Could not save destination."));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(method: Method) {
    const enabling = !method.is_enabled;
    const action = enabling ? "Enable" : "Disable";
    const message = enabling
      ? "Confirm that the bank/institution, recipient, account/phone/merchant ID, instructions, and optional QR are correct and belong to Cloud L."
      : "New customers will no longer be able to select it; existing orders keep their saved details.";
    if (!window.confirm(`${action} “${method.label}” for customers? ${message}`)) return;

    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/payment-methods", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle",
          id: method.id,
          is_enabled: enabling,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Could not update destination.");
      }
      await load();
    } catch (cause) {
      setError(errorMessage(cause, "Could not update destination."));
    } finally {
      setBusy(false);
    }
  }

  function textInput(key: keyof Fields, title: string, required = false) {
    return (
      <label className="checkout-label" key={key}>
        {title}
        <input
          required={required}
          maxLength={fieldLimits[key] || 120}
          value={form[key]}
          onChange={(event) =>
            setForm((current) => ({ ...current, [key]: event.currentTarget.value }))
          }
        />
      </label>
    );
  }

  const manualMethods = methods.filter((method) => method.payment_type === "manual_transfer");

  return (
    <section className="payment-settings">
      <header className="payment-settings__head">
        <div>
          <p className="tracking-eyebrow">RECEIVING DESTINATIONS</p>
          <h2>Payment <em>settings.</em></h2>
          <p>Manage manual-transfer options shown to customers after order confirmation.</p>
        </div>
        <button
          type="button"
          className="staff-button"
          onClick={startAdd}
          disabled={busy}
        >
          Add destination
        </button>
      </header>

      <p className="payment-settings__warning">
        <strong>High-impact access:</strong> The current shared staff password controls
        these receiving details as well as order operations. There is no separate role for
        payment settings; access must be limited to owner-authorized staff only.
      </p>
      {error && <p className="checkout-error" role="alert">{error}</p>}

      {loading ? (
        <p className="staff-empty">Loading payment settings…</p>
      ) : manualMethods.length === 0 ? (
        <p className="staff-empty">No manual-transfer destinations yet.</p>
      ) : (
        <div className="payment-settings__list">
          {manualMethods.map((method) => (
            <article className="payment-setting" key={method.id}>
              <div>
                <span
                  className={
                    method.is_enabled
                      ? "payment-setting__state is-on"
                      : "payment-setting__state"
                  }
                >
                  {method.is_enabled ? "Enabled" : "Disabled"}
                </span>
                <h3>{method.label}</h3>
                <p>
                  {[
                    method.bank_name,
                    method.recipient_name,
                    method.account_number && `Account ${method.account_number}`,
                    method.phone_number,
                    method.merchant_id && `Merchant ID ${method.merchant_id}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {method.instructions && <small>{method.instructions}</small>}
              </div>
              <div className="payment-setting__actions">
                <button type="button" onClick={() => startEdit(method)} disabled={busy}>
                  Edit
                </button>
                <button type="button" onClick={() => void toggle(method)} disabled={busy}>
                  {method.is_enabled ? "Disable" : "Enable"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing && (
        <form className="payment-setting-form" onSubmit={save}>
          <h3>{editing === "new" ? "Add manual-transfer destination" : "Edit destination"}</h3>
          <p>
            Payment method identity and type cannot be changed. There is no hard-delete
            action. {editing === "new" && "New destinations start disabled; save and review the details, then enable them explicitly."}
          </p>
          <div className="payment-setting-form__grid">
            {textInput("label", "Customer-facing label", true)}
            {textInput("bank_name", "Institution / bank", true)}
            {textInput("recipient_name", "Recipient name", true)}
            {textInput("account_number", "Account number")}
            {textInput("phone_number", "Phone number")}
            {textInput("merchant_id", "Merchant ID")}
          </div>
          <label className="checkout-label">
            Instructions
            <textarea
              rows={3}
              maxLength={1000}
              value={form.instructions}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  instructions: event.currentTarget.value,
                }))
              }
            />
          </label>
          <label className="checkout-label">
            Optional QR image
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={selectQr}
            />
            <small>
              PNG, JPEG, or WebP; maximum 400 KiB. {qrFileName || (form.qr_code_data_url ? "A QR image is currently saved." : "")}
            </small>
          </label>
          {form.qr_code_data_url && (
            <div className="payment-setting__qr">
              <img src={form.qr_code_data_url} alt="Payment QR preview" />
              <button
                type="button"
                onClick={() => {
                  setForm((current) => ({ ...current, qr_code_data_url: "" }));
                  setQrFileName("");
                  setQrReading(false);
                }}
                disabled={qrReading}
              >
                Remove QR
              </button>
            </div>
          )}
          <div className="payment-setting__actions">
            <button type="submit" disabled={busy || qrReading}>
              {qrReading ? "Reading QR…" : busy ? "Saving…" : "Save destination"}
            </button>
            <button type="button" onClick={cancel} disabled={busy || qrReading}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <section className="payment-audit">
        <h3>Recent changes</h3>
        {changes.length ? (
          changes.map((change) => (
            <article key={change.id}>
              <time>
                {new Date(change.created_at).toLocaleString("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </time>
              <strong>{change.method_label}</strong>
              <span>{change.summary}</span>
            </article>
          ))
        ) : (
          <p>No recorded changes.</p>
        )}
      </section>
    </section>
  );
}
