"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireSub } from "@/lib/session"
import { validateSlug, validateStoreFields, type FieldErrors } from "@/lib/storeValidation"
import {
  createStore,
  deleteStore,
  setPublished,
  updateStore,
  type ImageInput,
} from "@/services/storeService"
import { deps } from "./deps"
import { readImageField } from "./formImage"

export type StoreFormState = {
  errors?: FieldErrors
  values?: { slug?: string; name: string; description: string; themeColor: string }
  message?: string
  saved?: boolean
}

const SAVE_FAILED = "保存できませんでした。時間をおいてもう一度お試しください。"

function text(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === "string" ? value : ""
}

// Validates everything the service trusts: text fields and both image uploads.
async function parseStoreForm(formData: FormData) {
  const values = {
    name: text(formData, "name"),
    description: text(formData, "description"),
    themeColor: text(formData, "themeColor"),
  }
  const fields = validateStoreFields(values)
  const logo = await readImageField(formData, "logo")
  const header = await readImageField(formData, "header")
  const errors: FieldErrors = fields.ok ? {} : { ...fields.errors }
  if (!logo.ok) errors.logo = logo.error
  if (!header.ok) errors.header = header.error
  if (!fields.ok || !logo.ok || !header.ok) {
    return { ok: false as const, values, errors }
  }
  return {
    ok: true as const,
    values,
    fields: fields.value,
    logo: logo.image as ImageInput,
    header: header.image as ImageInput,
  }
}

export async function createStoreAction(
  _prev: StoreFormState,
  formData: FormData,
): Promise<StoreFormState> {
  const sub = await requireSub()
  const rawSlug = text(formData, "slug")
  const parsed = await parseStoreForm(formData)
  const slug = validateSlug(rawSlug)
  if (!parsed.ok || !slug.ok) {
    const errors: FieldErrors = { ...(parsed.ok ? {} : parsed.errors) }
    if (!slug.ok) errors.slug = slug.error
    return { errors, values: { slug: rawSlug, ...parsed.values } }
  }

  let result
  try {
    result = await createStore(deps(), sub, {
      slug: slug.slug,
      fields: parsed.fields,
      logo: parsed.logo,
      header: parsed.header,
    })
  } catch (error) {
    console.error("createStoreAction failed", error)
    return { message: SAVE_FAILED, values: { slug: rawSlug, ...parsed.values } }
  }
  if (!result.ok) {
    if (result.code === "invalid") {
      return { errors: result.errors, values: { slug: rawSlug, ...parsed.values } }
    }
    redirect("/dashboard") // already_has_store
  }
  revalidatePath("/dashboard")
  redirect("/dashboard")
}

export async function updateStoreAction(
  _prev: StoreFormState,
  formData: FormData,
): Promise<StoreFormState> {
  const sub = await requireSub()
  const parsed = await parseStoreForm(formData)
  if (!parsed.ok) return { errors: parsed.errors, values: parsed.values }

  let result
  try {
    result = await updateStore(deps(), sub, {
      fields: parsed.fields,
      logo: parsed.logo,
      header: parsed.header,
      removeLogo: formData.get("removeLogo") === "on",
      removeHeader: formData.get("removeHeader") === "on",
    })
  } catch (error) {
    console.error("updateStoreAction failed", error)
    return { message: SAVE_FAILED, values: parsed.values }
  }
  if (!result.ok) {
    if (result.code === "invalid") return { errors: result.errors, values: parsed.values }
    redirect("/dashboard") // not_found
  }
  revalidatePath("/dashboard")
  revalidatePath("/s/" + result.store.slug)
  return { saved: true }
}

export async function setPublishedAction(formData: FormData): Promise<void> {
  const sub = await requireSub()
  const store = await setPublished(deps(), sub, formData.get("publish") === "true")
  revalidatePath("/dashboard")
  if (store) revalidatePath("/s/" + store.slug)
}

export async function deleteStoreAction(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const sub = await requireSub()
  const store = await prisma.store.findUnique({ where: { ownerSub: sub }, select: { slug: true } })
  const result = await deleteStore(deps(), sub, text(formData, "confirmSlug"))
  if (!result.ok && result.code === "confirm_mismatch") {
    return { error: "ストア ID が一致しません" }
  }
  revalidatePath("/dashboard")
  if (store) revalidatePath("/s/" + store.slug)
  return {}
}
