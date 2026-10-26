import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import CourseCard, { Stars } from '../components/CourseCard.jsx'
import { useApp } from '../context/AppContext.jsx'
import { instructors } from '../data/data.js'

export default function CourseDetail() {
  const { id } = useParams()
  const { addToCart, enrolled, enrollFree, wishlist, toggleWishlist, setCartOpen, coursesData: courses } = useApp()
  const course = courses.find(c => c.id === Number(id))
  const navigate = useNavigate()
  const [openIdx, setOpenIdx] = useState(0)

  if (!course) return <div className="container section empty big"><div className="empty-icon">😕</div><h2>Course not found</h2><Link className="btn btn-primary" to="/courses">Back to Courses</Link></div>

  const owned = enrolled.includes(course.id)
  const teacher = instructors.find(i => i.name === course.instructor)
  const related = courses.filter(c => c.category === course.category && c.id !== course.id).slice(0, 3)
  const buyNow = () => { if (course.price === 0) { enrollFree(course); navigate('/my-learning') } else { addToCart(course); setCartOpen(true) } }

  return (
    <>
      <section className="detail-head">
        <div className="container detail-grid">
          <div>
            <p className="crumbs"><Link to="/">Home</Link> / <Link to="/courses">Courses</Link> / {course.catName}</p>
            <h1 className="serif white">{course.title}</h1>
            <p className="detail-sub">{course.desc}</p>
            <div className="detail-meta">
              <span><b>{course.rating}</b> <Stars value={course.rating} /> ({course.reviews.toLocaleString()} reviews)</span>
              <span>▶ {course.lessons} lessons</span><span>🕘 {course.hours} hours</span><span>📶 {course.level}</span>
            </div>
            <div className="instructor-mini light"><img src={course.instructorImg} alt="" /><span>Created by <b>{course.instructor}</b></span></div>
          </div>
          <aside className="buy-card">
            <img src={course.image} alt={course.title} />
            <div className="buy-body">
              <div className="buy-price">{course.price === 0 ? 'Free' : `$${course.price}`} {course.price > 0 && <s>${course.oldPrice}</s>} {course.price > 0 && <span className="off">{Math.round((1 - course.price / course.oldPrice) * 100)}% off</span>}</div>
              {owned
                ? <Link className="btn btn-primary btn-block" to="/my-learning">▶ Continue Learning</Link>
                : <><button className="btn btn-primary btn-block" onClick={buyNow}>{course.price === 0 ? 'Enroll for Free' : 'Buy Now'}</button>
                    {course.price > 0 && <button className="btn btn-outline btn-block" onClick={() => addToCart(course)}>Add to Cart</button>}</>}
              <button className="btn btn-ghost btn-block" onClick={() => toggleWishlist(course.id)}>{wishlist.includes(course.id) ? '❤️ Saved in Wishlist' : '🤍 Add to Wishlist'}</button>
              <ul className="buy-list">
                <li>♾️ Full lifetime access</li><li>📱 Watch on mobile & desktop</li>
                <li>🏆 Certificate of completion</li><li>📁 Downloadable resources</li>
                <li>🛡️ 30-day money-back guarantee</li>
              </ul>
              <p className="promo-hint">💡 Extra 20% off in cart with code <b>HOLIDAY20</b></p>
            </div>
          </aside>
        </div>
      </section>

      <section className="section">
        <div className="container narrow">
          <h2 className="serif">What You Will Learn</h2>
          <div className="outcomes">{course.outcomes.map(o => <div key={o}>✅ {o}</div>)}</div>

          <h2 className="serif mt-lg">Course Curriculum</h2>
          <p className="muted">{course.curriculum.length} sections · {course.lessons} lessons · {course.hours}h total</p>
          <div className="accordion">
            {course.curriculum.map((s, i) => (
              <div key={s} className={`acc-item ${openIdx === i ? 'open' : ''}`}>
                <button className="acc-head" onClick={() => setOpenIdx(openIdx === i ? -1 : i)}><span>Section {i + 1}: {s}</span><span>{openIdx === i ? '−' : '+'}</span></button>
                {openIdx === i && <div className="acc-body">
                  {['Introduction & overview', 'Core concepts explained', 'Hands-on guided practice', 'Real-world mini project', 'Quiz & summary'].map((l, j) => (
                    <div className="lesson-row" key={l}><span>▶ {i + 1}.{j + 1} {l}</span><span>{owned || j === 0 ? (j === 0 && !owned ? 'Preview' : '12:30') : '🔒'}</span></div>
                  ))}
                </div>}
              </div>
            ))}
          </div>

          {teacher && <>
            <h2 className="serif mt-lg">Meet Your Instructor</h2>
            <div className="teacher-card">
              <img src={teacher.image} alt={teacher.name} />
              <div><h3>{teacher.name}</h3><p className="blue-text">{teacher.role}</p><p>{teacher.bio}</p><p className="inst-meta">⭐ {teacher.rating} instructor rating · {teacher.students.toLocaleString()} students · {teacher.courses} courses</p></div>
            </div>
          </>}
        </div>
      </section>

      {related.length > 0 && <section className="section soft"><div className="container"><h2 className="serif center">Students Also Bought</h2><div className="course-grid">{related.map(c => <CourseCard key={c.id} course={c} />)}</div></div></section>}
    </>
  )
}
