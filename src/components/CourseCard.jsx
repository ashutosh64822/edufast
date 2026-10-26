import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'

export function Stars({ value = 5 }) {
  return <span className="stars" aria-label={`${value} stars`}>{'★'.repeat(Math.round(value))}<span className="stars-dim">{'★'.repeat(5 - Math.round(value))}</span></span>
}

export default function CourseCard({ course }) {
  const { addToCart, enrolled, enrollFree, wishlist, toggleWishlist } = useApp()
  const navigate = useNavigate()
  const owned = enrolled.includes(course.id)
  const wished = wishlist.includes(course.id)

  const cta = () => {
    if (owned) return navigate('/my-learning')
    if (course.price === 0) { enrollFree(course); navigate('/my-learning'); return }
    addToCart(course)
  }

  return (
    <article className="course-card">
      <div className="course-img">
        <Link to={`/courses/${course.id}`}><img src={course.image} alt={course.title} loading="lazy" /></Link>
        {course.bestseller && <span className="tag-best">Bestseller</span>}
        {course.price === 0 && <span className="tag-free">FREE</span>}
        <button className={`wish-btn ${wished ? 'active' : ''}`} onClick={() => toggleWishlist(course.id)} aria-label="Add to wishlist">{wished ? '❤️' : '🤍'}</button>
      </div>
      <div className="course-body">
        <div className="course-meta"><span className="cat-chip">{course.catName}</span><span>{course.level}</span></div>
        <Link to={`/courses/${course.id}`}><h3>{course.title}</h3></Link>
        <div className="instructor-mini"><img src={course.instructorImg} alt="" /><span>{course.instructor}</span></div>
        <div className="rating-row"><strong>{course.rating}</strong><Stars value={course.rating} /><span>({course.reviews.toLocaleString()})</span></div>
        <div className="course-info"><span>▶ {course.lessons} lessons</span><span>🕘 {course.hours}h</span><span>♾️ Lifetime</span></div>
        <div className="course-foot">
          <div className="price">{course.price === 0 ? 'Free' : `$${course.price}`} {course.oldPrice > 0 && course.price > 0 && <s>${course.oldPrice}</s>}</div>
          <button className={`btn ${owned ? 'btn-outline' : 'btn-primary btn-sm'}`} onClick={cta}>{owned ? 'Go to Course' : course.price === 0 ? 'Enroll Free' : 'Add to Cart'}</button>
        </div>
      </div>
    </article>
  )
}
