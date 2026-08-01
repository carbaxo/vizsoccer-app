"""Genera la marca de VizSoccer: SVG del logotipo e iconos PNG de la PWA.

La geometría se CALCULA (no se dibuja a mano) para que la V del icono, la del
logotipo y las letras salgan con las mismas proporciones. Es el mismo método
que usa el logo de VizPlay, para que las dos apps se lean como una familia:
una V de dos brazos y un logotipo geométrico partido en dos colores
(VIZ en blanco, SOCCER en verde).

Uso: OUTPUT_DIR=. python3 scripts/logo.py   (requiere Pillow para los PNG)
"""
import math
import os
import pathlib

OUTPUT_DIR = os.environ.get("OUTPUT_DIR", str(pathlib.Path(__file__).resolve().parent.parent))
BRAND_DIR = os.path.join(OUTPUT_DIR, "brand")

# ------------------------------------------------------------------ colores
# El verde de marca es #44BB00. El icono va sobre un degradado verde: un icono
# oscuro se pierde en el launcher entre los demás. El logotipo largo va sobre
# casi negro, porque ahí el verde necesita fondo oscuro para leerse.
VERDE = "#44BB00"          # color de marca: el "SOCCER" del logotipo
VERDE_CLARO = "#5FD400"    # arranque del degradado del icono
VERDE_OSCURO = "#1A4700"   # final del degradado del icono
LIMA = "#C7F58F"           # segundo brazo de la V sobre el degradado verde
BLANCO = "#FFFFFF"
TINTA_CLARA = "#0E1B0A"    # fondo del logotipo: casi negro con un punto de verde
TINTA_OSCURA = "#040903"


def _hex(color):
    c = color.lstrip("#")
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))


# ---------------------------------------------------------------- primitivas
def fmt(v):
    s = ("%.2f" % v).rstrip("0").rstrip(".")
    return s if s else "0"


def poly(points):
    """Polígono cerrado -> pathData."""
    d = "M%s,%s" % (fmt(points[0][0]), fmt(points[0][1]))
    for x, y in points[1:]:
        d += " L%s,%s" % (fmt(x), fmt(y))
    return d + " Z"


def rect(x, y, w, h):
    return poly([(x, y), (x + w, y), (x + w, y + h), (x, y + h)])


def rect_pts(x, y, w, h):
    return [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]


# ---------------------------------------------------------------- la marca: V
def v_mark(cx, top, height, width, thick):
    """Dos brazos de una V con el corte superior HORIZONTAL (look geométrico).

    Devuelve (brazo_izq, brazo_der) como listas de puntos. El brazo derecho va
    en otro tono: es lo que hace que la V se lea también como un vértice.
    """
    apex = (cx, top + height)
    left_out = (cx - width / 2.0, top)
    right_out = (cx + width / 2.0, top)
    # Caída vertical equivalente a desplazarse `thick` en horizontal por la
    # misma pendiente: así el vértice interior queda donde toca y el grosor es
    # uniforme.
    slope = height / (width / 2.0)
    drop = thick * slope
    inner = (cx, top + height - drop)
    izq = [left_out, apex, inner, (left_out[0] + thick, top)]
    der = [right_out, apex, inner, (right_out[0] - thick, top)]
    return izq, der


# ------------------------------------------------------- letras geométricas
def glyph(ch, x, y, w, h, s):
    """Letra de trazo recto. Solo hacen falta las de VIZSOCCER."""
    cx = x + w / 2.0
    P = []
    if ch == "V":
        slope = h / (w / 2.0)
        drop = s * slope
        apex = (cx, y + h)
        inner = (cx, y + h - drop)
        P.append([(x, y), apex, inner, (x + s, y)])
        P.append([(x + w, y), apex, inner, (x + w - s, y)])
    elif ch == "I":
        P.append(rect_pts(cx - s / 2.0, y, s, h))
    elif ch == "Z":
        P.append(rect_pts(x, y, w, s))
        P.append(rect_pts(x, y + h - s, w, s))
        P.append([(x + w - s, y + s), (x + w, y + s),
                  (x + s, y + h - s), (x, y + h - s)])
    elif ch == "S":
        medio = y + (h - s) / 2.0
        P.append(rect_pts(x, y, w, s))                    # remate superior
        P.append(rect_pts(x, medio, w, s))                # travesaño central
        P.append(rect_pts(x, y + h - s, w, s))            # remate inferior
        P.append(rect_pts(x, y, s, medio - y))            # vertical izq. arriba
        P.append(rect_pts(x + w - s, medio, s, y + h - medio))  # vertical der. abajo
    elif ch == "O":
        P.append(rect_pts(x, y, w, s))
        P.append(rect_pts(x, y + h - s, w, s))
        P.append(rect_pts(x, y + s, s, h - 2 * s))
        P.append(rect_pts(x + w - s, y + s, s, h - 2 * s))
    elif ch == "C":
        # C "cuadrada", del mismo estilo geométrico que la O: barra vertical
        # con los remates arriba y abajo. Sin curvas, para que case con la V.
        P.append(rect_pts(x, y, s, h))
        P.append(rect_pts(x, y, w * 0.9, s))
        P.append(rect_pts(x, y + h - s, w * 0.9, s))
    elif ch == "E":
        P.append(rect_pts(x, y, s, h))
        P.append(rect_pts(x, y, w * 0.9, s))
        P.append(rect_pts(x, y + (h - s) / 2.0, w * 0.78, s))
        P.append(rect_pts(x, y + h - s, w * 0.9, s))
    elif ch == "R":
        cuenco = h * 0.58
        P.append(rect_pts(x, y, s, h))                       # asta
        P.append(rect_pts(x, y, w * 0.82, s))                # remate superior
        P.append(rect_pts(x, y + cuenco - s, w * 0.82, s))   # cierre del cuenco
        P.append(rect_pts(x + w * 0.82 - s, y, s, cuenco))   # lateral del cuenco
        # Pierna diagonal, con el mismo grosor que el resto.
        P.append([(x + w * 0.40, y + cuenco - s), (x + w * 0.40 + s, y + cuenco - s),
                  (x + w, y + h), (x + w - s, y + h)])
    else:
        raise ValueError("glifo no definido: " + ch)
    return P


def wordmark(text, x, y, cap, gap):
    """Logotipo en mayúsculas. Devuelve (lista_de_poligonos, ancho_total)."""
    w = cap * 0.65
    s = cap * 0.17
    out, cur = [], x
    for ch in text:
        out += glyph(ch, cur, y, w, cap, s)
        cur += w + gap
    return out, cur - gap - x


def wordmark_colores(text, corte, x, y, cap, gap, color_a, color_b):
    """Como wordmark(), pero devuelve (poligono, color) partiendo en `corte`.

    Hay que contar los trazos de cada glifo: una S son cinco y una I uno solo.
    """
    letras, ancho = wordmark(text, x, y, cap, gap)
    out, i = [], 0
    for k, ch in enumerate(text):
        trazos = len(glyph(ch, 0, 0, 10, 10, 2))
        color = color_a if k < corte else color_b
        for p in letras[i:i + trazos]:
            out.append((p, color))
        i += trazos
    return out, ancho


TEXTO = "VIZSOCCER"
CORTE = 3          # VIZ | SOCCER: las tres primeras en blanco
ANCHO_CAP = len(TEXTO) * 0.65 + (len(TEXTO) - 1) * 0.22   # ancho del logotipo / cap


# --------------------------------------------------------------------- SVG
def svg(w, h, cuerpo, defs=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {fmt(w)} {fmt(h)}" '
            f'width="{fmt(w)}" height="{fmt(h)}" role="img">\n'
            f'{defs}{cuerpo}\n</svg>\n')


def linear_defs(ident, c1, c2):
    return (f'  <defs><linearGradient id="{ident}" x1="0" y1="0" x2="1" y2="1">\n'
            f'    <stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/>\n'
            f'  </linearGradient></defs>\n')


def path_svg(points, fill):
    return f'  <path fill="{fill}" d="{poly(points)}"/>'


def build_mark_svg(size=108, radius_ratio=0.22, ident="vs-mark"):
    """Icono cuadrado: V de dos tonos sobre el degradado verde."""
    r = size * radius_ratio
    izq, der = v_mark(cx=size / 2, top=size * 0.315, height=size * 0.389,
                      width=size * 0.444, thick=size * 0.120)
    cuerpo = [f'  <rect width="{fmt(size)}" height="{fmt(size)}" rx="{fmt(r)}" fill="url(#{ident})"/>',
              path_svg(izq, BLANCO), path_svg(der, LIMA)]
    return svg(size, size, "\n".join(cuerpo),
               linear_defs(ident, VERDE_CLARO, VERDE_OSCURO))


def build_logo_svg():
    """Logotipo completo (320x180): marca + VIZ en blanco y SOCCER en verde."""
    BW, BH = 320.0, 180.0
    MARGEN, HUECO = 26.0, 20.0

    mh = 52.0                      # alto de la V
    mw = mh * (48.0 / 42.0)        # mismas proporciones que en el icono
    my = (BH - mh) / 2.0

    # El tamaño de las letras se DESPEJA del hueco disponible en vez de fijarlo
    # a ojo, y después el conjunto (marca + logotipo) se CENTRA.
    libre = BW - 2 * MARGEN - mw - HUECO
    cap = min(libre / ANCHO_CAP, 26.0)
    total = mw + HUECO + cap * ANCHO_CAP
    x0 = (BW - total) / 2.0

    izq, der = v_mark(cx=x0 + mw / 2.0, top=my, height=mh, width=mw,
                      thick=13 * (mh / 42.0))
    letras, ancho = wordmark_colores(TEXTO, CORTE, x=x0 + mw + HUECO,
                                     y=(BH - cap) / 2.0, cap=cap, gap=cap * 0.22,
                                     color_a=BLANCO, color_b=VERDE)

    cuerpo = [f'  <rect width="{fmt(BW)}" height="{fmt(BH)}" rx="18" fill="url(#vs-logo)"/>',
              path_svg(izq, BLANCO), path_svg(der, VERDE)]
    cuerpo += [path_svg(p, c) for p, c in letras]
    print("logotipo: ancho %.1f, margen derecho %.1f" % (ancho, BW - (x0 + mw + HUECO + ancho)))
    return svg(BW, BH, "\n".join(cuerpo), linear_defs("vs-logo", TINTA_CLARA, TINTA_OSCURA))


def build_wordmark_svg():
    """Solo el logotipo, sobre fondo transparente (para documentación y web)."""
    cap = 26.0
    ancho = cap * ANCHO_CAP
    alto = cap * 1.6
    letras, _ = wordmark_colores(TEXTO, CORTE, x=0, y=(alto - cap) / 2.0,
                                 cap=cap, gap=cap * 0.22,
                                 color_a="currentColor", color_b=VERDE)
    return svg(ancho, alto, "\n".join(path_svg(p, c) for p, c in letras))


# --------------------------------------------------------------------- PNG
def build_icons():
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        print("⚠ Pillow no instalado: se omiten los PNG (pip install Pillow)")
        return

    def gradiente(canvas, c1, c2):
        """Degradado lineal en diagonal, calculado en pequeño y reescalado."""
        n = 64
        base = Image.new("RGB", (n, n))
        a, b = _hex(c1), _hex(c2)
        pixels = base.load()
        for y in range(n):
            for x in range(n):
                t = (x + y) / (2.0 * (n - 1))
                pixels[x, y] = tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))
        return base.resize((canvas, canvas), Image.BICUBIC)

    def build(size, maskable):
        escala = 4
        canvas = size * escala
        image = gradiente(canvas, VERDE_CLARO, VERDE_OSCURO).convert("RGBA")
        draw = ImageDraw.Draw(image)
        # En los iconos maskable Android recorta hasta el 80 %: la V se queda en
        # las proporciones del icono adaptativo. En los normales puede crecer.
        k = 1.0 if maskable else 1.22
        izq, der = v_mark(cx=canvas / 2, top=canvas * (0.5 - 0.185 * k),
                          height=canvas * 0.389 * k, width=canvas * 0.444 * k,
                          thick=canvas * 0.120 * k)
        draw.polygon(izq, fill=_hex(BLANCO))
        draw.polygon(der, fill=_hex(LIMA))
        if not maskable:
            mascara = Image.new("L", (canvas, canvas), 0)
            ImageDraw.Draw(mascara).rounded_rectangle(
                [0, 0, canvas - 1, canvas - 1], radius=canvas * 0.22, fill=255)
            image.putalpha(mascara)
        return image.resize((size, size), Image.LANCZOS)

    for nombre, size, maskable in [
        ("icon-192.png", 192, False),
        ("icon-512.png", 512, False),
        ("icon-maskable-512.png", 512, True),
        ("apple-touch-icon.png", 180, True),
    ]:
        ruta = os.path.join(OUTPUT_DIR, nombre)
        build(size, maskable).save(ruta)
        print("✔", ruta)


def main():
    os.makedirs(BRAND_DIR, exist_ok=True)
    salidas = {
        "logo.svg": build_logo_svg(),
        "logo-mark.svg": build_mark_svg(),
        "logo-wordmark.svg": build_wordmark_svg(),
    }
    for nombre, contenido in salidas.items():
        ruta = os.path.join(BRAND_DIR, nombre)
        with open(ruta, "w", encoding="utf-8") as fh:
            fh.write(contenido)
        print("✔", ruta)
    build_icons()

    # La V de la barra de navegación va incrustada en ui.js: se imprime aquí
    # para poder copiarla sin volver a calcularla a mano.
    izq, der = v_mark(cx=16, top=10.08, height=12.44, width=14.2, thick=3.84)
    print("nav 32x32 · brazo izq:", poly(izq))
    print("nav 32x32 · brazo der:", poly(der))


if __name__ == "__main__":
    main()
