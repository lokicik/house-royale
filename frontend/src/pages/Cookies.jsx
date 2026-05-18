import AppShell from '../components/AppShell'
import './Legal.css'

export default function Cookies() {
  return (
    <AppShell>
      <div className="legal-content">
        <h1>Çerez Politikası</h1>
        <p className="legal-date">Son güncelleme: 18 Mayıs 2026</p>

        <p>
          House Royale, platformun işlevselliğini ve kullanıcı deneyimini sürdürmek için sınırlı
          sayıda çerez ve tarayıcı depolama mekanizması kullanmaktadır.
        </p>

        <h2>1. Kullandığımız Depolama Mekanizmaları</h2>

        <h3>Zorunlu Çerezler</h3>
        <p>Bu çerezler olmadan platform düzgün çalışamaz:</p>
        <ul>
          <li>
            <strong>Oturum tokeni (Firebase Auth):</strong> Oturum açtıktan sonra kimliğinizi
            doğrulamak için tarayıcınızda güvenli bir oturum tokeni saklanır. Bu token sayfalar
            arasında geçiş yaparken kimlik doğrulamayı sürdürür.
          </li>
          <li>
            <strong>CSRF koruması:</strong> Form gönderimleri ve API çağrılarında güvenliği sağlamak
            için kısa ömürlü bir oturum çerezi kullanılır.
          </li>
        </ul>

        <h3>localStorage</h3>
        <p>Tarayıcı yerel deposunu şu amaçlarla kullanırız:</p>
        <ul>
          <li>
            <strong>Tercihler:</strong> Arayüz dil tercihi gibi uygulama düzeyindeki ayarlar.
          </li>
          <li>
            <strong>Lobi durumu:</strong> Sayfa yenilenmesi sonrasında aktif lobi oturumunu
            kurtarmak için geçici oda kimliği verisi.
          </li>
        </ul>

        <h2>2. Kullanmadığımız Şeyler</h2>
        <ul>
          <li>Reklam veya yeniden hedefleme çerezleri.</li>
          <li>Facebook Pixel, Google Analytics veya benzeri üçüncü taraf izleme araçları.</li>
          <li>Platformlar arası kullanıcı takibi.</li>
          <li>Hassas kişisel verilerin çerezlerde saklanması.</li>
        </ul>

        <h2>3. Çerez Süreleri</h2>
        <ul>
          <li><strong>Oturum çerezleri:</strong> Tarayıcıyı kapattığınızda otomatik silinir.</li>
          <li><strong>Firebase Auth tokeni:</strong> Oturumu kapattığınızda veya token süresi dolduğunda (30 gün) temizlenir.</li>
          <li><strong>localStorage verileri:</strong> Siz silene kadar veya hesabınızı kapatana kadar tarayıcıda kalır.</li>
        </ul>

        <h2>4. Çerezleri Kontrol Etme</h2>
        <p>
          Tarayıcı ayarlarınızdan çerezleri engelleyebilir veya silebilirsiniz. Ancak zorunlu çerezleri
          devre dışı bırakırsanız oturum açma ve oyun işlevleri düzgün çalışmayabilir.
        </p>
        <p>Tarayıcınıza göre ayarlar için:</p>
        <ul>
          <li>Chrome: Ayarlar → Gizlilik ve Güvenlik → Çerezler</li>
          <li>Firefox: Ayarlar → Gizlilik ve Güvenlik → Çerezler ve Site Verileri</li>
          <li>Safari: Tercihler → Gizlilik → Çerezleri Yönet</li>
        </ul>

        <h2>5. Değişiklikler</h2>
        <p>
          Kullandığımız depolama mekanizmalarında değişiklik olması halinde bu sayfa güncellenecek
          ve önemli değişiklikler için kayıtlı kullanıcılara bildirim gönderilecektir.
        </p>

        <h2>6. İletişim</h2>
        <p>
          Çerez politikamıza ilişkin sorularınız için:{' '}
          <a href="mailto:help@houseroyale.fun">help@houseroyale.fun</a>
        </p>
      </div>
    </AppShell>
  )
}
