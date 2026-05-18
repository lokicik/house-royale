import AppShell from '../components/AppShell'
import './Legal.css'

export default function Privacy() {
  return (
    <AppShell>
      <div className="legal-content">
        <h1>Gizlilik Politikası</h1>
        <p className="legal-date">Son güncelleme: 18 Mayıs 2026</p>

        <p>
          House Royale ("biz", "bize" veya "şirketimiz") olarak gizliliğinizi ciddiye alıyoruz. Bu
          politika, hizmetlerimizi kullanırken hangi kişisel verileri topladığımızı, bu verileri nasıl
          işlediğimizi ve haklarınızın neler olduğunu açıklamaktadır.
        </p>

        <h2>1. Toplanan Veriler</h2>
        <p>House Royale'i kullanırken aşağıdaki verileri toplayabiliriz:</p>
        <ul>
          <li><strong>Hesap bilgileri:</strong> E-posta adresiniz ve seçtiğiniz görünen adınız.</li>
          <li><strong>Oyun verileri:</strong> Tahminleriniz, puan geçmişiniz, katıldığınız turlar ve liderlik tablosu sıralamanız.</li>
          <li><strong>Teknik veriler:</strong> IP adresi, tarayıcı türü, oturum süreleri ve uygulama içi hata günlükleri.</li>
          <li><strong>İletişim verileri:</strong> Bize gönderdiğiniz destek talepleri veya geri bildirimler.</li>
        </ul>

        <h2>2. Verilerin Kullanım Amacı</h2>
        <p>Topladığımız verileri şu amaçlarla kullanırız:</p>
        <ul>
          <li>Hesabınızı oluşturmak ve kimlik doğrulamasını sağlamak.</li>
          <li>Oyun akışını yönetmek, tahminlerinizi kaydetmek ve puanları hesaplamak.</li>
          <li>Liderlik tablolarını ve AI model karşılaştırmalarını oluşturmak.</li>
          <li>Hizmet güvenilirliğini izlemek ve hataları gidermek.</li>
          <li>Yasal yükümlülüklerimizi yerine getirmek.</li>
        </ul>

        <h2>3. Veri Paylaşımı</h2>
        <p>
          Kişisel verilerinizi üçüncü taraflara satmıyoruz. Yalnızca aşağıdaki durumlarda paylaşım
          gerçekleşebilir:
        </p>
        <ul>
          <li><strong>Hizmet sağlayıcılar:</strong> Kimlik doğrulama ve veritabanı altyapısı için Firebase (Google LLC) kullanıyoruz.</li>
          <li><strong>Yasal zorunluluklar:</strong> Mahkeme kararı veya yetkili makam talebi halinde.</li>
          <li><strong>Şirket devri:</strong> Birleşme veya satın alma süreçlerinde, kullanıcılar önceden bilgilendirilir.</li>
        </ul>

        <h2>4. Veri Saklama Süresi</h2>
        <p>
          Hesabınız aktif olduğu sürece verilerinizi saklarız. Hesabınızı silmeniz halinde kişisel
          verileriniz 30 gün içinde sistemlerimizden kaldırılır. Yasal yükümlülükler gerektirdiğinde
          anonimleştirilmiş oyun istatistikleri daha uzun süre tutulabilir.
        </p>

        <h2>5. KVKK Kapsamındaki Haklarınız</h2>
        <p>
          6698 Sayılı Kişisel Verilerin Korunması Kanunu uyarınca aşağıdaki haklara sahipsiniz:
        </p>
        <ul>
          <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme.</li>
          <li>İşlenmiş kişisel verilerinizi talep etme.</li>
          <li>Hatalı verilerin düzeltilmesini isteme.</li>
          <li>Verilerinizin silinmesini veya yok edilmesini talep etme.</li>
          <li>Verilerinizin üçüncü taraflara aktarılması halinde bildirim talep etme.</li>
          <li>Otomatik sistemler aracılığıyla aleyhinize bir sonuç ortaya çıkmasına itiraz etme.</li>
        </ul>
        <p>
          Bu haklarınızı kullanmak için <a href="mailto:help@houseroyale.fun">help@houseroyale.fun</a> adresine
          yazabilirsiniz.
        </p>

        <h2>6. Güvenlik</h2>
        <p>
          Verilerinizi yetkisiz erişime karşı korumak için endüstri standardı şifreleme (TLS) ve
          erişim kontrolü önlemleri uyguluyoruz. Ancak internet üzerindeki hiçbir iletimin %100 güvenli
          olmadığını hatırlatırız.
        </p>

        <h2>7. Değişiklikler</h2>
        <p>
          Bu politikayı zaman zaman güncelleyebiliriz. Önemli değişiklikler olduğunda kayıtlı e-posta
          adresinize bildirim göndeririz. Güncel politikaya her zaman bu sayfadan ulaşabilirsiniz.
        </p>

        <h2>8. İletişim</h2>
        <p>
          Gizlilik konusundaki sorularınız için:{' '}
          <a href="mailto:help@houseroyale.fun">help@houseroyale.fun</a>
        </p>
      </div>
    </AppShell>
  )
}
