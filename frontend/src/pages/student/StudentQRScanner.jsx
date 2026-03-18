import { useEffect, useRef, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"

export default function StudentQRScanner({ onSuccess }) {
  const scannerRef = useRef(null)
  const hasScannedRef = useRef(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const scanner = new Html5Qrcode("reader")
    scannerRef.current = scanner

    const startScanner = async () => {
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 250 },
          async (decodedText) => {
            if (hasScannedRef.current) return

            try {
              const data = JSON.parse(decodedText)

              if (!data.session_id) {
                setError("Invalid QR Code")
                return
              }

              hasScannedRef.current = true

              if (scanner.getState() === 2) {
                await scanner.stop()
              }

              onSuccess(data)

            } catch {
              setError("Invalid QR Format")
            }
          }
        )
      } catch {
        setError("Camera access denied or unavailable")
      }
    }

    startScanner()

    return () => {
      if (
        scannerRef.current &&
        scannerRef.current.getState() === 2
      ) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [onSuccess])

  return (
    <div className="text-center">
      <div id="reader" className="w-full max-w-md mx-auto" />
      {error && <p className="text-red-600 mt-4">{error}</p>}
    </div>
  )
}