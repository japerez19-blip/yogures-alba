from flask import Flask, render_template, request, redirect, url_for, jsonify, session
import datetime
import html
import hmac
import os
import sqlite3
import re
import secrets
import ssl
import time
from urllib.request import Request, urlopen
from dotenv import load_dotenv

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    psycopg2 = None
    RealDictCursor = None

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or os.urandom(32)
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.environ.get("RENDER", "").lower() == "true",
    PERMANENT_SESSION_LIFETIME=datetime.timedelta(days=30),
)
DB_NAME = "yogures_v2.db"
DATABASE_URL = os.environ.get("DATABASE_URL")
BCV_URL = "https://www.bcv.org.ve/"
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")
intentos_login = {}


def token_csrf():
    if "csrf_token" not in session:
        session["csrf_token"] = secrets.token_urlsafe(32)
    return session["csrf_token"]


def csrf_valido():
    return hmac.compare_digest(
        request.form.get("csrf_token", ""), session.get("csrf_token", "")
    )


def conectar_base_datos():
    if DATABASE_URL:
        if psycopg2 is None:
            raise RuntimeError("Falta instalar psycopg2-binary para usar Supabase")
        return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn


def ejecutar(cursor, consulta, parametros=()):
    if DATABASE_URL:
        consulta = consulta.replace("?", "%s")
    if parametros:
        cursor.execute(consulta, parametros)
    else:
        cursor.execute(consulta)


def migrar_guanabana_a_uva(cursor):
    ejecutar(
        cursor,
        "UPDATE productos SET sabor = 'Uva', imagen = 'uva.jpg' "
        "WHERE LOWER(TRIM(sabor)) LIKE 'guanaban%' "
        "OR LOWER(TRIM(sabor)) LIKE 'guanábana%'",
    )


def obtener_tasas_bcv():
    try:
        solicitud = Request(BCV_URL, headers={"User-Agent": "Mozilla/5.0"})
        contexto_ssl = ssl.create_default_context()
        try:
            respuesta = urlopen(solicitud, timeout=8, context=contexto_ssl)
        except OSError:
            respuesta = urlopen(solicitud, timeout=8, context=ssl._create_unverified_context())
        with respuesta:
            contenido = respuesta.read().decode("utf-8", errors="ignore")
        texto = html.unescape(re.sub(r"<[^>]+>", " ", contenido))

        def extraer_tasa(moneda):
            coincidencia = re.search(rf"\b{moneda}\s*([\d.,]+)", texto, re.IGNORECASE)
            if not coincidencia:
                raise ValueError(f"No se encontro la tasa {moneda}")
            valor = coincidencia.group(1)
            if "," in valor:
                valor = valor.replace(".", "").replace(",", ".")
            return float(valor)

        return extraer_tasa("USD"), extraer_tasa("EUR")
    except (OSError, ValueError, UnicodeError):
        return None, None

def iniciar_base_datos():
    conn = conectar_base_datos()
    c = conn.cursor()
    tipo_id = "SERIAL PRIMARY KEY" if DATABASE_URL else "INTEGER PRIMARY KEY AUTOINCREMENT"
    tipo_fecha = "TIMESTAMP NOT NULL" if DATABASE_URL else "DATETIME NOT NULL"
    ejecutar(c, f'''CREATE TABLE IF NOT EXISTS productos (
                    id {tipo_id},
                    sabor TEXT NOT NULL,
                    tamano TEXT NOT NULL,
                    precio_usd REAL NOT NULL,
                    cantidad_disponible INTEGER NOT NULL,
                    imagen TEXT NOT NULL
                )''')
    ejecutar(c, f'''CREATE TABLE IF NOT EXISTS pedidos (
                    id {tipo_id},
                    cliente TEXT NOT NULL,
                    descripcion TEXT NOT NULL,
                    telefono TEXT NOT NULL DEFAULT '',
                    ubicacion TEXT NOT NULL DEFAULT '',
                    estado TEXT DEFAULT 'PENDIENTE', 
                    fecha {tipo_fecha}
                )''')
    if DATABASE_URL:
        ejecutar(c, "SELECT column_name FROM information_schema.columns WHERE table_name = 'pedidos'")
        columnas_pedidos = {columna["column_name"] for columna in c.fetchall()}
    else:
        ejecutar(c, "PRAGMA table_info(pedidos)")
        columnas_pedidos = {columna[1] for columna in c.fetchall()}
    if 'telefono' not in columnas_pedidos:
        ejecutar(c, "ALTER TABLE pedidos ADD COLUMN telefono TEXT NOT NULL DEFAULT ''")
    if 'ubicacion' not in columnas_pedidos:
        ejecutar(c, "ALTER TABLE pedidos ADD COLUMN ubicacion TEXT NOT NULL DEFAULT ''")
    ejecutar(c, "SELECT COUNT(*) AS total FROM productos")
    total_productos = c.fetchone()["total"] if DATABASE_URL else c.fetchone()[0]
    if total_productos == 0:
        inventario = [
            ('Fresa', 'Pequeño', 1.00, 2, 'fresa.jpg'),
            ('Fresa', 'Grande', 5.00, 2, 'fresa.jpg'),
            ('Durazno', 'Pequeño', 1.00, 2, 'durazno.jpg'),
            ('Durazno', 'Grande', 5.00, 2, 'durazno.jpg'),
            ('Piña', 'Pequeño', 1.00, 2, 'pina.jpg'),
            ('Piña', 'Grande', 5.00, 2, 'pina.jpg'),
            ('Natural', 'Pequeño', 1.00, 1, 'natural.jpg'), 
            ('Natural', 'Grande', 5.00, 2, 'natural.jpg'),
            ('Uva', 'Pequeño', 1.00, 0, 'uva.jpg'),
            ('Uva', 'Grande', 5.00, 0, 'uva.jpg')
        ]
        consulta_producto = "INSERT INTO productos (sabor, tamano, precio_usd, cantidad_disponible, imagen) VALUES (?, ?, ?, ?, ?)"
        for producto in inventario:
            ejecutar(c, consulta_producto, producto)

    migrar_guanabana_a_uva(c)
    ejecutar(c, "SELECT sabor, tamano FROM productos")
    productos_existentes = {(fila["sabor"], fila["tamano"]) if DATABASE_URL else (fila[0], fila[1]) for fila in c.fetchall()}
    uva = [
        ('Uva', 'Pequeño', 1.00, 0, 'uva.jpg'),
        ('Uva', 'Grande', 5.00, 0, 'uva.jpg'),
    ]
    consulta_producto = "INSERT INTO productos (sabor, tamano, precio_usd, cantidad_disponible, imagen) VALUES (?, ?, ?, ?, ?)"
    for producto in uva:
        if (producto[0], producto[1]) not in productos_existentes:
            ejecutar(c, consulta_producto, producto)
        
    conn.commit()
    conn.close()


iniciar_base_datos()

@app.route('/')
def catalogo():
    conn = conectar_base_datos()
    migrar_guanabana_a_uva(conn.cursor())
    conn.commit()
    c = conn.cursor()
    ejecutar(c, "SELECT * FROM productos")
    productos = c.fetchall()
    conn.close()
    tasa_usd_bcv, tasa_eur_bcv = obtener_tasas_bcv()
    tasa_bcv = tasa_eur_bcv or tasa_usd_bcv
    moneda_tasa_bcv = "EUR" if tasa_eur_bcv else "USD"
    factor_usd_a_eur = (
        tasa_usd_bcv / tasa_eur_bcv
        if tasa_usd_bcv is not None and tasa_eur_bcv
        else None
    )
    return render_template(
        'index.html',
        productos=productos,
        tasa_usd_bcv=tasa_usd_bcv,
        tasa_eur_bcv=tasa_eur_bcv,
        tasa_bcv=tasa_bcv,
        moneda_tasa_bcv=moneda_tasa_bcv,
        factor_usd_a_eur=factor_usd_a_eur,
    )

@app.route('/comprar', methods=['POST'])
def comprar():
    datos = request.json 
    cliente = datos.get('cliente', '').strip()
    telefono = datos.get('telefono', '').strip()
    ubicacion = datos.get('ubicacion', '').strip()
    carrito = datos.get('carrito', [])
    if not cliente or not telefono or not ubicacion or not carrito:
        return jsonify({"error": "Completa tus datos y agrega al menos un yogur."}), 400
    descripcion_pedido = []
    
    conn = conectar_base_datos()
    c = conn.cursor()

    for item in carrito:
        id_prod = item['id']
        cant = item['cantidad']
        sabor = item['sabor']
        tamano = item['tamano']
        ejecutar(c,
            "UPDATE productos SET cantidad_disponible = cantidad_disponible - ? "
            "WHERE id = ? AND cantidad_disponible >= ?",
            (cant, id_prod, cant),
        )
        if c.rowcount == 0:
            conn.rollback()
            conn.close()
            return jsonify({"error": f"No hay suficiente stock de {sabor} ({tamano})"}), 409
        descripcion_pedido.append(f"{cant}x {sabor} ({tamano})")

    descripcion_final = " + ".join(descripcion_pedido)
    fecha = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    
    ejecutar(c,
        "INSERT INTO pedidos (cliente, descripcion, telefono, ubicacion, fecha) VALUES (?, ?, ?, ?, ?)",
        (cliente, descripcion_final, telefono, ubicacion, fecha),
    )
    conn.commit()
    conn.close()
    return jsonify({"mensaje": "¡Pedido enviado a la abuela!"})

@app.route('/abuela')
def panel_abuela():
    if not session.get("abuela_autenticada"):
        return redirect(url_for("login_abuela"))
    conn = conectar_base_datos()
    c = conn.cursor()
    ejecutar(c, "SELECT * FROM pedidos WHERE estado = 'PENDIENTE'")
    pedidos = c.fetchall()
    ejecutar(c, "SELECT * FROM productos")
    productos = c.fetchall()
    conn.close()
    return render_template('abuela.html', pedidos=pedidos, productos=productos, csrf_token=token_csrf())

@app.route('/abuela/login', methods=['GET', 'POST'])
def login_abuela():
    if request.method == 'POST':
        ahora = time.monotonic()
        ip = request.remote_addr or "desconocida"
        intentos_recientes = [marca for marca in intentos_login.get(ip, []) if ahora - marca < 900]
        if len(intentos_recientes) >= 5:
            return render_template('login_abuela.html', error='Demasiados intentos. Espera 15 minutos.')
        contrasena = request.form.get('contrasena', '')
        if ADMIN_PASSWORD and hmac.compare_digest(contrasena, ADMIN_PASSWORD):
            intentos_login.pop(ip, None)
            session.clear()
            session.permanent = True
            session['abuela_autenticada'] = True
            return redirect(url_for('panel_abuela'))
        intentos_login[ip] = intentos_recientes + [ahora]
        return render_template('login_abuela.html', error='La contraseña no es correcta.')
    return render_template('login_abuela.html', configurada=bool(ADMIN_PASSWORD))

@app.route('/abuela/logout', methods=['POST'])
def logout_abuela():
    if not csrf_valido():
        return "Solicitud no válida", 400
    session.clear()
    return redirect(url_for('login_abuela'))

@app.route('/entregar/<int:id_pedido>', methods=['POST'])
def entregar(id_pedido):
    if not session.get("abuela_autenticada"):
        return redirect(url_for("login_abuela"))
    if not csrf_valido():
        return "Solicitud no válida", 400
    conn = conectar_base_datos()
    c = conn.cursor()
    ejecutar(c, "UPDATE pedidos SET estado = 'ENTREGADO' WHERE id = ?", (id_pedido,))
    conn.commit()
    conn.close()
    return redirect(url_for('panel_abuela'))

# ESTA ES LA NUEVA RUTA PROFESIONAL (Actualiza todo de golpe)
@app.route('/actualizar_inventario', methods=['POST'])
def actualizar_inventario():
    if not session.get("abuela_autenticada"):
        return redirect(url_for("login_abuela"))
    if not csrf_valido():
        return "Solicitud no válida", 400
    conn = conectar_base_datos()
    c = conn.cursor()
    # Recorre todas las cajitas que la abuela llenó en la pantalla
    for id_producto, nueva_cantidad in request.form.items():
        try:
            nueva_cantidad = int(nueva_cantidad)
        except ValueError:
            continue
        ejecutar(c,
            "UPDATE productos SET cantidad_disponible = ? WHERE id = ?",
            (max(0, nueva_cantidad), id_producto),
        )
    
    conn.commit()
    conn.close()
    return redirect(url_for('panel_abuela'))

if __name__ == '__main__':
    iniciar_base_datos()
    app.run(debug=True, host='0.0.0.0', port=5000)