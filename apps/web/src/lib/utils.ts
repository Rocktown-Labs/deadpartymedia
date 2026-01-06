import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(amount: string | number, currency = "USD") {
  const numAmount = typeof amount === "string" ? Number.parseFloat(amount) : amount
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(numAmount)
}

export function createUrl(pathname: string, params: URLSearchParams | string) {
  const paramsString = params.toString()
  const queryString = paramsString.length ? `?${paramsString}` : ""
  return `${pathname}${queryString}`
}
