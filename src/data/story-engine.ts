import type {
  Choice,
  StoryChoiceNode,
  StoryChoiceResult,
  StoryFlow,
  StorySelection
} from '../types'

export interface StoryFlowValidation {
  valid: boolean
  errors: string[]
  choiceCount: number
}

export type StoryArtworkStage = 'opening' | 'middle' | 'late'

export const storyArtworkStage = (nodeId: string): StoryArtworkStage => {
  if (nodeId.includes('-s3-') || nodeId.includes('-closing-') || nodeId.endsWith('-end')) {
    return 'late'
  }
  if (nodeId.includes('-s2-')) return 'middle'
  return 'opening'
}

export const validateStoryFlow = (flow: StoryFlow): StoryFlowValidation => {
  const errors: string[] = []
  const nodes = Object.values(flow.nodes)
  const choices = nodes.filter((node): node is StoryChoiceNode => node.type === 'choice')
  if (!flow.nodes[flow.startNodeId]) errors.push(`Missing start node: ${flow.startNodeId}`)
  if (choices.length !== 3) errors.push(`Expected 3 choice nodes, found ${choices.length}`)

  for (const node of nodes) {
    if (node.type === 'dialogue' && !flow.nodes[node.next]) {
      errors.push(`${node.id} points to missing node ${node.next}`)
    }
    if (node.type === 'choice') {
      if (!node.learningCue.explanationEn || !node.learningCue.explanationJa) {
        errors.push(`${node.id} has an incomplete learning cue`)
      }
      if (node.options.length < 2 || node.options.length > 3) {
        errors.push(`${node.id} must have 2–3 options`)
      }
      const mergeTargets = new Set<string>()
      for (const option of node.options) {
        const response = flow.nodes[option.next]
        if (!response) {
          errors.push(`${node.id}/${option.id} points to missing node ${option.next}`)
        } else if (response.type !== 'dialogue') {
          errors.push(`${node.id}/${option.id} must lead to a dialogue response`)
        } else {
          mergeTargets.add(response.next)
        }
      }
      if (mergeTargets.size !== 1) errors.push(`${node.id} branches must merge after one response`)
    }
  }

  const visited = new Set<string>()
  const visiting = new Set<string>()
  let endingReachable = false
  const visit = (id: string) => {
    if (visiting.has(id)) {
      errors.push(`Cycle detected at ${id}`)
      return
    }
    if (visited.has(id)) return
    const node = flow.nodes[id]
    if (!node) return
    visiting.add(id)
    if (node.type === 'ending') endingReachable = true
    if (node.type === 'dialogue') visit(node.next)
    if (node.type === 'choice') node.options.forEach((option) => visit(option.next))
    visiting.delete(id)
    visited.add(id)
  }
  visit(flow.startNodeId)
  if (!endingReachable) errors.push('No ending is reachable from the start node')
  for (const node of nodes) {
    if (!visited.has(node.id)) errors.push(`Unreachable node: ${node.id}`)
  }
  return { valid: errors.length === 0, errors, choiceCount: choices.length }
}

export const choiceResultFor = (
  flow: StoryFlow,
  selection: StorySelection
): StoryChoiceResult | null => {
  const node = flow.nodes[selection.pointId]
  if (!node || node.type !== 'choice') return null
  const option = node.options.find((candidate) => candidate.id === selection.optionId)
  if (!option) return null
  return {
    pointId: node.id,
    optionId: option.id,
    englishText: option.englishText,
    japaneseText: option.japaneseText,
    naturalExpression: option.naturalExpression,
    feedback: option.feedback,
    affectionChange: option.affectionChange,
    trustChange: option.trustChange,
    englishXp: option.englishXp,
    learningCue: node.learningCue
  }
}

export const storyChoiceResults = (flow: StoryFlow, selections: StorySelection[]) =>
  selections
    .map((selection) => choiceResultFor(flow, selection))
    .filter((result): result is StoryChoiceResult => result !== null)

export const legacyChoiceFromStoryResult = (result: StoryChoiceResult): Choice => ({
  id: result.optionId,
  englishText: result.englishText,
  japaneseText: result.japaneseText,
  affectionChange: result.affectionChange,
  trustChange: result.trustChange,
  englishXp: result.englishXp,
  feedback: result.feedback,
  naturalExpression: result.naturalExpression,
  explanation: result.learningCue.explanationJa,
  heroineResponse: '',
  heroineResponseJa: '',
  heroineExpression: 'smile'
})

export const savedSelections = (results: StoryChoiceResult[] | undefined): StorySelection[] =>
  (results ?? []).map((result) => ({ pointId: result.pointId, optionId: result.optionId }))
