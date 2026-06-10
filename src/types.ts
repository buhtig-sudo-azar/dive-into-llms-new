/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TokenInfo {
  id: number;
  text: string;
  color: string;
  bytes: string;
}

export interface EmbeddingPoint {
  word: string;
  x: number; // projected 2D x (-1 to 1)
  y: number; // projected 2D y (-1 to 1)
  category: 'vector-math' | 'fruits' | 'technology' | 'animals' | 'custom';
  originalEmbedding?: number[];
}

export interface AttentionWeight {
  fromToken: string;
  toToken: string;
  weight: number;
}

export interface LogitValue {
  token: string;
  probability: number;
  originalProbability: number;
  cumulative: number;
  status: 'active' | 'filtered_top_k' | 'filtered_top_p' | 'selected';
}

export interface DocumentChunk {
  id: string;
  title: string;
  text: string;
  tag: string;
  similarity?: number;
}

export interface AgentStep {
  type: 'thought' | 'mcp-call' | 'mcp-response' | 'observation' | 'answer';
  title: string;
  message: string;
  detail?: string;
  timestamp: string;
}
