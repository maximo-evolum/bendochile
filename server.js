import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'bendo.sqlite');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT DEFAULT '',
  description TEXT DEFAULT '',
  specs TEXT DEFAULT '',
  short_description TEXT DEFAULT '',
  specs TEXT DEFAULT '',
  price REAL DEFAULT 0,
  compare_price REAL DEFAULT 0,
  discount_percent REAL DEFAULT 0,
  discount_price REAL DEFAULT 0,
  discount_active INTEGER DEFAULT 0,
  stock INTEGER DEFAULT 0,
  sku TEXT DEFAULT '',
  barcode TEXT DEFAULT '',
  category TEXT DEFAULT '',
  subcategory TEXT DEFAULT '',
  brand TEXT DEFAULT '',
  tags TEXT DEFAULT '[]',
  image TEXT DEFAULT '',
  gallery TEXT DEFAULT '[]',
  options TEXT DEFAULT '[]',
  star_product INTEGER DEFAULT 0,
  carousel_product INTEGER DEFAULT 0,
  featured INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  weight REAL DEFAULT 0,
  dimensions TEXT DEFAULT '',
  whatsapp_message TEXT DEFAULT '',
  seo_title TEXT DEFAULT '',
  seo_description TEXT DEFAULT '',
  specs TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT DEFAULT '',
  customer_phone TEXT DEFAULT '',
  customer_email TEXT DEFAULT '',
  items TEXT DEFAULT '[]',
  total REAL DEFAULT 0,
  status TEXT DEFAULT 'whatsapp',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all().map((item) => item.name);
  if (!columns.includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

[
  ['slug', "TEXT DEFAULT ''"],
  ['short_description', "TEXT DEFAULT ''"],
  ['specs', "TEXT DEFAULT ''"],
  ['compare_price', 'REAL DEFAULT 0'],
  ['discount_percent', 'REAL DEFAULT 0'],
  ['discount_price', 'REAL DEFAULT 0'],
  ['discount_active', 'INTEGER DEFAULT 0'],
  ['sku', "TEXT DEFAULT ''"],
  ['barcode', "TEXT DEFAULT ''"],
  ['subcategory', "TEXT DEFAULT ''"],
  ['brand', "TEXT DEFAULT ''"],
  ['tags', "TEXT DEFAULT '[]'"],
  ['gallery', "TEXT DEFAULT '[]'"],
  ['options', "TEXT DEFAULT '[]'"],
  ['star_product', 'INTEGER DEFAULT 0'],
  ['carousel_product', 'INTEGER DEFAULT 0'],
  ['featured', 'INTEGER DEFAULT 0'],
  ['active', 'INTEGER DEFAULT 1'],
  ['weight', 'REAL DEFAULT 0'],
  ['dimensions', "TEXT DEFAULT ''"],
  ['whatsapp_message', "TEXT DEFAULT ''"],
  ['seo_title', "TEXT DEFAULT ''"],
  ['seo_description', "TEXT DEFAULT ''"],
  ['updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP']
].forEach(([column, definition]) => ensureColumn('products', column, definition));

const initialAdmins = [
  { username: 'maximo', password: 'admin123', role: 'superadmin' },
  { username: 'admin1', password: 'admin123', role: 'admin' },
  { username: 'admin2', password: 'admin123', role: 'admin' },
  { username: 'admin3', password: 'admin123', role: 'admin' },
  { username: 'admin4', password: 'admin123', role: 'admin' }
];

const insertAdmin = db.prepare(`
  INSERT OR IGNORE INTO admins (username, password, role)
  VALUES (@username, @password, @role)
`);

initialAdmins.forEach((admin) => insertAdmin.run(admin));

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeInputProduct(body = {}) {
  return {
    name: String(body.name || body.title || 'Producto').trim(),
    slug: String(body.slug || ''),
    description: String(body.description || body.desc || ''),
    specs: String(body.specs || body.specifications || body.details || ''),
    short_description: String(body.short_description || body.shortDescription || ''),
    price: Number(body.price || 0),
    compare_price: Number(body.compare_price || body.comparePrice || 0),
    discount_percent: Number(body.discount_percent || body.discountPercent || body.discount || 0),
    discount_price: Number(body.discount_price || body.discountPrice || 0),
    discount_active: body.discount_active || body.discountActive || Number(body.discount_percent || body.discountPercent || 0) > 0 ? 1 : 0,
    stock: Number(body.stock || body.quantity || 0),
    sku: String(body.sku || ''),
    barcode: String(body.barcode || ''),
    category: String(body.category || ''),
    subcategory: String(body.subcategory || ''),
    brand: String(body.brand || ''),
    tags: JSON.stringify(parseJsonArray(body.tags)),
    image: String(body.image || body.imageUrl || body.img || ''),
    gallery: JSON.stringify(parseJsonArray(body.gallery)),
    options: JSON.stringify(parseJsonArray(body.options || body.variants || body.product_options)),
    star_product: body.star_product || body.starProduct || body.is_star ? 1 : 0,
    carousel_product: body.carousel_product || body.carouselProduct ? 1 : 0,
    featured: body.featured ? 1 : 0,
    active: body.active === false || body.active === 0 ? 0 : 1,
    weight: Number(body.weight || 0),
    dimensions: String(body.dimensions || ''),
    whatsapp_message: String(body.whatsapp_message || body.whatsappMessage || ''),
    seo_title: String(body.seo_title || body.seoTitle || ''),
    seo_description: String(body.seo_description || body.seoDescription || '')
  };
}

function normalizeOutputProduct(product) {
  return {
    ...product,
    specs: product.specs || product.specifications || product.short_description || '',
    price: Number(product.price || 0),
    compare_price: Number(product.compare_price || 0),
    discount_percent: Number(product.discount_percent || 0),
    discountPercent: Number(product.discount_percent || 0),
    discount_price: Number(product.discount_price || 0),
    discount_active: Boolean(product.discount_active),
    stock: Number(product.stock || 0),
    featured: Boolean(product.featured),
    active: Boolean(product.active),
    weight: Number(product.weight || 0),
    tags: parseJsonArray(product.tags),
    gallery: parseJsonArray(product.gallery),
    options: parseJsonArray(product.options),
    variants: parseJsonArray(product.options),
    product_options: parseJsonArray(product.options),
    starProduct: Boolean(product.star_product),
    star_product: Boolean(product.star_product),
    carouselProduct: Boolean(product.carousel_product),
    carousel_product: Boolean(product.carousel_product)
  };
}

function sendError(res, status, message, error = null) {
  if (error) console.error(message, error);
  return res.status(status).json({ success: false, message });
}

app.get('/api/health', (req, res) => {
  return res.json({
    ok: true,
    service: 'BENDO API',
    database: dbPath,
    admins: db.prepare('SELECT COUNT(*) AS count FROM admins').get().count,
    products: db.prepare('SELECT COUNT(*) AS count FROM products').get().count
  });
});

app.post('/api/auth/login', (req, res) => {
  try {
    const username = String(req.body?.username || '').trim().toLowerCase();
    const password = String(req.body?.password || '').trim();

    if (!username || !password) {
      return sendError(res, 400, 'Faltan credenciales');
    }

    const admin = db.prepare(
      'SELECT id, username, role FROM admins WHERE lower(username) = ? AND password = ?'
    ).get(username, password);

    if (!admin) {
      return sendError(res, 401, 'Usuario o contraseña incorrectos');
    }

    return res.json({
      success: true,
      token: `bendo-admin-${admin.id}-${Date.now()}`,
      user: {
        id: admin.id,
        username: admin.username,
        role: admin.role
      }
    });
  } catch (error) {
    return sendError(res, 500, 'Error interno en login', error);
  }
});

app.get('/api/products', (req, res) => {
  try {
    const products = db.prepare('SELECT * FROM products ORDER BY id DESC').all();
    return res.json(products.map(normalizeOutputProduct));
  } catch (error) {
    return sendError(res, 500, 'Error cargando productos', error);
  }
});

app.post('/api/products', (req, res) => {
  try {
    const product = normalizeInputProduct(req.body);

    if (!product.name) {
      return sendError(res, 400, 'El nombre del producto es obligatorio');
    }

    const result = db.prepare(`
      INSERT INTO products (
        name, slug, description, specs, short_description, price, compare_price, discount_percent, discount_price, discount_active,
        stock, sku, barcode, category, subcategory, brand, tags, image,
        gallery, options, star_product, carousel_product, featured, active, weight, dimensions, whatsapp_message,
        seo_title, seo_description
      ) VALUES (
        @name, @slug, @description, @specs, @short_description, @price, @compare_price, @discount_percent, @discount_price, @discount_active,
        @stock, @sku, @barcode, @category, @subcategory, @brand, @tags, @image,
        @gallery, @options, @star_product, @carousel_product, @featured, @active, @weight, @dimensions, @whatsapp_message,
        @seo_title, @seo_description
      )
    `).run(product);

    const saved = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ success: true, product: normalizeOutputProduct(saved) });
  } catch (error) {
    return sendError(res, 500, 'Error creando producto', error);
  }
});

app.put('/api/products/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const current = db.prepare('SELECT * FROM products WHERE id = ?').get(id);

    if (!current) {
      return sendError(res, 404, 'Producto no encontrado');
    }

    const merged = normalizeInputProduct({ ...normalizeOutputProduct(current), ...req.body });

    db.prepare(`
      UPDATE products
      SET
        name=@name,
        slug=@slug,
        description=@description,
        specs=@specs,
        short_description=@short_description,
        price=@price,
        compare_price=@compare_price,
        discount_percent=@discount_percent,
        discount_price=@discount_price,
        discount_active=@discount_active,
        stock=@stock,
        sku=@sku,
        barcode=@barcode,
        category=@category,
        subcategory=@subcategory,
        brand=@brand,
        tags=@tags,
        image=@image,
        gallery=@gallery,
        options=@options,
        star_product=@star_product,
        carousel_product=@carousel_product,
        featured=@featured,
        active=@active,
        weight=@weight,
        dimensions=@dimensions,
        whatsapp_message=@whatsapp_message,
        seo_title=@seo_title,
        seo_description=@seo_description,
        updated_at=CURRENT_TIMESTAMP
      WHERE id=@id
    `).run({ ...merged, id });

    const saved = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    return res.json({ success: true, product: normalizeOutputProduct(saved) });
  } catch (error) {
    return sendError(res, 500, 'Error actualizando producto', error);
  }
});

app.delete('/api/products/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM products WHERE id = ?').run(Number(req.params.id));
    return res.json({ success: true });
  } catch (error) {
    return sendError(res, 500, 'Error eliminando producto', error);
  }
});

app.post('/api/orders', (req, res) => {
  try {
    const body = req.body || {};
    const items = Array.isArray(body.items) ? body.items : [];

    const result = db.prepare(`
      INSERT INTO orders (customer_name, customer_phone, customer_email, items, total, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      String(body.customer_name || body.name || ''),
      String(body.customer_phone || body.phone || ''),
      String(body.customer_email || body.email || ''),
      JSON.stringify(items),
      Number(body.total || 0),
      String(body.status || 'whatsapp')
    );

    return res.status(201).json({ success: true, orderId: result.lastInsertRowid });
  } catch (error) {
    return sendError(res, 500, 'Error creando orden', error);
  }
});

app.get('/api/orders', (req, res) => {
  try {
    const orders = db.prepare('SELECT * FROM orders ORDER BY id DESC').all();
    return res.json(orders.map((order) => ({
      ...order,
      items: parseJsonArray(order.items)
    })));
  } catch (error) {
    return sendError(res, 500, 'Error cargando órdenes', error);
  }
});

const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');

  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }

  return res.status(200).send(`
    <h1>BENDO API funcionando</h1>
    <p>Ejecuta <code>npm run build</code> para generar el frontend.</p>
    <p>Health: <a href="/api/health">/api/health</a></p>
  `);
});

app.listen(PORT, () => {
  console.log(`BENDO API running on port ${PORT}`);
});
