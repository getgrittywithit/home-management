'use client'

import { StudentData, FamilyBook } from './types'
import BooksView from './BooksView'
import VocabWordsTab from '../VocabWordsTab'
import ReadingProgressDashboard from '../ReadingProgressDashboard'
import { ParentLibraryAdmin } from '../HomeLibrary'

interface Props {
  students: StudentData[]
  familyBook: FamilyBook | null
}

export default function HomeschoolELAR({ students, familyBook }: Props) {
  return (
    <div className="space-y-6">
      <ReadingProgressDashboard />
      <BooksView students={students} familyBook={familyBook} />
      <VocabWordsTab />
      <ParentLibraryAdmin />
      {/* Phase 5.9: Book Buddy progress + ELAR Journey Map will render here */}
    </div>
  )
}
