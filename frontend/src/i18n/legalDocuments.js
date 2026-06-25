export const legalDocuments = {
  tr: {
    privacy: {
      title: 'Gizlilik Politikasi',
      updatedAt: 'Son guncelleme: 18 Mayis 2026',
      blocks: [
        {
          type: 'p',
          text: 'House Royale ("biz", "bize" veya "sirketimiz") olarak gizliliginizi ciddiye aliyoruz. Bu politika, hizmetlerimizi kullanirken hangi kisisel verileri topladigimizi, bu verileri nasil isledigimizi ve haklarinizin neler oldugunu aciklamaktadir.',
        },
        { type: 'h2', text: '1. Toplanan Veriler' },
        { type: 'p', text: "House Royale'i kullanirken asagidaki verileri toplayabiliriz:" },
        {
          type: 'ul',
          items: [
            { label: 'Hesap bilgileri:', text: 'E-posta adresiniz ve sectiginiz gorunen adiniz.' },
            { label: 'Oyun verileri:', text: 'Tahminleriniz, puan gecmisiniz, katildiginiz turlar ve liderlik tablosu siralamaniz.' },
            { label: 'Teknik veriler:', text: 'IP adresi, tarayici turu, oturum sureleri ve uygulama ici hata gunlukleri.' },
            { label: 'Iletisim verileri:', text: 'Bize gonderdiginiz destek talepleri veya geri bildirimler.' },
          ],
        },
        { type: 'h2', text: '2. Verilerin Kullanim Amaci' },
        { type: 'p', text: 'Topladigimiz verileri su amaclarla kullaniriz:' },
        {
          type: 'ul',
          items: [
            'Hesabinizi olusturmak ve kimlik dogrulamasini saglamak.',
            'Oyun akisini yonetmek, tahminlerinizi kaydetmek ve puanlari hesaplamak.',
            'Liderlik tablolarini ve AI model karsilastirmalarini olusturmak.',
            'Hizmet guvenilirligini izlemek ve hatalari gidermek.',
            'Yasal yukumluluklerimizi yerine getirmek.',
          ],
        },
        { type: 'h2', text: '3. Veri Paylasimi' },
        {
          type: 'p',
          text: 'Kisisel verilerinizi ucuncu taraflara satmiyoruz. Yalnizca asagidaki durumlarda paylasim gerceklesebilir:',
        },
        {
          type: 'ul',
          items: [
            { label: 'Hizmet saglayicilar:', text: 'Kimlik dogrulama ve veritabani altyapisi icin Firebase (Google LLC) kullaniyoruz.' },
            { label: 'Yasal zorunluluklar:', text: 'Mahkeme karari veya yetkili makam talebi halinde.' },
            { label: 'Sirket devri:', text: 'Birlesme veya satin alma sureclerinde, kullanicilar onceden bilgilendirilir.' },
          ],
        },
        { type: 'h2', text: '4. Veri Saklama Suresi' },
        {
          type: 'p',
          text: 'Hesabiniz aktif oldugu surece verilerinizi saklariz. Hesabinizi silmeniz halinde kisisel verileriniz 30 gun icinde sistemlerimizden kaldirilir. Yasal yukumlulukler gerektirdiginde anonimlestirilmis oyun istatistikleri daha uzun sure tutulabilir.',
        },
        { type: 'h2', text: '5. KVKK Kapsamindaki Haklariniz' },
        {
          type: 'p',
          text: '6698 Sayili Kisisel Verilerin Korunmasi Kanunu uyarinca asagidaki haklara sahipsiniz:',
        },
        {
          type: 'ul',
          items: [
            'Kisisel verilerinizin islenip islenmedigini ogrenme.',
            'Islenmis kisisel verilerinizi talep etme.',
            'Hatali verilerin duzeltilmesini isteme.',
            'Verilerinizin silinmesini veya yok edilmesini talep etme.',
            'Verilerinizin ucuncu taraflara aktarilmasi halinde bildirim talep etme.',
            'Otomatik sistemler araciligiyla aleyhinize bir sonuc ortaya cikmasina itiraz etme.',
          ],
        },
        {
          type: 'p',
          content: ['Bu haklarinizi kullanmak icin ', { href: 'mailto:help@houseroyale.fun', label: 'help@houseroyale.fun' }, ' adresine yazabilirsiniz.'],
        },
        { type: 'h2', text: '6. Guvenlik' },
        {
          type: 'p',
          text: 'Verilerinizi yetkisiz erisime karsi korumak icin endustri standardi sifreleme (TLS) ve erisim kontrolu onlemleri uyguluyoruz. Ancak internet uzerindeki hicbir iletimin %100 guvenli olmadigini hatirlatiriz.',
        },
        { type: 'h2', text: '7. Degisiklikler' },
        {
          type: 'p',
          text: 'Bu politikayi zaman zaman guncelleyebiliriz. Onemli degisiklikler oldugunda kayitli e-posta adresinize bildirim gondeririz. Guncel politikaya her zaman bu sayfadan ulasabilirsiniz.',
        },
        { type: 'h2', text: '8. Iletisim' },
        {
          type: 'p',
          content: ['Gizlilik konusundaki sorulariniz icin: ', { href: 'mailto:help@houseroyale.fun', label: 'help@houseroyale.fun' }],
        },
      ],
    },
    terms: {
      title: 'Kullanim Sartlari',
      updatedAt: 'Son guncelleme: 18 Mayis 2026',
      blocks: [
        {
          type: 'p',
          text: "House Royale'e eriserek veya platformu kullanarak bu Kullanim Sartlari'ni kabul etmis sayilirsiniz. Lutfen dikkatlice okuyunuz.",
        },
        { type: 'h2', text: '1. Hizmetin Kapsami' },
        {
          type: 'p',
          text: 'House Royale, kullanicilarin gercek Turkiye gayrimenkul ilanlari uzerinden yapay zeka modelleriyle fiyat tahmin yarislari yaptigi eglence amacli bir platformdur. Platform uzerindeki tum tahminler ve puanlar yalnizca oyun ici gecerlilige sahiptir; gercek finansal tavsiye niteligi tasimaz.',
        },
        { type: 'h2', text: '2. Hesap Olusturma' },
        {
          type: 'ul',
          items: [
            'Platforma kayit olmak icin gecerli bir e-posta adresi gerekmektedir.',
            'Hesap bilgilerinizin guvenliginden siz sorumlusunuz.',
            'Hesabinizi baskasina devredemez veya satamaz, baskasinin adina hesap olusturamazsiniz.',
            '18 yasindan kucukseniz ebeveyn veya vasi onayiyla platforma katilabilirsiniz.',
          ],
        },
        { type: 'h2', text: '3. Kabul Edilebilir Kullanim' },
        { type: 'p', text: 'Platformu kullanirken asagidakileri yapmaktan kacinmalisiniz:' },
        {
          type: 'ul',
          items: [
            'Oyun mekaniklerini manipule etmek veya hile uygulamak.',
            'Diger kullanicilari taciz etmek veya rahatsiz edici icerik paylasmak.',
            'Otomatik araclar ya da botlar araciligiyla sisteme asiri yuk bindirmek.',
            "Platformun kaynak kodunu, veri yapisini veya API'lerini izinsiz kopyalamak ya da tersine muhendislik uygulamak.",
            'House Royale altyapisini veya diger kullanicilari etkileyen guvenlik aciklarini kotuye kullanmak.',
          ],
        },
        { type: 'h2', text: '4. Yapay Zeka Modelleri ve Tahminler' },
        {
          type: 'p',
          text: 'Platformdaki yapay zeka modelleri (Custom ANN, Hybrid Model, MLP Model vb.) egitim verilerine dayali tahminler uretir. Bu tahminler:',
        },
        {
          type: 'ul',
          items: [
            'Gercek piyasa kosullarini her zaman dogru yansitmayabilir.',
            'Yatirim, kiralama veya satin alma kararlarinda referans olarak kullanilmamalidir.',
            'Yalnizca oyun deneyimi sunmak amaciyla hesaplanmaktadir.',
          ],
        },
        { type: 'h2', text: '5. Fikri Mulkiyet' },
        {
          type: 'p',
          text: "House Royale adi, logosu, tasarimi, yazilim kodu ve icerikler telif hakki ve ticari marka yasalariyla korunmaktadir. Kullanicilar bu icerikleri House Royale'in yazili izni olmaksizin kopyalayamaz, dagitamaz veya ticari amacla kullanamaz.",
        },
        { type: 'h2', text: '6. Hizmet Kesintileri ve Degisiklikler' },
        {
          type: 'p',
          text: 'Bakim, guncelleme veya teknik nedenlerle hizmeti gecici olarak durdurma hakkini sakli tutariz. Hizmet ozelliklerini onceden haber vermeksizin degistirebiliriz; ancak onemli degisiklikler icin kullanicilar bilgilendirilir.',
        },
        { type: 'h2', text: '7. Sorumluluk Sinirlamasi' },
        {
          type: 'p',
          text: 'House Royale, platform uzerindeki tahminlerin veya AI model ciktilarinin dogruluguna dair herhangi bir garanti vermez. Kullanicinin bu verilere dayanarak aldigi kararlardan dogacak dogrudan veya dolayli zararlardan sorumlu tutulamaz. Platformun teknik arizalarindan kaynaklanan puan kayiplari icin azami sorumluluk, etkilenen kullaniciya abonelik ucreti iadesinden ibaret olacaktir.',
        },
        { type: 'h2', text: '8. Hesap Askiya Alma' },
        {
          type: 'p',
          content: ['Bu sartlari ihlal eden hesaplar onceden bildirimde bulunulmaksizin askiya alinabilir veya kalici olarak kapatilabilir. Itiraz hakki icin ', { href: 'mailto:help@houseroyale.fun', label: 'help@houseroyale.fun' }, ' adresine basvurabilirsiniz.'],
        },
        { type: 'h2', text: '9. Uygulanacak Hukuk' },
        {
          type: 'p',
          text: 'Bu sartlar Turkiye Cumhuriyeti hukukuna tabidir. Anlasmazliklarda Istanbul mahkemeleri yetkilidir.',
        },
        { type: 'h2', text: '10. Iletisim' },
        {
          type: 'p',
          content: ['Kullanim sartlarina iliskin sorulariniz icin: ', { href: 'mailto:help@houseroyale.fun', label: 'help@houseroyale.fun' }],
        },
      ],
    },
    cookies: {
      title: 'Cerez Politikasi',
      updatedAt: 'Son guncelleme: 18 Mayis 2026',
      blocks: [
        {
          type: 'p',
          text: 'House Royale, platformun islevselligini ve kullanici deneyimini surdurmek icin sinirli sayida cerez ve tarayici depolama mekanizmasi kullanmaktadir.',
        },
        { type: 'h2', text: '1. Kullandigimiz Depolama Mekanizmalari' },
        { type: 'h3', text: 'Zorunlu Cerezler' },
        { type: 'p', text: 'Bu cerezler olmadan platform duzgun calisamaz:' },
        {
          type: 'ul',
          items: [
            { label: 'Oturum tokeni (Firebase Auth):', text: 'Oturum actiktan sonra kimliginizi dogrulamak icin tarayicinizda guvenli bir oturum tokeni saklanir. Bu token sayfalar arasynda gecis yaparken kimlik dogrulamayi surdurur.' },
            { label: 'CSRF korumasi:', text: 'Form gonderimleri ve API cagrilarinda guvenligi saglamak icin kisa omurlu bir oturum cerezi kullanilir.' },
          ],
        },
        { type: 'h3', text: 'localStorage' },
        { type: 'p', text: 'Tarayici yerel deposunu su amaclarla kullaniriz:' },
        {
          type: 'ul',
          items: [
            { label: 'Tercihler:', text: 'Arayuz dil tercihi gibi uygulama duzeyindeki ayarlar.' },
            { label: 'Lobi durumu:', text: 'Sayfa yenilenmesi sonrasinda aktif lobi oturumunu kurtarmak icin gecici oda kimligi verisi.' },
          ],
        },
        { type: 'h2', text: '2. Kullanmadigimiz Seyler' },
        {
          type: 'ul',
          items: [
            'Reklam veya yeniden hedefleme cerezleri.',
            'Facebook Pixel, Google Analytics veya benzeri ucuncu taraf izleme araclari.',
            'Platformlar arasi kullanici takibi.',
            'Hassas kisisel verilerin cerezlerde saklanmasi.',
          ],
        },
        { type: 'h2', text: '3. Cerez Sureleri' },
        {
          type: 'ul',
          items: [
            { label: 'Oturum cerezleri:', text: 'Tarayiciyi kapattiginizda otomatik silinir.' },
            { label: 'Firebase Auth tokeni:', text: 'Oturumu kapattiginizda veya token suresi doldugunda (30 gun) temizlenir.' },
            { label: 'localStorage verileri:', text: 'Siz silene kadar veya hesabinizi kapatana kadar tarayicida kalir.' },
          ],
        },
        { type: 'h2', text: '4. Cerezleri Kontrol Etme' },
        {
          type: 'p',
          text: 'Tarayici ayarlarinizdan cerezleri engelleyebilir veya silebilirsiniz. Ancak zorunlu cerezleri devre disi birakirsaniz oturum acma ve oyun islevleri duzgun calismayabilir.',
        },
        { type: 'p', text: 'Tarayiciniza gore ayarlar icin:' },
        {
          type: 'ul',
          items: [
            'Chrome: Ayarlar -> Gizlilik ve Guvenlik -> Cerezler',
            'Firefox: Ayarlar -> Gizlilik ve Guvenlik -> Cerezler ve Site Verileri',
            'Safari: Tercihler -> Gizlilik -> Cerezleri Yonet',
          ],
        },
        { type: 'h2', text: '5. Degisiklikler' },
        {
          type: 'p',
          text: 'Kullandigimiz depolama mekanizmalarinda degisiklik olmasi halinde bu sayfa guncellenecek ve onemli degisiklikler icin kayitli kullanicilara bildirim gonderilecektir.',
        },
        { type: 'h2', text: '6. Iletisim' },
        {
          type: 'p',
          content: ['Cerez politikamiza iliskin sorulariniz icin: ', { href: 'mailto:help@houseroyale.fun', label: 'help@houseroyale.fun' }],
        },
      ],
    },
  },
  en: {
    privacy: {
      title: 'Privacy Policy',
      updatedAt: 'Last updated: May 18, 2026',
      blocks: [
        {
          type: 'p',
          text: 'At House Royale ("we", "us", or "our company"), we take your privacy seriously. This policy explains what personal data we collect, how we process it, and what rights you have when using our services.',
        },
        { type: 'h2', text: '1. Data We Collect' },
        { type: 'p', text: 'While using House Royale, we may collect the following data:' },
        {
          type: 'ul',
          items: [
            { label: 'Account information:', text: 'Your email address and chosen display name.' },
            { label: 'Game data:', text: 'Your guesses, score history, rounds you joined, and leaderboard ranking.' },
            { label: 'Technical data:', text: 'IP address, browser type, session durations, and in-app error logs.' },
            { label: 'Communication data:', text: 'Support requests or feedback you send to us.' },
          ],
        },
        { type: 'h2', text: '2. How We Use Data' },
        { type: 'p', text: 'We use collected data for the following purposes:' },
        {
          type: 'ul',
          items: [
            'To create your account and authenticate your identity.',
            'To run the gameplay flow, store your guesses, and calculate scores.',
            'To build leaderboards and AI model comparisons.',
            'To monitor service reliability and fix issues.',
            'To fulfill legal obligations.',
          ],
        },
        { type: 'h2', text: '3. Data Sharing' },
        {
          type: 'p',
          text: 'We do not sell your personal data to third parties. Sharing may occur only in the following cases:',
        },
        {
          type: 'ul',
          items: [
            { label: 'Service providers:', text: 'We use Firebase (Google LLC) for authentication and database infrastructure.' },
            { label: 'Legal requirements:', text: 'When required by court order or a request from a competent authority.' },
            { label: 'Business transfer:', text: 'During merger or acquisition processes, with prior notice to users.' },
          ],
        },
        { type: 'h2', text: '4. Data Retention' },
        {
          type: 'p',
          text: 'We keep your data while your account remains active. If you delete your account, personal data is removed from our systems within 30 days. Anonymized gameplay statistics may be retained longer when required by law.',
        },
        { type: 'h2', text: '5. Your Rights Under Turkish Law' },
        {
          type: 'p',
          text: 'Under Law No. 6698 on the Protection of Personal Data, you have the following rights:',
        },
        {
          type: 'ul',
          items: [
            'To learn whether your personal data is being processed.',
            'To request access to processed personal data.',
            'To request correction of inaccurate data.',
            'To request deletion or destruction of your data.',
            'To request notice when your data is transferred to third parties.',
            'To object to outcomes produced solely by automated systems to your detriment.',
          ],
        },
        {
          type: 'p',
          content: ['To exercise these rights, you may contact ', { href: 'mailto:help@houseroyale.fun', label: 'help@houseroyale.fun' }, '.'],
        },
        { type: 'h2', text: '6. Security' },
        {
          type: 'p',
          text: 'We apply industry-standard encryption (TLS) and access control measures to protect your data from unauthorized access. However, no transmission over the internet can be guaranteed to be 100% secure.',
        },
        { type: 'h2', text: '7. Changes' },
        {
          type: 'p',
          text: 'We may update this policy from time to time. If important changes are made, we will notify registered users by email. The latest version will always be available on this page.',
        },
        { type: 'h2', text: '8. Contact' },
        {
          type: 'p',
          content: ['For privacy-related questions: ', { href: 'mailto:help@houseroyale.fun', label: 'help@houseroyale.fun' }],
        },
      ],
    },
    terms: {
      title: 'Terms of Use',
      updatedAt: 'Last updated: May 18, 2026',
      blocks: [
        {
          type: 'p',
          text: "By accessing House Royale or using the platform, you agree to these Terms of Use. Please read them carefully.",
        },
        { type: 'h2', text: '1. Scope of the Service' },
        {
          type: 'p',
          text: 'House Royale is an entertainment platform where users compete with AI models by estimating prices of real estate listings from Turkey. All predictions and scores on the platform are valid only within the game and do not constitute financial advice.',
        },
        { type: 'h2', text: '2. Account Creation' },
        {
          type: 'ul',
          items: [
            'A valid email address is required to register for the platform.',
            'You are responsible for keeping your account credentials secure.',
            'You may not transfer or sell your account or create an account on behalf of someone else.',
            'If you are under 18, you may join the platform with parental or guardian consent.',
          ],
        },
        { type: 'h2', text: '3. Acceptable Use' },
        { type: 'p', text: 'When using the platform, you must avoid the following:' },
        {
          type: 'ul',
          items: [
            'Manipulating gameplay mechanics or cheating.',
            'Harassing other users or sharing disturbing content.',
            'Using automated tools or bots to place excessive load on the system.',
            "Copying the platform's source code, data structures, or APIs without authorization, or reverse engineering them.",
            'Abusing security vulnerabilities that affect House Royale infrastructure or other users.',
          ],
        },
        { type: 'h2', text: '4. AI Models and Predictions' },
        {
          type: 'p',
          text: 'The AI models on the platform (Custom ANN, Hybrid Model, MLP Model, etc.) generate predictions based on training data. These predictions:',
        },
        {
          type: 'ul',
          items: [
            'May not always reflect real market conditions accurately.',
            'Must not be used as a reference for investment, rental, or purchase decisions.',
            'Are calculated solely to provide gameplay.',
          ],
        },
        { type: 'h2', text: '5. Intellectual Property' },
        {
          type: 'p',
          text: "The House Royale name, logo, design, software code, and content are protected by copyright and trademark laws. Users may not copy, distribute, or use this content for commercial purposes without House Royale's written permission.",
        },
        { type: 'h2', text: '6. Service Interruptions and Changes' },
        {
          type: 'p',
          text: 'We reserve the right to suspend the service temporarily for maintenance, updates, or technical reasons. We may change service features without prior notice, although users will be informed of significant changes.',
        },
        { type: 'h2', text: '7. Limitation of Liability' },
        {
          type: 'p',
          text: 'House Royale does not guarantee the accuracy of predictions or AI model outputs on the platform. We are not liable for direct or indirect damages arising from decisions made by users based on this data. For score losses caused by technical failures, our maximum liability will be limited to refunding the affected user’s subscription fee, if any.',
        },
        { type: 'h2', text: '8. Account Suspension' },
        {
          type: 'p',
          content: ['Accounts that violate these terms may be suspended or permanently closed without prior notice. For appeals, contact ', { href: 'mailto:help@houseroyale.fun', label: 'help@houseroyale.fun' }, '.'],
        },
        { type: 'h2', text: '9. Governing Law' },
        {
          type: 'p',
          text: 'These terms are governed by the laws of the Republic of Turkey. Istanbul courts have jurisdiction over disputes.',
        },
        { type: 'h2', text: '10. Contact' },
        {
          type: 'p',
          content: ['For questions about these terms: ', { href: 'mailto:help@houseroyale.fun', label: 'help@houseroyale.fun' }],
        },
      ],
    },
    cookies: {
      title: 'Cookie Policy',
      updatedAt: 'Last updated: May 18, 2026',
      blocks: [
        {
          type: 'p',
          text: 'House Royale uses a limited number of cookies and browser storage mechanisms to keep the platform functional and provide a reliable user experience.',
        },
        { type: 'h2', text: '1. Storage Mechanisms We Use' },
        { type: 'h3', text: 'Required Cookies' },
        { type: 'p', text: 'The platform cannot operate properly without these cookies:' },
        {
          type: 'ul',
          items: [
            { label: 'Session token (Firebase Auth):', text: 'After you sign in, a secure session token is stored in your browser to verify your identity across page navigation.' },
            { label: 'CSRF protection:', text: 'A short-lived session cookie is used to secure form submissions and API calls.' },
          ],
        },
        { type: 'h3', text: 'localStorage' },
        { type: 'p', text: 'We use local browser storage for the following purposes:' },
        {
          type: 'ul',
          items: [
            { label: 'Preferences:', text: 'App-level settings such as your interface language choice.' },
            { label: 'Lobby state:', text: 'A temporary room identifier used to recover an active lobby after a page refresh.' },
          ],
        },
        { type: 'h2', text: '2. What We Do Not Use' },
        {
          type: 'ul',
          items: [
            'Advertising or retargeting cookies.',
            'Facebook Pixel, Google Analytics, or similar third-party tracking tools.',
            'Cross-platform user tracking.',
            'Storage of sensitive personal data in cookies.',
          ],
        },
        { type: 'h2', text: '3. Cookie Durations' },
        {
          type: 'ul',
          items: [
            { label: 'Session cookies:', text: 'Automatically removed when you close your browser.' },
            { label: 'Firebase Auth token:', text: 'Cleared when you sign out or when the token expires (30 days).' },
            { label: 'localStorage data:', text: 'Remains in the browser until you delete it or close your account.' },
          ],
        },
        { type: 'h2', text: '4. Controlling Cookies' },
        {
          type: 'p',
          text: 'You can block or delete cookies through your browser settings. However, disabling required cookies may prevent sign-in and gameplay features from working correctly.',
        },
        { type: 'p', text: 'Browser settings:' },
        {
          type: 'ul',
          items: [
            'Chrome: Settings -> Privacy and Security -> Cookies',
            'Firefox: Settings -> Privacy and Security -> Cookies and Site Data',
            'Safari: Preferences -> Privacy -> Manage Cookies',
          ],
        },
        { type: 'h2', text: '5. Changes' },
        {
          type: 'p',
          text: 'If the storage mechanisms we use change, this page will be updated and registered users will be notified of important changes.',
        },
        { type: 'h2', text: '6. Contact' },
        {
          type: 'p',
          content: ['For questions about this cookie policy: ', { href: 'mailto:help@houseroyale.fun', label: 'help@houseroyale.fun' }],
        },
      ],
    },
  },
}
