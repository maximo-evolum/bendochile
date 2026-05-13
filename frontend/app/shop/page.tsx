
export default function ShopPage() {
  return (
    <main style={{padding:'40px',fontFamily:'sans-serif'}}>
      <h1>Tienda NOVA Market</h1>

      <div style={{
        display:'grid',
        gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',
        gap:'24px',
        marginTop:'40px'
      }}>
        <div style={{
          border:'1px solid #eee',
          borderRadius:'20px',
          padding:'20px'
        }}>
          <h2>Taladro Premium</h2>
          <p>$89.990</p>
          <button>Comprar</button>
        </div>

        <div style={{
          border:'1px solid #eee',
          borderRadius:'20px',
          padding:'20px'
        }}>
          <h2>Kit Herramientas</h2>
          <p>$59.990</p>
          <button>Comprar</button>
        </div>
      </div>
    </main>
  );
}
