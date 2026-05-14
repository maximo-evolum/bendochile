export const API_URL = ''

async function safeJson(response) {
  const text = await response.text()

  let data = null

  try {
    data = text ? JSON.parse(text) : null
  } catch (error) {
    throw new Error('Respuesta inválida del servidor')
  }

  if (!response.ok) {
    throw new Error(data?.message || 'Error servidor')
  }

  return data
}

export function isSupabaseConfigured() {
  return false
}

export function resolveProductImage(image) {
  const rawImage = image || ''

  if (!rawImage || rawImage.trim() === '') {
    return '/uploads/no-image.png'
  }

  // Base64
  if (rawImage.startsWith('data:image')) {
    return rawImage
  }

  // URLs externas
  if (
    rawImage.startsWith('http://') ||
    rawImage.startsWith('https://')
  ) {
    return rawImage
  }

  // Ya absoluta
  if (rawImage.startsWith('/')) {
    return rawImage
  }

  // limpiar nombre archivo
  const imageName = rawImage
    .split('?')[0]
    .split('/')
    .pop()
    .split('\\')
    .pop()

  return `/uploads/${imageName}`
}

export async function getProducts() {
  const res = await fetch('/api/products')
  return await safeJson(res)
}

export async function getPublicFallbackProducts() {
  return []
}

export async function saveProduct(product = {}) {

  // normalizar imagen
  if (product.image) {

    // Base64
    if (product.image.startsWith('data:image')) {
      // dejar intacto
    }

    // URL externa
    else if (
      product.image.startsWith('http://') ||
      product.image.startsWith('https://')
    ) {
      // dejar intacto
    }

    // imagen local
    else {
      const imageName = product.image
        .split('?')[0]
        .split('/')
        .pop()
        .split('\\')
        .pop()

      product.image = `/uploads/${imageName}`
    }
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


export function normalizeGallery(gallery) {
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
