
'use client';

export default function LoginPage() {
  return (
    <main style={{
      minHeight:'100vh',
      display:'flex',
      alignItems:'center',
      justifyContent:'center',
      background:'#f5f5f3',
      fontFamily:'sans-serif'
    }}>
      <div style={{
        width:'380px',
        background:'white',
        padding:'40px',
        borderRadius:'24px',
        boxShadow:'0 10px 30px rgba(0,0,0,0.08)'
      }}>
        <h1 style={{marginBottom:'24px'}}>Panel Administrador</h1>

        <input
          placeholder="Usuario"
          style={{
            width:'100%',
            padding:'14px',
            marginBottom:'16px',
            borderRadius:'12px',
            border:'1px solid #ddd'
          }}
        />

        <input
          type="password"
          placeholder="Contraseña"
          style={{
            width:'100%',
            padding:'14px',
            marginBottom:'20px',
            borderRadius:'12px',
            border:'1px solid #ddd'
          }}
        />

        <button style={{
          width:'100%',
          padding:'14px',
          border:'none',
          borderRadius:'12px',
          background:'#2E5E4E',
          color:'white',
          cursor:'pointer'
        }}>
          Ingresar
        </button>
      </div>
    </main>
  );
}
