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
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code?size=280x280&data=${encodeURIComponent(
    `Pay ${grandTotal.toFixed(2)} with PingoMe dummy QR`
  )}&bgcolor=ffffff&color=000000`;

  if (paymentStage === 'qr') {
    return (
      <div className="checkout-shell">
        <button className="back-button" onClick={onBack}>
          ← Back to menu
        </button>

        <div className="payment-qr">
          <div className="section-header">
            <h2>Pay with QR Code</h2>
            <p>Scan this code with your payment app to complete the order.</p>
          </div>
          <div className="qr-card">
            <img src={qrUrl} alt="Dummy payment QR code" />
            <div className="qr-details">
              <strong>Amount:</strong> ${grandTotal.toFixed(2)}
            </div>
            <div className="qr-note">
              This is a demo payment page. Scan the QR code to simulate a payment.
            </div>
          </div>
          <button className="checkout-button" onClick={onBack}>
            Back to menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-shell">
      <button className="back-button" onClick={onBack}>
        ← Back to menu
      </button>

      <div className="section-header">
        <h2>Checkout</h2>
        <p>Review your order and complete the payment.</p>
      </div>

      <div className="checkout-grid">
        <section className="payment-panel">
          <h3>Payment Details</h3>
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
          </form>
        </section>

        <aside className="order-summary-panel">
          <h3>Order Summary</h3>
          <div className="summary-list">
            {cartItems.map((item) => (
              <div key={item.id} className="summary-item">
                <span>
                  {item.name} × {item.quantity}
                </span>
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
