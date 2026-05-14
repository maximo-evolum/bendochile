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
  featured: false,
};

function money(value) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function stockInfo(stock) {
  if (stock <= 0) return { label: 'Agotado', className: 'out' };
  if (stock <= 5) return { label: 'Últimas unidades', className: 'low' };
  return { label: 'Disponible', className: 'ok' };
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
      image: form.image || 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?q=80&w=1200&auto=format&fit=crop',
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

  const editProduct = (product) => { setForm({ ...product, price: String(product.price), stock: String(product.stock) }); setImageFile(null); };
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

function Store({ products, allProducts, query, setQuery, category, setCategory, onProduct, addToCart }) {
  const featured = allProducts.filter((product) => product.featured).slice(0, 3);

  return (
    <>
      <section className="hero">
        <div className="heroGlow" />
        <div className="heroContent">
          <p className="eyebrow">Premium market</p>
          <h1>Productos esenciales para tu vida diaria.</h1>
          <p>Una tienda simple, profesional y rápida para ferretería, abarrotes, hogar y limpieza.</p>
          <div className="heroActions">
            <a href="#productos" className="cta">Ver catálogo <ChevronRight size={18} /></a>
            <a href="#experiencia" className="secondaryCta">Cómo funciona</a>
          </div>
        </div>
        <div className="heroCard">
          <div className="heroCardTop"><Sparkles size={18} /> Stock en vivo</div>
          {featured.map((product) => (
            <div className="miniProduct" key={product.id}>
              <img src={resolveProductImage(product.image)} alt={product.name} />
              <div><strong>{product.name}</strong><small>{money(product.price)}</small></div>
              <span>{product.stock}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="experiencia" className="experience section">
        <div className="sectionTitle compact"><p className="eyebrow dark">Experiencia ecommerce</p><h2>Diseñada para vender sin saturar.</h2></div>
        <div className="experienceGrid">
          <Feature icon={<Truck />} title="Despacho claro" text=" Coordinar entrega o retiro por WhatsApp." />
          <Feature icon={<ShieldCheck />} title="Compra confiable" text="Cards limpias, precios visibles y estados de stock transparentes." />
          <Feature icon={<Boxes />} title="Inventario visible" text="El stock en tiempo real para su seguridad." />
        </div>
      </section>

      <section className="categoryShowcase section">
        <div className="sectionTitle"><h2>Categorías principales</h2><span>Compra rápida</span></div>
        <div className="categoryGrid">
          {['Ferretería', 'Abarrotes', 'Hogar', 'Limpieza'].map((item, index) => <CategoryTile key={item} title={item} index={index} setCategory={setCategory} />)}
        </div>
      </section>

      <section id="productos" className="catalog section">
        <div className="sectionTitle"><h2>Catálogo</h2><span>{products.length} productos</span></div>
        <div className="toolbar">
          <div className="searchBox"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar producto, descripción o categoría" /></div>
          <div className="chips">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={category === item ? 'selected' : ''}>{item}</button>)}</div>
        </div>
        <div className="grid">
          {products.map((product) => <ProductCard key={product.id} product={product} onProduct={onProduct} addToCart={addToCart} />)}
        </div>
      </section>

      <footer>
        <div><h2 className="footerLogo"><span className="bendoTextLogo footerTextLogo">BENDO<span>.</span></span></h2><p>Tienda enfocada en productos esenciales para el hogar, trabajo y vida diaria.</p></div>
        <div><h4>Contacto</h4><p>WhatsApp: +56962002398<br />Santiago, Chile</p></div>
      </footer>
    </>
  );
}

function Feature({ icon, title, text }) {
  return <article className="feature"><div>{icon}</div><h3>{title}</h3><p>{text}</p></article>;
}

function CategoryTile({ title, index, setCategory }) {
  const subtitles = ['Herramientas y fijaciones', 'Básicos para el día a día', 'Orden, luz y utilidad', 'Cuidado del espacio'];
  return <button className="categoryTile" onClick={() => setCategory(title)}><span>0{index + 1}</span><h3>{title}</h3><p>{subtitles[index]}</p></button>;
}

function ProductCard({ product, onProduct, addToCart }) {
  const status = stockInfo(product.stock);
  return (
    <article className="card">
      <button className="imageButton" onClick={() => onProduct(product)}><img src={resolveProductImage(product.image)} alt={product.name} /></button>
      <div className="cardBody">
        <div className="row"><span className="tag">{product.category}</span><span className={`stock ${status.className}`}>{status.label}: {product.stock}</span></div>
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <small>{product.specs}</small>
        <div className="buyRow"><strong>{money(product.price)}</strong><button disabled={product.stock <= 0} onClick={() => addToCart(product)}><ShoppingCart size={16} /> Agregar</button></div>
      </div>
    </article>
  );
}

function ProductModal({ product, onClose, addToCart }) {
  const status = stockInfo(product.stock);
  return (
    <div className="modalBackdrop" onClick={onClose}>
      <section className="productModal" onClick={(event) => event.stopPropagation()}>
        <button className="close" onClick={onClose}><X size={20} /></button>
        <img src={resolveProductImage(product.image)} alt={product.name} />
        <div className="productDetail">
          <span className="tag">{product.category}</span>
          <h2>{product.name}</h2>
          <p>{product.description}</p>
          <div className={`stock large ${status.className}`}>{status.label}: {product.stock} unidades</div>
          <div className="specBox"><strong>Especificaciones</strong><span>{product.specs}</span></div>
          <div className="modalBuy"><strong>{money(product.price)}</strong><button disabled={product.stock <= 0} onClick={() => addToCart(product)}><ShoppingCart size={18} /> Agregar al carrito</button></div>
        </div>
      </section>
    </div>
  );
}

function CartDrawer({ cart, open, onClose, changeQty, removeFromCart }) {
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const message = encodeURIComponent(`Hola, quiero cotizar/comprar estos productos:\n${cart.map((item) => `- ${item.name} x${item.qty}: ${money(item.price * item.qty)}`).join('\n')}\nTotal estimado: ${money(total)}`);

  return (
    <aside className={`cartDrawer ${open ? 'open' : ''}`}>
      <div className="cartHeader"><h3>Carrito</h3><button onClick={onClose}><X size={20} /></button></div>
      <div className="cartItems">
        {cart.length === 0 && <p className="empty">Agrega productos para generar una cotización rápida.</p>}
        {cart.map((item) => (
          <div className="cartItem" key={item.id}>
            <img src={resolveProductImage(item.image)} alt={item.name} />
            <div><strong>{item.name}</strong><small>{money(item.price)}</small><div className="qty"><button onClick={() => changeQty(item.id, -1)}><Minus size={14} /></button><span>{item.qty}</span><button onClick={() => changeQty(item.id, 1)}><Plus size={14} /></button></div></div>
            <button className="remove" onClick={() => removeFromCart(item.id)}><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
      <div className="cartFooter"><div><span>Total</span><strong>{money(total)}</strong></div><a className="primary whatsapp" href={`https://wa.me/56962002398?text=${message}`} target="_blank" rel="noreferrer">Comprar por WhatsApp</a></div>
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
      <div className="adminIntro"><p className="eyebrow dark">Panel administrativo real</p><h1>Catálogo conectado a base de datos y stock en vivo.</h1><p>Sesión activa: <strong>{adminUser?.username}</strong> ({adminUser?.role}). Los productos se guardan en Supabase y cualquier cambio de stock se refleja al instante en la tienda.</p><div className="adminIntroActions"><div className="liveStatus">{apiStatus}</div><button className="ghostText" onClick={logoutAdmin}>Cerrar sesión</button></div></div>
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
          <label>Descripción<textarea placeholder="Describe el producto" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label>Especificaciones<textarea placeholder="Medidas, formato, material, uso recomendado" value={form.specs} onChange={(event) => setForm({ ...form, specs: event.target.value })} /></label>
          <div className="two"><label>Precio<input type="number" placeholder="29990" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label><label>Stock<input type="number" placeholder="15" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} /></label></div>
          <label className="upload"><ImagePlus size={28} /><span>{form.image ? 'Imagen cargada correctamente' : 'Subir imagen del producto'}</span><input type="file" accept="image/*" onChange={(event) => handleImage(event.target.files[0])} /></label>
          <div className="formActions"><button className="primary">{form.id ? 'Guardar cambios' : 'Publicar producto'}</button>{form.id && <button type="button" className="ghostText" onClick={() => { setForm(emptyForm); setImageFile(null); }}>Cancelar</button>}</div>
        </form>

        <div className="panel inventoryPanel">
          <h2><Edit3 size={22} /> Inventario</h2>
          <div className="inventory">
            {products.map((product) => (
              <div className="inventoryItem" key={product.id}>
                <img src={resolveProductImage(product.image)} alt={product.name} />
                <div><strong>{product.name}</strong><small>{product.category} • {money(product.price)}</small></div>
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
