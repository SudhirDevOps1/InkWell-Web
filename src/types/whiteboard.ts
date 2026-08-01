export type ShapeType =
  | "rect"
  | "rounded-rect"
  | "circle"
  | "diamond"
  | "triangle"
  | "hexagon"
  | "cloud"
  | "star"
  | "line"
  | "arrow"
  | "frame"
  | "sticky"
  | "mind-map"
  | "capsule"
  | "parallelogram"
  | "text"
  | "draw"
  | "highlighter"
  | "image"
  | "video"
  | "stamp";

export type ConnectorType = "straight" | "curved" | "orthogonal";

export type AnchorPos = "top" | "right" | "bottom" | "left" | "center";

export type FontFamilyType = "sans" | "mono" | "hand" | "serif" | "display" | "rounded";

export type BrushStyleType = "pen" | "pencil" | "marker" | "brush" | "calligraphy" | "technical";

export type TextAlignType = "left" | "center" | "right";

export type StrokeStyleType = "solid" | "dashed" | "dotted";

export type GridType = "dots" | "squares" | "blueprint" | "blank";

export interface Point {
  x: number;
  y: number;
}

export interface WbElement {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  color: string;           // Stroke / primary color
  fill: string;            // Fill color
  strokeWidth: number;     // 1 to 12
  strokeStyle: StrokeStyleType;
  opacity: number;         // 0.1 to 1.0
  fontFamily?: FontFamilyType;
  fontSize?: number;
  textColor?: string;
  textAlign?: TextAlignType;
  bold?: boolean;
  italic?: boolean;
  locked?: boolean;
  rotation?: number;
  groupId?: string;
  imageSrc?: string;
  imageAlt?: string;
  // For freehand drawing or highlighter
  points?: Point[];
  brushStyle?: BrushStyleType;
  // For stamp icon / emoji
  stampIcon?: string;
  // For frames
  frameTitle?: string;
}

export interface WbConn {
  id: string;
  fromId: string;
  toId: string;
  fromAnchor: AnchorPos;
  toAnchor: AnchorPos;
  type: ConnectorType;
  color: string;
  strokeWidth: number;
  strokeStyle: StrokeStyleType;
  label?: string;
  arrowEnd?: boolean;
  arrowStart?: boolean;
}

export interface WbBoard {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  els: WbElement[];
  conns: WbConn[];
  gridType: GridType;
  zoom: number;
  pan: Point;
}

export interface HistoryEntry {
  els: WbElement[];
  conns: WbConn[];
}

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  avatar: string;
  cursor: Point;
  active: boolean;
}

export interface TemplateOption {
  id: string;
  title: string;
  category: "Software" | "Business" | "Study" | "Brainstorm";
  description: string;
  icon: string;
  nodeCount: number;
}
