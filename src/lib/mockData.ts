export interface Perk {
  perk_name: string
  perk_description: string
  main_icon_url: string
  type_icon_url: string | null
}

export interface Weapon {
  id: string
  name: string
  url: string
  weapon_type: string
  perks_quantity: string
  image_url: string
  proficiency_perks_by_slot: Perk[][]
}

export interface WeaponCategory {
  id: string
  name: string
  icon: string
  weaponCount: number
  badge: string
  color: string
  bgColor: string
}

export interface CommunityStats {
  totalVotesToday: number
  mostVotedWeapon: string
  recentWeapons: string[]
  trendingDebate: string
}

// Mock weapon data based on the provided example
export const mockWeapons: Weapon[] = [
  {
    id: "abyss-hammer",
    name: "Abyss Hammer",
    url: "https://tibia.fandom.com/wiki/Abyss_Hammer",
    weapon_type: "Club Weapons",
    perks_quantity: "2",
    image_url: "https://static.wikia.nocookie.net/tibia/images/8/87/Abyss_Hammer.gif/revision/latest?cb=20080503181043&path-prefix=en",
    proficiency_perks_by_slot: [
      [
        {
          perk_name: "Defence",
          perk_description: "+1 defence",
          main_icon_url: "https://static.wikia.nocookie.net/tibia/images/c/c2/Weapon_Proficiency_-_General.png/revision/latest/window-crop/width/32/x-offset/32/y-offset/0/window-width/32/window-height/32?cb=20250628185358&path-prefix=en&format=original",
          type_icon_url: null
        }
      ],
      [
        {
          perk_name: "Club Extra Damage Auto-Attack",
          perk_description: "+4% of your Club Fighting as extra damage for auto-attacks",
          main_icon_url: "https://static.wikia.nocookie.net/tibia/images/7/7a/Weapon_Proficiency_-_Gain_Extra_Damage_Auto-Attack.png/revision/latest/window-crop/width/32/x-offset/64/y-offset/0/window-width/32/window-height/32?cb=20250629110320&path-prefix=en&format=original",
          type_icon_url: null
        }
      ],
      [
        {
          perk_name: "Auto-Attack Critical Hit Chance",
          perk_description: "+1% critical hit chance for auto-attacks",
          main_icon_url: "https://static.wikia.nocookie.net/tibia/images/c/c2/Weapon_Proficiency_-_General.png/revision/latest/window-crop/width/32/x-offset/192/y-offset/0/window-width/32/window-height/32?cb=20250628185358&path-prefix=en&format=original",
          type_icon_url: null
        },
        {
          perk_name: "Life Gain on Kill",
          perk_description: "+5 hit points on kill",
          main_icon_url: "https://static.wikia.nocookie.net/tibia/images/c/c2/Weapon_Proficiency_-_General.png/revision/latest/window-crop/width/32/x-offset/448/y-offset/0/window-width/32/window-height/32?cb=20250628185358&path-prefix=en&format=original",
          type_icon_url: null
        }
      ]
    ]
  }
]

// Weapon categories with visual styling
export const weaponCategories: WeaponCategory[] = [
  {
    id: "swords",
    name: "Swords",
    icon: "⚔️",
    weaponCount: 87,
    badge: "🔥 Trending",
    color: "text-red-600",
    bgColor: "bg-red-50 hover:bg-red-100 border-red-200"
  },
  {
    id: "axes",
    name: "Axes",
    icon: "🪓",
    weaponCount: 72,
    badge: "⭐ Popular",
    color: "text-orange-600",
    bgColor: "bg-orange-50 hover:bg-orange-100 border-orange-200"
  },
  {
    id: "bows",
    name: "Bows",
    icon: "🏹",
    weaponCount: 45,
    badge: "🆕 Updated",
    color: "text-green-600",
    bgColor: "bg-green-50 hover:bg-green-100 border-green-200"
  },
  {
    id: "clubs",
    name: "Clubs",
    icon: "🔨",
    weaponCount: 65,
    badge: "⚡ Active",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50 hover:bg-yellow-100 border-yellow-200"
  },
  {
    id: "crossbows",
    name: "Crossbows",
    icon: "🎯",
    weaponCount: 38,
    badge: "📊 Stats",
    color: "text-purple-600",
    bgColor: "bg-purple-50 hover:bg-purple-100 border-purple-200"
  },
  {
    id: "wands",
    name: "Wands",
    icon: "✨",
    weaponCount: 52,
    badge: "🎯 Precise",
    color: "text-blue-600",
    bgColor: "bg-blue-50 hover:bg-blue-100 border-blue-200"
  },
  {
    id: "rods",
    name: "Rods",
    icon: "🔮",
    weaponCount: 48,
    badge: "🌟 Magic",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50 hover:bg-indigo-100 border-indigo-200"
  },
  {
    id: "spears",
    name: "Spears",
    icon: "🗡️",
    weaponCount: 29,
    badge: "🎲 Rare",
    color: "text-pink-600",
    bgColor: "bg-pink-50 hover:bg-pink-100 border-pink-200"
  }
]

// Community statistics
export const communityStats: CommunityStats = {
  totalVotesToday: 1247,
  mostVotedWeapon: "Falcon Battleaxe",
  recentWeapons: ["Soulmaimer", "Crystalline Sword", "Bow of Destruction"],
  trendingDebate: "Life Leech vs Mana Leech on Soulmaimer"
} 