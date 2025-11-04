import { useEffect, useState } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

function App() {
  const [profile, setProfile] = useState(null)
  const userId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null
  useEffect(() => {
    let ignore = false
    async function load() {
      if (!userId) { setProfile(null); return }
      try {
        const res = await fetch(`${API_BASE}/profile/${encodeURIComponent(userId)}`)
        if (!res.ok) throw new Error('profile')
        const data = await res.json()
        if (!ignore) setProfile(data)
      } catch {
        if (!ignore) setProfile({ user_id: Number(userId), name: '', avatar_data_url: null })
      }
    }
    load()
    return () => { ignore = true }
  }, [])
  const signedIn = !!userId
  const avatarSrc = profile?.avatar_data_url || '/placeholder.jpeg'
  const welcome = signedIn ? `Welcome${profile?.name ? ', ' + profile.name : ''}` : ''
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 text-slate-100">
      <header className="border-b border-slate-800/80 sticky top-0 z-10 backdrop-blur bg-slate-950/50">
        <div className="mx-auto max-w-5xl p-4 flex items-center gap-3">
          <a href="/" className="font-semibold tracking-wide">MOVAI</a>
          <div className="ml-auto flex items-center gap-3">
            {signedIn ? (
              <a href="/profile" className="inline-flex items-center gap-2">
                <img src={avatarSrc} alt="avatar" className="h-8 w-8 rounded-full object-cover border border-slate-700" />
              </a>
            ) : (
              <a href="#" onClick={(e)=>{e.preventDefault(); const uid = localStorage.getItem('user_id'); window.location.href = uid ? '/recommend' : '/login'}} className="text-sm rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5">Sign in</a>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-6">
        <Routes>
          <Route path="/" element={<HomeOrDashboard />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/survey" element={<SurveyPage />} />
          <Route path="/recommend" element={<RecommendPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App

function HomeOrDashboard() {
  const hasUser = typeof window !== 'undefined' && !!localStorage.getItem('user_id')
  return hasUser ? <RecommendPage /> : <HomePage />
}

function HomePage() {
  const navigate = useNavigate()
  const [bgId, setBgId] = useState(() => Math.max(1, Math.floor(Math.random()*500)))
  function goNext() {
    const uid = localStorage.getItem('user_id')
    if (uid) {
      navigate('/recommend')
    } else {
      navigate('/login')
    }
  }
  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-800">
      <img src={`${API_BASE}/image/${bgId}?type=hero`} alt="cinematic" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-[radial-gradient(1200px_500px_at_80%_-20%,#7c3aed33,transparent)]" />
      <div className="relative aspect-[21/9] sm:aspect-[16/7]" />
      <div className="absolute inset-0 p-8 sm:p-12 flex flex-col justify-end gap-4">
        <div className="text-4xl sm:text-5xl font-light tracking-wide drop-shadow">Discover, Decide <br className="hidden sm:block" />& Enjoy</div>
        <div className="flex gap-3">
          <button onClick={goNext} className="rounded-full bg-violet-600 hover:bg-violet-500 px-5 py-2.5 text-sm font-medium shadow-lg shadow-violet-900/30">Sign in</button>
        </div>
      </div>
    </section>
  )
}

function LoginPage() {
  const [userId, setUserId] = useState('')
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId ? Number(userId) : null,
          account: account || null,
          password: password || null
        })
      })
      if (!res.ok) throw new Error('Login failed')
      const data = await res.json()
      localStorage.setItem('token', data.token)
      localStorage.setItem('user_id', String(data.user_id))
      navigate('/recommend')
    } catch (e) {
      setError(e.message || 'Login error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">Welcome</h1>
        <p className="text-slate-400">Sign in with username or email, and password</p>
      </div>
      <form onSubmit={onSubmit} className="w-full max-w-md bg-slate-900/50 border border-slate-800 rounded-xl p-6 shadow-xl shadow-black/20">
        <label className="block text-sm mb-2">Account</label>
        <input className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500" value={account} onChange={(e)=>setAccount(e.target.value)} placeholder="username or email" />
        <label className="block text-sm mt-4 mb-2">Password</label>
        <input className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••••" />
        <div className="mt-4 text-xs text-slate-500">Don't have an account? <a href="/signup" className="underline">Create one</a></div>
        <button type="submit" disabled={loading} className="mt-4 inline-flex items-center justify-center rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-2 font-medium disabled:opacity-60">
          {loading ? 'Signing in…' : 'Continue'}
        </button>
        {error && <div className="mt-3 text-sm text-rose-400">{error}</div>}
      </form>
    </div>
  )
}

function SignupPage() {
  const [account, setAccount] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account, email, password, name: name || null })
      })
      if (!res.ok) {
        const t = await res.text()
        throw new Error(t || 'Signup failed')
      }
      const data = await res.json()
      localStorage.setItem('token', data.token)
      localStorage.setItem('user_id', String(data.user_id))
      navigate('/profile')
    } catch (e) {
      setError(e.message || 'Signup error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">Create account</h1>
        <p className="text-slate-400">Username, email, and a password</p>
      </div>
      <form onSubmit={onSubmit} className="w-full max-w-md bg-slate-900/50 border border-slate-800 rounded-xl p-6 shadow-xl shadow-black/20">
        <label className="block text-sm mb-2">Username</label>
        <input className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500" value={account} onChange={(e)=>setAccount(e.target.value)} />
        <label className="block text-sm mt-4 mb-2">Email</label>
        <input className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <label className="block text-sm mt-4 mb-2">Password</label>
        <input className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
        <label className="block text-sm mt-4 mb-2">Display name (optional)</label>
        <input className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500" value={name} onChange={(e)=>setName(e.target.value)} />
        <button type="submit" disabled={loading} className="mt-4 inline-flex items-center justify-center rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-2 font-medium disabled:opacity-60">
          {loading ? 'Creating…' : 'Create account'}
        </button>
        <div className="mt-3 text-xs text-slate-500">Already have an account? <a href="/login" className="underline">Sign in</a></div>
        {error && <div className="mt-3 text-sm text-rose-400">{error}</div>}
      </form>
    </div>
  )
}

function SurveyPage() {
  const [schema, setSchema] = useState({ genres: [], years: [] })
  const [selectedGenres, setSelectedGenres] = useState([])
  const [minYear, setMinYear] = useState('')
  const [maxYear, setMaxYear] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let ignore = false
    async function loadSchema() {
      try {
        const res = await fetch(`${API_BASE}/survey/schema`)
        if (!res.ok) throw new Error('Failed to load survey schema')
        const data = await res.json()
        if (!ignore) setSchema(data)
      } catch (e) {
        if (!ignore) setError(e.message || 'Error loading survey')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    loadSchema()
    return () => { ignore = true }
  }, [])

  async function onSubmit(e) {
    e.preventDefault()
    const userId = localStorage.getItem('user_id')
    try {
      await fetch(`${API_BASE}/survey/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: Number(userId),
          genres: selectedGenres,
          min_year: minYear ? Number(minYear) : null,
          max_year: maxYear ? Number(maxYear) : null
        })
      })
    } catch {}
    const params = new URLSearchParams()
    if (selectedGenres.length) params.set('genres', selectedGenres.join(','))
    if (minYear) params.set('min_year', String(minYear))
    if (maxYear) params.set('max_year', String(maxYear))
    navigate(`/recommend?${params.toString()}`)
  }

  if (loading) return <div className="text-slate-400">Loading survey…</div>
  if (error) return <div className="text-rose-400">{error}</div>

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold">Tell us your taste</h1>
        <p className="text-slate-400">Pick a few genres and a year range</p>
      </div>
      <form onSubmit={onSubmit} className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 shadow-xl shadow-black/20">
        <fieldset>
          <legend className="text-sm text-slate-400">Genres</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {schema.genres.map((g) => {
              const active = selectedGenres.includes(g)
              return (
                <button
                  type="button"
                  key={g}
                  className={`px-3 py-1 rounded-full border text-sm transition ${active ? 'bg-violet-600 border-violet-500' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
                  onClick={() => {
                    setSelectedGenres((prev) => active ? prev.filter(x => x !== g) : [...prev, g])
                  }}
                >{g}</button>
              )
            })}
          </div>
        </fieldset>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="text-sm">
            Min year
            <input className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500" type="number" value={minYear} onChange={(e) => setMinYear(e.target.value)} />
          </label>
          <label className="text-sm">
            Max year
            <input className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500" type="number" value={maxYear} onChange={(e) => setMaxYear(e.target.value)} />
          </label>
        </div>
        <button type="submit" className="mt-6 inline-flex items-center justify-center rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-2 font-medium">
          See recommendations
        </button>
      </form>
    </div>
  )
}

function ProfilePage() {
  const [name, setName] = useState('')
  const [avatarDataUrl, setAvatarDataUrl] = useState('')
  const [genresSchema, setGenresSchema] = useState([])
  const [genres, setGenres] = useState([])
  const [favoritesInput, setFavoritesInput] = useState('')
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let ignore = false
    async function load() {
      try {
        const userId = localStorage.getItem('user_id') || '1'
        const [schemaRes, profRes] = await Promise.all([
          fetch(`${API_BASE}/survey/schema`),
          fetch(`${API_BASE}/profile/${encodeURIComponent(userId)}`)
        ])
        if (!schemaRes.ok) throw new Error('Failed to load schema')
        if (!profRes.ok) throw new Error('Failed to load profile')
        const schema = await schemaRes.json()
        const prof = await profRes.json()
        if (ignore) return
        setGenresSchema(schema.genres || [])
        setName(prof.name || '')
        setAvatarDataUrl(prof.avatar_data_url || '')
        setGenres(prof.genres || [])
        setFavorites(prof.favorites || [])
      } catch (e) {
        if (!ignore) setError(e.message || 'Error loading profile')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [])

  function onAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setAvatarDataUrl(String(reader.result || ''))
    reader.readAsDataURL(file)
  }

  function addFavoriteFromInput() {
    const v = favoritesInput.trim()
    if (!v) return
    setFavorites((prev) => (prev.includes(v) ? prev : [...prev, v]))
    setFavoritesInput('')
  }

  async function saveProfile() {
    setSaving(true)
    setError('')
    try {
      const userId = localStorage.getItem('user_id') || '1'
      const res = await fetch(`${API_BASE}/profile/${encodeURIComponent(userId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: Number(userId),
          name,
          avatar_data_url: avatarDataUrl || null,
          genres,
          favorites
        })
      })
      if (!res.ok) throw new Error('Failed to save profile')
      navigate('/recommend')
    } catch (e) {
      setError(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-slate-400">Loading profile…</div>
  if (error) return <div className="text-rose-400">{error}</div>

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold">Your Profile</h1>

      <div className="grid gap-6 sm:grid-cols-[220px,1fr]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-[220px] w-[220px] rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
            <img src={avatarDataUrl || '/placeholder.jpeg'} alt="avatar" className="h-full w-full object-cover" />
          </div>
          <label className="text-sm inline-flex items-center gap-2 cursor-pointer">
            <span className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5">Upload avatar</span>
            <input type="file" accept="image/*" onChange={onAvatarChange} className="hidden" />
          </label>
        </div>

        <div className="flex flex-col gap-6">
          <label className="text-sm">
            Name
            <input className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500" value={name} onChange={(e)=>setName(e.target.value)} placeholder="Your name" />
          </label>

          <div>
            <div className="text-sm text-slate-400">Genres</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {genresSchema.map((g) => {
                const active = genres.includes(g)
                return (
                  <button
                    key={g}
                    type="button"
                    className={`px-3 py-1 rounded-full border text-sm transition ${active ? 'bg-violet-600 border-violet-500' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
                    onClick={() => setGenres((prev) => active ? prev.filter(x => x !== g) : [...prev, g])}
                  >{g}</button>
                )
              })}
            </div>
          </div>

          <div>
            <div className="text-sm text-slate-400">Favourite movies</div>
            <div className="mt-2 flex items-center gap-2">
              <input className="flex-1 rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500" value={favoritesInput} onChange={(e)=>setFavoritesInput(e.target.value)} placeholder="Type a title and press Add" />
              <button type="button" onClick={addFavoriteFromInput} className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-2 text-sm">Add</button>
            </div>
            {!!favorites.length && (
              <div className="mt-2 flex flex-wrap gap-2">
                {favorites.map((f) => (
                  <span key={f} className="text-xs px-2 py-1 rounded-full bg-slate-900/80 border border-slate-700/70">
                    {f}
                    <button className="ml-2 text-slate-400 hover:text-white" onClick={()=>setFavorites((prev)=>prev.filter(x=>x!==f))}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={saveProfile} disabled={saving} className="rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-2 font-medium disabled:opacity-60">
              {saving ? 'Saving…' : 'Save & Continue'}
            </button>
            <button onClick={()=>navigate('/recommend')} className="rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-2 font-medium">Skip</button>
            <button onClick={()=>{ localStorage.removeItem('user_id'); localStorage.removeItem('token'); window.location.href='/' }} className="rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-2 font-medium">Log out</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function RecommendPage() {
  const [recs, setRecs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [featured, setFeatured] = useState(null)
  const [profileName, setProfileName] = useState('')

  useEffect(() => {
    let ignore = false
    async function run() {
      const userId = localStorage.getItem('user_id') || '1'
      const qs = new URLSearchParams(window.location.search)
      qs.set('n', '12')
      try {
        const [recsRes, profRes] = await Promise.all([
          fetch(`${API_BASE}/recommend/${encodeURIComponent(userId)}?${qs.toString()}`),
          fetch(`${API_BASE}/profile/${encodeURIComponent(userId)}`)
        ])
        if (!recsRes.ok) throw new Error('Failed to fetch recommendations')
        const data = await recsRes.json()
        const list = Array.isArray(data.recommendations) ? data.recommendations : []
        let profName = ''
        if (profRes.ok) {
          const prof = await profRes.json()
          profName = prof?.name || ''
        }
        if (!ignore) {
          setRecs(list)
          setFeatured(list[0] || null)
          setProfileName(profName)
        }
      } catch (e) {
        if (!ignore) setError(e.message || 'Error fetching recs')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    run()
    return () => { ignore = true }
  }, [])

  if (loading) return <div className="text-slate-400">Loading…</div>
  if (error) return <div className="text-rose-400">{error}</div>

  return (
    <div className="flex flex-col gap-10">
      <h1 className="text-3xl font-semibold">{`Welcome${profileName ? `, ${profileName}` : ''}`}</h1>
      {featured && (
        <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[radial-gradient(1200px_500px_at_80%_-20%,#7c3aed20,transparent),linear-gradient(to_bottom,#0b1020,#0b1020)]">
          <div className="grid grid-cols-1 lg:grid-cols-3">
            <div className="col-span-2 aspect-[3/1] sm:aspect-[21/9] overflow-hidden">
              <img src={`${API_BASE}/image/${featured.movie_id}?type=hero`} alt="featured" className="h-full w-full object-cover" />
            </div>
            <div className="p-6 flex flex-col gap-3 justify-center">
              <div className="text-xs uppercase tracking-wider text-slate-400">Featured</div>
              <h2 className="text-3xl font-semibold leading-tight line-clamp-2">{featured.title}</h2>
              <div className="text-sm text-slate-400">Predicted rating <span className="text-slate-200 font-medium">{featured.predicted_rating?.toFixed?.(2) ?? featured.predicted_rating}</span></div>
              <div className="mt-2 flex gap-2">
                <button className="rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-2 text-sm font-medium">Play trailer</button>
                <button className="rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-2 text-sm font-medium">Add to watchlist</button>
              </div>
            </div>
          </div>
        </section>
      )}

      <Section title="Recommendations for you">
        <Carousel>
          {recs.map((r) => (
            <MovieCard key={r.movie_id} title={r.title} score={r.predicted_rating} genres={r.genres} movieId={r.movie_id} />
          ))}
        </Carousel>
      </Section>

      <Section title="Popular now">
        <Carousel>
          {recs.slice().reverse().map((r) => (
            <MovieCard key={`p-${r.movie_id}`} title={r.title} score={r.predicted_rating} genres={r.genres} movieId={r.movie_id} />
          ))}
        </Carousel>
      </Section>

      <Section title="Browse by genre">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 aspect-video" />
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 aspect-video" />
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 aspect-video" />
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-lg font-semibold">{title}</h3>
      {children}
    </section>
  )
}

function Carousel({ children }) {
  return (
    <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-4 min-w-full">
        {children}
      </div>
    </div>
  )
}

function MovieCard({ title, score, genres, movieId }) {
  return (
    <div className="w-[220px] shrink-0 rounded-xl overflow-hidden bg-slate-900/50 border border-slate-800 hover:border-violet-600/50 transition shadow-xl shadow-black/20">
      <div className="relative aspect-[2/3] bg-slate-900/60">
        {movieId != null && (
          <img src={`${API_BASE}/image/${movieId}?type=poster`} alt="poster" className="absolute inset-0 h-full w-full object-cover" />
        )}
        {!!genres && (
          <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
            <div className="flex gap-1 flex-wrap">
              {(genres.split('|').slice(0,3)).map((g) => (
                <span key={g} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700/70">{g}</span>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="p-3 flex items-center justify-between">
        <div className="text-sm font-medium line-clamp-2 pr-2">{title}</div>
        <div className="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700">{score?.toFixed?.(2) ?? score}</div>
      </div>
    </div>
  )
}
