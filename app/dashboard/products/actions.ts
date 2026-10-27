"use server"

import { revalidatePath } from "next/cache"
import { notFound, redirect } from "next/navigation"
import {
  MAX_IMAGES_PER_PRODUCT,
  MAX_PRODUCTS_PER_STORE,
  parseHalfWidthInteger,
  validateProductFields,
  type ProductFieldErrors,
} from "@/lib/productValidation"
import { requireSub } from "@/lib/session"
import {
  addProductImage,
  createProduct,
  deleteProduct,
  makeProductImageFirst,
  removeProductImage,
  setProductPublished,
  updateProduct,
} from "@/services/productService"
import { getOwnStore } from "@/services/storeService"
import { deps } from "../deps"
import { readImageField } from "../formImage"

export type ProductFormState = {
  errors?: ProductFieldErrors
  values?: { name: string; description: string; price: string; stock: string }
  message?: string
  saved?: boolean
}

const SAVE_FAILED = "保存できませんでした。時間をおいてもう一度お試しください。"
const PRODUCT_LIMIT = `商品は ${MAX_PRODUCTS_PER_STORE} 件までです`
const IMAGE_LIMIT = `画像は ${MAX_IMAGES_PER_PRODUCT} 枚までです`
const STOCK_CHANGED = "在庫が注文で変わりました。画面を更新してください"

function text(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === "string" ? value : ""
}

async function revalidateProduct(sub: string, productId: string) {
  revalidatePath("/dashboard/products")
  revalidatePath(`/dashboard/products/${productId}`)
  const store = await getOwnStore(deps(), sub)
  if (store) {
    revalidatePath(`/s/${store.slug}`)
    revalidatePath(`/s/${store.slug}/products/${productId}`)
  }
}

export async function createProductAction(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const sub = await requireSub()
  const values = {
    name: text(formData, "name"),
    description: text(formData, "description"),
    price: text(formData, "price"),
    stock: text(formData, "stock"),
  }
  const fields = validateProductFields(values)
  if (!fields.ok) return { errors: fields.errors, values }

  let result
  try {
    result = await createProduct(deps(), sub, fields.value)
  } catch (error) {
    console.error("createProductAction failed", error)
    return { message: SAVE_FAILED, values }
  }
  if (!result.ok) {
    if (result.code === "no_store") redirect("/dashboard")
    return { message: PRODUCT_LIMIT, values }
  }
  await revalidateProduct(sub, result.product.id)
  redirect(`/dashboard/products/${result.product.id}`)
}

export async function updateProductAction(
  productId: string,
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const sub = await requireSub()
  const values = {
    name: text(formData, "name"),
    description: text(formData, "description"),
    price: text(formData, "price"),
    stock: text(formData, "stock"),
  }
  // 編集フォームを開いたときの在庫数。読めなければ在庫が変わったものとして扱う
  const stockBase = parseHalfWidthInteger(text(formData, "stockBase"))
  if (stockBase === null) return { message: STOCK_CHANGED, values }
  const fields = validateProductFields(values, { stockBase })
  if (!fields.ok) return { errors: fields.errors, values }

  let result
  try {
    result = await updateProduct(deps(), sub, productId, fields.value, stockBase)
  } catch (error) {
    console.error("updateProductAction failed", error)
    return { message: SAVE_FAILED, values }
  }
  if (!result.ok) {
    if (result.code === "not_found") notFound()
    // 再読み込みしないことで、入力した値とこの案内を残す
    return { message: STOCK_CHANGED, values }
  }
  await revalidateProduct(sub, productId)
  return { saved: true }
}

export async function setProductPublishedAction(productId: string, formData: FormData): Promise<void> {
  const sub = await requireSub()
  const product = await setProductPublished(deps(), sub, productId, formData.get("publish") === "true")
  if (!product) notFound()
  await revalidateProduct(sub, productId)
}

export async function addProductImageAction(
  productId: string,
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const sub = await requireSub()
  const parsed = await readImageField(formData, "image")
  if (!parsed.ok) return { error: parsed.error }
  if (parsed.image === null) return { error: "画像を選んでください" }

  let result
  try {
    result = await addProductImage(deps(), sub, productId, parsed.image)
  } catch (error) {
    console.error("addProductImageAction failed", error)
    return { error: SAVE_FAILED }
  }
  if (!result.ok) {
    if (result.code === "not_found") notFound()
    return { error: IMAGE_LIMIT }
  }
  await revalidateProduct(sub, productId)
  return {}
}

export async function removeProductImageAction(productId: string, imageId: string): Promise<void> {
  const sub = await requireSub()
  const product = await removeProductImage(deps(), sub, productId, imageId)
  if (!product) notFound()
  await revalidateProduct(sub, productId)
}

export async function makeProductImageFirstAction(productId: string, imageId: string): Promise<void> {
  const sub = await requireSub()
  const product = await makeProductImageFirst(deps(), sub, productId, imageId)
  if (!product) notFound()
  await revalidateProduct(sub, productId)
}

export async function deleteProductAction(productId: string): Promise<void> {
  const sub = await requireSub()
  const store = await getOwnStore(deps(), sub)
  const deleted = await deleteProduct(deps(), sub, productId)
  if (!deleted) notFound()
  revalidatePath("/dashboard/products")
  if (store) {
    revalidatePath(`/s/${store.slug}`)
    revalidatePath(`/s/${store.slug}/products/${productId}`)
  }
  redirect("/dashboard/products")
}
