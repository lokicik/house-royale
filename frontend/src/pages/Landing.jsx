import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/icons'
import './Landing.css'

const avatarColors = ['#2563eb', '#7c3aed', '#db2777', '#f59e0b', '#10b981']

const compareRows = [
  { name: 'Sen', pct: 92, you: true },
  { name: 'GPT-4', pct: 84 },
  { name: 'Claude', pct: 78 },
  { name: 'Gemini', pct: 71 },
  { name: 'Llama 3', pct: 63 },
]

export default function Landing() {
  const navigate = useNavigate()
  const goLogin = () => navigate('/login')

  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <span className="landing-logo-mark">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 11l9-8 9 8" />
                <path d="M5 10v10h14V10" />
              </svg>
            </span>
            HOUSE ROYALE
          </div>
          <div className="landing-nav-links">
            <a href="#how">Nasıl Oynanır</a>
            <a href="#features">Özellikler</a>
            <a href="#models">Modeller</a>
            <a href="#leaderboard">Liderlik</a>
            <a href="#about">Hakkında</a>
          </div>
          <div className="landing-nav-actions">
            <button className="landing-btn landing-btn-ghost" onClick={goLogin}>Giriş Yap</button>
            <button className="landing-btn landing-btn-primary" onClick={goLogin}>Kayıt Ol</button>
          </div>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-container landing-hero-grid">
          <div>
            <h1>
              Ev fiyatını tahmin et.
              <span className="accent">AI'ı geç.</span>
            </h1>
            <p className="lead">
              Gelişmiş yapay zeka modellerine karşı yarış ve gerçek emlak fiyat tahmini turlarında
              en yakın tahmini sen yap.
            </p>
            <div className="landing-hero-actions">
              <button className="landing-btn landing-btn-primary landing-btn-lg" onClick={goLogin}>
                <Icon name="play" size={16} />
                Oyuna Başla
              </button>
              <button className="landing-btn landing-btn-outline landing-btn-lg" onClick={goLogin}>
                <Icon name="users" size={16} />
                Lobiye Katıl
              </button>
            </div>
            <div className="landing-social">
              <div className="landing-avatars">
                {avatarColors.map((c, i) => (
                  <span key={i} style={{ background: c }}>{String.fromCharCode(65 + i)}</span>
                ))}
              </div>
              <div className="landing-social-text">
                <strong>1.250+ oyuncu</strong> şu an oynuyor
              </div>
            </div>
          </div>

          <div className="landing-hero-visual">
            <div className="landing-hero-image-wrap">
              <img src="/assets/landing-page-house-img.png" alt="Modern ev" />
              <div className="landing-price-badge">
                <span className="label">Gerçek Fiyat</span>
                <span className="value">₺3.750.000</span>
              </div>
            </div>
            <div className="landing-compare-card">
              <h4>Kim daha yakın tahmin eder?</h4>
              {compareRows.map((r) => (
                <div key={r.name} className="landing-bar-row">
                  <span className={`name${r.you ? ' you' : ''}`}>{r.name}</span>
                  <span className="landing-bar-track">
                    <span
                      className={`landing-bar-fill${r.you ? '' : ' muted'}`}
                      style={{ width: `${r.pct}%` }}
                    />
                  </span>
                  <span className="pct">%{r.pct}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-features" id="features">
        <div className="landing-container">
          <div className="landing-features-grid">
            <div className="landing-feature">
              <div className="landing-feature-icon"><Icon name="home" size={22} /></div>
              <h3>Gerçek İlanlar</h3>
              <p>Türkiye genelinden seçilmiş gerçek emlak ilanlarıyla turlar oyna. Her ev gerçek, her fiyat doğrulanmış.</p>
            </div>
            <div className="landing-feature">
              <div className="landing-feature-icon"><Icon name="brain" size={22} /></div>
              <h3>AI Modelleri</h3>
              <p>GPT-4, Claude, Gemini ve daha fazlasıyla yarış. Hangisinin emlak sezgisi daha iyi, sen karar ver.</p>
            </div>
            <div className="landing-feature">
              <div className="landing-feature-icon"><Icon name="trophy" size={22} /></div>
              <h3>Çok Oyunculu Turlar</h3>
              <p>Arkadaşlarınla aynı lobide yarış, her turda kim AI'ya en yakın geldi, anında gör.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-how" id="how">
        <div className="landing-container">
          <h2 className="landing-section-title">Nasıl Çalışır</h2>
          <div className="landing-steps">
            <div className="landing-step">
              <div className="landing-step-num">1</div>
              <h4>Ev Gör</h4>
              <p>Gerçek bir ilanı, fotoğraflarını ve detaylarını incele.</p>
            </div>
            <div className="landing-step">
              <div className="landing-step-num">2</div>
              <h4>Tahmin Et</h4>
              <p>Evin gerçek fiyatına dair en iyi tahminini gir.</p>
            </div>
            <div className="landing-step">
              <div className="landing-step-num">3</div>
              <h4>AI Tahmin Eder</h4>
              <p>Yapay zeka modelleri de aynı anda kendi tahminlerini yapar.</p>
            </div>
            <div className="landing-step">
              <div className="landing-step-num">4</div>
              <h4>En Yakın Kazanır</h4>
              <p>Gerçek fiyata en yakın tahmin tur puanlarını alır.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-stats">
        <div className="landing-container">
          <div className="landing-stats-grid">
            <div className="landing-stat">
              <div className="landing-stat-icon"><Icon name="users" size={22} /></div>
              <div>
                <div className="value">1.250+</div>
                <div className="label">Aktif Oyuncu</div>
              </div>
            </div>
            <div className="landing-stat">
              <div className="landing-stat-icon"><Icon name="clock" size={22} /></div>
              <div>
                <div className="value">15.840+</div>
                <div className="label">Oynanan Tur</div>
              </div>
            </div>
            <div className="landing-stat">
              <div className="landing-stat-icon"><Icon name="brain" size={22} /></div>
              <div>
                <div className="value">6</div>
                <div className="label">AI Modeli</div>
              </div>
            </div>
            <div className="landing-stat">
              <div className="landing-stat-icon"><Icon name="home" size={22} /></div>
              <div>
                <div className="value">892</div>
                <div className="label">Bugünkü Ev</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-top">
            <div className="landing-footer-brand-col">
              <div className="landing-footer-brand">
                <span className="landing-logo-mark">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 11l9-8 9 8" />
                    <path d="M5 10v10h14V10" />
                  </svg>
                </span>
                HOUSE ROYALE
              </div>
              <p className="landing-footer-tag">
                Türkiye'nin gerçek emlak fiyat tahmin yarışı. AI modellerine karşı yarış, en yakın tahmini sen yap.
              </p>
              <div className="landing-socials">
                <a className="landing-social" href="#" aria-label="Twitter">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                </a>
                <a className="landing-social" href="#" aria-label="GitHub">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.16c-3.2.7-3.88-1.36-3.88-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.68 1.25 3.34.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.58.23 2.75.11 3.04.73.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.41-5.25 5.7.41.36.78 1.06.78 2.14v3.17c0 .31.21.68.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.73 18.27.5 12 .5z" /></svg>
                </a>
                <a className="landing-social" href="#" aria-label="Discord">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" /></svg>
                </a>
                <a className="landing-social" href="#" aria-label="Instagram">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" />
                    <path d="M16 11.37a4 4 0 1 1-4.73-4.66 4 4 0 0 1 4.73 4.66z" />
                    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                  </svg>
                </a>
              </div>
            </div>

            <div className="landing-footer-col">
              <h4>Oyun</h4>
              <ul>
                <li><a onClick={goLogin}>Oyna</a></li>
                <li><a href="#features">Özellikler</a></li>
                <li><a href="#how">Nasıl Oynanır</a></li>
                <li><a onClick={goLogin}>Lobiye Katıl</a></li>
              </ul>
            </div>

            <div className="landing-footer-col">
              <h4>Topluluk</h4>
              <ul>
                <li><a href="#">Discord</a></li>
                <li><a href="#">Twitter</a></li>
                <li><a href="#">Blog</a></li>
                <li><a href="#">Turnuvalar</a></li>
              </ul>
            </div>

            <div className="landing-footer-col">
              <h4>Şirket</h4>
              <ul>
                <li><a href="#">Hakkımızda</a></li>
                <li><a href="#">Kariyer</a></li>
                <li><a href="#">Basın</a></li>
                <li><a href="mailto:info@houseroyale.app">İletişim</a></li>
              </ul>
            </div>

            <div className="landing-newsletter">
              <h4>Güncel Kal</h4>
              <p>Yeni turlar, modeller ve haftalık liderlik özetleri.</p>
              <form className="landing-newsletter-form" onSubmit={(e) => e.preventDefault()}>
                <input type="email" placeholder="sen@ornek.com" />
                <button type="submit">Katıl</button>
              </form>
              <div className="landing-newsletter-note">Spam yok. İstediğinde aboneliği bırakabilirsin.</div>
            </div>
          </div>

          <div className="landing-footer-bar">
            <span>© 2026 House Royale. Tüm hakları saklıdır.</span>
            <div className="legal">
              <a href="#">Gizlilik</a>
              <a href="#">Şartlar</a>
              <a href="#">Çerezler</a>
            </div>
            <span className="landing-status-dot">Tüm sistemler çalışıyor</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
