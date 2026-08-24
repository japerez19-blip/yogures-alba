from flask import Flask, render_template, request, redirect, url_for, jsonify, session
import sqlite3
import datetime
import html
import hmac
import os
import re
import ssl
from urllib.request import Request, urlopen

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or os.urandom(32)
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.environ.get("RENDER", "").lower() == "true",
    PERMANENT_SESSION_LIFETIME=datetime.timedelta(days=30),
)
DB_NAME = "yogures_v2.db"
BCV_URL = "https://www.bcv.org.ve/"
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD")


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
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS productos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sabor TEXT NOT NULL,
                    tamano TEXT NOT NULL,
                    precio_usd REAL NOT NULL,
                    cantidad_disponible INTEGER NOT NULL,
                    imagen TEXT NOT NULL
                )''')
    c.execute('''CREATE TABLE IF NOT EXISTS pedidos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    cliente TEXT NOT NULL,
                    descripcion TEXT NOT NULL,
                    telefono TEXT NOT NULL DEFAULT '',
                    ubicacion TEXT NOT NULL DEFAULT '',
                    estado TEXT DEFAULT 'PENDIENTE', 
                    fecha DATETIME NOT NULL
                )''')
    c.execute("PRAGMA table_info(pedidos)")
    columnas_pedidos = {columna[1] for columna in c.fetchall()}
    if 'telefono' not in columnas_pedidos:
        c.execute("ALTER TABLE pedidos ADD COLUMN telefono TEXT NOT NULL DEFAULT ''")
    if 'ubicacion' not in columnas_pedidos:
        c.execute("ALTER TABLE pedidos ADD COLUMN ubicacion TEXT NOT NULL DEFAULT ''")
    c.execute("SELECT COUNT(*) FROM productos")
    if c.fetchone()[0] == 0:
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
        c.executemany("INSERT INTO productos (sabor, tamano, precio_usd, cantidad_disponible, imagen) VALUES (?, ?, ?, ?, ?)", inventario)

    c.execute("UPDATE productos SET sabor = 'Uva', imagen = 'uva.jpg' WHERE sabor = 'Guanábana'")
    c.execute("SELECT sabor, tamano FROM productos")
    productos_existentes = {(fila[0], fila[1]) for fila in c.fetchall()}
    uva = [
        ('Uva', 'Pequeño', 1.00, 0, 'uva.jpg'),
        ('Uva', 'Grande', 5.00, 0, 'uva.jpg'),
    ]
    c.executemany(
        "INSERT INTO productos (sabor, tamano, precio_usd, cantidad_disponible, imagen) "
        "VALUES (?, ?, ?, ?, ?)",
        [producto for producto in uva if (producto[0], producto[1]) not in productos_existentes],
    )
        
    conn.commit()
    conn.close()


iniciar_base_datos()

@app.route('/')
def catalogo():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row 
    c = conn.cursor()
    c.execute("SELECT * FROM productos")
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
    
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    for item in carrito:
        id_prod = item['id']
        cant = item['cantidad']
        sabor = item['sabor']
        tamano = item['tamano']
        c.execute(
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
    
    c.execute(
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
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM pedidos WHERE estado = 'PENDIENTE'")
    pedidos = c.fetchall()
    c.execute("SELECT * FROM productos")
    productos = c.fetchall()
    conn.close()
    return render_template('abuela.html', pedidos=pedidos, productos=productos)

@app.route('/abuela/login', methods=['GET', 'POST'])
def login_abuela():
    if request.method == 'POST':
        contrasena = request.form.get('contrasena', '')
        if ADMIN_PASSWORD and hmac.compare_digest(contrasena, ADMIN_PASSWORD):
            session.clear()
            session.permanent = True
            session['abuela_autenticada'] = True
            return redirect(url_for('panel_abuela'))
        return render_template('login_abuela.html', error='La contraseña no es correcta.')
    return render_template('login_abuela.html', configurada=bool(ADMIN_PASSWORD))

@app.route('/abuela/logout', methods=['POST'])
def logout_abuela():
    session.clear()
    return redirect(url_for('login_abuela'))

@app.route('/entregar/<int:id_pedido>')
def entregar(id_pedido):
    if not session.get("abuela_autenticada"):
        return redirect(url_for("login_abuela"))
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute("UPDATE pedidos SET estado = 'ENTREGADO' WHERE id = ?", (id_pedido,))
    conn.commit()
    conn.close()
    return redirect(url_for('panel_abuela'))

# ESTA ES LA NUEVA RUTA PROFESIONAL (Actualiza todo de golpe)
@app.route('/actualizar_inventario', methods=['POST'])
def actualizar_inventario():
    if not session.get("abuela_autenticada"):
        return redirect(url_for("login_abuela"))
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    # Recorre todas las cajitas que la abuela llenó en la pantalla
    for id_producto, nueva_cantidad in request.form.items():
        try:
            nueva_cantidad = int(nueva_cantidad)
        except ValueError:
            continue
        c.execute(
            "UPDATE productos SET cantidad_disponible = ? WHERE id = ?",
            (max(0, nueva_cantidad), id_producto),
        )
    
    conn.commit()
    conn.close()
    return redirect(url_for('panel_abuela'))

if __name__ == '__main__':
    iniciar_base_datos()
    app.run(debug=True, host='0.0.0.0', port=5000)