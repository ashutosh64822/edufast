// EduFast database layer
// -----------------------------------------------------------------------------
// Production mode (recommended for Netlify/Vercel):
//   Set DATABASE_URL to a Neon, Supabase, or other hosted Postgres connection
//   string. Data is stored in real relational tables and survives deploys,
//   restarts, cold starts, and multiple serverless instances.
//
// Local fallback mode:
//   If DATABASE_URL is not set, the old server/data/db.json store is used so
//   the project still runs on a developer machine. Do not use the JSON store
//   as a permanent production database on Netlify/Vercel.
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { courses as seedCourses } from '../src/data/data.js'

const { Pool } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, 'data')
const DB_FILE = path.join(DATA_DIR, 'db.json')
const LEGACY_DB_FILE = process.env.LEGACY_DB_FILE
  ? path.resolve(process.env.LEGACY_DB_FILE)
  : DB_FILE
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL || ''

export const databaseKind = DATABASE_URL ? 'postgres' : 'json'
export const uid = () => crypto.randomUUID()
export const now = () => new Date().toISOString()
export const publicUser = (u) => u && ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone || '',
  role: u.role,
  createdAt: u.createdAt,
})

const iso = (value) => {
  if (!value) return value
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toISOString()
}
const num = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
const int = (value, fallback = 0) => Math.trunc(num(value, fallback))

function normalizeState(state = {}) {
  return {
    users: Array.isArray(state.users) ? state.users : [],
    courses: Array.isArray(state.courses) ? state.courses : [],
    enrollments: Array.isArray(state.enrollments) ? state.enrollments : [],
    wishlists: Array.isArray(state.wishlists) ? state.wishlists : [],
    orders: Array.isArray(state.orders) ? state.orders : [],
    messages: Array.isArray(state.messages) ? state.messages : [],
    subscribers: Array.isArray(state.subscribers) ? state.subscribers : [],
  }
}

function buildSeedState() {
  const adminId = uid()
  const demoId = uid()
  return {
    users: [
      { id: adminId, name: 'Admin', email: 'admin@edufast.com', phone: '', role: 'admin', passHash: bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10), createdAt: now() },
      { id: demoId, name: 'Demo Student', email: 'demo@edufast.com', phone: '', role: 'student', passHash: bcrypt.hashSync(process.env.DEMO_PASSWORD || 'demo123', 10), createdAt: now() },
    ],
    courses: seedCourses.map(c => ({ ...c })),
    enrollments: [
      { id: uid(), userId: demoId, courseId: 1, progress: 35, enrolledAt: now() },
      { id: uid(), userId: demoId, courseId: 5, progress: 80, enrolledAt: now() },
    ],
    wishlists: [{ userId: demoId, courseId: 3 }],
    orders: [],
    messages: [],
    subscribers: [],
  }
}

function readLegacyState() {
  try {
    if (!fs.existsSync(LEGACY_DB_FILE)) return null
    const state = normalizeState(JSON.parse(fs.readFileSync(LEGACY_DB_FILE, 'utf8')))
    return state.users.length || state.courses.length ? state : null
  } catch (error) {
    console.warn(`Could not import legacy JSON database: ${error.message}`)
    return null
  }
}

// -----------------------------------------------------------------------------
// JSON fallback store (local development only)
// -----------------------------------------------------------------------------
let jsonDb = null

function loadJsonDb() {
  if (jsonDb) return jsonDb
  fs.mkdirSync(DATA_DIR, { recursive: true })
  if (fs.existsSync(DB_FILE)) {
    try {
      jsonDb = normalizeState(JSON.parse(fs.readFileSync(DB_FILE, 'utf8')))
    } catch {
      jsonDb = buildSeedState()
      saveJsonDb()
    }
  } else {
    jsonDb = buildSeedState()
    saveJsonDb()
  }
  return jsonDb
}

function saveJsonDb() {
  if (!jsonDb) return
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const tmp = `${DB_FILE}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(jsonDb, null, 2))
  fs.renameSync(tmp, DB_FILE)
}

function jsonLearningState(userId) {
  const db = loadJsonDb()
  const mine = db.enrollments.filter(e => e.userId === userId)
  const progress = {}
  mine.forEach(e => { progress[e.courseId] = e.progress })
  return {
    enrolled: mine.map(e => e.courseId),
    progress,
    wishlist: db.wishlists.filter(w => w.userId === userId).map(w => w.courseId),
    orders: db.orders.filter(o => o.userId === userId),
  }
}

// -----------------------------------------------------------------------------
// Postgres store
// -----------------------------------------------------------------------------
let pool = null

function sslFor(url) {
  try {
    const parsed = new URL(url)
    if (parsed.searchParams.get('sslmode') === 'disable') return false
    if (['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)) return false
  } catch { /* use secure default below */ }
  return { rejectUnauthorized: false }
}

function getPool() {
  if (!DATABASE_URL) throw new Error('DATABASE_URL is not configured')
  if (!pool) {
    const serverless = Boolean(process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME)
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: sslFor(DATABASE_URL),
      max: int(process.env.PGPOOL_MAX, serverless ? 1 : 5),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    })
    pool.on('error', (error) => console.error('Postgres pool error:', error.message))
  }
  return pool
}

const DDL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'student',
  pass_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users ((lower(email)));

CREATE TABLE IF NOT EXISTS courses (
  id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  cat_name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  old_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  rating NUMERIC(3,2) NOT NULL DEFAULT 4.8,
  reviews INTEGER NOT NULL DEFAULT 0,
  lessons INTEGER NOT NULL DEFAULT 0,
  hours NUMERIC(8,2) NOT NULL DEFAULT 0,
  level TEXT NOT NULL DEFAULT 'Beginner',
  instructor TEXT NOT NULL DEFAULT 'EduFast Team',
  instructor_img TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  bestseller BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT NOT NULL DEFAULT '',
  outcomes JSONB NOT NULL DEFAULT '[]'::jsonb,
  curriculum JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, course_id)
);
CREATE INDEX IF NOT EXISTS enrollments_user_idx ON enrollments (user_id);

CREATE TABLE IF NOT EXISTS wishlists (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  promo_code TEXT,
  status TEXT NOT NULL DEFAULT 'paid (demo gateway)',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS orders_user_idx ON orders (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT 'General Question',
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscribers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS subscribers_email_lower_idx ON subscribers ((lower(email)));
`

function userFromRow(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || '',
    role: row.role,
    passHash: row.pass_hash,
    createdAt: iso(row.created_at),
  }
}

function courseFromRow(row) {
  if (!row) return null
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    catName: row.cat_name,
    price: num(row.price),
    oldPrice: num(row.old_price),
    rating: num(row.rating),
    reviews: int(row.reviews),
    lessons: int(row.lessons),
    hours: num(row.hours),
    level: row.level,
    instructor: row.instructor,
    instructorImg: row.instructor_img,
    image: row.image,
    bestseller: Boolean(row.bestseller),
    desc: row.description,
    outcomes: Array.isArray(row.outcomes) ? row.outcomes : [],
    curriculum: Array.isArray(row.curriculum) ? row.curriculum : [],
  }
}

function orderFromRow(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id,
    items: Array.isArray(row.items) ? row.items : [],
    subtotal: num(row.subtotal),
    discount: num(row.discount),
    total: num(row.total),
    promoCode: row.promo_code,
    status: row.status,
    createdAt: iso(row.created_at),
  }
}

function messageFromRow(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || '',
    subject: row.subject,
    message: row.message,
    read: Boolean(row.is_read),
    createdAt: iso(row.created_at),
  }
}

function courseValues(course, includeId = false) {
  const values = [
    course.title || 'Untitled Course',
    course.category || 'development',
    course.catName || course.category || 'Development',
    num(course.price),
    num(course.oldPrice),
    num(course.rating, 4.8),
    int(course.reviews),
    int(course.lessons),
    num(course.hours),
    course.level || 'Beginner',
    course.instructor || 'EduFast Team',
    course.instructorImg || '',
    course.image || '',
    Boolean(course.bestseller),
    course.desc || '',
    JSON.stringify(Array.isArray(course.outcomes) ? course.outcomes : []),
    JSON.stringify(Array.isArray(course.curriculum) ? course.curriculum : []),
  ]
  return includeId ? [int(course.id), ...values] : values
}

const COURSE_COLUMNS_WITH_ID = 'id,title,category,cat_name,price,old_price,rating,reviews,lessons,hours,level,instructor,instructor_img,image,bestseller,description,outcomes,curriculum'
const COURSE_COLUMNS = 'title,category,cat_name,price,old_price,rating,reviews,lessons,hours,level,instructor,instructor_img,image,bestseller,description,outcomes,curriculum'
const placeholders = (count, start = 1) => Array.from({ length: count }, (_, i) => `$${start + i}`).join(',')

async function insertCourseRow(client, course, includeId = false) {
  const columns = includeId ? COURSE_COLUMNS_WITH_ID : COURSE_COLUMNS
  const values = courseValues(course, includeId)
  const conflict = includeId ? ' ON CONFLICT (id) DO NOTHING' : ''
  const { rows } = await client.query(
    `INSERT INTO courses (${columns}) VALUES (${placeholders(values.length)})${conflict} RETURNING *`,
    values,
  )
  return rows[0] ? courseFromRow(rows[0]) : null
}

async function insertStateIntoPostgres(client, state) {
  for (const course of state.courses) await insertCourseRow(client, course, true)
  await client.query(`SELECT setval(pg_get_serial_sequence('courses', 'id'), COALESCE((SELECT MAX(id) FROM courses), 1), EXISTS (SELECT 1 FROM courses))`)

  for (const user of state.users) {
    await client.query(
      `INSERT INTO users (id,name,email,phone,role,pass_hash,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
      [user.id || uid(), user.name || 'User', String(user.email || '').toLowerCase(), user.phone || '', user.role || 'student', user.passHash || '', iso(user.createdAt) || now()],
    )
  }

  const userIds = new Set(state.users.map(u => u.id))
  const courseIds = new Set(state.courses.map(c => int(c.id)))
  for (const enrollment of state.enrollments) {
    if (!userIds.has(enrollment.userId) || !courseIds.has(int(enrollment.courseId))) continue
    await client.query(
      `INSERT INTO enrollments (id,user_id,course_id,progress,enrolled_at)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (user_id,course_id) DO NOTHING`,
      [enrollment.id || uid(), enrollment.userId, int(enrollment.courseId), Math.min(100, Math.max(0, int(enrollment.progress))), iso(enrollment.enrolledAt) || now()],
    )
  }
  for (const wishlist of state.wishlists) {
    if (!userIds.has(wishlist.userId) || !courseIds.has(int(wishlist.courseId))) continue
    await client.query(
      'INSERT INTO wishlists (user_id,course_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [wishlist.userId, int(wishlist.courseId)],
    )
  }
  for (const order of state.orders) {
    if (!userIds.has(order.userId)) continue
    await client.query(
      `INSERT INTO orders (id,user_id,items,subtotal,discount,total,promo_code,status,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
      [order.id || uid(), order.userId, JSON.stringify(order.items || []), num(order.subtotal), num(order.discount), num(order.total), order.promoCode || null, order.status || 'paid (demo gateway)', iso(order.createdAt) || now()],
    )
  }
  for (const message of state.messages) {
    await client.query(
      `INSERT INTO messages (id,name,email,phone,subject,message,is_read,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
      [message.id || uid(), message.name || '', message.email || '', message.phone || '', message.subject || 'General Question', message.message || '', Boolean(message.read), iso(message.createdAt) || now()],
    )
  }
  for (const subscriber of state.subscribers) {
    await client.query(
      'INSERT INTO subscribers (id,email,created_at) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
      [subscriber.id || uid(), subscriber.email || '', iso(subscriber.createdAt) || now()],
    )
  }
}

async function initPostgres() {
  const clientPool = getPool()
  await clientPool.query(DDL)
  const { rows } = await clientPool.query('SELECT (SELECT COUNT(*)::int FROM users) AS users, (SELECT COUNT(*)::int FROM courses) AS courses')
  if (rows[0].users === 0 && rows[0].courses === 0) {
    const state = readLegacyState() || buildSeedState()
    const client = await clientPool.connect()
    try {
      await client.query('BEGIN')
      await insertStateIntoPostgres(client, normalizeState(state))
      await client.query('COMMIT')
      console.log(`Postgres database initialized (${state.users?.length || 0} users, ${state.courses?.length || 0} courses).`)
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
}

let initPromise = null
export async function initDb() {
  if (!initPromise) {
    initPromise = (DATABASE_URL ? initPostgres() : Promise.resolve(loadJsonDb())).catch((error) => {
      initPromise = null
      throw error
    })
  }
  return initPromise
}

export async function closeDb() {
  if (pool) await pool.end()
  pool = null
  initPromise = null
}

export async function getCounts() {
  await initDb()
  if (!DATABASE_URL) {
    const db = loadJsonDb()
    return { users: db.users.length, courses: db.courses.length, enrollments: db.enrollments.length, orders: db.orders.length, messages: db.messages.length }
  }
  const { rows } = await getPool().query(`
    SELECT
      (SELECT COUNT(*)::int FROM users) AS users,
      (SELECT COUNT(*)::int FROM courses) AS courses,
      (SELECT COUNT(*)::int FROM enrollments) AS enrollments,
      (SELECT COUNT(*)::int FROM orders) AS orders,
      (SELECT COUNT(*)::int FROM messages) AS messages`)
  return rows[0]
}

export async function listCourses() {
  await initDb()
  if (!DATABASE_URL) return [...loadJsonDb().courses]
  const { rows } = await getPool().query('SELECT * FROM courses ORDER BY id')
  return rows.map(courseFromRow)
}

export async function getCourse(id) {
  await initDb()
  if (!DATABASE_URL) return loadJsonDb().courses.find(c => c.id === int(id)) || null
  const { rows } = await getPool().query('SELECT * FROM courses WHERE id = $1', [int(id)])
  return courseFromRow(rows[0])
}

export async function findUserByEmail(email) {
  await initDb()
  const normalized = String(email || '').toLowerCase()
  if (!DATABASE_URL) return loadJsonDb().users.find(u => u.email.toLowerCase() === normalized) || null
  const { rows } = await getPool().query('SELECT * FROM users WHERE lower(email) = lower($1)', [normalized])
  return userFromRow(rows[0])
}

export async function findUserById(id) {
  await initDb()
  if (!DATABASE_URL) return loadJsonDb().users.find(u => u.id === id) || null
  const { rows } = await getPool().query('SELECT * FROM users WHERE id = $1', [id])
  return userFromRow(rows[0])
}

export async function createUser(user) {
  await initDb()
  if (!DATABASE_URL) {
    const db = loadJsonDb()
    if (db.users.some(u => u.email.toLowerCase() === user.email.toLowerCase())) {
      const error = new Error('An account with this email already exists — please log in')
      error.code = 'DUPLICATE_EMAIL'
      throw error
    }
    db.users.push(user)
    saveJsonDb()
    return user
  }
  try {
    const { rows } = await getPool().query(
      `INSERT INTO users (id,name,email,phone,role,pass_hash,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [user.id, user.name, user.email, user.phone || '', user.role || 'student', user.passHash, user.createdAt || now()],
    )
    return userFromRow(rows[0])
  } catch (error) {
    if (error.code === '23505') error.code = 'DUPLICATE_EMAIL'
    throw error
  }
}

export async function getLearningState(userId) {
  await initDb()
  if (!DATABASE_URL) return jsonLearningState(userId)
  const clientPool = getPool()
  const [enrollments, wishlists, orders] = await Promise.all([
    clientPool.query('SELECT course_id, progress FROM enrollments WHERE user_id = $1 ORDER BY enrolled_at', [userId]),
    clientPool.query('SELECT course_id FROM wishlists WHERE user_id = $1 ORDER BY created_at', [userId]),
    clientPool.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at', [userId]),
  ])
  const progress = {}
  enrollments.rows.forEach(row => { progress[row.course_id] = int(row.progress) })
  return {
    enrolled: enrollments.rows.map(row => row.course_id),
    progress,
    wishlist: wishlists.rows.map(row => row.course_id),
    orders: orders.rows.map(orderFromRow),
  }
}

export async function enrollInCourse(userId, courseId) {
  await initDb()
  if (!DATABASE_URL) {
    const db = loadJsonDb()
    if (!db.enrollments.some(e => e.userId === userId && e.courseId === int(courseId))) {
      db.enrollments.push({ id: uid(), userId, courseId: int(courseId), progress: 0, enrolledAt: now() })
      saveJsonDb()
    }
    return
  }
  await getPool().query(
    `INSERT INTO enrollments (id,user_id,course_id,progress,enrolled_at)
     VALUES ($1,$2,$3,0,NOW()) ON CONFLICT (user_id,course_id) DO NOTHING`,
    [uid(), userId, int(courseId)],
  )
}

export async function setProgress(userId, courseId, progress) {
  await initDb()
  const value = Math.min(100, Math.max(0, int(progress)))
  if (!DATABASE_URL) {
    const db = loadJsonDb()
    const enrollment = db.enrollments.find(e => e.userId === userId && e.courseId === int(courseId))
    if (!enrollment) return false
    enrollment.progress = value
    saveJsonDb()
    return true
  }
  const result = await getPool().query(
    'UPDATE enrollments SET progress = $3 WHERE user_id = $1 AND course_id = $2',
    [userId, int(courseId), value],
  )
  return result.rowCount > 0
}

export async function toggleWishlist(userId, courseId) {
  await initDb()
  if (!DATABASE_URL) {
    const db = loadJsonDb()
    const index = db.wishlists.findIndex(w => w.userId === userId && w.courseId === int(courseId))
    if (index >= 0) db.wishlists.splice(index, 1)
    else db.wishlists.push({ userId, courseId: int(courseId) })
    saveJsonDb()
    return
  }
  await getPool().query(`
    WITH removed AS (
      DELETE FROM wishlists WHERE user_id = $1 AND course_id = $2 RETURNING 1
    )
    INSERT INTO wishlists (user_id, course_id)
    SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM removed)
    ON CONFLICT DO NOTHING`, [userId, int(courseId)])
}

function calculateOrder(items, promoCode, userId) {
  const subtotal = +items.reduce((sum, course) => sum + num(course.price), 0).toFixed(2)
  const discountRate = String(promoCode || '').toUpperCase() === 'HOLIDAY20' ? 0.2 : 0
  const discount = +(subtotal * discountRate).toFixed(2)
  return {
    id: uid(),
    userId,
    items: items.map(c => ({ courseId: c.id, title: c.title, price: num(c.price) })),
    subtotal,
    discount,
    total: +(subtotal - discount).toFixed(2),
    promoCode: discountRate ? 'HOLIDAY20' : null,
    status: 'paid (demo gateway)',
    createdAt: now(),
  }
}

export async function checkout(userId, courseIds, promoCode) {
  await initDb()
  const uniqueIds = [...new Set((Array.isArray(courseIds) ? courseIds : []).map(int).filter(id => id > 0))]
  if (!uniqueIds.length) return null

  if (!DATABASE_URL) {
    const db = loadJsonDb()
    const items = uniqueIds
      .map(id => db.courses.find(c => c.id === id))
      .filter(course => course && !db.enrollments.some(e => e.userId === userId && e.courseId === course.id))
    if (!items.length) return null
    const order = calculateOrder(items, promoCode, userId)
    db.orders.push(order)
    items.forEach(course => db.enrollments.push({ id: uid(), userId, courseId: course.id, progress: 0, enrolledAt: now() }))
    saveJsonDb()
    return order
  }

  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `SELECT c.* FROM courses c
       WHERE c.id = ANY($1::int[])
         AND NOT EXISTS (SELECT 1 FROM enrollments e WHERE e.user_id = $2 AND e.course_id = c.id)`,
      [uniqueIds, userId],
    )
    const byId = new Map(rows.map(row => [row.id, courseFromRow(row)]))
    const items = uniqueIds.map(id => byId.get(id)).filter(Boolean)
    if (!items.length) {
      await client.query('ROLLBACK')
      return null
    }
    const order = calculateOrder(items, promoCode, userId)
    const inserted = await client.query(
      `INSERT INTO orders (id,user_id,items,subtotal,discount,total,promo_code,status,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [order.id, userId, JSON.stringify(order.items), order.subtotal, order.discount, order.total, order.promoCode, order.status, order.createdAt],
    )
    for (const course of items) {
      await client.query(
        `INSERT INTO enrollments (id,user_id,course_id,progress,enrolled_at)
         VALUES ($1,$2,$3,0,$4) ON CONFLICT (user_id,course_id) DO NOTHING`,
        [uid(), userId, course.id, order.createdAt],
      )
    }
    await client.query('COMMIT')
    return orderFromRow(inserted.rows[0])
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function addMessage(message) {
  await initDb()
  if (!DATABASE_URL) {
    const db = loadJsonDb()
    db.messages.push(message)
    saveJsonDb()
    return message
  }
  const { rows } = await getPool().query(
    `INSERT INTO messages (id,name,email,phone,subject,message,is_read,created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [message.id, message.name, message.email, message.phone || '', message.subject, message.message, Boolean(message.read), message.createdAt || now()],
  )
  return messageFromRow(rows[0])
}

export async function addSubscriber(email) {
  await initDb()
  if (!DATABASE_URL) {
    const db = loadJsonDb()
    if (!db.subscribers.some(s => s.email.toLowerCase() === String(email).toLowerCase())) {
      db.subscribers.push({ id: uid(), email, createdAt: now() })
      saveJsonDb()
    }
    return
  }
  await getPool().query(
    'INSERT INTO subscribers (id,email,created_at) VALUES ($1,$2,NOW()) ON CONFLICT ((lower(email))) DO NOTHING',
    [uid(), email],
  )
}

export async function getAdminStats() {
  await initDb()
  if (!DATABASE_URL) {
    const db = loadJsonDb()
    return {
      users: db.users.length,
      courses: db.courses.length,
      enrollments: db.enrollments.length,
      orders: db.orders.length,
      revenue: +db.orders.reduce((sum, order) => sum + num(order.total), 0).toFixed(2),
      messages: db.messages.length,
      subscribers: db.subscribers.length,
      recentOrders: [...db.orders].reverse().slice(0, 8),
      recentMessages: [...db.messages].reverse().slice(0, 8),
      userList: db.users.map(publicUser),
    }
  }
  const clientPool = getPool()
  const [totals, recentOrders, recentMessages, userList] = await Promise.all([
    clientPool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM users) AS users,
        (SELECT COUNT(*)::int FROM courses) AS courses,
        (SELECT COUNT(*)::int FROM enrollments) AS enrollments,
        (SELECT COUNT(*)::int FROM orders) AS orders,
        COALESCE((SELECT SUM(total) FROM orders), 0) AS revenue,
        (SELECT COUNT(*)::int FROM messages) AS messages,
        (SELECT COUNT(*)::int FROM subscribers) AS subscribers`),
    clientPool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 8'),
    clientPool.query('SELECT * FROM messages ORDER BY created_at DESC LIMIT 8'),
    clientPool.query('SELECT * FROM users ORDER BY created_at'),
  ])
  const summary = totals.rows[0]
  return {
    users: summary.users,
    courses: summary.courses,
    enrollments: summary.enrollments,
    orders: summary.orders,
    revenue: +num(summary.revenue).toFixed(2),
    messages: summary.messages,
    subscribers: summary.subscribers,
    recentOrders: recentOrders.rows.map(orderFromRow),
    recentMessages: recentMessages.rows.map(messageFromRow),
    userList: userList.rows.map(row => publicUser(userFromRow(row))),
  }
}

export async function createCourse(course) {
  await initDb()
  if (!DATABASE_URL) {
    const db = loadJsonDb()
    const created = { ...course, id: Math.max(0, ...db.courses.map(c => int(c.id))) + 1 }
    db.courses.push(created)
    saveJsonDb()
    return created
  }
  return insertCourseRow(getPool(), course, false)
}

export async function updateCourse(id, course) {
  await initDb()
  if (!DATABASE_URL) {
    const db = loadJsonDb()
    const index = db.courses.findIndex(c => c.id === int(id))
    if (index < 0) return null
    db.courses[index] = { ...db.courses[index], ...course, id: int(id) }
    saveJsonDb()
    return db.courses[index]
  }
  const values = courseValues(course, false)
  const assignments = COURSE_COLUMNS.split(',').map((column, index) => `${column} = $${index + 1}`).join(',')
  const { rows } = await getPool().query(
    `UPDATE courses SET ${assignments}, updated_at = NOW() WHERE id = $${values.length + 1} RETURNING *`,
    [...values, int(id)],
  )
  return courseFromRow(rows[0])
}

export async function deleteCourse(id) {
  await initDb()
  if (!DATABASE_URL) {
    const db = loadJsonDb()
    db.courses = db.courses.filter(c => c.id !== int(id))
    db.enrollments = db.enrollments.filter(e => e.courseId !== int(id))
    db.wishlists = db.wishlists.filter(w => w.courseId !== int(id))
    saveJsonDb()
    return
  }
  await getPool().query('DELETE FROM courses WHERE id = $1', [int(id)])
}
