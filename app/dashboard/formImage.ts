import { validateImage } from "@/lib/storeValidation"

// Reads an optional image upload from the form. A missing or empty file input means "no image".
export async function readImageField(
  formData: FormData,
  name: "logo" | "header" | "image",
): Promise<ReturnType<typeof validateImage>> {
  const file = formData.get(name)
  if (!(file instanceof File)) return { ok: true, image: null }
  return validateImage(new Uint8Array(await file.arrayBuffer()))
}
