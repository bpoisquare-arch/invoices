import fs from 'fs'
import path from 'path'
import { PREDEFINED_AGENTS } from '@/lib/constants/aimt-agents'

export type CommissionType = 'percentage' | 'fixed'

export interface AgentCommissionRule {
  agentName: string
  type: CommissionType
  rate: number // If percentage: e.g. 15 for 15%. If fixed: e.g. 500 for $500 AUD
  notes?: string
  updatedAt: string
}

const COMMISSION_SETTINGS_FILE = path.join(
  process.cwd(),
  'data',
  'aimt_agent_commissions.json'
)

// In-memory cache for fast reads
let inMemoryRules: Record<string, AgentCommissionRule> | null = null

function readRulesFromFile(): Record<string, AgentCommissionRule> {
  try {
    if (!fs.existsSync(COMMISSION_SETTINGS_FILE)) {
      return {}
    }
    const raw = fs.readFileSync(COMMISSION_SETTINGS_FILE, 'utf-8')
    return JSON.parse(raw) || {}
  } catch (error) {
    console.error('Error reading agent commission rules file:', error)
    return {}
  }
}

function writeRulesToFile(rules: Record<string, AgentCommissionRule>): void {
  try {
    const dir = path.dirname(COMMISSION_SETTINGS_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(COMMISSION_SETTINGS_FILE, JSON.stringify(rules, null, 2), 'utf-8')
  } catch (error) {
    console.error('Error writing agent commission rules file:', error)
  }
}

/**
 * Get all configured agent commission rules mapped by agent name.
 */
export async function getAllAgentCommissionRules(): Promise<Record<string, AgentCommissionRule>> {
  if (inMemoryRules) {
    return inMemoryRules
  }
  const rules = readRulesFromFile()
  inMemoryRules = rules
  return rules
}

/**
 * Get the commission rule for a specific agent.
 */
export async function getAgentCommissionRule(agentName: string): Promise<AgentCommissionRule | null> {
  const rules = await getAllAgentCommissionRules()
  return rules[agentName] || null
}

/**
 * Save or update the commission rule for a specific agent.
 */
export async function saveAgentCommissionRule(params: {
  agentName: string
  type: CommissionType
  rate: number
  notes?: string
}): Promise<AgentCommissionRule> {
  const rules = await getAllAgentCommissionRules()

  const updatedRule: AgentCommissionRule = {
    agentName: params.agentName.trim(),
    type: params.type,
    rate: Math.max(0, Number(params.rate) || 0),
    notes: params.notes?.trim() || '',
    updatedAt: new Date().toISOString(),
  }

  rules[params.agentName.trim()] = updatedRule
  inMemoryRules = rules
  writeRulesToFile(rules)

  return updatedRule
}

/**
 * Reset / delete commission rule for a specific agent.
 */
export async function deleteAgentCommissionRule(agentName: string): Promise<boolean> {
  const rules = await getAllAgentCommissionRules()
  if (rules[agentName]) {
    delete rules[agentName]
    inMemoryRules = rules
    writeRulesToFile(rules)
    return true
  }
  return false
}

