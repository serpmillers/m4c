import { useEffect, useState } from 'react'
import { Routes, Route, useNavigate, useParams, Link } from 'react-router-dom'
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
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-4 flex items-center gap-3">
          <a href="/" className="font-semibold tracking-wide">MOVAI</a>
          <div className="ml-auto flex items-center gap-3">
            <a href="/about" className="text-sm text-slate-300 hover:text-white transition">About</a>
            {signedIn ? (
              <>
                <a href="/watchlist" className="text-sm text-slate-300 hover:text-white transition">Watchlist</a>
                <a href="/profile" className="inline-flex items-center gap-2">
                  <img src={avatarSrc} alt="avatar" className="h-8 w-8 rounded-full object-cover border border-slate-700" />
                </a>
                <button onClick={()=>{ localStorage.removeItem('user_id'); localStorage.removeItem('token'); window.location.href='/' }} className="text-sm rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5">Log out</button>
              </>
            ) : (
              <a href="#" onClick={(e)=>{e.preventDefault(); const uid = localStorage.getItem('user_id'); window.location.href = uid ? '/recommend' : '/login'}} className="text-sm rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5">Sign in</a>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<HomeOrDashboard />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/survey" element={<SurveyPage />} />
          <Route path="/recommend" element={<RecommendPage />} />
          <Route path="/movie/:id" element={<MovieDetailPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
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
    <div className="relative min-h-[calc(100vh-120px)] rounded-2xl overflow-hidden">
      <img src={`${API_BASE}/image/${bgId}?type=hero`} alt="cinematic" className="absolute inset-0 h-full w-full object-cover" />
      <section className="relative h-full min-h-[600px] sm:min-h-[700px] flex items-center justify-center p-6 sm:p-12 lg:p-16">
        <div className="relative z-10 rounded-2xl bg-black/60 backdrop-blur-sm border border-white/10 p-10 sm:p-16 lg:p-20 max-w-3xl w-full">
          <div className="text-5xl sm:text-6xl lg:text-7xl font-light tracking-wide mb-8 sm:mb-10 leading-tight">Discover, Decide <br className="hidden sm:block" />& Enjoy</div>
          <div className="flex gap-4">
            <button onClick={goNext} className="rounded-full bg-violet-600 hover:bg-violet-500 px-6 py-3 sm:px-8 sm:py-3.5 text-base sm:text-lg font-medium shadow-lg shadow-violet-900/30 transition">Sign in</button>
          </div>
        </div>
      </section>
    </div>
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
  const navigate = useNavigate()
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

  const [showTrailer, setShowTrailer] = useState(false)
  const featuredTrailerId = featured?.trailer_youtube_id

  if (loading) return <div className="text-slate-400">Loading…</div>
  if (error) return <div className="text-rose-400">{error}</div>

  return (
    <div className="flex flex-col gap-12">
      <h1 className="text-4xl lg:text-5xl font-semibold">{`Welcome${profileName ? `, ${profileName}` : ''}`}</h1>
      {featured && (
        <>
          <section onClick={() => navigate(`/movie/${featured.movie_id}`)} className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[radial-gradient(1200px_500px_at_80%_-20%,#7c3aed20,transparent),linear-gradient(to_bottom,#0b1020,#0b1020)] cursor-pointer hover:border-violet-600/50 transition">
            <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr]">
              <div className="aspect-[3/1] sm:aspect-[21/9] overflow-hidden">
                <img src={`${API_BASE}/image/${featured.movie_id}?type=hero`} alt="featured" className="h-full w-full object-cover" />
              </div>
              <div className="p-8 lg:p-10 flex flex-col gap-4 justify-center">
                <div className="text-xs uppercase tracking-wider text-slate-400">Featured</div>
                <h2 className="text-3xl lg:text-4xl font-semibold leading-tight">{featured.title}</h2>
                <div className="text-sm text-slate-400">
                  {featured.year && <span>{featured.year} • </span>}
                  {featured.rating && <span>⭐ {featured.rating}/10</span>}
                  {!featured.rating && featured.predicted_rating && (
                    <span>Predicted rating <span className="text-slate-200 font-medium">{featured.predicted_rating?.toFixed?.(2) ?? featured.predicted_rating}</span></span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-3">
                  {featuredTrailerId && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setShowTrailer(true); }}
                      className="rounded-lg bg-violet-600 hover:bg-violet-500 px-5 py-2.5 text-sm font-medium"
                    >
                      Play trailer
                    </button>
                  )}
                  <WatchlistButton movieId={featured.movie_id} onClick={(e) => e.stopPropagation()} />
                </div>
              </div>
            </div>
          </section>
          {showTrailer && featuredTrailerId && (
            <TrailerModal youtubeId={featuredTrailerId} onClose={() => setShowTrailer(false)} />
          )}
        </>
      )}

      <Section title="Recommendations for you">
        <Carousel>
          {recs.map((r) => (
            <MovieCard key={r.movie_id} title={r.title} score={r.predicted_rating} genres={r.genres} movieId={r.movie_id} trailerYoutubeId={r.trailer_youtube_id} />
          ))}
        </Carousel>
      </Section>

      <Section title="Popular now">
        <Carousel>
          {recs.slice().reverse().map((r) => (
            <MovieCard key={`p-${r.movie_id}`} title={r.title} score={r.predicted_rating} genres={r.genres} movieId={r.movie_id} trailerYoutubeId={r.trailer_youtube_id} />
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
    <section className="flex flex-col gap-4">
      <h3 className="text-xl lg:text-2xl font-semibold">{title}</h3>
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

function TrailerModal({ youtubeId, onClose }) {
  if (!youtubeId) return null
  
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [onClose])
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-5xl mx-4" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white hover:text-slate-300 text-2xl font-bold"
        >
          ×
        </button>
        <div className="aspect-video bg-black rounded-lg overflow-hidden">
          <iframe
            className="w-full h-full"
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
            title="Trailer"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  )
}

function MovieCard({ title, score, genres, movieId, trailerYoutubeId }) {
  const navigate = useNavigate()
  const [showTrailer, setShowTrailer] = useState(false)
  
  function handleCardClick(e) {
    // Don't navigate if clicking on trailer button
    if (e.target.closest('.trailer-btn')) {
      e.stopPropagation()
      return
    }
    navigate(`/movie/${movieId}`)
  }
  
  return (
    <>
      <div onClick={handleCardClick} className="w-[220px] shrink-0 rounded-xl overflow-hidden bg-slate-900/50 border border-slate-800 hover:border-violet-600/50 transition shadow-xl shadow-black/20 cursor-pointer">
        <div className="relative aspect-[2/3] bg-slate-900/60 group">
          {movieId != null && (
            <img src={`${API_BASE}/image/${movieId}?type=poster`} alt="poster" className="absolute inset-0 h-full w-full object-cover" />
          )}
          {trailerYoutubeId && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowTrailer(true); }}
              className="trailer-btn absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>
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
      {showTrailer && (
        <TrailerModal youtubeId={trailerYoutubeId} onClose={() => setShowTrailer(false)} />
      )}
    </>
  )
}

function MovieDetailPage() {
  const { id } = useParams()
  const [movie, setMovie] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showTrailer, setShowTrailer] = useState(false)

  useEffect(() => {
    let ignore = false
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/movie/${encodeURIComponent(id)}`)
        if (!res.ok) throw new Error('Failed to load movie')
        const data = await res.json()
        if (!ignore) setMovie(data)
      } catch (e) {
        if (!ignore) setError(e.message || 'Error loading movie')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [id])

  if (loading) return <div className="text-slate-400">Loading…</div>
  if (error || !movie) return <div className="text-rose-400">{error || 'Movie not found'}</div>

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <img src={`${API_BASE}/image/${movie.movie_id}?type=poster`} alt={movie.title} className="w-full rounded-xl border border-slate-800" />
        </div>
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div>
            <h1 className="text-4xl font-semibold mb-2">{movie.title}</h1>
            <div className="flex items-center gap-4 text-slate-400">
              {movie.year && <span>{movie.year}</span>}
              {movie.rating && <span>⭐ {movie.rating}/10</span>}
              {movie.genres && (
                <div className="flex gap-2 flex-wrap">
                  {movie.genres.map((g, i) => (
                    <span key={i} className="px-2 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs">{g}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
          {movie.plot && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Plot</h2>
              <p className="text-slate-300 leading-relaxed">{movie.plot}</p>
            </div>
          )}
          <div className="flex gap-3">
            {movie.trailer_youtube_id && (
              <button 
                onClick={() => setShowTrailer(true)}
                className="rounded-lg bg-violet-600 hover:bg-violet-500 px-5 py-2.5 text-sm font-medium"
              >
                ▶ Play Trailer
              </button>
            )}
            <WatchlistButton movieId={movie.movie_id} />
          </div>
          {movie.sources && movie.sources.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-2">Available on</h2>
              <div className="flex gap-2 flex-wrap">
                {movie.sources.map((source, i) => {
                  const url = movie.source_urls?.[source]
                  const content = (
                    <span className="px-3 py-1 rounded-lg bg-violet-600/20 border border-violet-600/50 text-sm hover:bg-violet-600/30 transition cursor-pointer">
                      {source}
                    </span>
                  )
                  return url ? (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      {content}
                    </a>
                  ) : (
                    <span key={i}>{content}</span>
                  )
                })}
              </div>
            </div>
          )}
          <div className="mt-auto pt-4">
            <button onClick={() => window.history.back()} className="rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-2 font-medium">Back</button>
          </div>
        </div>
      </div>
      {showTrailer && movie.trailer_youtube_id && (
        <TrailerModal youtubeId={movie.trailer_youtube_id} onClose={() => setShowTrailer(false)} />
      )}
    </div>
  )
}

function WatchlistButton({ movieId, onClick, className = "" }) {
  const [inWatchlist, setInWatchlist] = useState(false)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    let ignore = false
    async function check() {
      const userId = localStorage.getItem('user_id')
      if (!userId || !movieId) {
        if (!ignore) setLoading(false)
        return
      }
      try {
        const res = await fetch(`${API_BASE}/watchlist/${encodeURIComponent(userId)}/check/${encodeURIComponent(movieId)}`)
        if (res.ok) {
          const data = await res.json()
          if (!ignore) setInWatchlist(data.in_watchlist || false)
        }
      } catch {}
      if (!ignore) setLoading(false)
    }
    check()
    return () => { ignore = true }
  }, [movieId])

  async function toggleWatchlist(e) {
    if (onClick) onClick(e)
    e.stopPropagation()
    const userId = localStorage.getItem('user_id')
    if (!userId || !movieId || updating) return
    
    setUpdating(true)
    try {
      const endpoint = inWatchlist ? 'remove' : 'add'
      const res = await fetch(`${API_BASE}/watchlist/${encodeURIComponent(userId)}/${endpoint}/${encodeURIComponent(movieId)}`, {
        method: 'POST'
      })
      if (res.ok) {
        setInWatchlist(!inWatchlist)
      }
    } catch {}
    finally {
      setUpdating(false)
    }
  }

  if (loading) return null

  return (
    <button 
      onClick={toggleWatchlist}
      disabled={updating}
      className={`rounded-lg px-5 py-2.5 text-sm font-medium transition ${inWatchlist 
        ? 'bg-violet-600 hover:bg-violet-500' 
        : 'bg-slate-800 hover:bg-slate-700'} ${className}`}
    >
      {updating ? '...' : inWatchlist ? '✓ In Watchlist' : 'Add to watchlist'}
    </button>
  )
}

function WatchlistPage() {
  const navigate = useNavigate()
  const [watchlist, setWatchlist] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    async function load() {
      const userId = localStorage.getItem('user_id')
      if (!userId) {
        if (!ignore) {
          setError('Please sign in to view your watchlist')
          setLoading(false)
        }
        return
      }
      try {
        const res = await fetch(`${API_BASE}/watchlist/${encodeURIComponent(userId)}`)
        if (!res.ok) throw new Error('Failed to load watchlist')
        const data = await res.json()
        if (!ignore) setWatchlist(data.watchlist || [])
      } catch (e) {
        if (!ignore) setError(e.message || 'Error loading watchlist')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    load()
    return () => { ignore = true }
  }, [])

  async function removeFromWatchlist(movieId) {
    const userId = localStorage.getItem('user_id')
    if (!userId) return
    try {
      const res = await fetch(`${API_BASE}/watchlist/${encodeURIComponent(userId)}/remove/${encodeURIComponent(movieId)}`, {
        method: 'POST'
      })
      if (res.ok) {
        setWatchlist(prev => prev.filter(m => m.movie_id !== movieId))
      }
    } catch {}
  }

  if (loading) return <div className="text-slate-400">Loading watchlist…</div>
  if (error) return <div className="text-rose-400">{error}</div>

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-4xl font-semibold">My Watchlist</h1>
      {watchlist.length === 0 ? (
        <div className="text-slate-400 text-center py-12">
          <p className="text-lg mb-4">Your watchlist is empty</p>
          <button onClick={() => navigate('/recommend')} className="rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-2">
            Browse Recommendations
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {watchlist.map((movie) => (
            <div key={movie.movie_id} className="flex flex-col gap-2">
              <div onClick={() => navigate(`/movie/${movie.movie_id}`)} className="relative aspect-[2/3] rounded-xl overflow-hidden bg-slate-900/50 border border-slate-800 hover:border-violet-600/50 transition cursor-pointer group">
                <img src={`${API_BASE}/image/${movie.movie_id}?type=poster`} alt={movie.title} className="absolute inset-0 h-full w-full object-cover" />
                <button
                  onClick={(e) => { e.stopPropagation(); removeFromWatchlist(movie.movie_id); }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition"
                >
                  ×
                </button>
              </div>
              <div className="text-sm font-medium line-clamp-2">{movie.title}</div>
              {movie.year && <div className="text-xs text-slate-400">{movie.year}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AboutPage() {
  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <div>
        <h1 className="text-4xl font-semibold mb-4">About MOVAI</h1>
        <p className="text-slate-300 leading-relaxed text-lg">
          MOVAI is a modern movie recommendation platform powered by advanced machine learning algorithms. 
          We help you discover your next favorite film by analyzing your preferences and providing personalized recommendations.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-3">🎬 Personalized Recommendations</h2>
          <p className="text-slate-400">
            Our AI-powered system learns from your movie preferences and viewing history to suggest films you'll love.
          </p>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-3">📊 Smart Filtering</h2>
          <p className="text-slate-400">
            Filter by genres, release years, and ratings to find exactly what you're in the mood for.
          </p>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-3">🎯 Curated Selection</h2>
          <p className="text-slate-400">
            Explore handpicked movies with detailed information, ratings, and streaming availability.
          </p>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-3">🔗 Streaming Links</h2>
          <p className="text-slate-400">
            Get direct links to watch your recommended movies on popular streaming platforms.
          </p>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-3">How It Works</h2>
        <ol className="list-decimal list-inside space-y-2 text-slate-300">
          <li>Create an account and sign in to get started</li>
          <li>Tell us about your movie preferences and favorite genres</li>
          <li>Browse personalized recommendations tailored just for you</li>
          <li>Explore movie details and find where to watch them</li>
        </ol>
      </div>

      <div className="pt-4">
        <button onClick={() => window.history.back()} className="rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-2 font-medium">Back</button>
      </div>
    </div>
  )
}
