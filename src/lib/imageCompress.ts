const MAX_IMAGE_EDGE = 1600
const JPEG_QUALITY = 0.85

const RESIZABLE_TYPES = new Set(['image/jpeg', 'image/png'])

function getTargetSize(width: number, height: number) {
  const longestEdge = Math.max(width, height)

  if (longestEdge <= MAX_IMAGE_EDGE) {
    return { width, height, shouldResize: false }
  }

  const scale = MAX_IMAGE_EDGE / longestEdge

  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
    shouldResize: true,
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to decode image'))
    }

    image.src = objectUrl
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise(resolve => {
    if (type === 'image/jpeg') {
      canvas.toBlob(resolve, type, JPEG_QUALITY)
      return
    }

    canvas.toBlob(resolve, type)
  })
}

export async function compressImageFile(file: File): Promise<File> {
  // 이미지가 아니거나 브라우저 디코드 리스크가 있는 포맷은 원본을 그대로 사용한다.
  if (!RESIZABLE_TYPES.has(file.type)) return file

  try {
    // 원본 이미지를 브라우저에서 로드해 실제 가로/세로 크기를 확인한다.
    const image = await loadImage(file)
    const target = getTargetSize(image.naturalWidth, image.naturalHeight)

    // 이미 최대 변 1600px 이하이면 불필요한 재인코딩 없이 원본을 유지한다.
    if (!target.shouldResize) return file

    // 긴 변을 1600px로 맞추고 비율은 그대로 유지해 canvas에 다시 그린다.
    const canvas = document.createElement('canvas')
    canvas.width = target.width
    canvas.height = target.height

    const context = canvas.getContext('2d')
    if (!context) return file

    context.drawImage(image, 0, 0, target.width, target.height)

    // JPEG는 품질 0.85로 저장하고, PNG는 투명도 보존을 위해 PNG 타입으로 리사이즈만 적용한다.
    const blob = await canvasToBlob(canvas, file.type)
    if (!blob) return file

    return new File([blob], file.name, {
      type: file.type,
      lastModified: file.lastModified,
    })
  } catch {
    // 클라이언트 압축 실패가 업로드 실패로 번지지 않도록 원본 파일로 폴백한다.
    return file
  }
}
