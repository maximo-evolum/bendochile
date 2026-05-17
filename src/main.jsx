import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BarChart3,
  Boxes,
  CheckCircle2,
  ChevronRight,
  Edit3,
  Eye,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  Menu,
  Minus,
  Package,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import './styles.css';
import { API_URL, deleteProductById, getProducts, getPublicFallbackProducts, isSupabaseConfigured, resolveProductImage, saveProduct as saveProductRecord, subscribeToProducts, updateProductStock } from './services/products';

const categories = ['Todos', 'Ferretería', 'Abarrotes', 'Hogar', 'Limpieza', 'Herramientas'];

const emptyForm = {
  id: '',
  name: '',
  price: '',
  stock: '',
  category: 'Ferretería',
  description: '',
  specs: '',
  image: '',
  gallery: [],
  discountPercent: '',
  discount_percent: '',
  discount_active: false,
  discount_price: '',
  featured: false,
  starProduct: false,
  carouselProduct: false,
  options: [],
  optionsText: '',
};

function money(value) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function stockInfo(stock) {
  if (stock <= 0) return { label: 'Agotado', className: 'out' };
  if (stock <= 5) return { label: 'Últimas unidades', className: 'low' };
  return { label: 'Disponible', className: 'ok' };
}


function normalizeGallery(gallery) {
  if (Array.isArray(gallery)) return gallery.filter(Boolean)

  if (!gallery) return []

  try {
    const parsed = JSON.parse(gallery)
    return Array.isArray(parsed) ? parsed.filter(Boolean) : []
  } catch {
    return String(gallery)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
}


function productSpecs(product) {
  return (
    product?.specs ||
    product?.specifications ||
    product?.specification ||
    product?.details ||
    product?.short_description ||
    product?.shortDescription ||
    product?.dimensions ||
    ''
  )
}

function productGallery(product) {
  const mainImage = product?.image ? [product.image] : []
  const gallery = normalizeGallery(product?.gallery || product?.images || product?.photos)

  return [...mainImage, ...gallery].filter(Boolean)
}

function getDiscountPercent(product) {
  const directPercent =
    product?.discountPercent ??
    product?.discount_percent ??
    product?.discount ??
    product?.discount_percentage

  const percent = Number(directPercent || 0)

  if (percent > 0) {
    return Math.min(99, Math.max(0, Math.round(percent)))
  }

  const price = Number(product?.price || 0)
  const discountPrice = Number(
    product?.discount_price ||
    product?.discountPrice ||
    product?.compare_price ||
    product?.comparePrice ||
    0
  )

  if (price > 0 && discountPrice > 0 && discountPrice < price) {
    return Math.round(((price - discountPrice) / price) * 100)
  }

  return 0
}

function finalPrice(product) {
  const price = Number(product?.price || 0)
  const percent = getDiscountPercent(product)

  if (!percent || percent <= 0) {
    const discountPrice = Number(product?.discount_price || product?.discountPrice || 0)
    return discountPrice > 0 && discountPrice < price ? discountPrice : price
  }

  return Math.round(price - (price * percent / 100))
}

function App() {
  const [route, setRoute] = useState(window.location.pathname);
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('admin_token') || '');
  const [adminUser, setAdminUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('admin_user') || 'null'); } catch { return null; }
  });

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setRoute(path);
  };

  useEffect(() => {
    const onPopState = () => setRoute(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const view = route.startsWith('/admin') ? 'admin' : route.startsWith('/login') ? 'login' : 'store';
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todos');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [apiStatus, setApiStatus] = useState('Conectando con base de datos...');

  const loadProducts = async () => {
    try {
      const data = await getProducts();
      setProducts(data);
      setApiStatus(isSupabaseConfigured ? 'Conectado • Stock realtime activo' : 'API local conectada • Stock actualizado');
    } catch (error) {
      try {
        const fallback = await getPublicFallbackProducts();
        setProducts(fallback);
        setApiStatus('Catálogo cargado en modo público');
      } catch {
        setApiStatus('No se pudo cargar el catálogo');
      }
    }
  };

  useEffect(() => {
    let alive = true;
    const safeLoad = async () => {
      if (!alive) return;
      await loadProducts();
    };

    safeLoad();

    const unsubscribe = subscribeToProducts(safeLoad);
    const timer = isSupabaseConfigured ? null : setInterval(safeLoad, 2500);

    return () => {
      alive = false;
      unsubscribe();
      if (timer) clearInterval(timer);
    };
  }, []);

  const filtered = useMemo(() => {
    return products.filter((product) => {
      const matchQuery = `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(query.toLowerCase());
      const matchCategory = category === 'Todos' || product.category === category;
      return matchQuery && matchCategory;
    });
  }, [products, query, category]);

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const saveProduct = async (event) => {
    event.preventDefault();
    if (!form.name || !form.price) return alert('Agrega al menos nombre y precio.');

    const payload = {
      ...form,
      price: Number(form.price),
      stock: Number(form.stock || 0),
      image: form.image || '',
      gallery: normalizeGallery(form.gallery),
      discountPercent: Number(form.discountPercent || 0),
      discount_percent: Number(form.discountPercent || 0),
      discount_active: Number(form.discountPercent || 0) > 0,
      specifications: form.specs || '',
      short_description: form.specs || '',
      options: normalizeProductOptions(form.options),
      product_options: normalizeProductOptions(form.options),
      variants: normalizeProductOptions(form.options),
      starProduct: Boolean(form.starProduct),
      star_product: Boolean(form.starProduct),
      carouselProduct: Boolean(form.carouselProduct),
      carousel_product: Boolean(form.carouselProduct),
      discount_price: Number(form.discountPercent || 0) > 0
        ? Math.round(Number(form.price || 0) - (Number(form.price || 0) * Number(form.discountPercent || 0) / 100))
        : 0,
    };

    try {
      await saveProductRecord(payload, adminToken);
      await loadProducts();
      setForm(emptyForm);
      setImageFile(null);
    } catch (error) {
      alert(error.message || 'No se pudo guardar el producto');
    }
  };

  const editProduct = (product) => {
    setForm({
      ...product,
      price: String(product.price || ''),
      stock: String(product.stock || ''),
      discountPercent: String(getDiscountPercent(product) || ''),
      gallery: normalizeGallery(product.gallery),
      options: normalizeProductOptions(product.options || product.variants || product.product_options),
      starProduct: productIsStar(product),
      carouselProduct: Boolean(product.carouselProduct || product.carousel_product),
      optionsText: normalizeProductOptions(product.options || product.variants || product.product_options)
        .map((option) => `${option.label}: ${option.values.join(', ')}`)
        .join('\n'),
    });

    setImageFile(null);
  };
  const deleteProduct = async (id) => { if (confirm('¿Eliminar este producto?')) { await deleteProductById(id, adminToken); await loadProducts(); } };
  const updateStock = async (id, stock) => {
    setProducts((current) => current.map((product) => (product.id === id ? { ...product, stock: Number(stock) } : product)));
    try {
      await updateProductStock(id, stock, adminToken);
    } catch (error) {
      alert(error.message || 'No se pudo actualizar el stock');
      await loadProducts();
    }
  };

  const addToCart = (product) => {
    if (product.stock <= 0) return;
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) return current.map((item) => (item.id === product.id ? { ...item, qty: Math.min(item.qty + 1, product.stock) } : item));
      return [...current, { ...product, qty: 1 }];
    });
    setCartOpen(true);
  };

  const changeQty = (id, delta) => {
    setCart((current) => current.map((item) => (item.id === id ? { ...item, qty: Math.max(1, Math.min(item.stock, item.qty + delta)) } : item)));
  };

  const removeFromCart = (id) => setCart((current) => current.filter((item) => item.id !== id));

  const loginAdmin = async ({ username, password }) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo iniciar sesión');

    localStorage.setItem('admin_token', data.token);
    localStorage.setItem('admin_user', JSON.stringify(data.user));
    setAdminToken(data.token);
    setAdminUser(data.user);
    navigate('/admin');
  };

  const logoutAdmin = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setAdminToken('');
    setAdminUser(null);
    navigate('/login');
  };

  return (
    <div className="app">
      <Header view={view} navigate={navigate} cartCount={cartCount} setCartOpen={setCartOpen} mobileMenu={mobileMenu} setMobileMenu={setMobileMenu} adminUser={adminUser} logoutAdmin={logoutAdmin} />

      {view === 'login' ? (
        <LoginPage onLogin={loginAdmin} />
      ) : view === 'admin' ? (
        adminToken ? (
          <Admin
            form={form}
            setForm={setForm}
            saveProduct={saveProduct}
            products={products}
            deleteProduct={deleteProduct}
            updateStock={updateStock}
            editProduct={editProduct}
            setImageFile={setImageFile}
            apiStatus={apiStatus}
            adminUser={adminUser}
            logoutAdmin={logoutAdmin}
          />
        ) : (
          <LoginPage onLogin={loginAdmin} message="Inicia sesión para acceder al panel administrador." />
        )
      ) : (
        <Store
          products={filtered}
          allProducts={products}
          query={query}
          setQuery={setQuery}
          category={category}
          setCategory={setCategory}
          onProduct={setSelectedProduct}
          addToCart={addToCart}
        />
      )}

      {selectedProduct && <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} addToCart={addToCart} />}
      <CartDrawer cart={cart} open={cartOpen} onClose={() => setCartOpen(false)} changeQty={changeQty} removeFromCart={removeFromCart} />
    </div>
  );
}

function Header({ view, navigate, cartCount, setCartOpen, mobileMenu, setMobileMenu, adminUser, logoutAdmin }) {
  const go = (target) => {
    navigate(target === 'admin' ? '/admin' : '/shop');
    setMobileMenu(false);
  };

  return (
    <header className="header">
      <button className="brand logoBrand" onClick={() => go('store')} aria-label="BENDO">
        <span className="bendoTextLogo">BENDO<span>.</span></span>
      </button>

      <nav className={mobileMenu ? 'open' : ''}>
        {view === 'store' ? (
          <>
            <button onClick={() => go('store')} className="active">Tienda</button>
            <a href="#productos" onClick={() => { navigate('/shop'); setMobileMenu(false); }}>Catálogo</a>
          </>
        ) : view === 'admin' ? (
          <>
            <button onClick={() => go('admin')} className="active">Admin</button>
            <button onClick={() => go('store')}>Ver tienda</button>
          </>
        ) : null}
      </nav>

      <div className="headerActions">
        {adminUser && (
          <button className="logoutButton" onClick={logoutAdmin} title="Cerrar sesión">
            <LogOut size={16} />
            <span>{adminUser.username}</span>
          </button>
        )}
        <button className="cartButton" onClick={() => setCartOpen(true)}>
          <ShoppingBag size={18} />
          <span>{cartCount}</span>
        </button>
        <button className="menuButton" onClick={() => setMobileMenu(!mobileMenu)}><Menu size={22} /></button>
      </div>
    </header>
  );
}

function LoginPage({ onLogin, message }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onLogin({ username, password });
    } catch (err) {
      setError(err.message || 'Datos incorrectos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="loginPage">
      <section className="loginCard">
        <p className="eyebrow dark">Acceso privado</p>
        <h1>Panel administrador</h1>
        <p className="loginHint">Esta vista es solo para administradores. Los clientes deben usar la tienda pública.</p>
        {message && <div className="loginNotice">{message}</div>}
        <form onSubmit={submit}>
          <label>Usuario
            <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="username" autoComplete="username" />
          </label>
          <label>Contraseña
            <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="password" type="password" autoComplete="current-password" />
          </label>
          {error && <div className="loginError">{error}</div>}
          <button className="primary" disabled={loading}>{loading ? 'Ingresando...' : 'Ingresar al admin'}</button>
        </form>
        <small>Usuarios de prueba: maximo, admin1, admin2, admin3, admin4 • clave: admin123</small>
      </section>
    </main>
  );
}



function normalizeProductOptions(options) {
  if (Array.isArray(options)) return options.filter((item) => item && item.label && item.values?.length)

  if (!options) return []

  try {
    const parsed = JSON.parse(options)
    return Array.isArray(parsed) ? parsed.filter((item) => item && item.label && item.values?.length) : []
  } catch {
    return []
  }
}

function productOptionSummary(product) {
  const options = normalizeProductOptions(
    product?.options ||
    product?.variants ||
    product?.product_options ||
    []
  );
  const [newsletterStatus, setNewsletterStatus] = useState('');
  const featured = pickProducts(allProducts, (product) => product.featured || getDiscountPercent(product) > 0, 3);
  const bestSellers = pickProducts(allProducts, (product) => product.featured || Number(product.stock || 0) <= 8, 4);
  const offers = pickProducts(allProducts, (product) => getDiscountPercent(product) > 0, 4);
  const viral = pickProducts(allProducts, (product) => product.featured, 4);
  const starProduct = allProducts.find(productIsStar) || featured[0] || allProducts[0];
  const carouselProducts = pickProducts(allProducts, productInCarousel, 8);

  const submitNewsletter = (event) => {
    event.preventDefault();

    if (!email || !email.includes('@')) {
      setNewsletterStatus('Ingresa un correo válido para recibir novedades.');
      return;
    }

    const saved = JSON.parse(localStorage.getItem('bendo_newsletter') || '[]');
    localStorage.setItem('bendo_newsletter', JSON.stringify([...new Set([...saved, email])]));
    setEmail('');
    setNewsletterStatus('Listo. Te avisaremos cuando lleguen nuevas ofertas virales.');
  };

  return (
    <>
      <div className="topPromo">
        <span>🔥 PRODUCTOS VIRALES</span>
        <span>•</span>
        <span>STOCK LIMITADO</span>
        <span>•</span>
        <span>OFERTAS REALES HOY</span>
      </div>

      <section className="hero bendoHero">
        <div className="heroGlow" />

        <div className="heroContent">
          <p className="eyebrow">BENDOCHILE.CL</p>
          <h1>Todo lo que quieres. Más rápido. Más simple.</h1>
          <p>Productos virales, tecnología, hogar y ofertas reales en un solo lugar. Compra fácil y cierra tu pedido directo por WhatsApp.</p>

          <div className="heroActions">
            <a href="#ofertas" className="cta">Ver ofertas <ChevronRight size={18} /></a>
            <a href="#experiencia" className="secondaryCta">Cómo funciona</a>
          </div>

          <div className="trustStrip">
            <span>✔ Compra segura</span>
            <span>✔ Envíos rápidos</span>
            <span>✔ Atención personalizada</span>
          </div>
        </div>

        <div className="heroCard viralHeroCard">
          <div className="heroCardTop"><Sparkles size={18} /> Tendencias BENDO</div>

          {featured.map((product) => (
            <button className="miniProduct" key={product.id} onClick={() => onProduct(product)}>
              <img src={resolveProductImage(product.image)} alt={product.name} />
              <div>
                <strong>{product.name}</strong>
                <small>{money(finalPrice(product))}</small>
              </div>
              {getDiscountPercent(product) > 0 && (
                <span>-{getDiscountPercent(product)}%</span>
              )}
            </button>
          ))}

          {featured.length === 0 && (
            <div className="emptyHeroCard">Agrega productos destacados desde el admin para llenar esta zona.</div>
          )}
        </div>
      </section>


      {starProduct && (
        <section className="starProductSection section">
          <div className="starProductMedia">
            <span>Producto estrella</span>
            <img src={resolveProductImage(starProduct.image)} alt={starProduct.name} />
          </div>

          <div className="starProductInfo">
            <p className="eyebrow dark">Oportunidad destacada</p>
            <h2>{starProduct.name}</h2>
            <p>{starProduct.description}</p>

            <div className="starBenefits">
              <span>Stock disponible: {starProduct.stock}</span>
              {getDiscountPercent(starProduct) > 0 && <span>-{getDiscountPercent(starProduct)}% descuento</span>}
              {productOptionSummary(starProduct) && <span>{productOptionSummary(starProduct)}</span>}
            </div>

            <div className="starPrice">
              <strong>{money(finalPrice(starProduct))}</strong>
              {getDiscountPercent(starProduct) > 0 && <small>{money(starProduct.price)}</small>}
            </div>

            <button className="cta" onClick={() => onProduct(starProduct)}>
              Ver producto <ChevronRight size={18} />
            </button>
          </div>
        </section>
      )}

      {carouselProducts.length > 0 && (
        <section className="relevanceCarousel section">
          <div className="sectionTitle">
            <h2>Productos con más relevancia</h2>
            <span>Destacados • Ofertas • Virales</span>
          </div>

          <div className="carouselTrack">
            {carouselProducts.map((product) => (
              <button className="carouselProduct" key={product.id} onClick={() => onProduct(product)}>
                <img src={resolveProductImage(product.image)} alt={product.name} />
                <div>
                  <strong>{product.name}</strong>
                  <span>{money(finalPrice(product))}</span>
                  {getDiscountPercent(product) > 0 && <em>-{getDiscountPercent(product)}%</em>}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section id="experiencia" className="experience section trustSection">
        <div className="sectionTitle compact">
          <p className="eyebrow dark">Compra simple, atención real</p>
          <h2>La tienda está optimizada para vender por WhatsApp.</h2>
        </div>

        <div className="experienceGrid">
          <Feature icon={<ShieldCheck />} title="Compra segura" text="Catálogo claro, productos seleccionados y atención personalizada." />
          <Feature icon={<Truck />} title="Envíos rápidos" text="Coordina entrega o retiro directamente por WhatsApp." />
          <Feature icon={<Boxes />} title="Stock limitado" text="Mira disponibilidad y últimas unidades antes de consultar." />
        </div>
      </section>

      <section className="highlightSection section premiumHighlights">
        <div className="sectionTitle">
          <h2>🔥 Destacados de la semana</h2>
          <span>Viral • Ofertas • Top ventas</span>
        </div>

        <div className="highlightGrid">
          <HighlightShelf title="Más vendidos esta semana" products={bestSellers} onProduct={onProduct} />
          <HighlightShelf title="Ofertas" products={offers} onProduct={onProduct} />
          <HighlightShelf title="Viral" products={viral} onProduct={onProduct} />
        </div>
      </section>

      <section id="ofertas" className="urgencyBand section">
        <div>
          <p className="eyebrow dark">Urgencia visual</p>
          <h2>Ofertas y stock limitado</h2>
          <p>Revisa los productos con descuento, últimas unidades y artículos destacados antes de que se agoten.</p>
        </div>
        <a href="#productos" className="cta">Ir al catálogo</a>
      </section>

      <section id="productos" className="catalog section">
        <div className="sectionTitle">
          <h2>Catálogo BENDO</h2>
          <span>{products.length} productos</span>
        </div>

        <div className="toolbar">
          <div className="searchBox">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar producto, descripción o categoría" />
          </div>

          <div className="chips">
            {categories.map((item) => (
              <button key={item} onClick={() => setCategory(item)} className={category === item ? 'selected' : ''}>
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} onProduct={onProduct} addToCart={addToCart} />
          ))}
        </div>
      </section>

      <section className="newsletter section">
        <div>
          <p className="eyebrow dark">Novedades y ofertas</p>
          <h2>Recibe productos virales antes que todos.</h2>
          <p>Deja tu correo para enterarte de nuevos productos, descuentos y stock limitado.</p>
        </div>

        <form onSubmit={submitNewsletter}>
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu correo" type="email" />
          <button className="primary">Recibir ofertas</button>
          {newsletterStatus && <small>{newsletterStatus}</small>}
        </form>
      </section>

      <footer>
        <div>
          <h2 className="footerLogo"><span className="bendoTextLogo footerTextLogo">BENDO<span>.</span></span></h2>
          <p>Productos virales, hogar, tecnología y ofertas reales. Sin pago online por ahora: cierre directo y personalizado por WhatsApp.</p>
        </div>

        <div>
          <h4>Contacto</h4>
          <p>WhatsApp: +56962002398<br />Santiago, Chile</p>
        </div>
      </footer>
    </>
  );
}

function Feature({ icon, title, text }) {
  return <article className="feature"><div>{icon}</div><h3>{title}</h3><p>{text}</p></article>;
}


function HighlightShelf({ title, products, onProduct }) {
  return (
    <article className="highlightShelf">
      <h3>{title}</h3>

      <div>
        {products.map((product) => (
          <button key={product.id} onClick={() => onProduct(product)}>
            <img src={resolveProductImage(product.image)} alt={product.name} />
            <span>{product.name}</span>
            <strong>{money(finalPrice(product))}</strong>
            {getDiscountPercent(product) > 0 && <em>-{getDiscountPercent(product)}%</em>}
          </button>
        ))}
      </div>
    </article>
  );
}

function CategoryTile({ title, index, setCategory }) {
  const subtitles = ['Herramientas y fijaciones', 'Básicos para el día a día', 'Orden, luz y utilidad', 'Cuidado del espacio'];
  return <button className="categoryTile" onClick={() => setCategory(title)}><span>0{index + 1}</span><h3>{title}</h3><p>{subtitles[index]}</p></button>;
}

function ProductCard({ product, onProduct, addToCart }) {
  const status = stockInfo(product.stock);
  const discountPercent = getDiscountPercent(product);

  return (
    <article className="card">
      <button className="imageButton" onClick={() => onProduct(product)}>
        <div className="cardBadges">
          {productBadges(product).map((badge) => <span key={badge}>{badge}</span>)}
        </div>
        <img src={resolveProductImage(product.image)} alt={product.name} />
      </button>

      <div className="cardBody">
        <div className="row">
          <span className="tag">{product.category}</span>
          <span className={`stock ${status.className}`}>{status.label}: {product.stock}</span>
        </div>

        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <small>{productSpecs(product) || 'Sin especificaciones agregadas'}</small>
        {productOptionSummary(product) && <small className="optionHint">Opciones: {productOptionSummary(product)}</small>}

        <div className="buyRow">
          <div className="priceBlock">
            <strong>{money(finalPrice(product))}</strong>

            {discountPercent > 0 && (
              <div className="discountInfo">
                <small className="oldPrice">{money(product.price)}</small>
                <span className="discountBadge">-{discountPercent}%</span>
              </div>
            )}
          </div>

          <button disabled={product.stock <= 0} onClick={() => addToCart(product)}>
            <ShoppingCart size={16} /> Agregar
          </button>
        </div>
      </div>
    </article>
  );
}

function ProductModal({ product, onClose, addToCart }) {
  const status = stockInfo(product.stock);
  const discountPercent = getDiscountPercent(product);
  const images = productGallery(product);
  const specs = productSpecs(product);
  const options = normalizeProductOptions(
    product.options ||
    product.variants ||
    product.product_options ||
    []
  );
  const [selectedOptions, setSelectedOptions] = useState(() => {
    return options.reduce((acc, option) => {
      acc[option.label] = option.values[0] || '';
      return acc;
    }, {});
  });

  const [activeImage, setActiveImage] = useState(
    images[0] || product.image
  );

  const currentIndex = images.findIndex(
    (image) => image === activeImage
  );

  const goNext = () => {
    if (images.length <= 1) return;

    const nextIndex =
      currentIndex >= images.length - 1
        ? 0
        : currentIndex + 1;

    setActiveImage(images[nextIndex]);
  };

  const goPrev = () => {
    if (images.length <= 1) return;

    const prevIndex =
      currentIndex <= 0
        ? images.length - 1
        : currentIndex - 1;

    setActiveImage(images[prevIndex]);
  };

  const addSelectedToCart = () => {
    addToCart({
      ...product,
      selectedOptions
    });
  };

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <section className="productModal" onClick={(event) => event.stopPropagation()}>
        <button className="close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="modalGallery">
          <div className="mainImageWrapper">
            {images.length > 1 && (
              <>
                <button className="galleryArrow left" onClick={goPrev}>‹</button>
                <button className="galleryArrow right" onClick={goNext}>›</button>
              </>
            )}

            <img className="modalMainImage" src={resolveProductImage(activeImage)} alt={product.name} />
          </div>

          {images.length > 1 && (
            <div className="modalThumbs">
              {images.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  className={`thumbButton ${activeImage === image ? 'active' : ''}`}
                  onClick={() => setActiveImage(image)}
                >
                  <img src={resolveProductImage(image)} alt={`${product.name} imagen ${index + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="productDetail">
          <span className="tag">{product.category}</span>
          <h2>{product.name}</h2>
          <p>{product.description}</p>

          <div className={`stock large ${status.className}`}>
            {status.label}: {product.stock} unidades
          </div>

          {options.length > 0 && (
            <div className="variantBox">
              <strong>Selecciona una opción</strong>
              {options.map((option) => (
                <label key={option.label}>
                  {option.label}
                  <select
                    value={selectedOptions[option.label] || ''}
                    onChange={(event) => setSelectedOptions({
                      ...selectedOptions,
                      [option.label]: event.target.value
                    })}
                  >
                    {option.values.map((value) => <option key={value}>{value}</option>)}
                  </select>
                </label>
              ))}
            </div>
          )}

          {productOptionSummary(product) && (
            <div className="variantPreview">
              <strong>Opciones disponibles</strong>
              <span>{productOptionSummary(product)}</span>
            </div>
          )}

          <div className="specBox">
            <strong>Especificaciones</strong>
            <span>{specs || 'Sin especificaciones agregadas'}</span>
          </div>

          <div className="modalBuy">
            <div className="priceBlock">
              <strong>{money(finalPrice(product))}</strong>

              {discountPercent > 0 && (
                <div className="discountInfo">
                  <small className="oldPrice">{money(product.price)}</small>
                  <span className="discountBadge">-{discountPercent}%</span>
                </div>
              )}
            </div>

            <button disabled={product.stock <= 0} onClick={addSelectedToCart}>
              <ShoppingCart size={18} /> Agregar al carrito
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function CartDrawer({ cart, open, onClose, changeQty, removeFromCart }) {
  const total = cart.reduce((sum, item) => sum + finalPrice(item) * item.qty, 0);
  const message = encodeURIComponent(
    `Hola, quiero cotizar/comprar estos productos:
${cart
      .map(
        (item) =>
          `- ${item.name}${item.selectedOptions ? ` (${Object.entries(item.selectedOptions).map(([key, value]) => `${key}: ${value}`).join(', ')})` : ''} x${item.qty}: ${money(
            finalPrice(item) * item.qty
          )}`
      )
      .join('\n')}
Total estimado: ${money(total)}`
  );

  return (
    <aside className={`cartDrawer ${open ? 'open' : ''}`}>
      <div className="cartHeader"><h3>Carrito</h3><button onClick={onClose}><X size={20} /></button></div>

      <div className="cartItems">
        {cart.length === 0 && <p className="empty">Agrega productos para generar una cotización rápida.</p>}

        {cart.map((item) => {
          const discountPercent = getDiscountPercent(item);

          return (
            <div className="cartItem" key={item.id}>
              <img src={resolveProductImage(item.image)} alt={item.name} />

              <div>
                <strong>{item.name}</strong>
                <small>{money(finalPrice(item))}</small>
                {item.selectedOptions && <small className="cartOptions">{Object.entries(item.selectedOptions).map(([key, value]) => `${key}: ${value}`).join(' • ')}</small>}

                {discountPercent > 0 && (
                  <div className="discountInfo mini">
                    <small className="oldPrice">{money(item.price)}</small>
                    <span className="discountBadge">-{discountPercent}%</span>
                  </div>
                )}

                <div className="qty">
                  <button onClick={() => changeQty(item.id, -1)}><Minus size={14} /></button>
                  <span>{item.qty}</span>
                  <button onClick={() => changeQty(item.id, 1)}><Plus size={14} /></button>
                </div>
              </div>

              <button className="remove" onClick={() => removeFromCart(item.id)}><Trash2 size={16} /></button>
            </div>
          );
        })}
      </div>

      <div className="cartFooter">
        <div><span>Total</span><strong>{money(total)}</strong></div>
        <a className="primary whatsapp" href={`https://wa.me/56962002398?text=${message}`} target="_blank" rel="noreferrer">Comprar por WhatsApp</a>
      </div>
    </aside>
  );
}

function Admin({ form, setForm, saveProduct, products, deleteProduct, updateStock, editProduct, setImageFile, apiStatus, adminUser, logoutAdmin }) {
  const totalStock = products.reduce((sum, product) => sum + product.stock, 0);
  const totalValue = products.reduce((sum, product) => sum + product.stock * product.price, 0);
  const lowStock = products.filter((product) => product.stock > 0 && product.stock <= 5).length;

  const handleImage = (file) => {
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setForm((current) => ({ ...current, image: reader.result }));
    reader.readAsDataURL(file);
  };

  return (
    <main className="admin">
      <div className="adminIntro"><p className="eyebrow dark">Panel administrativo real</p><h1>Catálogo conectado a base de datos y stock en vivo.</h1><p>Sesión activa: <strong>{adminUser?.username}</strong> ({adminUser?.role}). Los productos se guardan en SQLite y cualquier cambio de stock se refleja en la tienda.</p><div className="adminIntroActions"><div className="liveStatus">{apiStatus}</div><button className="ghostText" onClick={logoutAdmin}>Cerrar sesión</button></div></div>
      <div className="statsGrid">
        <Stat icon={<Package />} label="Productos" value={products.length} />
        <Stat icon={<Boxes />} label="Stock total" value={totalStock} />
        <Stat icon={<BarChart3 />} label="Valor inventario" value={money(totalValue)} />
        <Stat icon={<CheckCircle2 />} label="Stock bajo" value={lowStock} />
      </div>
      <div className="adminGrid">
        <form className="panel productForm" onSubmit={saveProduct}>
          <h2><LayoutDashboard size={22} /> {form.id ? 'Editar producto' : 'Nuevo producto'}</h2>
          <label>Nombre<input placeholder="Ej: Cemento rápido" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <div className="two"><label>Categoría<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{categories.filter((item) => item !== 'Todos').map((item) => <option key={item}>{item}</option>)}</select></label><label>Destacado<select value={form.featured ? 'Sí' : 'No'} onChange={(event) => setForm({ ...form, featured: event.target.value === 'Sí' })}><option>Sí</option><option>No</option></select></label></div>
          <div className="two"><label>Producto estrella<select value={form.starProduct ? 'Sí' : 'No'} onChange={(event) => setForm({ ...form, starProduct: event.target.value === 'Sí' })}><option>Sí</option><option>No</option></select></label><label>Mostrar en carrusel<select value={form.carouselProduct ? 'Sí' : 'No'} onChange={(event) => setForm({ ...form, carouselProduct: event.target.value === 'Sí' })}><option>Sí</option><option>No</option></select></label></div>
          <label>Descripción<textarea placeholder="Describe el producto" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label>Especificaciones<textarea placeholder="Medidas, formato, material, uso recomendado" value={form.specs} onChange={(event) => setForm({ ...form, specs: event.target.value })} /></label>
          <div className="two"><label>Precio<input type="number" placeholder="29990" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label><label>Stock<input type="number" placeholder="15" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} /></label></div>
          <label className="upload"><ImagePlus size={28} /><span>{form.image ? 'Imagen cargada correctamente' : 'Subir imagen del producto'}</span><input type="file" accept="image/*" onChange={(event) => handleImage(event.target.files[0])} /></label>

          <label>
            Descuento %
            <input
              type="number"
              placeholder="0"
              value={form.discountPercent || ''}
              onChange={(event) => setForm({ ...form, discountPercent: event.target.value })}
            />
          </label>

          <label>
            Galería de imágenes
            <textarea
              placeholder="Ejemplo: uploads/1.jpg, uploads/2.jpg"
              value={Array.isArray(form.gallery) ? form.gallery.join(', ') : form.gallery || ''}
              onChange={(event) => setForm({
                ...form,
                gallery: event.target.value
              })}
            />
          </label>

          {normalizeGallery(form.gallery).length > 0 && (
            <div className="galleryPreview">
              {normalizeGallery(form.gallery).map((image) => (
                <img
                  key={image}
                  src={resolveProductImage(image)}
                  alt="preview"
                />
              ))}
            </div>
          )}

          <label>
            Menú desplegable del producto
            <textarea
              placeholder={'Ejemplo:\nTalla: S, M, L, XL\nColor: Negro, Blanco\nCapacidad: 128GB, 256GB'}
              value={form.optionsText || ''}
              onChange={(event) => setForm({
                ...form,
                optionsText: event.target.value
              })}
            />
          </label>

          {(form.optionsText || '').trim() && (
            <div className="adminOptionPreview">
              {normalizeProductOptions(
                (form.optionsText || '')
                  .split('\n')
                  .map((line) => {
                    const [label, values] = line.split(':');
                    return {
                      label: (label || '').trim(),
                      values: (values || '').split(',').map((item) => item.trim()).filter(Boolean)
                    };
                  })
              ).map((option) => (
                <span key={option.label}>{option.label}: {option.values.join(', ')}</span>
              ))}
            </div>
          )}

          <div className="formActions"><button className="primary">{form.id ? 'Guardar cambios' : 'Publicar producto'}</button>{form.id && <button type="button" className="ghostText" onClick={() => { setForm(emptyForm); setImageFile(null); }}>Cancelar</button>}</div>
        </form>

        <div className="panel inventoryPanel">
          <h2><Edit3 size={22} /> Inventario</h2>
          <div className="inventory">
            {products.map((product) => (
              <div className="inventoryItem" key={product.id}>
                <img src={resolveProductImage(product.image)} alt={product.name} />
                <div>
                  <strong>{product.name}</strong>
                  <small>{product.category} • {money(finalPrice(product))}{getDiscountPercent(product) > 0 ? ` • -${getDiscountPercent(product)}%` : ''}</small>
                </div>
                <input type="number" value={product.stock} onChange={(event) => updateStock(product.id, event.target.value)} />
                <button className="ghost" onClick={() => editProduct(product)} title="Editar"><Eye size={16} /></button>
                <button className="ghost danger" onClick={() => deleteProduct(product.id)} title="Eliminar"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function Stat({ icon, label, value }) {
  return <article className="stat"><div>{icon}</div><span>{label}</span><strong>{value}</strong></article>;
}

createRoot(document.getElementById('root')).render(<App />);
