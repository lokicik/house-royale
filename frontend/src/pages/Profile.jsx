import { useEffect, useState } from 'react'
import { updateProfile } from 'firebase/auth'
import AppShell from '../components/AppShell'
import { useAuth } from '../contexts/authContextValue'
import { getLeaderboard, getMyHistory } from '../lib/api'
import './Profile.css'

const RANK_MEDALS = ['🥇', '🥈', '🥉']

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatMemberSince(firebaseUser) {
  if (!firebaseUser?.metadata?.creationTime) return '—'
  return new Date(firebaseUser.metadata.creationTime).toLocaleDateString('tr-TR', {
    month: 'long',
    year: 'numeric',
  })
}

export default function Profile() {
  const { user } = useAuth()
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState('')

  const [myStats, setMyStats] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Misafir'

  useEffect(() => {
    if (!user) return
    setLoading(true)
    setError(null)
    user.getIdToken().then(idToken => {
      Promise.all([
        getLeaderboard().then(d => ({ ok: true, d })).catch(e => ({ ok: false, e })),
        getMyHistory(user, idToken).then(d => ({ ok: true, d })).catch(e => ({ ok: false, e })),
      ]).then(([lbRes, histRes]) => {
        if (lbRes.ok && lbRes.d?.entries) {
          const me = lbRes.d.entries.find(e => !e.is_ai && e.id === user.uid)
          setMyStats(me ? { ...me, total: lbRes.d.entries.length } : null)
        }
        if (histRes.ok) {
          setHistory(histRes.d?.records ?? [])
        }
        const failures = [
          !lbRes.ok && (lbRes.e?.message || 'leaderboard'),
          !histRes.ok && (histRes.e?.message || 'history'),
        ].filter(Boolean)
        if (failures.length) {
          setError(`Veriler yüklenemedi: ${failures.join(' · ')}`)
        }
        setLoading(false)
      })
    }).catch(e => {
      setError(`Oturum doğrulanamadı: ${e?.message ?? e}`)
      setLoading(false)
    })
  }, [user])

  function startEditName() {
    setNameDraft(displayName)
    setNameError('')
    setEditingName(true)
  }

  async function saveName() {
    const trimmed = nameDraft.trim()
    if (!trimmed) {
      setNameError('İsim boş olamaz')
      return
    }
    if (trimmed.length > 30) {
      setNameError('İsim 30 karakterden uzun olamaz')
      return
    }
    setSavingName(true)
    setNameError('')
    try {
      await updateProfile(user, { displayName: trimmed })
      setEditingName(false)
    } catch {
      setNameError('İsim güncellenemedi')
    } finally {
      setSavingName(false)
    }
  }

  function cancelEditName() {
    setEditingName(false)
    setNameError('')
  }

  return (
    <AppShell>
      <div className="pf-header">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1>Profilim</h1>
          <p>Hesap bilgilerini ve oyun istatistiklerini görüntüle.</p>
        </div>
      </div>

      <div className="pf-grid">
        <aside className="pf-sidebar">
          <div className="pf-profile-card">
            <div className="pf-avatar-lg">{initials(displayName)}</div>

            {editingName ? (
              <div className="pf-name-edit">
                <input
                  className="pf-name-input"
                  value={nameDraft}
                  onChange={e => setNameDraft(e.target.value)}
                  maxLength={30}
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') cancelEditName() }}
                />
                <div className="pf-name-actions">
                  <button className="hr-btn hr-btn-primary" onClick={saveName} disabled={savingName}>
                    {savingName ? 'Kaydediliyor…' : 'Kaydet'}
                  </button>
                  <button className="hr-btn hr-btn-ghost" onClick={cancelEditName}>İptal</button>
                </div>
                {nameError && <div className="pf-name-error">{nameError}</div>}
              </div>
            ) : (
              <div className="pf-name-row">
                <h2 className="pf-display-name">{displayName}</h2>
                <button className="pf-edit-btn" onClick={startEditName} title="İsmi düzenle">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
            )}

            <div className="pf-email">{user?.email}</div>
            <div className="pf-member-since">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {formatMemberSince(user)} tarihinden beri üye
            </div>
          </div>

          {myStats && (
            <div className="pf-stats-card">
              <h3>Oyun Özeti</h3>
              <div className="pf-rank-row">
                <div className="pf-rank-badge">#{myStats.rank}</div>
                <div>
                  <div className="pf-label">Genel Sıralama</div>
                  <div className="pf-value">
                    {myStats.total > 0
                      ? `Üst %${Math.ceil(myStats.rank / myStats.total * 100)}`
                      : '—'}
                  </div>
                </div>
              </div>
              <div className="pf-stat-grid">
                <div className="pf-stat">
                  <div className="pf-stat-label">Tur</div>
                  <div className="pf-stat-value">{myStats.rounds}</div>
                </div>
                <div className="pf-stat">
                  <div className="pf-stat-label">Ort. Hata</div>
                  <div className="pf-stat-value">%{myStats.avg_err.toFixed(2)}</div>
                </div>
                <div className="pf-stat">
                  <div className="pf-stat-label">Kazanma</div>
                  <div className="pf-stat-value">%{myStats.win_rate.toFixed(1)}</div>
                </div>
                <div className="pf-stat">
                  <div className="pf-stat-label">Puan</div>
                  <div className="pf-stat-value">{myStats.score.toLocaleString('tr-TR')}</div>
                </div>
              </div>
            </div>
          )}
        </aside>

        <div className="pf-main">
          <div className="pf-section-card">
            <div className="pf-section-header">
              <h3>Oyun Geçmişi</h3>
              {!loading && !error && <span className="pf-count">{history.length} oyun</span>}
            </div>

            {loading ? (
              <div className="pf-empty">Yükleniyor…</div>
            ) : error ? (
              <div className="pf-empty" style={{ color: 'var(--hr-danger)' }}>{error}</div>
            ) : history.length === 0 ? (
              <div className="pf-empty">Henüz tamamlanmış oyunun yok. Bir oda oluştur ve oynamaya başla!</div>
            ) : (
              <table className="pf-history-table">
                <thead>
                  <tr>
                    <th>Sıra</th>
                    <th>Takma Ad</th>
                    <th>Puan</th>
                    <th>Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((rec, i) => (
                    <tr key={i}>
                      <td>
                        <span className="pf-history-rank">
                          {RANK_MEDALS[rec.rank - 1] ?? `#${rec.rank}`}
                        </span>
                      </td>
                      <td>{rec.nickname}</td>
                      <td><strong>{rec.score.toLocaleString('tr-TR')}</strong></td>
                      <td className="pf-date">{formatDate(rec.finished_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
