import { redirect } from "next/navigation"

// Anyone can browse without signing in, so the top page is the store list.
// Sign-in starts from the header, or when buying or opening the order history.
export default function Page() {
  redirect("/stores")
}
