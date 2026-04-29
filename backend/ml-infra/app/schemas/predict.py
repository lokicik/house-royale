from pydantic import BaseModel


class Features(BaseModel):
    # Konum
    il: str
    ilce: str | None = None
    mahalle: str | None = None
    konum_ham: str | None = None  # "İstanbul / Kadıköy / Moda Mah." ham string

    # Alan
    metrekare_brut: float
    metrekare_net: float | None = None

    # Oda bilgisi — "3+1", "2+1", "4+2" gibi ham text
    oda_salon: str

    # Bina — text değerler (ör. "0-5 yıl", "Giriş Kat", "5")
    bina_yasi: str | None = None
    kat: str | None = None
    kat_sayisi: str | None = None

    # Özellikler
    isitma: str | None = None
    banyo_sayisi: str | None = None
    balkon: str | None = None         # "Var" / "Yok"
    asansor: str | None = None        # "Var" / "Yok"
    otopark: str | None = None        # "Var" / "Yok"
    esyali: str | None = None         # "Evet" / "Hayır"
    kullanim_durumu: str | None = None

    # Site / Kompleks
    site_icerisinde: str | None = None  # "Evet" / "Hayır"
    aidat: str | None = None

    # Yasal / Satıcı
    krediye_uygun: str | None = None
    tapu_durumu: str | None = None
    kimden: str | None = None         # "Sahibinden" / "Emlakçıdan"


class PredictRequest(BaseModel):
    model_ids: list[str]
    features: Features
    image_urls: list[str] = []


class ModelPrediction(BaseModel):
    price_try: float
    confidence: float
    is_stub: bool = False


class PredictResponse(BaseModel):
    predictions: dict[str, ModelPrediction]
