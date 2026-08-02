from pathlib import Path
import os
import json, csv, html

ROOT=Path(os.environ.get('OUTPUT_DIR','tecnificacion_futbol_svg'))
EX={e['id']:e for e in json.loads((ROOT/'ejercicios.json').read_text(encoding='utf-8'))['ejercicios']}

# Cada sesión es un día completo de 60 min que trabaja TODAS las áreas técnicas:
# calentamiento (5) + 10 ejercicios de 5 min + vuelta a la calma (5) = 60.
SESSION_MIN=60
BLOCK_MIN=5
EXERCISES_PER_SESSION=10
WARMUP_MIN=5
COOLDOWN_MIN=5

# Agrupa cada objetivo del catálogo en un área de trabajo, y define el orden
# en el que aparecen dentro de la sesión (de dominio de balón a finalización).
AREA={
 'dominio':'Dominio y control','coordinación':'Dominio y control',
 'conducción':'Conducción','giros':'Giros y cambios de dirección',
 'pase':'Pase','pared':'Pase','precisión':'Precisión de pase',
 'control':'Control orientado','regate':'Regate y fintas','protección':'Protección',
 'desmarque':'Desmarque y apoyos','reacción':'Reacción y decisión',
 'tiro':'Finalización','mixto':'Circuito integrador',
}
AREA_ORDER=['Dominio y control','Conducción','Giros y cambios de dirección','Pase',
 'Control orientado','Precisión de pase','Regate y fintas','Protección',
 'Desmarque y apoyos','Reacción y decisión','Finalización','Circuito integrador']
LEVEL_RANK={'iniciación':0,'intermedio':1,'avanzado':2}

modalities=[('SOLO','Individual',1),('PAREJA','Pareja',2)]
levels=['iniciación','intermedio','avanzado']

def build_sessions(players,level):
    pool=[e for e in EX.values() if e['jugadores']==players]
    by_area={}
    for e in pool:
        by_area.setdefault(AREA[e['objetivo']],[]).append(e)
    # En cada área, prioriza los ejercicios del nivel del plan y luego los cercanos.
    for area in by_area:
        by_area[area].sort(key=lambda e:(abs(LEVEL_RANK[e['nivel']]-LEVEL_RANK[level]),e['id']))
    areas=[a for a in AREA_ORDER if a in by_area]
    sessions=[]
    for day in range(3):
        picks=[]
        rnd=0
        # Ronda a ronda por todas las áreas: la primera cubre cada área una vez
        # (día completo); las siguientes añaden variedad hasta llegar a 10.
        while len(picks)<EXERCISES_PER_SESSION and rnd<12:
            for area in areas:
                if len(picks)>=EXERCISES_PER_SESSION: break
                cands=by_area[area]
                e=cands[(day+rnd)%len(cands)]
                if e['id'] not in [p['id'] for p in picks]:
                    picks.append(e)
            rnd+=1
        while len(picks)<EXERCISES_PER_SESSION:  # catálogo pequeño: permite repetir
            picks.append(by_area[areas[len(picks)%len(areas)]][0])
        blocks=[dict(tipo='calentamiento',minutos=WARMUP_MIN,descripcion='Movilidad, activación y contactos libres con balón, con ambos perfiles.')]
        for e in picks:
            blocks.append(dict(tipo='ejercicio',ejercicio_id=e['id'],minutos=BLOCK_MIN,descripcion=e['nombre']))
        blocks.append(dict(tipo='vuelta_calma',minutos=COOLDOWN_MIN,descripcion='Toques suaves, estiramientos y respiración.'))
        assert sum(b['minutos'] for b in blocks)==SESSION_MIN
        sessions.append(dict(dia=day+1,titulo=f"Sesión completa {'ABC'[day]} · trabaja todas las áreas",
            duracion_min=SESSION_MIN,bloques=blocks))
    return sessions

plans=[]
for base,label,players in modalities:
    for level in levels:
        plans.append(dict(
          id=f'{base}-{level.upper()}-60',nombre=f'{label} · {level} · 60 min',jugadores=players,nivel=level,
          dias_semana=3,duracion_sesion_min=SESSION_MIN,duracion_programa_semanas=4,
          progresion_semanal=[
            'Semana 1: ejecución limpia y ritmo moderado en todas las áreas.',
            'Semana 2: aumenta la velocidad sin perder precisión.',
            'Semana 3: prioriza el pie menos hábil y reduce el número de toques.',
            'Semana 4: registra tiempos, aciertos y mejor marca en cada bloque.'
          ],
          sesiones=build_sessions(players,level)))

payload=dict(version='2.0',idioma='es',frecuencia='3 días por semana',
    duraciones_disponibles_min=[60],total_planes=len(plans),
    estructura='Cada sesión de 60 min trabaja todas las áreas: 10 ejercicios de 5 min más calentamiento y vuelta a la calma.',
    planes=plans)
(ROOT/'planes_entrenamiento.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding='utf-8')

with (ROOT/'planes_entrenamiento.csv').open('w',encoding='utf-8-sig',newline='') as f:
    fields=['plan_id','plan','jugadores','nivel','duracion_sesion_min','dia','sesion','orden','tipo','ejercicio_id','ejercicio','minutos','descripcion']
    w=csv.DictWriter(f,fieldnames=fields); w.writeheader()
    for p in plans:
      for s in p['sesiones']:
       for order,b in enumerate(s['bloques'],1):
        eid=b.get('ejercicio_id','')
        w.writerow(dict(plan_id=p['id'],plan=p['nombre'],jugadores=p['jugadores'],nivel=p['nivel'],duracion_sesion_min=p['duracion_sesion_min'],dia=s['dia'],sesion=s['titulo'],orden=order,tipo=b['tipo'],ejercicio_id=eid,ejercicio=EX[eid]['nombre'] if eid else '',minutos=b['minutos'],descripcion=b['descripcion']))

md=['# Planes de tecnificación','',f'{len(plans)} planes de cuatro semanas, con 3 sesiones por semana. Todas las sesiones duran 60 minutos y trabajan todas las áreas técnicas: 10 ejercicios de 5 minutos más calentamiento y vuelta a la calma.','']
for p in plans:
    md += [f"## {p['nombre']}",'',f"**Jugadores:** {p['jugadores']} · **Nivel:** {p['nivel']} · **Duración:** {p['duracion_sesion_min']} min",'']
    for s in p['sesiones']:
        md += [f"### Día {s['dia']} · {s['titulo']}",'']
        for b in s['bloques']:
            ref=f" — **{b['ejercicio_id']}**" if b.get('ejercicio_id') else ''
            md.append(f"- {b['minutos']} min{ref}: {b['descripcion']}")
        md.append('')
    md += ['**Progresión:** '+ ' '.join(p['progresion_semanal']),'']
(ROOT/'PLANES.md').write_text('\n'.join(md),encoding='utf-8')

cards=[]
for p in plans:
    sessions=[]
    for s in p['sesiones']:
        rows=''.join(f"<li><b>{b['minutos']} min</b> · {html.escape((b.get('ejercicio_id','')+' '+b['descripcion']).strip())}</li>" for b in s['bloques'])
        sessions.append(f"<section><h3>Día {s['dia']} · {html.escape(s['titulo'])}</h3><ul>{rows}</ul></section>")
    cards.append(f"<article class='plan' data-p='{p['jugadores']}' data-d='{p['duracion_sesion_min']}' data-n='{p['nivel']}'><div class='tag'>{p['jugadores']} jugador{'es' if p['jugadores']>1 else ''} · {p['nivel']} · {p['duracion_sesion_min']} min</div><h2>{html.escape(p['nombre'])}</h2>{''.join(sessions)}</article>")

HEAD=("<!doctype html><html lang='es'><meta charset='utf-8'>"
 "<meta name='viewport' content='width=device-width,initial-scale=1,viewport-fit=cover'>"
 "<meta name='description' content='12 planes de tecnificación de fútbol de 3 días por semana, con sesiones de 60 minutos que trabajan todas las áreas, modo entrenamiento guiado, cronómetro y demostraciones animadas.'>"
 "<meta name='theme-color' content='#0a1409'>"
 "<script>try{var _t=JSON.parse(localStorage.getItem('ft:tema'));document.documentElement.dataset.theme=_t||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light')}catch(e){}</script>"
 "<link rel='manifest' href='manifest.webmanifest'><link rel='icon' type='image/png' href='icon-192.png'><link rel='apple-touch-icon' href='apple-touch-icon.png'>"
 "<title>VizSoccer · Planes de entrenamiento</title>")
STYLE=("<style>*{box-sizing:border-box}body{margin:0;font:15px system-ui;background:#f1f7ea;color:#101d0b}"
 "header{padding:32px 5vw;background:linear-gradient(135deg,#1a4700,#44bb00);color:white}header h1{margin:0 0 8px}"
 ".filters{position:sticky;top:0;padding:14px 5vw;background:#fffe;display:flex;gap:10px;box-shadow:0 2px 12px #0002}"
 "select{padding:10px;border:1px solid #d6e4c8;border-radius:8px}main{padding:24px 5vw;display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:20px}"
 ".plan{background:white;border-radius:16px;padding:20px;box-shadow:0 6px 22px #101d0b15}.tag{display:inline-block;background:#e2eed6;color:#2f7d00;border-radius:999px;padding:6px 10px;font-size:12px;font-weight:700}"
 "h2{font-size:21px}h3{font-size:15px;margin-bottom:6px;border-top:1px solid #d6e4c8;padding-top:12px}ul{margin:0;padding-left:20px;line-height:1.55}.hide{display:none}</style>")
FILTERS=("<div class='filters'><select id='p'><option value=''>Jugadores: todos</option><option value='1'>Individual</option><option value='2'>Pareja</option></select>"
 "<select id='n'><option value=''>Nivel: todos</option><option>iniciación</option><option>intermedio</option><option>avanzado</option></select></div>")
SCRIPT=("<script>const q=s=>document.querySelector(s),f=()=>document.querySelectorAll('.plan').forEach(c=>c.classList.toggle('hide',(q('#p').value&&c.dataset.p!=q('#p').value)||(q('#n').value&&c.dataset.n!=q('#n').value)));document.querySelectorAll('select').forEach(x=>x.onchange=f)</script>"
 "<script src='data.js'></script><script src='perfil.js'></script><script defer src='ui.js'></script></html>")
HEADER="<header><h1>Planes de tecnificación</h1><p>3 días por semana · sesiones de 60 minutos que trabajan todas las áreas · progresión de 4 semanas</p></header>"
(ROOT/'planes.html').write_text(f"{HEAD}{STYLE}<link rel=\"stylesheet\" href=\"ui.css\">{HEADER}{FILTERS}<main>{''.join(cards)}</main>{SCRIPT}",encoding='utf-8')

# Actualiza data.js conservando los ejercicios (con sus rutas WebP) y sustituyendo los planes.
data_path=ROOT/'data.js'
prefix='window.TRAINING_DATA='
raw=data_path.read_text(encoding='utf-8')
existing=json.loads(raw[len(prefix):].rstrip().rstrip(';'))
existing['plans']=plans
data_path.write_text(prefix+json.dumps(existing,ensure_ascii=False,separators=(',',':'))+';',encoding='utf-8')

print(f'Planes creados: {len(plans)} (todos de 60 min, {EXERCISES_PER_SESSION} ejercicios de {BLOCK_MIN} min por sesión)')
