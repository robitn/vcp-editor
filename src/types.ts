export interface PlcWord {
  number: number;
  color: string;
  fontsize: number;
  font: string;
  fontstyle: string;
  verticalalignment: string;
  horizontalalignment: string;
  marginbottom: number;
  percentage: boolean;
}

export interface Border {
  row_start: number;
  column_start: number;
  row_span: number;
  column_span: number;
  fill: string;
  outline_color: string;
  outline_thickness: number;
  plc_word?: PlcWord;
}

export interface Image {
  row_start: number;
  column_start: number;
  row_span: number;
  column_span: number;
  path: string;
}

export interface Button {
  row: number;
  column: number;
  row_span?: number;
  column_span?: number;
  name: string;
  file?: string;  // XML file reference (empty if not configured yet)
  default_image?: string;  // Actual image filename from button XML
}

export interface OnClick {
  opacity: number;
  outline_color: string;
}

export interface OnHover {
  opacity: number;
  outline_color: string;
}

export interface VcpDocument {
  background: string;
  column_count: number;
  row_count: number;
  on_click?: OnClick;
  on_hover?: OnHover;
  borders: Border[];
  images: Image[];
  buttons: Button[];
}

export type ElementType = 'border' | 'image' | 'button' | 'empty';

export interface Selection {
  type: ElementType;
  index?: number;
  row?: number;
  column?: number;
}
