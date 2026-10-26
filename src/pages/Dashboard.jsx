import { Link, useSearchParams } from 'react-router-dom'
import CourseCard from '../components/CourseCard.jsx'
import { useApp } from '../context/AppContext.jsx'

export default function Dashboard() {
  const { user, enrolled, progress, updateProgress, wishlist, coursesData: courses, orders } = useApp()
  const [params] = useSearchParams()
  const my = courses.filter(c => enrolled.includes(c.id))
  const wished = courses.filter(c => wishlist.includes(c.id))
  const completed = my.filter(c => (progress[c.id] || 0) >= 100).length
  const avg = my.length ? Math.round(my.reduce((s, c) => s + (progress[c.id] || 0), 0) / my.length) : 0

  if (!user) return (
    <section className="section"><div className="container empty big"><div className="empty-icon">🔐</div><h2 className="serif">Please log in to see My Learning</h2><p>Your enrolled courses, progress and certificates live here.</p><div className="row-gap"><Link className="btn btn-primary btn-lg" to="/login">Log In</Link><Link className="btn btn-outline btn-lg" to="/register">Register Free</Link></div></div></section>
  )

  return (
    <>
      <section className="page-head"><div className="container">
        <p className="eyebrow light">My Learning</p>
        <h1 className="serif white">Welcome{params.get('welcome') ? ' aboard' : ' back'}, {user.name.split(' ')[0]}! 👋</h1>
        <p>{user.email} {params.get('welcome') && '· 🎉 Payment successful (demo) — your new courses are ready below!'}</p>
      </div></section>

      <section className="section"><div className="container">
        <div className="dash-stats">
          <div><b>{my.length}</b><span>Enrolled Courses</span></div>
          <div><b>{completed}</b><span>Completed</span></div>
          <div><b>{avg}%</b><span>Average Progress</span></div>
          <div><b>{wished.length}</b><span>Wishlist Items</span></div>
        </div>

        <h2 className="serif">Continue Learning</h2>
        {my.length === 0 ? (
          <div className="empty big"><div className="empty-icon">📚</div><h3>You haven't enrolled in any course yet</h3><p>Start with a free course or use code <b>HOLIDAY20</b> for 20% off.</p><Link className="btn btn-primary btn-lg" to="/courses">Browse Courses</Link></div>
        ) : (
          <div className="learning-list">
            {my.map(c => { const p = progress[c.id] || 0; return (
              <article className="learning-card" key={c.id}>
                <Link to={`/courses/${c.id}`}><img src={c.image} alt="" /></Link>
                <div className="learning-body">
                  <span className="cat-chip">{c.catName}</span>
                  <Link to={`/courses/${c.id}`}><h3>{c.title}</h3></Link>
                  <p className="muted">{c.instructor} · {c.lessons} lessons · {c.hours}h</p>
                  <div className="progress-bar"><div style={{ width: `${p}%` }} /></div>
                  <div className="progress-row"><span>{p}% complete {p >= 100 && '🏆 Certificate unlocked!'}</span>
                    <span className="row-gap">
                      <button className="btn btn-outline btn-sm" onClick={() => updateProgress(c.id, p + 10)}>+10% Mark Progress</button>
                      {p >= 100
                        ? <button className="btn btn-primary btn-sm" onClick={() => alert(`🏆 Certificate of Completion\n\nThis certifies that ${user.name} has successfully completed\n"${c.title}" on EduFast.\n\n(Demo certificate)`)}>Download Certificate</button>
                        : <Link className="btn btn-primary btn-sm" to={`/courses/${c.id}`}>Continue ▶</Link>}
                    </span>
                  </div>
                </div>
              </article>
            )})}
          </div>
        )}

        {orders && orders.length > 0 && <><h2 className="serif mt-lg">My Orders 🧾</h2><div className="order-list">{[...orders].reverse().map(o => <div className="order-card" key={o.id}><div><b>{o.items.map(i => i.title).join(', ')}</b><span>{new Date(o.createdAt).toLocaleDateString()} · {o.status}{o.promoCode ? ` · Code: ${o.promoCode}` : ''}</span></div><b>${o.total.toFixed(2)}</b></div>)}</div></>}

        {wished.length > 0 && <><h2 className="serif mt-lg">My Wishlist ❤️</h2><div className="course-grid">{wished.map(c => <CourseCard key={c.id} course={c} />)}</div></>}

        <h2 className="serif mt-lg">Recommended For You</h2>
        <div className="course-grid">{courses.filter(c => !enrolled.includes(c.id)).slice(0, 3).map(c => <CourseCard key={c.id} course={c} />)}</div>
      </div></section>
    </>
  )
}
