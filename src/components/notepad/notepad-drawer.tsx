'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  NotebookPen,
  Plus,
  Search,
  Trash2,
  Pin,
  PinOff,
  Check,
  CheckCheck,
  Clock,
  Copy,
  Download,
  Maximize2,
  Minimize2,
  X,
  ChevronLeft,
  ChevronRight,
  Bold,
  Italic,
  List,
  ListTodo,
  Calendar,
  Save,
  Loader2,
  FileText,
  AlertCircle,
  FolderOpen,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface NoteItem {
  id: string
  userId?: string | null
  userEmail?: string | null
  title: string
  content: string
  category: string
  color: string
  isPinned: boolean
  createdAt: string
  updatedAt: string
}

const CATEGORIES = [
  'All',
  'General',
  'Attendance',
  'Late Arrival',
  'Leave / WFH',
  'Follow-up',
  'Urgent',
]

const COLOR_THEMES: Record<
  string,
  {
    name: string
    bg: string
    border: string
    cardBg: string
    accent: string
    dot: string
  }
> = {
  amber: {
    name: 'Yellow / Amber',
    bg: 'bg-amber-500/10',
    border: 'border-amber-200',
    cardBg: 'hover:bg-amber-50/60',
    accent: 'text-amber-700',
    dot: 'bg-amber-400',
  },
  blue: {
    name: 'Sky Blue',
    bg: 'bg-sky-500/10',
    border: 'border-sky-200',
    cardBg: 'hover:bg-sky-50/60',
    accent: 'text-sky-700',
    dot: 'bg-sky-400',
  },
  emerald: {
    name: 'Emerald Green',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-200',
    cardBg: 'hover:bg-emerald-50/60',
    accent: 'text-emerald-700',
    dot: 'bg-emerald-400',
  },
  purple: {
    name: 'Violet Purple',
    bg: 'bg-purple-500/10',
    border: 'border-purple-200',
    cardBg: 'hover:bg-purple-50/60',
    accent: 'text-purple-700',
    dot: 'bg-purple-400',
  },
  rose: {
    name: 'Rose Red',
    bg: 'bg-rose-500/10',
    border: 'border-rose-200',
    cardBg: 'hover:bg-rose-50/60',
    accent: 'text-rose-700',
    dot: 'bg-rose-400',
  },
  slate: {
    name: 'Slate Gray',
    bg: 'bg-slate-500/10',
    border: 'border-slate-200',
    cardBg: 'hover:bg-slate-50/60',
    accent: 'text-slate-700',
    dot: 'bg-slate-400',
  },
}

interface NotepadDrawerProps {
  isOpen: boolean
  onClose: () => void
  onNotesCountChange?: (count: number) => void
}

export function NotepadDrawer({
  isOpen,
  onClose,
  onNotesCountChange,
}: NotepadDrawerProps) {
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [isMaximized, setIsMaximized] = useState<boolean>(false)
  const [showSidebar, setShowSidebar] = useState<boolean>(true)

  // Active note editor state
  const [title, setTitle] = useState<string>('')
  const [content, setContent] = useState<string>('')
  const [category, setCategory] = useState<string>('General')
  const [color, setColor] = useState<string>('amber')
  const [isPinned, setIsPinned] = useState<boolean>(false)

  // Status & feedback
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<string>('')
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Refs for debouncing & avoiding stale closures
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const activeNoteRef = useRef<{
    id: string | null
    title: string
    content: string
    category: string
    color: string
    isPinned: boolean
  }>({
    id: null,
    title: '',
    content: '',
    category: 'General',
    color: 'amber',
    isPinned: false,
  })

  // Keep ref synchronized with active state
  useEffect(() => {
    activeNoteRef.current = {
      id: activeNoteId,
      title,
      content,
      category,
      color,
      isPinned,
    }
  }, [activeNoteId, title, content, category, color, isPinned])

  // Fetch all notes from real database
  const fetchNotes = useCallback(async (isInitial = false) => {
    if (isInitial) setIsLoading(true)
    try {
      const res = await fetch('/api/notes', { cache: 'no-store' })
      const data = await res.json()
      if (data.success && Array.isArray(data.notes)) {
        setNotes(data.notes)
        if (onNotesCountChange) {
          onNotesCountChange(data.notes.length)
        }

        // If no active note is selected, pick the first one or create initial
        if (isInitial && data.notes.length > 0) {
          const first = data.notes[0]
          setActiveNoteId(first.id)
          setTitle(first.title)
          setContent(first.content)
          setCategory(first.category || 'General')
          setColor(first.color || 'amber')
          setIsPinned(Boolean(first.isPinned))
        }
      }
    } catch (err) {
      console.error('Error fetching notes:', err)
    } finally {
      if (isInitial) setIsLoading(false)
    }
  }, [onNotesCountChange])

  // Initial load when opened
  useEffect(() => {
    if (isOpen) {
      fetchNotes(true)
    }
  }, [isOpen, fetchNotes])

  // Background live polling every 12 seconds when open
  useEffect(() => {
    if (!isOpen) return
    const interval = setInterval(() => {
      fetchNotes(false)
    }, 12000)
    return () => clearInterval(interval)
  }, [isOpen, fetchNotes])

  // Immediate save helper to database
  const persistNoteToDatabase = async (noteToSave: {
    id: string
    title: string
    content: string
    category: string
    color: string
    isPinned: boolean
  }) => {
    if (!noteToSave.id) return
    setSaveStatus('saving')
    try {
      const res = await fetch(`/api/notes/${noteToSave.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: noteToSave.title,
          content: noteToSave.content,
          category: noteToSave.category,
          color: noteToSave.color,
          isPinned: noteToSave.isPinned,
        }),
      })
      const data = await res.json()
      if (data.success && data.note) {
        setSaveStatus('saved')
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        setLastSavedAt(now)

        // Update local list
        setNotes((prev) =>
          prev.map((n) => (n.id === data.note.id ? data.note : n))
        )
      } else {
        setSaveStatus('error')
      }
    } catch (err) {
      console.error('Failed to save note:', err)
      setSaveStatus('error')
    }
  }

  // Debounced auto-save when user edits
  const triggerAutoSave = () => {
    if (!activeNoteId) return
    setSaveStatus('saving')
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      persistNoteToDatabase(activeNoteRef.current as any)
    }, 600)
  }

  // Switch to another note safely (flushing current unsaved changes first)
  const handleSelectNote = (note: NoteItem) => {
    if (activeNoteId === note.id) return

    // Flush current note save if needed
    if (activeNoteId && saveStatus === 'saving') {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      persistNoteToDatabase(activeNoteRef.current as any)
    }

    setActiveNoteId(note.id)
    setTitle(note.title)
    setContent(note.content)
    setCategory(note.category || 'General')
    setColor(note.color || 'amber')
    setIsPinned(Boolean(note.isPinned))
    setSaveStatus('idle')
    setDeleteConfirmId(null)
  }

  // Create a new note in database
  const handleCreateNewNote = async () => {
    // Flush current note first
    if (activeNoteId && saveStatus === 'saving') {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      persistNoteToDatabase(activeNoteRef.current as any)
    }

    setSaveStatus('saving')
    try {
      const nowStr = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
      const newTitle = `Notes - ${nowStr}`

      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          content: '',
          category: selectedCategory !== 'All' ? selectedCategory : 'Attendance',
          color: 'amber',
          isPinned: false,
        }),
      })

      const data = await res.json()
      if (data.success && data.note) {
        const newNote: NoteItem = data.note
        setNotes((prev) => [newNote, ...prev])
        if (onNotesCountChange) {
          onNotesCountChange(notes.length + 1)
        }
        setActiveNoteId(newNote.id)
        setTitle(newNote.title)
        setContent(newNote.content)
        setCategory(newNote.category)
        setColor(newNote.color)
        setIsPinned(newNote.isPinned)
        setSaveStatus('saved')
        setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))

        // Focus title after creating
        setTimeout(() => {
          textareaRef.current?.focus()
        }, 100)
      }
    } catch (err) {
      console.error('Failed to create note:', err)
      setSaveStatus('error')
    }
  }

  // Delete note from database
  const handleDeleteNote = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    try {
      const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        const remaining = notes.filter((n) => n.id !== id)
        setNotes(remaining)
        if (onNotesCountChange) {
          onNotesCountChange(remaining.length)
        }
        setDeleteConfirmId(null)

        if (activeNoteId === id) {
          if (remaining.length > 0) {
            handleSelectNote(remaining[0])
          } else {
            setActiveNoteId(null)
            setTitle('')
            setContent('')
          }
        }
      }
    } catch (err) {
      console.error('Failed to delete note:', err)
    }
  }

  // Toggle Pin on active note
  const handleTogglePin = () => {
    const nextPin = !isPinned
    setIsPinned(nextPin)
    activeNoteRef.current.isPinned = nextPin
    setNotes((prev) =>
      prev.map((n) => (n.id === activeNoteId ? { ...n, isPinned: nextPin } : n))
    )
    triggerAutoSave()
  }

  // Quick formatting helpers
  const handleInsertText = (before: string, after: string = '') => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = content.substring(start, end)
    const replacement = `${before}${selected}${after}`
    const newContent = content.substring(0, start) + replacement + content.substring(end)

    setContent(newContent)
    activeNoteRef.current.content = newContent
    triggerAutoSave()

    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + before.length, end + before.length)
    }, 10)
  }

  const handleInsertTimestamp = () => {
    const now = new Date()
    const stamp = `\n📌 [${now.toLocaleDateString('en-GB')} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}] - `
    handleInsertText(stamp)
  }

  const handleCopyContent = () => {
    if (!content && !title) return
    const textToCopy = `${title}\n${'='.repeat(title.length || 10)}\n\n${content}`
    navigator.clipboard.writeText(textToCopy)
    setCopyFeedback(true)
    setTimeout(() => setCopyFeedback(false), 2000)
  }

  const handleDownloadTxt = () => {
    const element = document.createElement('a')
    const file = new Blob([`${title}\nCategory: ${category}\nUpdated: ${lastSavedAt || new Date().toLocaleString()}\n\n${content}`], {
      type: 'text/plain;charset=utf-8',
    })
    element.href = URL.createObjectURL(file)
    element.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'note'}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  // Filter notes by search & category
  const filteredNotes = notes.filter((n) => {
    const matchesCategory =
      selectedCategory === 'All' || n.category === selectedCategory
    const matchesSearch =
      !searchQuery ||
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Keyboard shortcut listener: Ctrl+S saves, Esc closes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (activeNoteRef.current.id) {
          if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
          persistNoteToDatabase(activeNoteRef.current as any)
        }
      }
      if (e.key === 'Escape' && !deleteConfirmId) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, deleteConfirmId, onClose])

  if (!isOpen) return null

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0
  const charCount = content.length

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Semi-transparent Backdrop (Clicking outside closes & auto-saves) */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (activeNoteId && saveStatus === 'saving') {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
            persistNoteToDatabase(activeNoteRef.current as any)
          }
          onClose()
        }}
      />

      {/* Main Slide-in Panel / Maximize Modal Container */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10 transition-all duration-300 ease-in-out',
          isMaximized ? 'w-full' : 'w-full md:max-w-3xl lg:max-w-4xl'
        )}
      >
        <div
          className={cn(
            'flex flex-col h-full bg-white shadow-2xl border-l border-slate-200 overflow-hidden transition-all duration-200',
            isMaximized ? 'w-full rounded-none' : 'w-full sm:rounded-l-2xl'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* HEADER BAR */}
          <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-inner">
                <NotebookPen className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                    Notepad & Real-Time Notes
                  </h2>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live Cloud Sync
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  Changes automatically save to database in real-time
                </p>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-1.5">
              {/* Save Status Badge */}
              <div className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 mr-1">
                {saveStatus === 'saving' && (
                  <span className="flex items-center gap-1 text-amber-300 font-medium animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Saving...
                  </span>
                )}
                {saveStatus === 'saved' && (
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <Check className="w-3 h-3" />
                    Saved {lastSavedAt && `(${lastSavedAt})`}
                  </span>
                )}
                {saveStatus === 'error' && (
                  <span className="flex items-center gap-1 text-rose-400 font-medium">
                    <AlertCircle className="w-3 h-3" />
                    Save Error
                  </span>
                )}
                {saveStatus === 'idle' && (
                  <span className="flex items-center gap-1 text-slate-400">
                    <CheckCheck className="w-3 h-3 text-slate-500" />
                    Synced
                  </span>
                )}
              </div>

              {/* Toggle Sidebar (Mobile / Compact) */}
              <button
                type="button"
                onClick={() => setShowSidebar(!showSidebar)}
                title={showSidebar ? 'Hide Notes List' : 'Show Notes List'}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
              >
                {showSidebar ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </button>

              {/* Maximize / Restore Toggle */}
              <button
                type="button"
                onClick={() => setIsMaximized(!isMaximized)}
                title={isMaximized ? 'Restore Width' : 'Maximize Full Screen'}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
              >
                {isMaximized ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  if (activeNoteId && saveStatus === 'saving') {
                    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
                    persistNoteToDatabase(activeNoteRef.current as any)
                  }
                  onClose()
                }}
                title="Close Notepad (Esc)"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-rose-600/80 rounded-md transition-colors ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* MAIN BODY: 2 COLUMNS (Sidebar list + Rich Editor) */}
          <div className="flex-1 flex overflow-hidden bg-slate-50">
            {/* LEFT COLUMN: NOTES LIST (Collapsible) */}
            {showSidebar && (
              <div className="w-64 sm:w-72 md:w-80 border-r border-slate-200 bg-white flex flex-col shrink-0 overflow-hidden shadow-xs">
                {/* Search & New Note Button */}
                <div className="p-3 border-b border-slate-200 space-y-2 bg-slate-50/60">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={handleCreateNewNote}
                      size="sm"
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs h-8.5 rounded-lg flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Note</span>
                    </Button>
                  </div>

                  {/* Search Filter */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <Input
                      placeholder="Search notes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 pl-8 pr-7 text-xs bg-white border-slate-200 rounded-lg focus-visible:ring-1 focus-visible:ring-slate-400"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Category Pills Slider */}
                  <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-0.5 pt-0.5 text-[11px]">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={cn(
                          'px-2 py-0.5 rounded-full whitespace-nowrap font-medium transition-all cursor-pointer',
                          selectedCategory === cat
                            ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                            : 'bg-slate-200/70 text-slate-600 hover:bg-slate-300 hover:text-slate-800'
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes List Scrollable */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-300">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                      <span className="text-xs">Loading notes from database...</span>
                    </div>
                  ) : filteredNotes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center p-4 text-slate-400">
                      <FolderOpen className="w-8 h-8 text-slate-300 mb-1.5" />
                      <p className="text-xs font-semibold text-slate-600">No notes found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {searchQuery ? 'Try a different search keyword' : 'Click "New Note" to create your first note!'}
                      </p>
                      {!searchQuery && (
                        <Button
                          type="button"
                          onClick={handleCreateNewNote}
                          variant="outline"
                          size="sm"
                          className="mt-3 text-xs h-7 border-dashed border-slate-300 text-slate-700"
                        >
                          <Plus className="w-3 h-3 mr-1" /> Create Note
                        </Button>
                      )}
                    </div>
                  ) : (
                    filteredNotes.map((item) => {
                      const isActive = activeNoteId === item.id
                      const theme = COLOR_THEMES[item.color] || COLOR_THEMES.amber
                      const isDeletingThis = deleteConfirmId === item.id

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleSelectNote(item)}
                          className={cn(
                            'group relative p-2.5 rounded-xl border text-left transition-all duration-150 cursor-pointer select-none',
                            isActive
                              ? 'bg-white border-slate-800 ring-1 ring-slate-800 shadow-xs'
                              : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white hover:shadow-2xs'
                          )}
                        >
                          {/* Color strip on left */}
                          <div
                            className={cn(
                              'absolute left-0 top-2 bottom-2 w-1 rounded-r-md transition-colors',
                              theme.dot
                            )}
                          />

                          <div className="pl-2">
                            {/* Header: Title + Pin */}
                            <div className="flex items-start justify-between gap-1">
                              <h4
                                className={cn(
                                  'text-xs font-semibold truncate',
                                  isActive ? 'text-slate-900' : 'text-slate-700'
                                )}
                              >
                                {item.title || 'Untitled Note'}
                              </h4>
                              {item.isPinned && (
                                <Pin className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />
                              )}
                            </div>

                            {/* Snippet */}
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                              {item.content ? item.content.slice(0, 100) : '(Empty note)'}
                            </p>

                            {/* Footer: Category + Date */}
                            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 text-[10px] text-slate-400">
                              <span
                                className={cn(
                                  'px-1.5 py-0.2 rounded font-medium text-[9.5px]',
                                  theme.bg,
                                  theme.accent
                                )}
                              >
                                {item.category || 'General'}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-2.5 h-2.5" />
                                <span>
                                  {item.updatedAt
                                    ? new Date(item.updatedAt).toLocaleDateString([], {
                                        month: 'short',
                                        day: 'numeric',
                                      })
                                    : 'New'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Quick Delete confirmation inline */}
                          {isDeletingThis ? (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute inset-0 bg-white/95 backdrop-blur-xs rounded-xl flex items-center justify-between p-2.5 border border-rose-300 animate-in fade-in duration-100 z-10"
                            >
                              <span className="text-[11px] font-bold text-rose-600">Delete note?</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteNote(item.id, e)}
                                  className="px-2 py-0.5 text-[10px] bg-rose-600 hover:bg-rose-700 text-white rounded font-bold cursor-pointer"
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setDeleteConfirmId(null)
                                  }}
                                  className="px-2 py-0.5 text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-medium cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleteConfirmId(item.id)
                              }}
                              title="Delete Note"
                              className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-1.5 top-1.5 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Footer notes count */}
                <div className="p-2 px-3 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>
                    Total: <strong>{notes.length}</strong> note(s)
                  </span>
                  <button
                    type="button"
                    onClick={() => fetchNotes(true)}
                    className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 text-[10.5px]"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            )}

            {/* RIGHT COLUMN: RICH NOTE EDITOR */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
              {activeNoteId ? (
                <>
                  {/* TOP BAR OF EDITOR: Title + Meta */}
                  <div className="p-3 sm:px-5 border-b border-slate-200 bg-white space-y-2.5">
                    {/* Title Input + Pin Button */}
                    <div className="flex items-center gap-2">
                      <Input
                        value={title}
                        onChange={(e) => {
                          const val = e.target.value
                          setTitle(val)
                          activeNoteRef.current.title = val
                          setNotes((prev) =>
                            prev.map((n) =>
                              n.id === activeNoteId ? { ...n, title: val } : n
                            )
                          )
                          triggerAutoSave()
                        }}
                        placeholder="Note Title (e.g., Daily Attendance Remarks, Follow-ups)..."
                        className="text-base font-bold text-slate-900 border-none shadow-none focus-visible:ring-0 p-0 h-auto placeholder:text-slate-300"
                      />

                      {/* Pin to Top Button */}
                      <button
                        type="button"
                        onClick={handleTogglePin}
                        title={isPinned ? 'Unpin Note' : 'Pin Note to Top'}
                        className={cn(
                          'p-1.5 rounded-lg border transition-all cursor-pointer shrink-0',
                          isPinned
                            ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-2xs'
                            : 'border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                        )}
                      >
                        {isPinned ? (
                          <Pin className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                        ) : (
                          <PinOff className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Save Now Button */}
                      <Button
                        type="button"
                        onClick={() => {
                          if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
                          persistNoteToDatabase(activeNoteRef.current as any)
                        }}
                        disabled={saveStatus === 'saving'}
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-xs text-slate-700 hover:bg-slate-100 border-slate-300 shrink-0 font-medium cursor-pointer"
                        title="Manual Save (Ctrl+S)"
                      >
                        {saveStatus === 'saving' ? (
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : (
                          <Save className="w-3 h-3 mr-1 text-slate-500" />
                        )}
                        <span>Save</span>
                      </Button>
                    </div>

                    {/* Metadata Selector Row: Category, Theme Color */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Category Select */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-400 font-medium">Category:</span>
                          <select
                            value={category}
                            onChange={(e) => {
                              const val = e.target.value
                              setCategory(val)
                              activeNoteRef.current.category = val
                              setNotes((prev) =>
                                prev.map((n) =>
                                  n.id === activeNoteId ? { ...n, category: val } : n
                                )
                              )
                              triggerAutoSave()
                            }}
                            className="text-xs bg-slate-50 border border-slate-300 rounded-md px-2 py-1 text-slate-700 font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
                          >
                            {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Color Themes */}
                        <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Color:</span>
                          <div className="flex items-center gap-1">
                            {Object.entries(COLOR_THEMES).map(([key, val]) => (
                              <button
                                key={key}
                                type="button"
                                onClick={() => {
                                  setColor(key)
                                  activeNoteRef.current.color = key
                                  setNotes((prev) =>
                                    prev.map((n) =>
                                      n.id === activeNoteId ? { ...n, color: key } : n
                                    )
                                  )
                                  triggerAutoSave()
                                }}
                                title={val.name}
                                className={cn(
                                  'w-4 h-4 rounded-full transition-transform cursor-pointer',
                                  val.dot,
                                  color === key
                                    ? 'ring-2 ring-slate-800 scale-110 shadow-xs'
                                    : 'opacity-70 hover:opacity-100 hover:scale-105'
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right Quick Action Icons (Copy, Download, Delete) */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={handleCopyContent}
                          title="Copy Note Text"
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          {copyFeedback ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadTxt}
                          title="Export as Text (.txt)"
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(activeNoteId)}
                          title="Delete Note"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* FORMATTING TOOLBAR */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1 text-slate-600">
                      <button
                        type="button"
                        onClick={() => handleInsertText('**', '**')}
                        title="Bold Text"
                        className="px-2 py-1 text-xs hover:bg-slate-100 rounded font-bold hover:text-slate-900"
                      >
                        <Bold className="w-3.5 h-3.5 inline mr-1" />
                        Bold
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertText('*', '*')}
                        title="Italic Text"
                        className="px-2 py-1 text-xs hover:bg-slate-100 rounded italic hover:text-slate-900"
                      >
                        <Italic className="w-3.5 h-3.5 inline mr-1" />
                        Italic
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertText('\n• ')}
                        title="Bullet List"
                        className="px-2 py-1 text-xs hover:bg-slate-100 rounded hover:text-slate-900"
                      >
                        <List className="w-3.5 h-3.5 inline mr-1" />
                        List
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertText('\n[ ] ')}
                        title="Checkbox / Task"
                        className="px-2 py-1 text-xs hover:bg-slate-100 rounded hover:text-slate-900"
                      >
                        <ListTodo className="w-3.5 h-3.5 inline mr-1" />
                        Task
                      </button>
                      <button
                        type="button"
                        onClick={handleInsertTimestamp}
                        title="Insert Current Date & Time"
                        className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded hover:text-slate-900 flex items-center gap-1 ml-auto cursor-pointer"
                      >
                        <Calendar className="w-3 h-3 text-amber-600" />
                        Timestamp
                      </button>
                    </div>
                  </div>

                  {/* NOTE CONTENT TEXTAREA */}
                  <div className="flex-1 p-3 sm:px-5 flex flex-col overflow-hidden bg-white">
                    <textarea
                      ref={textareaRef}
                      value={content}
                      onChange={(e) => {
                        const val = e.target.value
                        setContent(val)
                        activeNoteRef.current.content = val
                        setNotes((prev) =>
                          prev.map((n) =>
                            n.id === activeNoteId ? { ...n, content: val } : n
                          )
                        )
                        triggerAutoSave()
                      }}
                      placeholder="Start typing your attendance notes, employee follow-ups, punch issues, reminders, or observations here..."
                      className="w-full flex-1 resize-none border-none outline-none focus:outline-none focus:ring-0 text-slate-800 text-sm leading-relaxed p-0 placeholder:text-slate-300 font-sans"
                      spellCheck="true"
                    />
                  </div>

                  {/* FOOTER BAR: Word count, status, tips */}
                  <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-400 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span>{wordCount} words</span>
                      <span>{charCount} characters</span>
                      <span className="hidden sm:inline text-slate-300">|</span>
                      <span className="hidden sm:inline text-slate-400">
                        Auto-saves to Hostinger MySQL live
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">Ctrl+S to save</span>
                    </div>
                  </div>
                </>
              ) : (
                /* EMPTY STATE (No note active) */
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-3 shadow-xs">
                    <NotebookPen className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">No Note Selected</h3>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    Select an existing note from the list on the left or create a new note to start writing.
                  </p>
                  <Button
                    type="button"
                    onClick={handleCreateNewNote}
                    className="mt-4 bg-slate-900 hover:bg-slate-800 text-white text-xs h-8.5 rounded-lg px-4 flex items-center gap-1.5 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create New Note
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
