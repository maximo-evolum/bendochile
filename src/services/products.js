
export const API_URL = ''

async function safeJson(response) {
  const text = await response.text()

  let data = null

  try {
    data = text ? JSON.parse(text) : null
  } catch (error) {
    throw new Error(`Respuesta inválida del servidor`)
  }

  if (!response.ok) {
    throw new Error(data?.message || 'Error servidor')
  }

  return data
}

export function isSupabaseConfigured() {
  return false
}

export function resolveProductImage(product) {
  const image =
    product?.image ||
    product?.imageUrl ||
    product?.img ||
    ''

  if (!image || image.trim() === '') {
    return 'https://via.placeholder.com/600x600?text=BENDO'
  }

  // URL externa
  if (
    image.startsWith('http://') ||
    image.startsWith('https://')
  ) {
    return image
  }

  // Limpieza de rutas Windows/fakepath
  let cleanPath = image
    .replace(/\\/g, '/')
    .replace(/^C:\\/i, '')
    .replace(/^fakepath\//i, '')
    .replace(/^\/+/, '')

  // Si solo viene nombre archivo
  if (
    !cleanPath.startsWith('uploads/')
  ) {
    cleanPath = `uploads/${cleanPath}`
  }

  return `${window.location.origin}/${cleanPath}`
}

export async function getProducts() {
  const res = await fetch('/api/products')
  return await safeJson(res)
}

export async function saveProduct(product = {}) {
  // normalizar imagen
  if (product.image) {
    const imageName = product.image
      .split('/')
      .pop()
      .split('\\')
      .pop()

    product.image = `uploads/${imageName}`
  }

  const hasId = Boolean(product?.id)

  const res = await fetch(
    hasId ? `/api/products/${product.id}` : '/api/products',
    {
      method: hasId ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(product)
    }
  )

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

  const product =
    products.find((item) => String(item.id) === String(id)) || {}

  return await saveProduct({
    ...product,
    stock
  })
}

export function subscribeToProducts(callback) {
  let active = true

  async function load() {
    try {
      const products = await getProducts()

      if (active && typeof callback === 'function') {
        callback(products)
      }
    } catch (error) {
      console.warn(error)
    }
  }

  load()

  const interval = setInterval(load, 5000)

  return () => {
    active = false
    clearInterval(interval)
  }
}
