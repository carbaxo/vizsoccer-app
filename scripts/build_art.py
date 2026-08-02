"""Genera la ilustración de VizSoccer: medallas de reto, avatares y fondo de ficha.

Mismo criterio que `logo.py`: el dibujo se CALCULA, no se pega a mano, para que
todo salga con la misma rejilla, los mismos grosores y los colores de la marca.
No son imágenes de IA: son vectores generados, ligeros y nítidos a cualquier
tamaño, que es lo que necesita una PWA que debe funcionar sin conexión.

Uso: OUTPUT_DIR=. python3 scripts/build_art.py
"""
import math
import os
import pathlib

OUTPUT_DIR = os.environ.get("OUTPUT_DIR", str(pathlib.Path(__file__).resolve().parent.parent))
ART = os.path.join(OUTPUT_DIR, "art")

VERDE = "#44BB00"
VERDE_CLARO = "#7CE33A"
VERDE_OSCURO = "#1A4700"
LIMA = "#C7F58F"
BLANCO = "#FFFFFF"
TINTA = "#0A1409"
ORO = "#FFC61A"


def fmt(v):
    s = ("%.2f" % v).rstrip("0").rstrip(".")
    return s if s else "0"


def svg(w, h, cuerpo, defs=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {fmt(w)} {fmt(h)}" '
            f'width="{fmt(w)}" height="{fmt(h)}" fill="none">\n{defs}{cuerpo}\n</svg>\n')


def grad(ident, c1, c2, vertical=False):
    x2, y2 = ("0", "1") if vertical else ("1", "1")
    return (f'  <defs><linearGradient id="{ident}" x1="0" y1="0" x2="{x2}" y2="{y2}">\n'
            f'    <stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/>\n'
            f'  </linearGradient></defs>\n')


def escribir(nombre, contenido):
    ruta = os.path.join(ART, nombre)
    with open(ruta, "w", encoding="utf-8") as fh:
        fh.write(contenido)
    print("✔", ruta)


# =====================================================================
#  Medallas de reto (64x64). Disco con degradado + símbolo geométrico.
# =====================================================================
R = 32.0          # centro y radio del disco
TRAZO = 3.4       # grosor común de todos los símbolos


def circulo(cx, cy, r, relleno=None, borde=None, w=TRAZO):
    a = f'  <circle cx="{fmt(cx)}" cy="{fmt(cy)}" r="{fmt(r)}"'
    if relleno:
        a += f' fill="{relleno}"'
    if borde:
        a += f' stroke="{borde}" stroke-width="{fmt(w)}"'
    return a + "/>"


def linea(x1, y1, x2, y2, color=BLANCO, w=TRAZO, tapa="round"):
    return (f'  <path d="M{fmt(x1)},{fmt(y1)} L{fmt(x2)},{fmt(y2)}" stroke="{color}" '
            f'stroke-width="{fmt(w)}" stroke-linecap="{tapa}"/>')


def poli(puntos, relleno=None, borde=None, w=TRAZO, cerrar=True):
    d = "M" + " L".join(f"{fmt(x)},{fmt(y)}" for x, y in puntos) + (" Z" if cerrar else "")
    a = f'  <path d="{d}"'
    a += f' fill="{relleno}"' if relleno else ' fill="none"'
    if borde:
        a += f' stroke="{borde}" stroke-width="{fmt(w)}" stroke-linejoin="round" stroke-linecap="round"'
    return a + "/>"


def rect(x, y, w, h, relleno=None, borde=None, rx=0, gw=TRAZO):
    a = (f'  <rect x="{fmt(x)}" y="{fmt(y)}" width="{fmt(w)}" height="{fmt(h)}" '
         f'rx="{fmt(rx)}"')
    a += f' fill="{relleno}"' if relleno else ' fill="none"'
    if borde:
        a += f' stroke="{borde}" stroke-width="{fmt(gw)}"'
    return a + "/>"


def simbolo(nombre):
    """Devuelve los trazos del símbolo, centrados en (32,32) y dentro de r=20."""
    if nombre == "balon":
        # Balón: esfera con el pentágono central y sus costuras, como el icono
        # antiguo de la app pero reducido a trazo.
        p = [circulo(R, R, 15, borde=BLANCO)]
        pent = [(R + 6.4 * math.sin(math.tau * i / 5), R - 6.4 * math.cos(math.tau * i / 5)) for i in range(5)]
        p.append(poli(pent, relleno=BLANCO))
        for x, y in pent:
            dx, dy = x - R, y - R
            n = math.hypot(dx, dy)
            p.append(linea(x, y, R + dx / n * 14.2, R + dy / n * 14.2, w=2.4))
        return p
    if nombre == "diana":
        return [circulo(R, R, 15, borde=BLANCO), circulo(R, R, 8.4, borde=BLANCO, w=2.8),
                circulo(R, R, 2.8, relleno=BLANCO)]
    if nombre == "cono":
        # Cono de entrenamiento visto de frente, con su base.
        return [poli([(R, R - 15), (R + 11, R + 9), (R - 11, R + 9)], borde=BLANCO),
                linea(R - 15, R + 13.5, R + 15, R + 13.5)]
    if nombre == "porteria":
        # Portería con la red insinuada en dos líneas.
        p = [poli([(R - 15, R + 11), (R - 15, R - 10), (R + 15, R - 10), (R + 15, R + 11)],
                  borde=BLANCO, cerrar=False)]
        p += [linea(R - 5, R - 10, R - 5, R + 11, w=1.8), linea(R + 5, R - 10, R + 5, R + 11, w=1.8),
              linea(R - 15, R + 0.5, R + 15, R + 0.5, w=1.8)]
        return p
    if nombre == "pase":
        # Flecha de pase con el balón saliendo.
        return [circulo(R - 10, R + 6, 4.6, relleno=BLANCO),
                poli([(R - 13, R + 1), (R + 3, R - 13)], borde=BLANCO, cerrar=False),
                poli([(R + 12, R - 14), (R + 12, R - 4), (R + 2, R - 14)], relleno=BLANCO),
                linea(R - 4, R + 12, R + 13, R + 12, w=2.2)]
    if nombre == "llama":
        # Llama de racha: dos curvas, la interior en lima.
        return ['  <path d="M32,15 C40,23 44,29 44,35 A12,12 0 0,1 20,35 C20,28 25,25 27,20 '
                'C28,25 31,26 32,15 Z" fill="%s"/>' % BLANCO,
                '  <path d="M32,29 C36,33 37,36 37,38 A5,5 0 0,1 27,38 C27,35 30,33 32,29 Z" fill="%s"/>' % VERDE]
    if nombre == "calendario":
        p = [rect(R - 14, R - 11, 28, 24, borde=BLANCO, rx=3.5),
             linea(R - 14, R - 3.5, R + 14, R - 3.5, w=2.6),
             linea(R - 7, R - 15, R - 7, R - 8, w=2.6), linea(R + 7, R - 15, R + 7, R - 8, w=2.6)]
        for i in range(3):
            p.append(circulo(R - 7 + i * 7, R + 5, 2.1, relleno=BLANCO))
        return p
    if nombre == "dos":
        # Dos jugadores: cabeza y hombros, uno delante del otro.
        p = []
        for dx, color in ((-7.5, BLANCO), (7.5, LIMA)):
            p.append(circulo(R + dx, R - 7, 5.2, relleno=color))
            p.append('  <path d="M%s,%s a9,9 0 0,1 18,0 Z" fill="%s"/>'
                     % (fmt(R + dx - 9), fmt(R + 8.5), color))
        return p
    if nombre == "rayo":
        return [poli([(R + 4, R - 16), (R - 11, R + 3), (R - 1, R + 3), (R - 4, R + 16),
                      (R + 11, R - 3), (R + 1, R - 3)], relleno=BLANCO)]
    if nombre == "libro":
        return [poli([(R - 14, R - 12), (R - 1, R - 9), (R - 1, R + 13), (R - 14, R + 10)], borde=BLANCO),
                poli([(R + 14, R - 12), (R + 1, R - 9), (R + 1, R + 13), (R + 14, R + 10)], borde=BLANCO)]
    if nombre == "copa":
        p = [poli([(R - 9, R - 14), (R + 9, R - 14), (R + 7.5, R - 1),
                   (R - 7.5, R - 1)], borde=BLANCO),
             linea(R, R - 1, R, R + 7), linea(R - 8, R + 13, R + 8, R + 13, w=4),
             # asas
             '  <path d="M%s,%s a5.5,5.5 0 0,1 0,9" stroke="%s" stroke-width="2.6" fill="none"/>'
             % (fmt(R + 9), fmt(R - 11), BLANCO),
             '  <path d="M%s,%s a5.5,5.5 0 0,0 0,9" stroke="%s" stroke-width="2.6" fill="none"/>'
             % (fmt(R - 9), fmt(R - 11), BLANCO)]
        return p
    raise ValueError("símbolo no definido: " + nombre)


SIMBOLOS = ["balon", "diana", "cono", "porteria", "pase", "llama",
            "calendario", "dos", "rayo", "libro", "copa"]


def medalla(nombre, ganada=True):
    """Disco + símbolo. Sin ganar va en gris y con el símbolo apagado."""
    ident = f"m-{nombre}-{'on' if ganada else 'off'}"
    if ganada:
        defs = grad(ident, VERDE_CLARO, VERDE_OSCURO)
        cuerpo = [circulo(R, R, 30, relleno=f"url(#{ident})"),
                  circulo(R, R, 30, borde=VERDE, w=1.6)]
    else:
        defs = grad(ident, "#2C3F26", "#151F12")
        cuerpo = [circulo(R, R, 30, relleno=f"url(#{ident})"),
                  circulo(R, R, 30, borde="#3A4F32", w=1.6)]
    cuerpo += simbolo(nombre)
    contenido = svg(64, 64, "\n".join(cuerpo), defs)
    if not ganada:
        # El símbolo se apaga bajando su opacidad, no repintando cada trazo.
        contenido = contenido.replace(
            "\n".join(simbolo(nombre)),
            '  <g opacity="0.35">\n' + "\n".join(simbolo(nombre)) + "\n  </g>")
    return contenido


# =====================================================================
#  Avatares (96x96): monograma geométrico con la V de la marca de fondo.
# =====================================================================
PALETAS = [
    (VERDE_CLARO, VERDE_OSCURO), ("#00C2A8", "#053B36"), ("#FFC61A", "#4A3400"),
    ("#FF7A45", "#4A1804"), ("#8B7CFF", "#231A5C"), ("#FF5C8A", "#4A0E23"),
]


def avatar(indice):
    claro, oscuro = PALETAS[indice % len(PALETAS)]
    ident = f"av{indice}"
    # Marca de agua: la misma V del logotipo, girada y recortada por el disco.
    v = ('  <g opacity="0.16" fill="#FFFFFF">\n'
         '    <path d="M20,26 L48,74 L48,58 L34,26 Z"/>\n'
         '    <path d="M76,26 L48,74 L48,58 L62,26 Z"/>\n  </g>')
    cuerpo = [f'  <rect width="96" height="96" rx="48" fill="url(#{ident})"/>', v]
    return svg(96, 96, "\n".join(cuerpo), grad(ident, claro, oscuro))


# =====================================================================
#  Fondo de la ficha (300x420): rayas de césped + destello diagonal.
# =====================================================================
def ficha_fondo():
    W, H = 300.0, 420.0
    cuerpo = [f'  <rect width="{fmt(W)}" height="{fmt(H)}" rx="20" fill="url(#f-base)"/>']
    # Rayas de césped en diagonal, cada vez más tenues hacia abajo.
    cuerpo.append('  <g opacity="0.5">')
    paso = 26.0
    i = 0
    x = -H
    while x < W + H:
        if i % 2 == 0:
            op = 0.075 - 0.04 * (x + H) / (W + 2 * H)
            cuerpo.append(f'    <path d="M{fmt(x)},0 L{fmt(x + paso)},0 L{fmt(x + paso + H)},{fmt(H)} '
                          f'L{fmt(x + H)},{fmt(H)} Z" fill="#FFFFFF" opacity="{op:.3f}"/>')
        x += paso
        i += 1
    cuerpo.append("  </g>")
    # Destello superior: da el brillo de "carta" sin usar una imagen.
    cuerpo.append(f'  <path d="M0,0 L{fmt(W)},0 L{fmt(W)},{fmt(H * 0.34)} L0,{fmt(H * 0.52)} Z" '
                  f'fill="url(#f-brillo)"/>')
    defs = (grad("f-base", "#175A00", "#05100A", vertical=True)
            + '  <defs><linearGradient id="f-brillo" x1="0" y1="0" x2="0" y2="1">\n'
              '    <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.12"/>\n'
              '    <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>\n'
              '  </linearGradient></defs>\n')
    return svg(W, H, "\n".join(cuerpo), defs)


# =====================================================================
def main():
    os.makedirs(ART, exist_ok=True)
    for nombre in SIMBOLOS:
        escribir(f"medalla-{nombre}.svg", medalla(nombre, True))
        escribir(f"medalla-{nombre}-off.svg", medalla(nombre, False))
    for i in range(len(PALETAS)):
        escribir(f"avatar-{i}.svg", avatar(i))
    escribir("ficha-fondo.svg", ficha_fondo())


if __name__ == "__main__":
    main()
