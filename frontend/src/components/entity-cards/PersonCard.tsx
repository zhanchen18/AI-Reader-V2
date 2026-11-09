import { memo, useState } from "react"
import type { PersonProfile } from "@/api/types"
import { CardSection, ChapterTag, EntityLink } from "./CardSection"
import { EntityScenes } from "./EntityScenes"

interface PersonCardProps {
  profile: PersonProfile
  onEntityClick: (name: string, type: string) => void
  onChapterClick?: (ch: number) => void
  novelId?: string
  onRelationOverride?: (other: string, action: "update" | "delete", relationType?: string) => Promise<void>
}

// Category labels and ordering
const CATEGORY_LABELS: Record<string, string> = {
  family: "血亲关系",
  intimate: "亲密关系",
  hierarchical: "师承/主从",
  social: "社交关系",
  hostile: "敌对关系",
  other: "其他关系",
}
const CATEGORY_ORDER = ["family", "intimate", "hierarchical", "social", "hostile", "other"]
const RELATION_TYPES = [
  "父子", "父女", "母子", "母女", "兄弟", "兄妹", "姐弟", "姐妹",
  "祖孙", "叔侄", "舅甥", "姑侄", "表亲", "堂亲", "夫妻", "妯娌", "姻亲",
  "君臣", "宗室关系", "上官—下属", "同僚", "门生—座师", "主将—部将", "同袍", "结义兄弟",
  "师徒", "师兄弟", "同门", "主仆", "家臣—主人",
  "朋友", "故交", "同乡", "搭档", "盟友", "恩人", "仇家", "政敌", "利益联盟", "利用关系", "背叛关系", "保护关系", "敌对", "亲戚", "其他",
]

export const PersonCard = memo(function PersonCard({ profile, onEntityClick, onChapterClick, novelId, onRelationOverride }: PersonCardProps) {
  const { aliases, appearances, abilities, relations, items, experiences, stats } = profile
  const identityEntries = abilities
    .filter((a) => a.dimension === "身份")
    .sort((a, b) => a.chapter - b.chapter)
  const [addingRelation, setAddingRelation] = useState(false)
  const [newPerson, setNewPerson] = useState("")
  const [newType, setNewType] = useState("朋友")
  const [editingRelation, setEditingRelation] = useState<string | null>(null)
  const [editingType, setEditingType] = useState("朋友")

  // Group abilities by dimension
  const abilityGroups = new Map<string, typeof abilities>()
  for (const ab of abilities) {
    const group = abilityGroups.get(ab.dimension) ?? []
    group.push(ab)
    abilityGroups.set(ab.dimension, group)
  }

  return (
    <div className="space-y-0">
      {/* A. Basic Info */}
      <div className="border-b py-3">
        <div className="mb-1 flex items-center gap-3">
          <div className="bg-muted flex size-12 items-center justify-center rounded-full text-xl font-bold">
            {profile.name[0]}
          </div>
          <div>
            <h3 className="text-lg font-bold">{profile.name}</h3>
            {aliases.length > 0 && (
              <div className="text-muted-foreground text-xs">
                {aliases.map((a) => (
                  <span key={a.name} className="mr-2">
                    {a.name}
                    {a.first_chapter > 0 && (
                      onChapterClick ? (
                        <button
                          className="text-muted-foreground/50 ml-0.5 cursor-pointer hover:underline"
                          onClick={() => onChapterClick(a.first_chapter)}
                        >
                          (Ch.{a.first_chapter})
                        </button>
                      ) : (
                        <span className="text-muted-foreground/50 ml-0.5">(Ch.{a.first_chapter})</span>
                      )
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* B. Appearances — merged by description, latest first */}
      <CardSection title="外貌特征" defaultLimit={3}>
        {[...appearances].reverse().map((a, i) => {
          // Support both old ({chapter}) and new ({chapters}) format
          const legacyChapter = (a as { chapter?: number }).chapter
          const chs: number[] = a.chapters ?? (legacyChapter != null ? [legacyChapter] : [])
          return (
            <div key={i} className="text-sm">
              {onChapterClick ? (
                <button
                  className="text-muted-foreground cursor-pointer text-xs hover:underline"
                  onClick={() => onChapterClick(chs[0])}
                >
                  {chs.length === 1
                    ? `Ch.${chs[0]}`
                    : chs.length <= 3
                      ? `Ch.${chs.join(",")}`
                      : `Ch.${chs[0]}–${chs[chs.length - 1]}(${chs.length}次)`
                  }
                </button>
              ) : (
                <span className="text-muted-foreground text-xs">
                  {chs.length === 1
                    ? `Ch.${chs[0]}`
                    : chs.length <= 3
                      ? `Ch.${chs.join(",")}`
                      : `Ch.${chs[0]}–${chs[chs.length - 1]}(${chs.length}次)`
                  }
                </span>
              )}
              <span className="ml-1.5">{a.description}</span>
            </div>
          )
        })}
      </CardSection>

      {/* C. Relations — grouped by category */}
      {onRelationOverride && (
        <div className="border-b pb-2">
          <button className="text-primary text-xs hover:underline" onClick={() => {
            setAddingRelation(true)
          }}>＋新增人物关系</button>
        </div>
      )}
      <CardSection title="人物关系" defaultLimit={15}>
        {CATEGORY_ORDER
          .filter(cat => relations.some(r => (r.category || "other") === cat))
          .flatMap(cat => [
            <div key={`cat-${cat}`} className="text-muted-foreground mt-2 text-xs font-medium first:mt-0">
              {CATEGORY_LABELS[cat] ?? cat}
            </div>,
            ...relations
              .filter(r => (r.category || "other") === cat)
              .map(rel => {
                const latest = rel.stages[rel.stages.length - 1]
                const totalEvidences = rel.stages.reduce(
                  (n, s) => n + (s.evidences?.length ?? (s.evidence ? 1 : 0)), 0,
                )
                return (
                  <div key={rel.other_person} className="text-sm pl-2">
                    <EntityLink
                      name={rel.other_person}
                      type="person"
                      onClick={onEntityClick}
                    />
                    <span className="text-muted-foreground mx-1">—</span>
                    <span>{latest?.relation_type ?? "未知"}</span>
                    {onRelationOverride && (
                      <span className="ml-2 text-[10px]">
                        {editingRelation === rel.other_person ? (
                          <>
                            <select className="h-6 rounded border bg-background px-1 text-xs" value={editingType} onChange={(e) => setEditingType(e.target.value)}>
                              {RELATION_TYPES.map((type) => <option key={type}>{type}</option>)}
                            </select>
                            <button className="text-primary ml-1 hover:underline" onClick={() => { void onRelationOverride(rel.other_person, "update", editingType); setEditingRelation(null) }}>保存</button>
                            <button className="ml-1 hover:underline" onClick={() => setEditingRelation(null)}>取消</button>
                          </>
                        ) : <button className="text-primary hover:underline" onClick={() => { setEditingRelation(rel.other_person); setEditingType(latest?.relation_type ?? "朋友") }}>修改</button>}
                        <button className="text-destructive ml-2 hover:underline" onClick={() => {
                          if (window.confirm(`删除 ${profile.name} 与 ${rel.other_person} 的关系？`)) void onRelationOverride(rel.other_person, "delete")
                        }}>删除</button>
                      </span>
                    )}
                    {rel.stages.length > 1 && (
                      <span className="text-muted-foreground ml-1 text-xs">
                        ({rel.stages.map((s, si) => {
                          const legacyChapter = (s as { chapter?: number }).chapter
                          const chs: number[] = s.chapters ?? (legacyChapter != null ? [legacyChapter] : [])
                          if (chs.length === 0) return <span key={si}>{s.relation_type}</span>
                          const tag = chs.length === 1
                            ? `Ch.${chs[0]}`
                            : `Ch.${chs[0]}–${chs[chs.length - 1]}`
                          return (
                            <span key={si}>
                              {si > 0 && " → "}
                              {s.relation_type}(
                              {onChapterClick ? (
                                <button
                                  className="cursor-pointer hover:underline"
                                  onClick={() => onChapterClick(chs[0])}
                                >
                                  {tag}
                                </button>
                              ) : tag}
                              )
                            </span>
                          )
                        })})
                      </span>
                    )}
                    {totalEvidences > 0 && (
                      <details className="mt-0.5">
                        <summary className="text-muted-foreground text-[10px] cursor-pointer">
                          查看证据 ({totalEvidences})
                        </summary>
                        <div className="pl-2 mt-1 space-y-0.5">
                          {rel.stages.flatMap((s, si) =>
                            (s.evidences?.length ? s.evidences : s.evidence ? [s.evidence] : [])
                              .map((ev, ei) => (
                                <div key={`${si}-${ei}`} className="text-[11px] text-muted-foreground">
                                  「{ev}」
                                  {onChapterClick ? (
                                    <button
                                      className="ml-1 cursor-pointer opacity-60 hover:underline"
                                      onClick={() => onChapterClick(s.chapters[0])}
                                    >
                                      Ch.{s.chapters[0]}
                                    </button>
                                  ) : (
                                    <span className="ml-1 opacity-60">Ch.{s.chapters[0]}</span>
                                  )}
                                </div>
                              ))
                          )}
                        </div>
                      </details>
                    )}
                  </div>
                )
              }),
          ])}
      </CardSection>
      {addingRelation && onRelationOverride && (
        <div className="border-b px-1 py-2 flex flex-wrap items-center gap-1.5">
          <input className="h-7 w-28 rounded border bg-background px-2 text-xs" placeholder="对方人物" value={newPerson} onChange={(e) => setNewPerson(e.target.value)} />
          <select className="h-7 rounded border bg-background px-1 text-xs" value={newType} onChange={(e) => setNewType(e.target.value)}>
            {RELATION_TYPES.map((type) => <option key={type}>{type}</option>)}
          </select>
          <button className="text-primary text-xs hover:underline" onClick={() => { if (newPerson.trim()) { void onRelationOverride(newPerson.trim(), "update", newType); setNewPerson(""); setAddingRelation(false) } }}>保存</button>
          <button className="text-xs hover:underline" onClick={() => setAddingRelation(false)}>取消</button>
        </div>
      )}

      {/* D. Abilities and identity history */}
      <CardSection title="能力与身份经历" defaultLimit={8}>
        {Array.from(abilityGroups.entries()).flatMap(([dim, abs]) => [
          <div key={`dim-${dim}`} className="text-muted-foreground mt-1 text-xs font-medium first:mt-0">
            {dim}
          </div>,
          ...abs.map((ab, i) => (
            <div key={`${dim}-${i}`} className="text-sm pl-2">
              <ChapterTag chapter={ab.chapter} onClick={onChapterClick} />
              <span className="ml-1.5 font-medium">{ab.name}</span>
              {ab.description && (
                <span className="text-muted-foreground ml-1">{ab.description}</span>
              )}
            </div>
          )),
        ])}
      </CardSection>

      {identityEntries.length > 0 && (
        <CardSection title="身份/官职变迁" defaultLimit={8}>
          {identityEntries.map((entry, i) => {
            const next = identityEntries[i + 1]?.chapter
            return (
              <div key={`${entry.chapter}-${entry.name}-${i}`} className="text-sm">
                <ChapterTag chapter={entry.chapter} onClick={onChapterClick} />
                <span className="ml-1.5 font-medium">{entry.name}</span>
                <span className="text-muted-foreground ml-1 text-xs">
                  （至 {next ? `Ch.${next - 1}` : "当前分析范围末尾"}）
                </span>
                {entry.description && <span className="text-muted-foreground ml-1">{entry.description}</span>}
              </div>
            )
          })}
        </CardSection>
      )}

      {/* E. Items */}
      <CardSection title="物品关系" defaultLimit={5}>
        {items.map((it, i) => (
          <div key={i} className="text-sm">
            <ChapterTag chapter={it.chapter} onClick={onChapterClick} />
            <span className="ml-1.5">{it.action}</span>
            <EntityLink
              name={it.item_name}
              type="item"
              onClick={onEntityClick}
            />
            {it.description && (
              <span className="text-muted-foreground ml-1 text-xs">
                ({it.description})
              </span>
            )}
          </div>
        ))}
      </CardSection>

      {/* F. Footprint */}
      {(() => {
        const footprintMap = new Map<string, number>()
        for (const exp of experiences) {
          if (exp.location && !footprintMap.has(exp.location)) {
            footprintMap.set(exp.location, exp.chapter)
          }
        }
        if (footprintMap.size === 0) return null
        return (
          <CardSection title="足迹" defaultLimit={8}>
            {Array.from(footprintMap.entries()).map(([loc, ch]) => (
              <div key={loc} className="text-sm flex items-center gap-1.5">
                <ChapterTag chapter={ch} onClick={onChapterClick} />
                <EntityLink name={loc} type="location" onClick={onEntityClick} />
              </div>
            ))}
          </CardSection>
        )
      })()}

      {/* G. Experiences */}
      <CardSection title="经历" defaultLimit={5}>
        {[...experiences].reverse().map((exp, i) => (
          <div key={i} className="text-sm">
            <ChapterTag chapter={exp.chapter} onClick={onChapterClick} />
            <span className="ml-1.5">{exp.summary}</span>
            {exp.location && (
              <span className="text-muted-foreground ml-1">
                @<EntityLink
                  name={exp.location}
                  type="location"
                  onClick={onEntityClick}
                />
              </span>
            )}
          </div>
        ))}
      </CardSection>

      {/* H. Scenes */}
      {novelId && <EntityScenes novelId={novelId} entityName={profile.name} onChapterClick={onChapterClick} />}

      {/* I. Stats */}
      <div className="py-3">
        <details>
          <summary className="text-muted-foreground cursor-pointer text-xs font-medium uppercase tracking-wide">
            数据统计
          </summary>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {Object.entries(stats).map(([k, v]) => (
              <div key={k} className="rounded-md bg-muted/50 px-2 py-1 text-sm">
                <span className="text-muted-foreground text-xs">{formatStatLabel(k)}</span>
                <div className="font-medium">{v}</div>
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  )
})

function formatStatLabel(key: string): string {
  const labels: Record<string, string> = {
    chapter_count: "出场章节",
    first_chapter: "首次出场",
    last_chapter: "最后出场",
    relation_count: "关系数",
  }
  return labels[key] ?? key
}
