import { useCallback, useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { fetchNovel } from "@/api/client"
import { useChapterRangeStore } from "@/stores/chapterRangeStore"
import { RangeSlider } from "@/components/ui/range-slider"
import { Button } from "@/components/ui/button"

interface VisualizationLayoutProps {
  children: React.ReactNode
}

/**
 * Shared layout for visualization pages (graph, map, timeline, factions).
 * Provides the chapter range slider. Top navigation is handled by NovelLayout.
 */
export function VisualizationLayout({ children }: VisualizationLayoutProps) {
  const { novelId } = useParams<{ novelId: string }>()

  const {
    chapterStart,
    chapterEnd,
    analyzedFirst,
    analyzedLast,
    totalChapters,
    setRange,
    setTotalChapters,
    resetForNovel,
  } = useChapterRangeStore()
  const [draftRange, setDraftRange] = useState<[number, number]>([chapterStart, chapterEnd])

  // The store changes only after applying a range, or when a new novel/range
  // is loaded. Dragging the slider therefore never starts a data request.
  useEffect(() => {
    setDraftRange([chapterStart, chapterEnd])
  }, [chapterStart, chapterEnd])

  useEffect(() => {
    if (!novelId) return
    resetForNovel(novelId)
    fetchNovel(novelId).then((n) => {
      setTotalChapters(n.total_chapters)
    })
  }, [novelId, setTotalChapters, resetForNovel])

  const rangeMin = analyzedFirst || 1
  const rangeMax = analyzedLast || totalChapters || 1

  const handleRangeSlider = useCallback(
    (vals: [number, number]) => {
      setDraftRange(vals)
    },
    [],
  )

  const applyRange = useCallback(() => {
    setRange(draftRange[0], draftRange[1])
  }, [draftRange, setRange])

  const cancelRange = useCallback(() => {
    setDraftRange([chapterStart, chapterEnd])
  }, [chapterStart, chapterEnd])

  const rangeChanged = draftRange[0] !== chapterStart || draftRange[1] !== chapterEnd

  return (
    <div className="flex h-full flex-col">
      {/* Chapter range slider */}
      <div className="flex items-center gap-4 border-b bg-muted/30 px-4 py-1.5">
        <span className="text-muted-foreground text-xs whitespace-nowrap">章节范围</span>

        <span className="text-xs font-mono w-10 text-right tabular-nums">{draftRange[0]}</span>
        <RangeSlider
          min={rangeMin}
          max={rangeMax}
          step={1}
          value={draftRange}
          onValueChange={handleRangeSlider}
          className="w-64"
        />
        <span className="text-xs font-mono w-10 tabular-nums">{draftRange[1]}</span>

        {rangeChanged && (
          <>
            <Button size="xs" onClick={applyRange}>应用范围</Button>
            <Button size="xs" variant="ghost" onClick={cancelRange}>取消</Button>
          </>
        )}

        {analyzedFirst > 0 && totalChapters > 0 && analyzedLast < totalChapters && (
          <span className="text-muted-foreground text-xs whitespace-nowrap">
            已分析 {analyzedFirst}-{analyzedLast} / {totalChapters} 章
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  )
}
