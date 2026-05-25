import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../components/icons'
import ThemeToggle from '../components/ThemeToggle'
import './Landing.css'

const socialProofPhotos = [
  '/assets/landing-player-photo.jpg',
  '/assets/landing-player-photo-2.jpg',
  '/assets/landing-player-photo-3.jpg',
  '/assets/landing-player-photo-4.jpg',
]

const compareRows = [
  { name: 'Sen', pct: 92, you: true, price: '3.68M' },
  { name: 'model_0', pct: 84, price: '3.45M' },
  { name: 'model_1', pct: 78, price: '3.82M' },
  { name: 'model_2', pct: 71, price: '3.71M' },
  { name: 'model_3', pct: 63, price: '3.59M' },
]

const featureCards = [
  {
    icon: 'home',
    title: 'Gerçek İlanlar',
    desc: 'Türkiye genelinden seçilen gerçek emlak ilanlarıyla oyna. Fotoğraf, konum ve özellikler aynı ekranda.',
  },
  {
    icon: 'brain',
    title: 'AI Modelleri',
    desc: 'model_0, model_1 ve diğer modellerle yarış. Hangi tahmin hattı daha iyi, tur sonunda hemen gör.',
  },
  {
    icon: 'trophy',
    title: 'Çok Oyunculu Turlar',
    desc: 'Arkadaşlarınla aynı lobide yarış, gerçek fiyata en yakın tahmini kimin yaptığını anında izle.',
  },
]

const steps = [
  { num: 1, title: 'Evi İncele', desc: 'Gerçek ilan detaylarını, fotoğrafları ve mahalle sinyallerini gör.' },
  { num: 2, title: 'Tahminini Gir', desc: 'Evin gerçek satış fiyatına en yakın tahmini üret.' },
  { num: 3, title: 'Modeller Oynasın', desc: 'Aynı turda model_0, model_1 ve diğer modeller de tahmin yapsın.' },
  { num: 4, title: 'En Yakın Kazansın', desc: 'Gerçek fiyata en çok yaklaşan oyuncu tur puanlarını toplasın.' },
]

const stats = [
  { icon: 'users', value: '1.250+', label: 'Aktif Oyuncu' },
  { icon: 'play', value: '15.840+', label: 'Oynanan Tur' },
  { icon: 'brain', value: '6', label: 'Aktif Model' },
  { icon: 'trophy', value: '892', label: 'Bugünkü Maç' },
]

export default function Landing() {
  const navigate = useNavigate()
  const goLogin = () => navigate('/login')
  const [barsVisible, setBarsVisible] = useState(false)
  const navRef = useRef(null)
  const compareRef = useRef(null)
  const featuresRef = useRef(null)
  const howRef = useRef(null)
  const statsRef = useRef(null)

  const scrollToSection = sectionKey => {
    const sections = {
      features: featuresRef,
      how: howRef,
      stats: statsRef,
    }
    const targetRef = sections[sectionKey]
    if (!targetRef?.current) return

    const navHeight = navRef.current?.offsetHeight ?? 0
    const top = targetRef.current.getBoundingClientRect().top + window.scrollY - navHeight - 16

    window.scrollTo({
      top: Math.max(top, 0),
      behavior: 'smooth',
    })
  }

  useEffect(() => {
    const fadeEls = document.querySelectorAll('[data-fade]')
    const fadeObs = new IntersectionObserver(
      entries => entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
          fadeObs.unobserve(entry.target)
        }
      }),
      { threshold: 0.12 }
    )
    fadeEls.forEach(el => fadeObs.observe(el))

    const barObs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setBarsVisible(true)
          barObs.disconnect()
        }
      },
      { threshold: 0.25 }
    )
    if (compareRef.current) barObs.observe(compareRef.current)

    return () => {
      fadeObs.disconnect()
      barObs.disconnect()
    }
  }, [])

  return (
    <div className="landing">
      <div className="landing-bg-orb landing-bg-orb-a" />
      <div className="landing-bg-orb landing-bg-orb-b" />

      <header className="landing-nav" ref={navRef}>
        <div className="landing-nav-inner">
          <Link to="/" className="landing-brand" aria-label="House Royale">
            <img src="/house-royale-logo.png" alt="House Royale" className="landing-brand-logo" />
            <span className="landing-brand-name">House Royale</span>
          </Link>

          <nav className="landing-nav-links" aria-label="Landing navigation">
            <button type="button" className="landing-nav-link" onClick={() => scrollToSection('how')}>Nasıl Oynanır</button>
            <button type="button" className="landing-nav-link" onClick={() => scrollToSection('features')}>Özellikler</button>
            <button type="button" className="landing-nav-link" onClick={() => scrollToSection('stats')}>İstatistikler</button>
          </nav>

          <div className="landing-nav-actions">
            <ThemeToggle className="landing-theme-toggle" />
            <button className="landing-btn landing-btn-primary" onClick={goLogin}>Oyuna Başla</button>
          </div>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-container landing-hero-grid">
            <div className="landing-hero-copy">
              <span className="landing-kicker">Gerçek emlak tahmin oyunu</span>
              <h1>
                Ev fiyatını tahmin et.
                <span className="accent">AI'ı geç.</span>
              </h1>
              <p className="lead">
                Gelişmiş yapay zeka modellerine ve diğer oyunculara karşı yarış.
                Gerçek ilanlardan oluşan turlarda en yakın tahmini yap, liderlik tablosunda yüksel.
              </p>

              <div className="landing-hero-actions">
                <button className="landing-btn landing-btn-primary landing-btn-lg" onClick={goLogin}>
                  <Icon name="play" size={16} />
                  Hemen Oyna
                </button>
                <button className="landing-btn landing-btn-outline landing-btn-lg" onClick={goLogin}>
                  <Icon name="users" size={16} />
                  Lobiye Katıl
                </button>
              </div>

              <div className="landing-social">
                <div className="landing-avatars" aria-hidden="true">
                  {socialProofPhotos.map(photo => (
                    <span key={photo} className="landing-avatar-frame">
                      <img src={photo} alt="" className="landing-avatar-photo" />
                    </span>
                  ))}
                </div>
                <div className="landing-social-text">
                  <strong>1.250+ oyuncu</strong> şu an aktif olarak oynuyor
                </div>
              </div>
            </div>

            <div className="landing-hero-visual" data-fade>
              <div className="landing-hero-halo" />
              <div className="landing-hero-image-wrap">
                <img src="/assets/landing-page-house-img.png" alt="Modern ev" />
                <div className="landing-price-badge">
                  <span className="label">Gerçek Fiyat</span>
                  <span className="value">₺3.750.000</span>
                </div>
              </div>

              <div className="landing-compare-card" ref={compareRef}>
                <h4>Kim daha yakın tahmin eder?</h4>
                {compareRows.map((row, index) => (
                  <div key={row.name} className="landing-bar-row">
                    <span className={`name${row.you ? ' you' : ''}`}>{row.name}</span>
                    <span className="landing-bar-track">
                      <span
                        className={`landing-bar-fill${row.you ? '' : ' muted'}`}
                        style={{ width: barsVisible ? `${row.pct}%` : '0%', transitionDelay: `${index * 80}ms` }}
                      />
                    </span>
                    <span className="price">{row.price}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div ref={featuresRef} className="landing-scroll-anchor" aria-hidden="true" />

        <section className="landing-features">
          <div className="landing-container">
            <div className="landing-features-grid">
              {featureCards.map((feature, index) => (
                <article
                  key={feature.title}
                  className="landing-feature"
                  data-fade
                  style={{ transitionDelay: `${index * 90}ms` }}
                >
                  <div className="landing-feature-icon"><Icon name={feature.icon} size={24} /></div>
                  <div>
                    <h3>{feature.title}</h3>
                    <p>{feature.desc}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <div ref={howRef} className="landing-scroll-anchor" aria-hidden="true" />

        <section className="landing-how">
          <div className="landing-container">
            <h2 className="landing-section-title">Nasıl Çalışır</h2>
            <div className="landing-section-line" aria-hidden="true" />
            <div className="landing-steps">
              {steps.map((step, index) => (
                <article
                  key={step.num}
                  className="landing-step"
                  data-fade
                  style={{ transitionDelay: `${index * 80}ms` }}
                >
                  <div className="landing-step-icon">
                    <Icon
                      name={step.num === 1 ? 'home' : step.num === 2 ? 'chart' : step.num === 3 ? 'brain' : 'trophy'}
                      size={30}
                    />
                  </div>
                  <div className="landing-step-num">{step.num}</div>
                  <h4>{step.title}</h4>
                  <p>{step.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <div ref={statsRef} className="landing-scroll-anchor landing-scroll-anchor-stats" aria-hidden="true" />

        <section className="landing-stats">
          <div className="landing-container">
            <div className="landing-stats-grid">
              {stats.map((stat, index) => (
                <div
                  key={stat.label}
                  className="landing-stat"
                  data-fade
                  style={{ transitionDelay: `${index * 70}ms` }}
                >
                  <div className="landing-stat-icon"><Icon name={stat.icon} size={30} /></div>
                  <div>
                    <div className="value">{stat.value}</div>
                    <div className="label">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-main">
            <Link to="/" className="landing-footer-brand" aria-label="House Royale">
              <img src="/house-royale-logo.png" alt="House Royale" className="landing-footer-logo" />
              <span>House Royale</span>
            </Link>

            <nav className="landing-footer-nav" aria-label="Footer navigation">
              <button type="button" className="landing-footer-link-btn" onClick={() => scrollToSection('how')}>Nasıl Oynanır</button>
              <button type="button" className="landing-footer-link-btn" onClick={() => scrollToSection('features')}>Özellikler</button>
              <button type="button" className="landing-footer-link-btn" onClick={() => scrollToSection('stats')}>İstatistikler</button>
              <button type="button" className="landing-footer-link-btn" onClick={goLogin}>Giriş Yap</button>
            </nav>
          </div>

          <div className="landing-footer-bar">
            <span>© 2026 House Royale. Tüm hakları saklıdır.</span>
            <div className="legal">
              <Link to="/privacy">Gizlilik</Link>
              <Link to="/terms">Şartlar</Link>
              <Link to="/cookies">Çerezler</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
