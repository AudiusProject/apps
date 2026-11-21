import { Buffer } from 'buffer'

import { sha256 } from '@noble/hashes/sha256'
import { bytesToHex as toHex } from '@noble/hashes/utils'

class NodeScore {
  node: Buffer
  score: number

  constructor(node: Buffer) {
    this.node = node
    this.score = 0
  }
}

export class RendezvousHash {
  private readonly nodes: NodeScore[] = []

  constructor(...nodes: string[]) {
    this.add(...nodes)
  }

  add(...nodes: string[]): void {
    for (const node of nodes) {
      this.nodes.push(new NodeScore(Buffer.from(node)))
    }
  }

  getNodes(): string[] {
    return this.nodes.map((nodeScore) => nodeScore.node.toString())
  }

  get(key: string): string {
    const first = this.getN(1, key)[0]
    return first ?? ''
  }

  getN(n: number, key: string): string[] {
    return this.rendezvous256(key).slice(0, n)
  }

  rendezvous256(key: string) {
    const tuples = this.nodes.map((n) => {
      const hostName = n.node.toString()
      return [hostName, toHex(sha256(`${hostName}${key}`))]
    })
    tuples.sort((t1, t2) => {
      const [aHost, aScore] = t1
      const [bHost, bScore] = t2
      if (aScore === bScore) {
        return aHost! < bHost! ? -1 : 1
      }
      return aScore! < bScore! ? -1 : 1
    })
    return tuples.map((t) => t[0]!)
  }
}

export default RendezvousHash
