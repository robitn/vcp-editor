use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Border {
    pub row_start: i32,
    pub column_start: i32,
    pub row_span: i32,
    pub column_span: i32,
    pub fill: String,
    pub outline_color: String,
    pub outline_thickness: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub plc_word: Option<PlcWord>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlcWord {
    pub number: i32,
    pub color: String,
    pub fontsize: i32,
    pub font: String,
    pub fontstyle: String,
    pub verticalalignment: String,
    pub horizontalalignment: String,
    pub marginbottom: i32,
    pub percentage: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Image {
    pub row_start: i32,
    pub column_start: i32,
    pub row_span: i32,
    pub column_span: i32,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Button {
    pub row: i32,
    pub column: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub row_span: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub column_span: Option<i32>,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default_image: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OnClick {
    pub opacity: i32,
    pub outline_color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OnHover {
    pub opacity: i32,
    pub outline_color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VcpDocument {
    pub background: String,
    pub column_count: i32,
    pub row_count: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub on_click: Option<OnClick>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub on_hover: Option<OnHover>,
    #[serde(default)]
    pub borders: Vec<Border>,
    #[serde(default)]
    pub images: Vec<Image>,
    #[serde(default)]
    pub buttons: Vec<Button>,
}

impl Default for VcpDocument {
    fn default() -> Self {
        VcpDocument {
            background: "#E9E0B7".to_string(),
            column_count: 6,
            row_count: 14,
            on_click: Some(OnClick {
                opacity: 100,
                outline_color: "#000000".to_string(),
            }),
            on_hover: Some(OnHover {
                opacity: 100,
                outline_color: "#ffffff".to_string(),
            }),
            borders: Vec::new(),
            images: Vec::new(),
            buttons: Vec::new(),
        }
    }
}
