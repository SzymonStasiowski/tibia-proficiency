export type Vocation = 'Knight' | 'Paladin' | 'Sorcerer' | 'Druid'

export interface CharmSelection {
  charmId: string
  targetMonsters: string[]
}

export interface BuildConfig {
  vocation: Vocation
  level?: number
  equipment: Record<string, string>        // slot -> itemId
  imbuements: Record<string, string[]>     // itemId -> imbuementIds
  charms: CharmSelection[]
  weaponPerks: string[]                    // perk ids from existing table
}

