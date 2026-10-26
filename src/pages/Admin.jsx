import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { api } from '../lib/api.js'
import { categories } from '../data/data.js'

const blank = { title: '', category: 'development', price: 49, oldPrice: 99, level: 'Beginner', instructor: '', lessons: 20, hours: 5, desc: '', image: '/images/course-web.jpg' }
const IMAGE_OPTIONS = ['/images/course-web.jpg', '/images/course-code.jpg', '/images/course-data.jpg', '/images/course-python.jpg', '/images/course-business.jpg', '/images/course-marketing.jpg', '/images/course-design.jpg', '/images/course-uiux.jpg', '/images/course-architecture.jpg', '/images/course-laptop.jpg', '/images/course-js.jpg', '/images/course-dev.jpg']

export default function Admin() {
  const { user, coursesData, refreshCourses, toast } = useApp()
  const [stats, setStats] = useState(null)
  const [form, setForm] = useState(blank)
  const [editingId, setEditingId] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const loadStats = () => api('/api/admin/stats').then(setStats).catch(() => {})
  useEffect(() => { if (user?.role === 'admin') loadStats() }, [user])

  if (!user) return <section className="section"><div className="container empty big"><div className="empty-icon">🔐</div><h2 className="serif">Admin login required</h2><p>Log in with the admin account: <b>admin@edufast.com</b> / <b>admin123</b></p><Link className="btn btn-primary btn-lg" to="/login">Log In</Link></div></section>
  if (user.role !== 'admin') return <section className="section"><div className="container empty big"><div className="empty-icon">⛔</div><h2 className="serif">Admins only</h2><p>You are logged in as {user.email} (student account).</p><Link className="btn btn-primary btn-lg" to="/my-learning">Go to My Learning</Link></div></section>

  const save = async (e) => {
    e.preventDefault(); setBusy(true)
    try {
      const body = { ...form, price: Number(form.price), oldPrice: Number(form.oldPrice), lessons: Number(form.lessons), hours: Number(form.hours) }
      if (editingId) await api(`/api/admin/courses/${editingId}`, { method: 'PUT', body })
      else await api('/api/admin/courses', { method: 'POST', body })
      toast(editingId ? 'Course updated on server ✅' : 'Course added to the website 🎉')
      setForm(blank); setEditingId(null); await refreshCourses(); loadStats()
    } catch (err2) { toast('❌ ' + err2.message) } finally { setBusy(false) }
  }
  const edit = (c) => { setEditingId(c.id); setForm({ title: c.title, category: c.category, price: c.price, oldPrice: c.oldPrice, level: c.level, instructor: c.instructor, lessons: c.lessons, hours: c.hours, desc: c.desc, image: c.image }); window.scrollTo({ top: 320, behavior: 'smooth' }) }
  const remove = async (c) => { if (!window.confirm(`Delete "${c.title}" permanently?`)) return; try { await api(`/api/admin/courses/${c.id}`, { method: 'DELETE' }); toast('Course deleted'); await refreshCourses(); loadStats() } catch (e) { toast('❌ ' + e.message) } }

  return (
    <>
      <section className="page-head"><div className="container"><p className="eyebrow light">Admin Panel</p><h1 className="serif white">Welcome, {user.name} 🛠️</h1><p>Manage courses, see users, orders and messages — everything here comes live from the backend database.</p></div></section>
      <section className="section"><div className="container">
        {stats && <div className="dash-stats admin-stats">
          <div><b>{stats.users}</b><span>Registered Users</span></div><div><b>{stats.courses}</b><span>Courses</span></div>
          <div><b>{stats.enrollments}</b><span>Enrollments</span></div><div><b>{stats.orders}</b><span>Orders</span></div>
          <div><b>${stats.revenue}</b><span>Revenue (demo)</span></div><div><b>{stats.messages}</b><span>Contact Messages</span></div><div><b>{stats.subscribers}</b><span>Newsletter Subs</span></div>
        </div>}

        <div className="admin-grid">
          <form className="form-card" onSubmit={save}>
            <h2 className="serif">{editingId ? '✏️ Edit Course' : '➕ Add New Course'}</h2>
            <label>Course Title *<input value={form.title} onChange={set('title')} placeholder="e.g. Excel for Beginners" required /></label>
            <label>Category<select value={form.category} onChange={set('category')}>{categories.filter(c => c.id !== 'all').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <div className="form-row"><label>Price ($) — 0 = Free<input type="number" min="0" value={form.price} onChange={set('price')} /></label><label>Old Price ($)<input type="number" min="0" value={form.oldPrice} onChange={set('oldPrice')} /></label></div>
            <div className="form-row"><label>Lessons<input type="number" min="1" value={form.lessons} onChange={set('lessons')} /></label><label>Hours<input type="number" min="1" value={form.hours} onChange={set('hours')} /></label></div>
            <label>Level<select value={form.level} onChange={set('level')}><option>Beginner</option><option>Intermediate</option><option>Advanced</option><option>All Levels</option></select></label>
            <label>Instructor Name<input value={form.instructor} onChange={set('instructor')} placeholder="e.g. Jane Seymour" /></label>
            <label>Cover Image<select value={form.image} onChange={set('image')}>{IMAGE_OPTIONS.map(i => <option key={i} value={i}>{i.replace('/images/course-', '').replace('.jpg', '')}</option>)}</select></label>
            <label>Description<textarea rows="3" value={form.desc} onChange={set('desc')} placeholder="What will students learn?" /></label>
            <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Saving…' : editingId ? 'Save Changes' : 'Publish Course'}</button>
            {editingId && <button type="button" className="btn btn-ghost btn-block" onClick={() => { setEditingId(null); setForm(blank) }}>Cancel editing</button>}
          </form>

          <div>
            <h2 className="serif">All Courses ({coursesData.length})</h2>
            <div className="admin-table">
              {coursesData.map(c => <div className="admin-row" key={c.id}><img src={c.image} alt="" /><div><b>{c.title}</b><span>{c.catName} · {c.price === 0 ? 'Free' : `$${c.price}`} · {c.instructor}</span></div><button className="btn btn-outline btn-sm" onClick={() => edit(c)}>Edit</button><button className="btn btn-sm danger" onClick={() => remove(c)}>Delete</button></div>)}
            </div>
          </div>
        </div>

        {stats && <>
          <h2 className="serif mt-lg">Recent Orders 🧾</h2>
          {stats.recentOrders.length === 0 ? <p className="muted">No orders yet — buy a course as a student to see one here.</p> :
            <div className="order-list">{stats.recentOrders.map(o => <div className="order-card" key={o.id}><div><b>{o.items.map(i => i.title).join(', ')}</b><span>{new Date(o.createdAt).toLocaleString()} · {o.status}</span></div><b>${o.total.toFixed(2)}</b></div>)}</div>}
          <h2 className="serif mt-lg">Contact Messages 📩</h2>
          {stats.recentMessages.length === 0 ? <p className="muted">No messages yet — send one from the Contact page.</p> :
            <div className="order-list">{stats.recentMessages.map(m => <div className="order-card" key={m.id}><div><b>{m.name} — {m.subject}</b><span>{m.email} · {new Date(m.createdAt).toLocaleString()}</span><span>{m.message}</span></div></div>)}</div>}
          <h2 className="serif mt-lg">Registered Users 👥</h2>
          <div className="order-list">{stats.userList.map(u => <div className="order-card" key={u.id}><div><b>{u.name}</b><span>{u.email}</span></div><span className="cat-chip">{u.role}</span></div>)}</div>
        </>}
      </div></section>
    </>
  )
}
