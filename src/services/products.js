export const API_URL = ''

async function safeJson(response) {
  const text = await response.text()

  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch (error) {
    throw new Error(`Respuesta inválida del servidor: ${text.slice(0, 160)}`)
  }

  if (!response.ok) {
    throw new Error(data?.message || data?.error || 'Error en la solicitud')
  }

  return data
}

export function isSupabaseConfigured() {
  return false
}

export function resolveProductImage(product) {
  return (
    product?.image ||
    product?.imageUrl ||
    product?.img ||
    'https://via.placeholder.com/600x600?text=BENDO'
  )
}

export async function getProducts() {
  const res = await fetch('/api/products')
  const data = await safeJson(res)
  return Array.isArray(data) ? data : []
}

export async function getPublicFallbackProducts() {
  return []
}

export async function saveProduct(product = {}) {
  const hasId = Boolean(product?.id)
  const res = await fetch(hasId ? `/api/products/${product.id}` : '/api/products', {
    method: hasId ? 'PUT' : 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(product)
  })

  return await safeJson(res)
}

export async function createProduct(product = {}) {
  return await saveProduct(product)
}

export async function updateProduct(id, product = {}) {
  return await saveProduct({ ...product, id })
}

export async function deleteProductById(id) {
  const res = await fetch(`/api/products/${id}`, {
    method: 'DELETE'
  })

  return await safeJson(res)
}

export async function deleteProduct(id) {
  return await deleteProductById(id)
}

export async function updateProductStock(id, stock) {
  const products = await getProducts()
  const product = products.find((item) => String(item.id) === String(id)) || {}

  return await saveProduct({
    ...product,
    id,
    stock
  })
}

export function subscribeToProducts(callback) {
  let cancelled = false

  async function load() {
    try {
      const products = await getProducts()
      if (!cancelled && typeof callback === 'function') {
        callback(products)
      }
    } catch (error) {
      console.warn('No se pudieron cargar productos:', error.message)
    }
  }

  load()
  const interval = setInterval(load, 5000)

  return () => {
    cancelled = true
    clearInterval(interval)
  }
}

export async function loginAdmin(credentials = {}) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(credentials)
  })

  return await safeJson(res)
}
