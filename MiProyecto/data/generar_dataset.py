"""
generar_dataset.py
==================
Genera el dataset SIMULADO de pacientes para el componente de Ciencia de Datos
de SmartTriage (predicción del nivel de urgencia en un triage hospitalario).

Por qué simulado: no se dispone de expedientes clínicos reales (son datos
sensibles y protegidos). Se construye una población sintética a partir de una
"regla clínica" plausible más ruido aleatorio, de modo que:
  - las variables tienen relaciones realistas entre sí (p. ej. la fiebre sube
    la temperatura; el dolor y la disnea suben la frecuencia cardíaca),
  - la etiqueta `urgencia` NO es una función determinista de las entradas
    (hay ruido), así que un modelo tiene algo real que aprender y no puede
    alcanzar el 100 % de acierto.

La MISMA lógica está replicada dentro del notebook
`notebook/SmartTriage_CienciaDeDatos.ipynb` para que sea 100 % reproducible en
Google Colab sin archivos externos. Si cambias una, cambia la otra.

Uso:
    python generar_dataset.py            # escribe data/pacientes_simulados.csv
    python generar_dataset.py --n 3000   # tamaño personalizado
"""

from __future__ import annotations

import argparse
import pathlib

import numpy as np
import pandas as pd

# Catálogo de síntomas principales. Coincide con el tipo `SintomaPrincipal`
# de la app (utils/priorityPrediction.ts) y con el CHECK de la columna
# `sintoma_principal` en database/03_patients.sql.
SINTOMAS = [
    "dolor_pecho",
    "dificultad_respiratoria",
    "fractura",
    "dolor_abdominal",
    "mareo",
    "fiebre",
    "herida",
    "otro",
]

# Prevalencia relativa de cada síntoma en la población simulada (suma = 1).
PROB_SINTOMA = [0.12, 0.10, 0.13, 0.16, 0.10, 0.15, 0.14, 0.10]

# Peso de riesgo por síntoma (0-1). Mismo criterio clínico que PESO_SINTOMA
# en utils/priorityPrediction.ts: dolor de pecho y disnea son los más graves.
PESO_SINTOMA = {
    "dolor_pecho": 0.95,
    "dificultad_respiratoria": 0.90,
    "fractura": 0.55,
    "dolor_abdominal": 0.45,
    "mareo": 0.40,
    "fiebre": 0.35,
    "herida": 0.30,
    "otro": 0.25,
}

# Umbrales que traducen el score latente (0-1.x) a categoría de urgencia.
UMBRAL_ALTA = 0.62
UMBRAL_MEDIA = 0.35


def _clip01(x: np.ndarray) -> np.ndarray:
    return np.clip(x, 0.0, 1.0)


def generar_dataset(n: int = 1500, seed: int = 42) -> pd.DataFrame:
    """Devuelve un DataFrame con `n` pacientes sintéticos ya etiquetados."""
    rng = np.random.default_rng(seed)

    # --- Variables independientes -------------------------------------------
    edad = rng.integers(1, 98, size=n)
    sintoma = rng.choice(SINTOMAS, size=n, p=PROB_SINTOMA)
    nivel_dolor = rng.choice([1, 2, 3], size=n, p=[0.40, 0.35, 0.25])

    # La disnea es mucho más probable si el motivo de consulta ya es
    # respiratorio o cardíaco.
    p_disnea = np.where(
        np.isin(sintoma, ["dificultad_respiratoria", "dolor_pecho"]), 0.70, 0.12
    )
    disnea = rng.random(n) < p_disnea

    # Temperatura: base normal, con repunte si hay fiebre o disnea.
    temperatura = rng.normal(36.8, 0.5, n)
    temperatura += np.where(sintoma == "fiebre", rng.normal(1.8, 0.6, n), 0.0)
    temperatura += np.where(disnea, rng.normal(0.3, 0.2, n), 0.0)

    # Frecuencia cardíaca: sube con el dolor, la disnea y el dolor de pecho.
    fc = rng.normal(78, 11, n)
    fc += (nivel_dolor - 1) * 7
    fc += np.where(disnea, 14, 0)
    fc += np.where(sintoma == "dolor_pecho", 10, 0)
    fc = np.clip(fc, 45, 190)

    # --- Score de riesgo latente ------------------------------------------
    # Parte LINEAL: es exactamente la que reproduce la regla simplificada que
    # corre en el cliente (utils/priorityPrediction.ts). Sirve de baseline.
    score_lineal = (
        ((nivel_dolor - 1) / 2) * 0.30
        + _clip01((temperatura - 36.5) / 4.0) * 0.20
        + _clip01((fc - 70) / 80.0) * 0.15
        + disnea.astype(float) * 0.20
        + np.array([PESO_SINTOMA[s] for s in sintoma]) * 0.10
        + _clip01((edad - 60) / 40.0) * 0.05
    )

    # Parte NO LINEAL: combinaciones de factores que un triage real sí pondera
    # pero una suma de pesos independientes no captura. Es la brecha que el
    # modelo de árboles puede aprender y la regla lineal no.
    combo_cardiorresp = np.isin(sintoma, ["dolor_pecho", "dificultad_respiratoria"]) & disnea
    posible_sepsis = (temperatura >= 38.0) & (fc >= 110)
    adulto_fragil = (edad >= 75) & (nivel_dolor >= 2)
    lactante = edad <= 2
    herida_leve = (sintoma == "herida") & (nivel_dolor == 1) & (~disnea)

    score = (
        score_lineal
        + 0.12 * combo_cardiorresp
        + 0.10 * posible_sepsis
        + 0.08 * adulto_fragil
        + 0.06 * lactante
        - 0.05 * herida_leve
    )

    # El ruido gaussiano hace que la urgencia no sea 100 % predecible desde
    # las variables: es lo que da margen de aprendizaje (y de error) al modelo.
    score = score + rng.normal(0.0, 0.05, n)

    urgencia = np.where(
        score >= UMBRAL_ALTA, 1, np.where(score >= UMBRAL_MEDIA, 2, 3)
    )

    return pd.DataFrame(
        {
            "edad": edad.astype(int),
            "sintoma_principal": sintoma,
            "nivel_dolor": nivel_dolor.astype(int),
            "dificultad_respiratoria": disnea,
            "temperatura": np.round(temperatura, 1),
            "frecuencia_cardiaca": np.round(fc).astype(int),
            "urgencia": urgencia.astype(int),
        }
    )


def regla_simple(
    edad: float,
    sintoma_principal: str,
    nivel_dolor: int,
    dificultad_respiratoria: bool,
    temperatura: float,
    frecuencia_cardiaca: float,
) -> int:
    """Regla lineal simplificada que corre en el cliente (sin interacciones).

    Es la réplica en Python de `predecirUrgencia` de
    utils/priorityPrediction.ts. Se usa en el notebook como BASELINE contra el
    que se compara el modelo de Ciencia de Datos.
    """
    c = lambda x: max(0.0, min(1.0, x))  # noqa: E731
    score = (
        ((nivel_dolor - 1) / 2) * 0.30
        + c((temperatura - 36.5) / 4.0) * 0.20
        + c((frecuencia_cardiaca - 70) / 80.0) * 0.15
        + (0.20 if dificultad_respiratoria else 0.0)
        + PESO_SINTOMA.get(sintoma_principal, 0.25) * 0.10
        + c((edad - 60) / 40.0) * 0.05
    )
    if score >= UMBRAL_ALTA:
        return 1
    if score >= UMBRAL_MEDIA:
        return 2
    return 3


def _main() -> None:
    parser = argparse.ArgumentParser(description="Genera el dataset simulado de SmartTriage.")
    parser.add_argument("--n", type=int, default=1500, help="Número de pacientes (def. 1500)")
    parser.add_argument("--seed", type=int, default=42, help="Semilla aleatoria (def. 42)")
    parser.add_argument(
        "--out",
        type=str,
        default=str(pathlib.Path(__file__).parent / "pacientes_simulados.csv"),
        help="Ruta del CSV de salida",
    )
    args = parser.parse_args()

    df = generar_dataset(n=args.n, seed=args.seed)
    df.to_csv(args.out, index=False)

    print(f"Dataset generado: {args.out}")
    print(f"Filas: {len(df)}  Columnas: {list(df.columns)}")
    print("\nDistribucion de urgencia (1=Alta, 2=Media, 3=Baja):")
    print(df["urgencia"].value_counts().sort_index().to_string())


if __name__ == "__main__":
    _main()
