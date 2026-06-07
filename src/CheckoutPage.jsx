import { useState } from 'react';

export default function CheckoutPage({ cartItems, total, onBack }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    address: '',
    card: '',
    expiry: '',
    cvv: '',
  });
  const [paymentStage, setPaymentStage] = useState('form');

  const updateField = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    setPaymentStage('qr');
  };

  const taxes = total * 0.08;
  const grandTotal = total + taxes;
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code?size=280x280&data=${encodeURIComponent(
    `Pay ${grandTotal.toFixed(2)} with PingoMe dummy QR`
  )}&bgcolor=ffffff&color=4f46e5`;

  if (paymentStage === 'qr') {
    return (
      <div className="checkout-shell">
        <button className="back-button" onClick={onBack}>
          ← Back to menu
        </button>

        <div className="checkout-hero">
          <span className="checkout-hero-badge">Almost there</span>
          <h2>Scan &amp; Pay</h2>
          <p>Open your favorite UPI or wallet app and scan to complete the order.</p>
        </div>

        <div className="payment-qr">
          <div className="qr-card">
            <div className="qr-amount-pill">
              Total due <strong>${grandTotal.toFixed(2)}</strong>
            </div>
            <div className="qr-frame">
              <img src={qrUrl} alt="Dummy payment QR code" />
            </div>
            <div className="qr-note">
              <span className="qr-lock">🔒</span> This is a demo payment page. Scan
              the QR code to simulate a secure payment.
            </div>
            <button className="checkout-button" onClick={onBack}>
              Done — back to menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-shell">
      <button className="back-button" onClick={onBack}>
        ← Back to menu
      </button>

      <div className="checkout-hero">
        <span className="checkout-hero-badge">Secure checkout</span>
        <h2>Complete your order</h2>
        <p>You're just one step away from a delicious meal.</p>
        <div className="checkout-steps">
          <span className="step done">1 · Cart</span>
          <span className="step active">2 · Payment</span>
          <span className="step">3 · Confirm</span>
        </div>
      </div>

      <div className="checkout-grid">
        <section className="payment-panel">
          <div className="panel-head">
            <h3>Payment details</h3>
            <span className="card-brands">💳 Visa · Mastercard · UPI</span>
          </div>
          <form className="payment-form" onSubmit={handleSubmit}>
            <label>
              Full name
              <input
                type="text"
                required
                value={form.name}
                onChange={updateField('name')}
                placeholder="Jane Doe"
              />
            </label>
            <label>
              Email
              <input
                type="email"
                required
                value={form.email}
                onChange={updateField('email')}
                placeholder="jane@example.com"
              />
            </label>
            <label>
              Delivery address
              <input
                type="text"
                required
                value={form.address}
                onChange={updateField('address')}
                placeholder="221B Baker Street"
              />
            </label>
            <label>
              Card number
              <input
                type="text"
                required
                inputMode="numeric"
                value={form.card}
                onChange={updateField('card')}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
              />
            </label>
            <div className="payment-form-row">
              <label>
                Expiry
                <input
                  type="text"
                  required
                  value={form.expiry}
                  onChange={updateField('expiry')}
                  placeholder="MM/YY"
                  maxLength={5}
                />
              </label>
              <label>
                CVV
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  value={form.cvv}
                  onChange={updateField('cvv')}
                  placeholder="123"
                  maxLength={4}
                />
              </label>
            </div>
            <button
              type="submit"
              className="checkout-button"
              disabled={cartItems.length === 0}
            >
              Pay ${grandTotal.toFixed(2)}
            </button>
            <p className="secure-note">
              <span>🔒</span> Payments are encrypted and 100% secure.
            </p>
          </form>
        </section>

        <aside className="order-summary-panel">
          <div className="panel-head">
            <h3>Order summary</h3>
            <span className="summary-count">{itemCount} item{itemCount === 1 ? '' : 's'}</span>
          </div>
          <div className="summary-list">
            {cartItems.map((item) => (
              <div key={item.id} className="summary-item">
                <div className="summary-item-media">
                  <img src={item.image} alt={item.name} />
                  <div>
                    <span className="summary-item-name">{item.name}</span>
                    <span className="summary-item-qty">Qty {item.quantity}</span>
                  </div>
                </div>
                <strong>${(item.price * item.quantity).toFixed(2)}</strong>
              </div>
            ))}
          </div>
          <div className="summary-totals">
            <div>
              <span>Subtotal</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <div>
              <span>Taxes (8%)</span>
              <span>${taxes.toFixed(2)}</span>
            </div>
            <div>
              <span>Delivery</span>
              <span className="free-tag">Free</span>
            </div>
            <div className="summary-grand">
              <span>Total</span>
              <strong>${grandTotal.toFixed(2)}</strong>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
