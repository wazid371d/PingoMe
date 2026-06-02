import { useMemo, useState } from 'react';
import './App.css';

const dishes = [
  {
    id: 1,
    name: 'Paneer Butter Masala',
    description: 'Soft paneer cubes in a creamy tomato gravy with warm spices.',
    price: 12.99,
    image:
      'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 2,
    name: 'Veggie Pizza',
    description: 'Crispy crust topped with fresh vegetables, cheese, and herbs.',
    price: 10.5,
    image:
      'https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 3,
    name: 'Sushi Platter',
    description: 'Assorted sushi rolls served with soy sauce, wasabi, and ginger.',
    price: 18.25,
    image:
      'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 4,
    name: 'Avocado Toast',
    description: 'Multigrain toast with smashed avocado, chili flakes, and lemon.',
    price: 8.75,
    image:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 5,
    name: 'Caesar Salad',
    description: 'Crisp romaine lettuce with parmesan, croutons, and creamy dressing.',
    price: 9.5,
    image:
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 6,
    name: 'Chocolate Brownie',
    description: 'Warm fudge brownie topped with ice cream and chocolate sauce.',
    price: 6.95,
    image:
      'https://images.unsplash.com/photo-1521305916504-4a1121188589?auto=format&fit=crop&w=900&q=80',
  },
];

export default function App() {
  const [cartItems, setCartItems] = useState([]);

  const addToCart = (dish) => {
    setCartItems((current) => {
      const existing = current.find((item) => item.id === dish.id);
      if (existing) {
        return current.map((item) =>
          item.id === dish.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...current, { ...dish, quantity: 1 }];
    });
  };

  const updateQuantity = (dishId, delta) => {
    setCartItems((current) =>
      current
        .map((item) =>
          item.id === dishId ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (dishId) => {
    setCartItems((current) => current.filter((item) => item.id !== dishId));
  };

  const total = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  );

  return (
    <div className="app-shell">
      <header className="hero-panel">
        <div>
          <span className="eyebrow">PingoMe</span>
          <h1>Order the best food near you</h1>
          <p>
            Browse a curated menu of delicious meals, add items to your cart, and
            preview your order instantly. No backend needed.
          </p>
        </div>
        <div className="hero-image-card">
          <img
            src="https://images.unsplash.com/photo-1555992336-03a23c6f8f81?auto=format&fit=crop&w=900&q=80"
            alt="Delicious food"
          />
          <div className="hero-tag">Fresh meals ready to order</div>
        </div>
      </header>

      <main className="content-grid">
        <section className="menu-panel">
          <div className="section-header">
            <h2>Featured Menu</h2>
            <p>Choose from a selection of mouthwatering dishes and desserts.</p>
          </div>
          <div className="dish-grid">
            {dishes.map((dish) => (
              <article key={dish.id} className="dish-card">
                <div className="dish-image-wrap">
                  <img src={dish.image} alt={dish.name} />
                </div>
                <div className="dish-info">
                  <div>
                    <h3>{dish.name}</h3>
                    <p>{dish.description}</p>
                  </div>
                  <div className="dish-meta">
                    <strong>${dish.price.toFixed(2)}</strong>
                    <button onClick={() => addToCart(dish)}>Add to cart</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="cart-panel">
          <div className="cart-header">
            <h2>Your Cart</h2>
            <span>{cartItems.length} item{cartItems.length === 1 ? '' : 's'}</span>
          </div>

          {cartItems.length === 0 ? (
            <div className="empty-cart">
              <p>Your cart is empty.</p>
              <p>Add items from the menu to start your order.</p>
            </div>
          ) : (
            <div className="cart-list">
              {cartItems.map((item) => (
                <div key={item.id} className="cart-item">
                  <div className="cart-item-media">
                    <img src={item.image} alt={item.name} />
                    <div>
                      <h3>{item.name}</h3>
                      <p>${item.price.toFixed(2)} x {item.quantity}</p>
                    </div>
                  </div>
                  <div className="cart-actions">
                    <button onClick={() => updateQuantity(item.id, -1)}>-</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)}>+</button>
                    <button className="remove-button" onClick={() => removeFromCart(item.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="cart-summary">
            <div>
              <span>Subtotal</span>
              <strong>${total.toFixed(2)}</strong>
            </div>
            <button className="checkout-button" disabled={cartItems.length === 0}>
              Checkout
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
