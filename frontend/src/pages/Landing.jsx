import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import LocaleToggle from '../components/LocaleToggle'
import { Icon } from '../components/icons'
import ThemeToggle from '../components/ThemeToggle'
import { useLocale } from '../contexts/localeContextValue'
import './Landing.css'

void React

const socialProofPhotos = [
  '/assets/landing-player-photo.jpg',
  '/assets/landing-player-photo-2.jpg',
  '/assets/landing-player-photo-3.jpg',
  '/assets/landing-player-photo-4.jpg',
]

export default function Landing() {
  const navigate = useNavigate()
  const { t } = useLocale()
  const goLogin = () => navigate('/login')
  const [barsVisible, setBarsVisible] = useState(false)
  const navRef = useRef(null)
  const compareRef = useRef(null)
  const featuresRef = useRef(null)
  const howRef = useRef(null)
  const statsRef = useRef(null)
  const compareRows = t('landing.compareRows')
  const featureCards = t('landing.featureCards')
  const steps = t('landing.steps')
  const stats = t('landing.stats')

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
            <button type="button" className="landing-nav-link" onClick={() => scrollToSection('how')}>{t('landing.nav.how')}</button>
            <button type="button" className="landing-nav-link" onClick={() => scrollToSection('features')}>{t('landing.nav.features')}</button>
            <button type="button" className="landing-nav-link" onClick={() => scrollToSection('stats')}>{t('landing.nav.stats')}</button>
          </nav>

          <div className="landing-nav-actions">
            <LocaleToggle />
            <ThemeToggle className="landing-theme-toggle" />
            <button className="landing-btn landing-btn-primary" onClick={goLogin}>{t('landing.actions.start')}</button>
          </div>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-container landing-hero-grid">
            <div className="landing-hero-copy">
              <span className="landing-kicker">{t('landing.kicker')}</span>
              <h1>
                {t('landing.hero.title')}
                <span className="accent">{t('landing.hero.accent')}</span>
              </h1>
              <p className="lead">{t('landing.hero.lead')}</p>

              <div className="landing-hero-actions">
                <button className="landing-btn landing-btn-primary landing-btn-lg" onClick={goLogin}>
                  <Icon name="play" size={16} />
                  {t('landing.actions.playNow')}
                </button>
                <button className="landing-btn landing-btn-outline landing-btn-lg" onClick={goLogin}>
                  <Icon name="users" size={16} />
                  {t('landing.actions.joinLobby')}
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
                  <strong>{t('landing.socialProof.strong')}</strong> {t('landing.socialProof.text')}
                </div>
              </div>
            </div>

            <div className="landing-hero-visual" data-fade>
              <div className="landing-hero-halo" />
              <div className="landing-hero-image-wrap">
                <img src="/assets/landing-page-house-img.png" alt={t('landing.heroImageAlt')} />
                <div className="landing-price-badge">
                  <span className="label">{t('landing.priceLabel')}</span>
                  <span className="value">₺3.750.000</span>
                </div>
              </div>

              <div className="landing-compare-card" ref={compareRef}>
                <h4>{t('landing.compareTitle')}</h4>
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
            <h2 className="landing-section-title">{t('landing.sectionTitle')}</h2>
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
              <button type="button" className="landing-footer-link-btn" onClick={() => scrollToSection('how')}>{t('landing.nav.how')}</button>
              <button type="button" className="landing-footer-link-btn" onClick={() => scrollToSection('features')}>{t('landing.nav.features')}</button>
              <button type="button" className="landing-footer-link-btn" onClick={() => scrollToSection('stats')}>{t('landing.nav.stats')}</button>
              <button type="button" className="landing-footer-link-btn" onClick={goLogin}>{t('landing.actions.signIn')}</button>
            </nav>
          </div>

          <div className="landing-footer-bar">
            <LocaleToggle />
            <span>{t('common.footer.copyright')}</span>
            <div className="legal">
              <Link to="/privacy">{t('common.footer.privacy')}</Link>
              <Link to="/terms">{t('common.footer.terms')}</Link>
              <Link to="/cookies">{t('common.footer.cookies')}</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
