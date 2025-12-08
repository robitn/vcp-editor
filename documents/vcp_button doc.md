
# **Extracted Features of `<vcp_button>` Elements**

The XML examples show **five major feature groups** for VCP buttons:

---

## **1. PLC-Controlled LED Indicator Light**

A `<vcp_button>` may include a `<plc_output>` block that drives a small LED overlay rendered by the VCP engine.

### **Tags**

* `<plc_output>`

  * `<number>` – The PLC output number linked to this button.
  * `<color_on>` – LED color (HEX) when output is ON.
  * `<color_off>` – LED color (HEX) when output is OFF.

### **Notes**

* LED is *not part of the SVG*; the VCP overlays it automatically.
* LED overlay has a hardcoded radial-gradient effect.
* LED can be removed by deleting the `<plc_output>` block.

---

## **2. Removing the LED Indicator**

To eliminate the LED indicator entirely:

### **Action**

Remove the entire block:

```xml
<plc_output>
    <number>xxxx</number>
    <color_on>#xxxxxx</color_on>
    <color_off>#xxxxxx</color_off>
</plc_output>
```

After removal the button contains only:

```xml
<vcp_button>
</vcp_button>
```

---

## **3. “On-Click” Image Swap (Momentary Press Graphic Swap)**

A `<vcp_button>` may define a temporary alternate SVG to display *while the button is pressed*.

### **Tag**

* `<on_click_swap>` — Name of SVG file to show only while the mouse/finger is pressing the button.

### **Purpose**

* Used for UI effects (e.g., button looks different during press).

### **Example**

```xml
<on_click_swap>x_positive_swap.svg</on_click_swap>
```

---

## **4. Output-State-Based Image Swapping (Persistent ON/OFF Graphics)**

Instead of an LED, the button may use **two different SVG graphics** depending on whether its output is ON or OFF.

### **Tags (inside `<plc_output>`)**

* `<image_on>` – SVG displayed when the PLC output is ON.
* `<image_off>` – SVG displayed when the PLC output is OFF.

### **Behavior**

* Works similarly to an LED indicator, but swaps entire images.

### **Example**

```xml
<plc_output>
    <number>1076</number>
    <image_on>work_light.svg</image_on>
    <image_off>work_light_off.svg</image_off>
</plc_output>
```

---

## **5. Input-Driven Image Swap (Indicator Light Using Images)**

A `<vcp_button>` can also be driven by a PLC **input** instead of an output.
This allows a button to function purely as a status indicator.

### **Tags**

Inside `<plc_input>`:

* `<number>` – PLC input number monitored.
* `<image_on>` – Image used when input is active.
* `<image_off>` – Image used when input is inactive.

### **Example**

```xml
<vcp_button>
    <plc_input>
        <number>7</number>
        <image_on>probe_trip.svg</image_on>
        <image_off>probe_clear.svg</image_off>
    </plc_input>
</vcp_button>
```

---

## **6. Event Mapping**

Many buttons include:

* `<skin_event_num>` — Associates the button with a specific VCP event/action.

### **Purpose**

* Links the button to CNC12 functions (jogging, toggling a feature, etc.).
* May appear before or after other blocks in examples.

### **Examples**

```xml
<skin_event_num>39</skin_event_num>
<skin_event_num>20</skin_event_num>
<skin_event_num>67</skin_event_num>
<skin_event_num>207</skin_event_num>
```

---

# **Full Feature Summary (All Tags Identified)**

| Feature                     | Tag(s)                                           | Description                                               |
| --------------------------- | ------------------------------------------------ | --------------------------------------------------------- |
| **LED indicator**           | `<plc_output>`, `<color_on>`, `<color_off>`      | VCP overlays LED showing output ON/OFF.                   |
| **Remove LED**              | (delete `<plc_output>` block)                    | Removes LED indicator entirely.                           |
| **Output binding**          | `<plc_output> <number>`                          | Links button to a PLC output.                             |
| **Input binding**           | `<plc_input> <number>`                           | Links button to a PLC input for indicator-style behavior. |
| **Click-swap image**        | `<on_click_swap>`                                | Temporary alternate SVG shown while pressed.              |
| **Output-state image swap** | `<image_on>`, `<image_off>`                      | Persistent ON/OFF SVG depending on PLC output state.      |
| **Input-state image swap**  | `<image_on>`, `<image_off>` inside `<plc_input>` | Swaps images based on PLC input state.                    |
| **VCP event mapping**       | `<skin_event_num>`                               | Assigns VCP function to this button.                      |

---
