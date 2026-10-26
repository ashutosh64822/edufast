import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'

export default function CartDrawer() {
  const { cart, removeFromCart, cartOpen, setCartOpen, checkout, user } = useApp()
  const [code, setCode] = useState('')
  const [discount, setDiscount] = useState(0)
  const [msg, setMsg] = useState('')
  const [paying, setPaying] = useState(false)
  const navigate = useNavigate()
  if (!cartOpen) return null

  const subtotal = cart.reduce((s, c) => s + c.price, 0)
  const total = +(subtotal * (1 - discount)).toFixed(2)

  const apply = () => {
    if (code.trim().toUpperCase() === 'HOLIDAY20') { setDiscount(0.2); setMsg('✅ 20% holiday discount applied!') }
    else { setDiscount(0); setMsg('❌ Invalid code. Try HOLIDAY20') }
  }
  const pay = async () => {
    if (!user) { setCartOpen(false); navigate('/login?next=checkout'); return }
    setPaying(true)
    try {
      await checkout(discount > 0 ? 'HOLIDAY20' : code.trim())
      navigate('/my-learning?welcome=1')
    } catch (e) { setMsg('❌ ' + e.message) }
    finally { setPaying(false) }
  }

  return (
    <div className="drawer-wrap" role="dialog" aria-label="Shopping cart">
      <div className="drawer-backdrop" onClick={() => setCartOpen(false)} />
      <aside className="drawer">
        <div className="drawer-head"><h3>Your Cart ({cart.length})</h3><button className="icon-btn" onClick={() => setCartOpen(false)} aria-label="Close">✕</button></div>
        {cart.length === 0 ? (
          <div className="empty"><div className="empty-icon">🛒</div><p>Your cart is empty.</p><button className="btn btn-primary" onClick={() => { setCartOpen(false); navigate('/courses') }}>Browse Courses</button></div>
        ) : (
          <>
            <div className="cart-items">
              {cart.map(c => (
                <div key={c.id} className="cart-item">
                  <img src={c.image} alt="" />
                  <div><strong>{c.title}</strong><span>{c.instructor}</span><b>${c.price}</b></div>
                  <button className="remove" onClick={() => removeFromCart(c.id)} aria-label="Remove">🗑️</button>
                </div>
              ))}
            </div>
            <div className="promo">
              <input placeholder="Promo code (HOLIDAY20)" value={code} onChange={e => setCode(e.target.value)} />
              <button className="btn btn-outline btn-sm" onClick={apply}>Apply</button>
            </div>
            {msg && <p className="promo-msg">{msg}</p>}
            <div className="totals">
              <div><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
              {discount > 0 && <div className="green"><span>Holiday discount (20%)</span><span>−${(subtotal * discount).toFixed(2)}</span></div>}
              <div className="grand"><span>Total</span><span>${total.toFixed(2)}</span></div>
            </div>
            <button className="btn btn-primary btn-block" onClick={pay} disabled={paying}>{paying ? 'Processing…' : user ? 'Checkout & Enroll Now' : 'Log in to Checkout'}</button>
            <p className="guarantee">🛡️ 30-day money-back guarantee · Secure checkout</p>
            <p className="guarantee">Order & enrollment are saved on the server. Payment gateway is demo — no real payment is taken.</p>
          </>
        )}
      </aside>
    </div>
  )
}
