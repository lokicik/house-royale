import AppShell from '../components/AppShell'
import './Legal.css'

export default function Terms() {
  return (
    <AppShell>
      <div className="legal-content">
        <h1>Kullanım Şartları</h1>
        <p className="legal-date">Son güncelleme: 18 Mayıs 2026</p>

        <p>
          House Royale'e erişerek veya platformu kullanarak bu Kullanım Şartları'nı kabul etmiş
          sayılırsınız. Lütfen dikkatlice okuyunuz.
        </p>

        <h2>1. Hizmetin Kapsamı</h2>
        <p>
          House Royale, kullanıcıların gerçek Türkiye gayrimenkul ilanları üzerinden yapay zeka
          modelleriyle fiyat tahmin yarışları yaptığı eğlence amaçlı bir platformdur. Platform
          üzerindeki tüm tahminler ve puanlar yalnızca oyun içi geçerliliğe sahiptir; gerçek finansal
          tavsiye niteliği taşımaz.
        </p>

        <h2>2. Hesap Oluşturma</h2>
        <ul>
          <li>Platforma kayıt olmak için geçerli bir e-posta adresi gerekmektedir.</li>
          <li>Hesap bilgilerinizin güvenliğinden siz sorumlusunuz.</li>
          <li>Hesabınızı başkasına devredemez veya satamaz, başkasının adına hesap oluşturamazsınız.</li>
          <li>18 yaşından küçükseniz ebeveyn veya vasi onayıyla platforma katılabilirsiniz.</li>
        </ul>

        <h2>3. Kabul Edilebilir Kullanım</h2>
        <p>Platformu kullanırken aşağıdakileri yapmaktan kaçınmalısınız:</p>
        <ul>
          <li>Oyun mekaniklerini manipüle etmek veya hile uygulamak.</li>
          <li>Diğer kullanıcıları taciz etmek veya rahatsız edici içerik paylaşmak.</li>
          <li>Otomatik araçlar ya da botlar aracılığıyla sisteme aşırı yük bindirmek.</li>
          <li>Platformun kaynak kodunu, veri yapısını veya API'lerini izinsiz kopyalamak ya da tersine mühendislik uygulamak.</li>
          <li>House Royale altyapısını veya diğer kullanıcıları etkileyen güvenlik açıklarını kötüye kullanmak.</li>
        </ul>

        <h2>4. Yapay Zeka Modelleri ve Tahminler</h2>
        <p>
          Platformdaki yapay zeka modelleri (Custom ANN, Hybrid Model, MLP Model vb.) eğitim
          verilerine dayalı tahminler üretir. Bu tahminler:
        </p>
        <ul>
          <li>Gerçek piyasa koşullarını her zaman doğru yansıtmayabilir.</li>
          <li>Yatırım, kiralama veya satın alma kararlarında referans olarak kullanılmamalıdır.</li>
          <li>Yalnızca oyun deneyimi sunmak amacıyla hesaplanmaktadır.</li>
        </ul>

        <h2>5. Fikri Mülkiyet</h2>
        <p>
          House Royale adı, logosu, tasarımı, yazılım kodu ve içerikler telif hakkı ve ticari marka
          yasalarıyla korunmaktadır. Kullanıcılar bu içerikleri House Royale'in yazılı izni olmaksızın
          kopyalayamaz, dağıtamaz veya ticari amaçla kullanamaz.
        </p>

        <h2>6. Hizmet Kesintileri ve Değişiklikler</h2>
        <p>
          Bakım, güncelleme veya teknik nedenlerle hizmeti geçici olarak durdurma hakkını saklı
          tutarız. Hizmet özelliklerini önceden haber vermeksizin değiştirebiliriz; ancak önemli
          değişiklikler için kullanıcılar bilgilendirilir.
        </p>

        <h2>7. Sorumluluk Sınırlaması</h2>
        <p>
          House Royale, platform üzerindeki tahminlerin veya AI model çıktılarının doğruluğuna dair
          herhangi bir garanti vermez. Kullanıcının bu verilere dayanarak aldığı kararlardan doğacak
          doğrudan veya dolaylı zararlardan sorumlu tutulamaz. Platformun teknik arızalarından
          kaynaklanan puan kayıpları için azami sorumluluk, etkilenen kullanıcıya abonelik ücreti
          iadesinden ibaret olacaktır.
        </p>

        <h2>8. Hesap Askıya Alma</h2>
        <p>
          Bu şartları ihlal eden hesaplar önceden bildirimde bulunulmaksızın askıya alınabilir veya
          kalıcı olarak kapatılabilir. İtiraz hakkı için{' '}
          <a href="mailto:help@houseroyale.fun">help@houseroyale.fun</a> adresine
          başvurabilirsiniz.
        </p>

        <h2>9. Uygulanacak Hukuk</h2>
        <p>
          Bu şartlar Türkiye Cumhuriyeti hukukuna tabidir. Anlaşmazlıklarda İstanbul mahkemeleri
          yetkilidir.
        </p>

        <h2>10. İletişim</h2>
        <p>
          Kullanım şartlarına ilişkin sorularınız için:{' '}
          <a href="mailto:help@houseroyale.fun">help@houseroyale.fun</a>
        </p>
      </div>
    </AppShell>
  )
}
