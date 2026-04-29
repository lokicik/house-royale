import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
      <h1>House Royale</h1>
      <p>Türk gayrimenkul fiyatlarını tahmin et. Yapay zeka modelleriyle yarış.</p>
      <button onClick={() => navigate('/login')} style={{ marginTop: '2rem', padding: '0.75rem 2rem', fontSize: '1rem', cursor: 'pointer' }}>
        Oyna
      </button>
    </div>
  )
}
