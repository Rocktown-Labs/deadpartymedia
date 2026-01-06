"use client"

import { ShoppingBag, X, Plus, Minus, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useFormStatus } from "react-dom"
import { redirectToCheckout, removeItem, updateItemQuantity } from "@/app/cart/actions"
import { useCart } from "./cart-context"
import Image from "next/image"
import { DEFAULT_OPTION } from "@/lib/constants"

function CheckoutButton() {
  const { pending } = useFormStatus()

  return (
    <button
      className="w-full rounded-lg bg-[#7CFC00] p-4 text-center text-sm font-bold text-black hover:bg-[#7CFC00]/90 disabled:opacity-50 uppercase tracking-wider transition-colors"
      type="submit"
      disabled={pending}
    >
      {pending ? "Processing..." : "Proceed to Checkout"}
    </button>
  )
}

export default function CartModal() {
  const { cart, updateCartItem } = useCart()
  const [isOpen, setIsOpen] = useState(false)
  const quantityRef = useRef(cart?.totalQuantity)

  useEffect(() => {
    if (cart?.totalQuantity && cart?.totalQuantity !== quantityRef.current && cart?.totalQuantity > 0) {
      if (!isOpen) {
        setIsOpen(true)
      }
      quantityRef.current = cart?.totalQuantity
    }
  }, [isOpen, cart?.totalQuantity, quantityRef])

  const openCart = () => setIsOpen(true)
  const closeCart = () => setIsOpen(false)

  return (
    <>
      {/* Cart Button */}
      <button
        onClick={openCart}
        className="relative flex h-11 w-11 items-center justify-center rounded-lg border border-gray-800 hover:border-[#7CFC00] transition-colors"
        aria-label="Open cart"
      >
        <ShoppingBag className="h-5 w-5" />
        {cart?.totalQuantity ? (
          <div className="absolute -right-2 -top-2 h-5 w-5 rounded-full bg-[#7CFC00] text-[11px] font-bold text-black flex items-center justify-center">
            {cart.totalQuantity}
          </div>
        ) : null}
      </button>

      {/* Cart Modal */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" onClick={closeCart} />

          {/* Slide-in Panel */}
          <div className="fixed right-0 top-0 h-full w-full md:w-[420px] bg-[#0A0A0A] border-l border-gray-800 z-[300] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold">Cart</h2>
              <button onClick={closeCart} className="p-2 hover:bg-gray-900 rounded-lg transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            {!cart || cart.lines.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6">
                <ShoppingBag className="h-16 w-16 text-gray-600 mb-4" />
                <p className="text-xl font-bold mb-2">Your cart is empty</p>
                <p className="text-gray-400 text-sm">Add some items to get started</p>
              </div>
            ) : (
              <>
                {/* Cart Items */}
                <div className="flex-1 overflow-auto p-6">
                  <div className="space-y-4">
                    {cart.lines.map((item) => (
                      <div key={item.id} className="flex gap-4 border-b border-gray-800 pb-4">
                        {/* Product Image */}
                        <div className="relative w-20 h-20 flex-shrink-0 bg-gray-900 rounded-lg overflow-hidden">
                          <Image
                            src={item.merchandise.product.featuredImage.url || "/placeholder.svg"}
                            alt={item.merchandise.product.title}
                            fill
                            className="object-cover"
                          />
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm mb-1 truncate">{item.merchandise.product.title}</h3>
                          {item.merchandise.title !== DEFAULT_OPTION && (
                            <p className="text-xs text-gray-400 mb-2">{item.merchandise.title}</p>
                          )}

                          {/* Quantity Controls */}
                          <div className="flex items-center gap-3">
                            <div className="flex items-center border border-gray-800 rounded-lg">
                              <button
                                onClick={() => {
                                  updateCartItem(item.merchandise.id, "minus")
                                  updateItemQuantity(null, {
                                    merchandiseId: item.merchandise.id,
                                    quantity: item.quantity - 1,
                                  })
                                }}
                                className="p-2 hover:bg-gray-900 transition-colors"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="px-3 text-sm font-medium">{item.quantity}</span>
                              <button
                                onClick={() => {
                                  updateCartItem(item.merchandise.id, "plus")
                                  updateItemQuantity(null, {
                                    merchandiseId: item.merchandise.id,
                                    quantity: item.quantity + 1,
                                  })
                                }}
                                className="p-2 hover:bg-gray-900 transition-colors"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>

                            <button
                              onClick={() => {
                                updateCartItem(item.merchandise.id, "delete")
                                removeItem(null, item.merchandise.id)
                              }}
                              className="p-2 hover:bg-red-900/20 text-red-500 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold">${item.cost.totalAmount.amount}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-800 p-6 space-y-4">
                  {/* Totals */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-400">
                      <span>Subtotal</span>
                      <span>${cart.cost.subtotalAmount.amount}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Shipping</span>
                      <span>Calculated at checkout</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Taxes</span>
                      <span>Calculated at checkout</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-800">
                      <span>Total</span>
                      <span className="text-[#7CFC00]">${cart.cost.totalAmount.amount}</span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <form action={() => redirectToCheckout(cart.currency)}>
                    <CheckoutButton />
                  </form>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </>
  )
}
