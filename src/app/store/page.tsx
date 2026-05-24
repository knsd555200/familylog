'use client'
import { useState } from 'react'
import { products, photoProducts, photoSamples, Product } from '@/data/store'
import { Sparkles, Check, ExternalLink, X, ShoppingCart, ChevronRight } from 'lucide-react'

const TABS = ['전체', '도서', '교육 프로그램', '포토몰', '생필품'] as const
const CATEGORY_MAP: Record<string, Product['category']> = {
  '도서': 'book', '교육 프로그램': 'program', '생필품': 'goods',
}

export default function StorePage() {
  const [tab, setTab] = useState<typeof TABS[number]>('전체')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [addedToCart, setAddedToCart] = useState(false)
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([])
  const [selectedPhotoProduct, setSelectedPhotoProduct] = useState<string | null>(null)
  const [photoStep, setPhotoStep] = useState<'select' | 'product' | 'done'>('select')

  const filteredProducts = tab === '전체' || tab === '포토몰'
    ? products
    : products.filter(p => p.category === CATEGORY_MAP[tab])

  const handleAddToCart = () => {
    setAddedToCart(true)
    setTimeout(() => { setAddedToCart(false); setSelectedProduct(null) }, 1500)
  }

  return (
    <div className="max-w-2xl mx-auto pb-20 lg:pb-6">
      {/* Tabs */}
      <div className="sticky top-14 lg:top-0 z-20 bg-brand-bg/95 backdrop-blur-sm border-b border-brand-line">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide px-4 lg:px-6 py-3">
          {TABS.map(t => (
            <button key={t} onClick={() => { setTab(t); setPhotoStep('select'); setSelectedPhotos([]); setSelectedPhotoProduct(null) }}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${tab === t ? 'bg-brand-text text-white' : 'bg-brand-card text-brand-sub'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 lg:px-6 py-4">
        {/* Featured banner */}
        {tab === '전체' && (
          <div className="mb-5 bg-gradient-to-br from-brand-green to-brand-green-dark rounded-3xl p-5 text-white">
            <div className="text-xs font-medium opacity-80 mb-1">패밀로그 스토어</div>
            <h2 className="font-serif font-bold text-xl mb-2">가정을 위한 큐레이션</h2>
            <p className="text-sm opacity-90 leading-relaxed">도서, 교육 프로그램, 가족 사진까지<br />가정 성장에 필요한 모든 것을 모았어요</p>
          </div>
        )}

        {/* PhotoMall */}
        {tab === '포토몰' && (
          <div className="space-y-4">
            {photoStep === 'select' && (
              <>
                <div className="bg-brand-green-light rounded-2xl p-4 flex items-start gap-3">
                  <Sparkles size={18} className="text-brand-green mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-brand-green-dark">AI가 가족 사진을 자동 선별했어요</div>
                    <p className="text-xs text-brand-green-dark/70 mt-1 leading-relaxed">업로드된 사진 중 가족이 함께 있는 베스트 컷만 골라드렸어요.</p>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-medium text-sm">자동 필터링된 사진 ({photoSamples.length}장)</h2>
                    <span className="text-xs text-brand-green font-medium">{selectedPhotos.length}장 선택</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {photoSamples.map(src => {
                      const sel = selectedPhotos.includes(src)
                      return (
                        <button key={src} onClick={() => setSelectedPhotos(prev => sel ? prev.filter(s => s !== src) : [...prev, src])}
                          className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${sel ? 'border-brand-green' : 'border-transparent'}`}>
                          <img src={src} alt="" className="w-full h-full object-cover" />
                          {sel && (
                            <div className="absolute inset-0 bg-brand-green/30 flex items-center justify-center">
                              <div className="w-7 h-7 bg-brand-green rounded-full flex items-center justify-center">
                                <Check size={14} className="text-white" strokeWidth={3} />
                              </div>
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <button onClick={() => setPhotoStep('product')} disabled={selectedPhotos.length === 0}
                  className={`w-full py-3.5 rounded-2xl font-medium text-sm ${selectedPhotos.length > 0 ? 'bg-brand-green text-white' : 'bg-brand-card text-brand-muted'}`}>
                  다음: 제품 선택 ({selectedPhotos.length}장)
                </button>
              </>
            )}
            {photoStep === 'product' && (
              <>
                <button onClick={() => setPhotoStep('select')} className="text-xs text-brand-muted">← 사진 다시 선택</button>
                <h2 className="font-medium text-base">어떤 제품으로 만들까요?</h2>
                <div className="grid grid-cols-2 gap-3">
                  {photoProducts.map(p => (
                    <button key={p.id} onClick={() => setSelectedPhotoProduct(p.id)}
                      className={`text-left bg-white rounded-2xl border-2 overflow-hidden ${selectedPhotoProduct === p.id ? 'border-brand-green' : 'border-brand-line'}`}>
                      <img src={p.image} alt={p.name} className="w-full aspect-square object-cover" />
                      <div className="p-3">
                        <div className="font-medium text-sm">{p.name}</div>
                        <div className="text-[11px] text-brand-muted mt-0.5">{p.description}</div>
                        <div className="font-bold text-sm mt-1.5">{p.price.toLocaleString()}원</div>
                      </div>
                    </button>
                  ))}
                </div>
                <button onClick={() => setPhotoStep('done')} disabled={!selectedPhotoProduct}
                  className={`w-full py-3.5 rounded-2xl font-medium text-sm ${selectedPhotoProduct ? 'bg-brand-green text-white' : 'bg-brand-card text-brand-muted'}`}>
                  주문하기
                </button>
              </>
            )}
            {photoStep === 'done' && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-brand-green-light rounded-full flex items-center justify-center">
                  <Check size={32} className="text-brand-green" strokeWidth={3} />
                </div>
                <h2 className="font-medium text-lg mb-2">주문이 완료되었어요</h2>
                <p className="text-sm text-brand-sub mb-6">3~5일 내 배송될 예정이에요.</p>
                <button onClick={() => { setPhotoStep('select'); setSelectedPhotos([]); setSelectedPhotoProduct(null) }}
                  className="px-6 py-2.5 bg-brand-green text-white rounded-full text-sm">스토어로 돌아가기</button>
              </div>
            )}
          </div>
        )}

        {/* Product grid */}
        {tab !== '포토몰' && (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map(p => (
              <button key={p.id} onClick={() => setSelectedProduct(p)} className="text-left bg-white rounded-2xl border border-brand-line overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative aspect-square">
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                  {p.isCoupang && (
                    <span className="absolute top-2 left-2 text-[9px] font-medium px-1.5 py-0.5 bg-white/90 backdrop-blur-sm rounded text-brand-sub">쿠팡 파트너스</span>
                  )}
                </div>
                <div className="p-3">
                  <div className="text-[10px] text-brand-muted mb-0.5">
                    {p.category === 'book' ? '도서' : p.category === 'program' ? '교육 프로그램' : '생필품'}
                  </div>
                  <div className="font-medium text-sm leading-snug mb-1 line-clamp-2">{p.name}</div>
                  <p className="text-[11px] text-brand-sub line-clamp-1 leading-relaxed mb-2">{p.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-sm">{p.price.toLocaleString()}원</div>
                    <ChevronRight size={14} className="text-brand-muted" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product detail bottom sheet */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-end animate-fade-in" onClick={() => setSelectedProduct(null)}>
          <div className="bg-white w-full max-w-lg mx-auto rounded-t-3xl overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex">
              <img src={selectedProduct.image} alt={selectedProduct.name} className="w-36 h-36 object-cover flex-shrink-0" />
              <div className="flex-1 p-4">
                <div className="text-[10px] text-brand-muted mb-1">
                  {selectedProduct.category === 'book' ? '도서' : selectedProduct.category === 'program' ? '교육 프로그램' : '생필품'}
                </div>
                <h2 className="font-medium text-base leading-snug mb-1">{selectedProduct.name}</h2>
                <p className="text-[11px] text-brand-sub leading-relaxed line-clamp-2">{selectedProduct.description}</p>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 p-1 text-brand-muted">
                <X size={20} />
              </button>
            </div>
            <div className="px-5 py-4 border-t border-brand-line">
              <p className="text-sm text-brand-sub leading-relaxed mb-4">{selectedProduct.detail}</p>
              <div className="flex items-center justify-between mb-4">
                <div className="text-xl font-bold">{selectedProduct.price.toLocaleString()}원</div>
                {selectedProduct.isCoupang && (
                  <span className="text-[10px] text-brand-muted flex items-center gap-1"><ExternalLink size={10} /> 쿠팡으로 이동</span>
                )}
              </div>
              {addedToCart ? (
                <div className="w-full py-3.5 bg-brand-green-light text-brand-green-dark rounded-2xl font-medium text-sm text-center flex items-center justify-center gap-2">
                  <Check size={16} strokeWidth={3} /> 장바구니에 담겼어요
                </div>
              ) : (
                <button onClick={handleAddToCart}
                  className="w-full py-3.5 bg-brand-green text-white rounded-2xl font-medium text-sm flex items-center justify-center gap-2">
                  <ShoppingCart size={16} /> 구매하기
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
