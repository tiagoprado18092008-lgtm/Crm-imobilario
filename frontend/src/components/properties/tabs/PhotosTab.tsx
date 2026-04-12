import React, { useState, useRef, useCallback } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { X, Upload } from 'lucide-react'
import type { PropertyPhoto } from '../../../types'
import { uploadPhoto, deletePhoto, reorderPhotos, updatePhoto } from '../../../api/properties.api'
import { useUIStore } from '../../../store/ui.store'

const CATEGORIAS = ['Exterior', 'Sala', 'Cozinha', 'Quarto', 'Casa de banho', 'Outro']

interface SortablePhotoProps {
  photo: PropertyPhoto
  onDelete: (id: string) => void
  onCategoriaChange: (id: string, cat: string) => void
  onClick: () => void
  apiBase: string
}

const SortablePhoto: React.FC<SortablePhotoProps> = ({ photo, onDelete, onCategoriaChange, onClick, apiBase }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  const src = photo.url.startsWith('http') ? photo.url : `${apiBase}${photo.url}`

  return (
    <div ref={setNodeRef} style={{ ...style, position: 'relative', borderRadius: 10, overflow: 'hidden', border: '2px solid var(--border-color)', aspectRatio: '4/3', cursor: 'grab' }}>
      <img
        src={src}
        alt=""
        onClick={onClick}
        {...attributes}
        {...listeners}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(photo.id) }}
        style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
      >
        <X size={12} />
      </button>
      <select
        value={photo.categoria ?? ''}
        onChange={e => onCategoriaChange(photo.id, e.target.value)}
        onClick={e => e.stopPropagation()}
        style={{ position: 'absolute', bottom: 4, left: 4, right: 4, fontSize: 11, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 4px' }}
      >
        <option value="">Categoria...</option>
        {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  )
}

interface Props {
  propertyId: string
  photos: PropertyPhoto[]
  onChange: (photos: PropertyPhoto[]) => void
}

export const PhotosTab: React.FC<Props> = ({ propertyId, photos, onChange }) => {
  const { showToast } = useUIStore()
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const apiBase = (import.meta as any).env?.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:3000'

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleFiles = useCallback(async (files: FileList) => {
    if (photos.length + files.length > 30) {
      showToast('Máximo de 30 fotos', 'error'); return
    }
    setUploading(true)
    try {
      const results: PropertyPhoto[] = []
      for (const file of Array.from(files)) {
        const res = await uploadPhoto(propertyId, file)
        results.push(res.data)
      }
      onChange([...photos, ...results])
    } catch {
      showToast('Erro ao fazer upload', 'error')
    } finally {
      setUploading(false)
    }
  }, [photos, propertyId])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
  }

  const handleDelete = async (photoId: string) => {
    try {
      await deletePhoto(propertyId, photoId)
      onChange(photos.filter(p => p.id !== photoId))
    } catch {
      showToast('Erro ao eliminar foto', 'error')
    }
  }

  const handleCategoriaChange = async (photoId: string, categoria: string) => {
    try {
      await updatePhoto(propertyId, photoId, categoria)
      onChange(photos.map(p => p.id === photoId ? { ...p, categoria } : p))
    } catch {
      showToast('Erro ao actualizar categoria', 'error')
    }
  }

  const handleDragEnd = async (event: any) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = photos.findIndex(p => p.id === active.id)
    const newIndex = photos.findIndex(p => p.id === over.id)
    const reordered = arrayMove(photos, oldIndex, newIndex).map((p, i) => ({ ...p, ordem: i }))
    onChange(reordered)
    try {
      await reorderPhotos(propertyId, reordered.map(p => p.id))
    } catch {
      showToast('Erro ao reordenar', 'error')
    }
  }

  return (
    <div>
      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        style={{ border: '2px dashed var(--border-color)', borderRadius: 12, padding: 32, textAlign: 'center', cursor: 'pointer', marginBottom: 20, color: 'var(--text-muted)', fontSize: 13 }}
      >
        <Upload size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
        <p style={{ margin: 0 }}>{uploading ? 'A carregar...' : 'Arrastar fotos ou clique para seleccionar'}</p>
        <p style={{ margin: '4px 0 0', fontSize: 11 }}>JPG, PNG, WEBP · Máx. 30 fotos</p>
        <input ref={inputRef} type="file" multiple accept=".jpg,.jpeg,.png,.webp" style={{ display: 'none' }} onChange={e => e.target.files && handleFiles(e.target.files)} />
      </div>

      {/* Grid */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={photos.map(p => p.id)} strategy={rectSortingStrategy}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {photos.map(photo => (
              <SortablePhoto
                key={photo.id}
                photo={photo}
                apiBase={apiBase}
                onDelete={handleDelete}
                onCategoriaChange={handleCategoriaChange}
                onClick={() => setLightbox(photo.url.startsWith('http') ? photo.url : `${apiBase}${photo.url}`)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, cursor: 'zoom-out' }}
        >
          <img src={lightbox} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} />
        </div>
      )}
    </div>
  )
}
