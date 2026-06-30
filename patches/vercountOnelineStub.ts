/**
 * 空实现：禁用 Vercount 的 PeerJS 在线人数统计。
 */
export type EventCallback = (event: { detail: unknown }) => void

export class Oneline {
  constructor(_url: string) {}

  on(_eventName: string, _callback: EventCallback): void {}

  destroy(): void {}
}

export default Oneline
