package property

import "math/rand"

var fixtures = []Property{
	// --- İstanbul (7) ---
	{
		ID: "ist-001", Il: "İstanbul", Ilce: "Kadıköy", Mahalle: "Moda",
		MetrekareBrut: 125, OdaSalon: "3+1",
		BinaYasi: "6-10 yıl", Kat: "4", KatSayisi: "8",
		Isitma: "Doğalgaz (Kombi)", Balkon: "Var", Asansor: "Var", Otopark: "Var",
		PriceTRY:  15_500_000,
		ImageURLs: []string{},
	},
	{
		ID: "ist-002", Il: "İstanbul", Ilce: "Beşiktaş", Mahalle: "Levent",
		MetrekareBrut: 90, OdaSalon: "2+1",
		BinaYasi: "11-15 yıl", Kat: "6", KatSayisi: "12",
		Isitma: "Doğalgaz (Kombi)", Balkon: "Var", Asansor: "Var", Otopark: "Var",
		PriceTRY:  12_000_000,
		ImageURLs: []string{},
	},
	{
		ID: "ist-003", Il: "İstanbul", Ilce: "Üsküdar", Mahalle: "Bağlarbaşı",
		MetrekareBrut: 165, OdaSalon: "4+1",
		BinaYasi: "0-5 yıl", Kat: "3", KatSayisi: "6",
		Isitma: "Doğalgaz (Kombi)", Balkon: "Var", Asansor: "Var", Otopark: "Var",
		PriceTRY:  18_000_000,
		ImageURLs: []string{},
	},
	{
		ID: "ist-004", Il: "İstanbul", Ilce: "Ataşehir", Mahalle: "Küçükbakkalköy",
		MetrekareBrut: 130, OdaSalon: "3+1",
		BinaYasi: "0-5 yıl", Kat: "5", KatSayisi: "10",
		Isitma: "Merkezi (Pay Ölçer)", Balkon: "Var", Asansor: "Var", Otopark: "Var",
		PriceTRY:  11_500_000,
		ImageURLs: []string{},
	},
	{
		ID: "ist-005", Il: "İstanbul", Ilce: "Maltepe", Mahalle: "Başıbüyük",
		MetrekareBrut: 140, OdaSalon: "3+1",
		BinaYasi: "11-15 yıl", Kat: "2", KatSayisi: "5",
		Isitma: "Doğalgaz (Kombi)", Balkon: "Var", Asansor: "Var", Otopark: "Yok",
		PriceTRY:  10_000_000,
		ImageURLs: []string{},
	},
	{
		ID: "ist-006", Il: "İstanbul", Ilce: "Pendik", Mahalle: "Yenişehir",
		MetrekareBrut: 95, OdaSalon: "2+1",
		BinaYasi: "6-10 yıl", Kat: "3", KatSayisi: "7",
		Isitma: "Doğalgaz (Kombi)", Balkon: "Var", Asansor: "Var", Otopark: "Var",
		PriceTRY:  7_500_000,
		ImageURLs: []string{},
	},
	{
		ID: "ist-007", Il: "İstanbul", Ilce: "Bağcılar", Mahalle: "Kirazlı",
		MetrekareBrut: 100, OdaSalon: "2+1",
		BinaYasi: "16-20 yıl", Kat: "1", KatSayisi: "5",
		Isitma: "Doğalgaz (Kombi)", Balkon: "Var", Asansor: "Yok", Otopark: "Yok",
		PriceTRY:  6_800_000,
		ImageURLs: []string{},
	},
	// --- Ankara (3) ---
	{
		ID: "ank-001", Il: "Ankara", Ilce: "Çankaya", Mahalle: "Kızılay",
		MetrekareBrut: 140, OdaSalon: "3+1",
		BinaYasi: "16-20 yıl", Kat: "5", KatSayisi: "8",
		Isitma: "Doğalgaz (Kombi)", Balkon: "Var", Asansor: "Var", Otopark: "Var",
		PriceTRY:  5_800_000,
		ImageURLs: []string{},
	},
	{
		ID: "ank-002", Il: "Ankara", Ilce: "Yenimahalle", Mahalle: "Demetevler",
		MetrekareBrut: 90, OdaSalon: "2+1",
		BinaYasi: "21-25 yıl", Kat: "3", KatSayisi: "6",
		Isitma: "Doğalgaz (Kombi)", Balkon: "Var", Asansor: "Yok", Otopark: "Yok",
		PriceTRY:  3_200_000,
		ImageURLs: []string{},
	},
	{
		ID: "ank-003", Il: "Ankara", Ilce: "Keçiören", Mahalle: "Etlik",
		MetrekareBrut: 120, OdaSalon: "3+1",
		BinaYasi: "11-15 yıl", Kat: "4", KatSayisi: "7",
		Isitma: "Doğalgaz (Kombi)", Balkon: "Var", Asansor: "Var", Otopark: "Yok",
		PriceTRY:  3_800_000,
		ImageURLs: []string{},
	},
	// --- İzmir (3) ---
	{
		ID: "izm-001", Il: "İzmir", Ilce: "Karşıyaka", Mahalle: "Bostanlı",
		MetrekareBrut: 115, OdaSalon: "3+1",
		BinaYasi: "6-10 yıl", Kat: "4", KatSayisi: "8",
		Isitma: "Doğalgaz (Kombi)", Balkon: "Var", Asansor: "Var", Otopark: "Var",
		PriceTRY:  8_000_000,
		ImageURLs: []string{},
	},
	{
		ID: "izm-002", Il: "İzmir", Ilce: "Konak", Mahalle: "Alsancak",
		MetrekareBrut: 80, OdaSalon: "2+1",
		BinaYasi: "21-25 yıl", Kat: "3", KatSayisi: "5",
		Isitma: "Doğalgaz (Kombi)", Balkon: "Var", Asansor: "Yok", Otopark: "Yok",
		PriceTRY:  5_500_000,
		ImageURLs: []string{},
	},
	{
		ID: "izm-003", Il: "İzmir", Ilce: "Bornova", Mahalle: "Kazımdirik",
		MetrekareBrut: 130, OdaSalon: "3+1",
		BinaYasi: "0-5 yıl", Kat: "2", KatSayisi: "6",
		Isitma: "Merkezi (Pay Ölçer)", Balkon: "Var", Asansor: "Var", Otopark: "Var",
		PriceTRY:  6_200_000,
		ImageURLs: []string{},
	},
	// --- Bursa (1) ---
	{
		ID: "brs-001", Il: "Bursa", Ilce: "Nilüfer", Mahalle: "Beşevler",
		MetrekareBrut: 135, OdaSalon: "3+1",
		BinaYasi: "6-10 yıl", Kat: "3", KatSayisi: "7",
		Isitma: "Doğalgaz (Kombi)", Balkon: "Var", Asansor: "Var", Otopark: "Var",
		PriceTRY:  4_800_000,
		ImageURLs: []string{},
	},
	// --- Antalya (1) ---
	{
		ID: "ant-001", Il: "Antalya", Ilce: "Muratpaşa", Mahalle: "Meltem",
		MetrekareBrut: 95, OdaSalon: "2+1",
		BinaYasi: "11-15 yıl", Kat: "5", KatSayisi: "9",
		Isitma: "Klima", Balkon: "Var", Asansor: "Var", Otopark: "Var",
		PriceTRY:  5_200_000,
		ImageURLs: []string{},
	},
}

func randomIndex(n int) int {
	return rand.Intn(n)
}
