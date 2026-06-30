export interface FriendLinkItem {
  url: string
  avatar: string
  name: string
  blog?: string
  desc?: string
  descr?: string
  color?: string
  siteshot?: string
}

export interface FriendLinkGroup {
  name?: string
  desc?: string
  links: FriendLinkItem[]
}

export interface LinksFrontmatter {
  layout?: string
  title?: string
  icon?: string
  cover?: string
  comment?: boolean
  random?: boolean
  errorImg?: string
  linkGroups?: FriendLinkGroup[]
  links?: FriendLinkItem[]
}

export interface LinksDetail {
  frontmatter: LinksFrontmatter
  linkGroups: FriendLinkGroup[]
  source?: string
}
