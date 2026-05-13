
export async function getProducts() {
  const res = await fetch('/api/products');
  return await res.json();
}

export async function loginAdmin(payload) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  return await res.json();
}

export async function createProduct(payload) {
  const res = await fetch('/api/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  return await res.json();
}
