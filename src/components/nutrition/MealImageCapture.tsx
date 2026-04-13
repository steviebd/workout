import { Camera, Upload } from 'lucide-react'
import { useRef, useCallback } from 'react'
import { Button } from '@/components/ui/Button'

interface MealImageCaptureProps {
  onCapture: (base64: string) => void
}

const MAX_SIZE_BYTES = 2 * 1024 * 1024

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img

        if (file.size > MAX_SIZE_BYTES) {
          const scale = Math.sqrt(MAX_SIZE_BYTES / file.size)
          width = Math.round(width * scale)
          height = Math.round(height * scale)
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        const base64 = canvas.toDataURL('image/jpeg', 0.85)
        resolve(base64)
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

export function MealImageCapture({ onCapture }: MealImageCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      console.error('Selected file is not an image')
      return
    }
    try {
      const base64 = await compressImage(file)
      onCapture(base64)
    } catch (err) {
      console.error('Failed to process image:', err)
    }
  }, [onCapture])

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    void handleFileSelect(e.target.files?.[0])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleCameraInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    void handleFileSelect(e.target.files?.[0])
    if (cameraInputRef.current) {
      cameraInputRef.current.value = ''
    }
  }

  return (
    <div className="flex gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraInputChange}
        className="hidden"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        className="flex-1"
      >
        <Upload className="h-4 w-4 mr-2" />
        Upload
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => cameraInputRef.current?.click()}
        className="flex-1"
      >
        <Camera className="h-4 w-4 mr-2" />
        Camera
      </Button>
    </div>
  )
}
