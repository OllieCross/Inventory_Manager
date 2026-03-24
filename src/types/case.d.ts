import type { Case, Item, Image, Document, User, Role, DocType } from '@prisma/client'

export type { Role, DocType }

export type CaseWithRelations = Case & {
  items: Item[]
  images: Image[]
  documents: Document[]
  createdBy: Pick<User, 'id' | 'name'>
  updatedBy: Pick<User, 'id' | 'name'> | null
}

export type ItemInput = {
  name: string
  quantity: number
  comment?: string
  sortOrder: number
}

export type CaseFormData = {
  name: string
  description?: string
  qrdata: string
  items: ItemInput[]
}
