"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { SAVE_FAILED, text } from "@/lib/formData"
import { requireSub } from "@/lib/session"
import { validateStoreFields, type FieldErrors } from "@/lib/storeValidation"
import { deps } from "@/services/deps"
import {
  createStore,
  setPublished,
  updateStore,
  type ImageInput,
} from "@/services/storeService"
import { readImageField } from "./formImage"

export type StoreFormState = {
  errors?: FieldErrors
  values?: {
    name: string
    description: string
    themeColor: string
    paymentInstructions: string
    contactEmail: string
  }
  message?: string
  saved?: boolean
}

// Validates everything the service trusts: text fields and both image uploads.
async function parseStoreForm(formData: FormData) {
  const values = {
    name: text(formData, "name"),
    description: text(formData, "description"),
    themeColor: text(formData, "themeColor"),
    paymentInstructions: text(formData, "paymentInstructions"),
    contactEmail: text(formData, "contactEmail"),
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
  const parsed = await parseStoreForm(formData)
  if (!parsed.ok) return { errors: parsed.errors, values: parsed.values }

  let result
  try {
    result = await createStore(deps(), sub, {
      fields: parsed.fields,
      logo: parsed.logo,
      header: parsed.header,
    })
  } catch (error) {
    console.error("createStoreAction failed", error)
    return { message: SAVE_FAILED, values: parsed.values }
  }
  if (!result.ok) {
    if (result.code === "invalid") return { errors: result.errors, values: parsed.values }
    redirect("/dashboard") // already_exists: ほかの人が先にお店を作った
  }
  revalidatePath("/", "layout")
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
  revalidatePath("/", "layout")
  return { saved: true }
}

export async function setPublishedAction(formData: FormData): Promise<void> {
  const sub = await requireSub()
  const store = await setPublished(deps(), sub, formData.get("publish") === "true")
  if (store) revalidatePath("/", "layout")
}
