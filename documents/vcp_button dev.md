
# **VCP Button XML — Developer Documentation**

## Overview

A `<vcp_button>` describes how a Virtual Control Panel (VCP) button behaves in CNC12.
Buttons may include:

* **Functional bindings** (to PLC inputs/outputs or VCP events)
* **LED indicators**
* **Image swapping behaviors** (press-state, ON/OFF state, input-driven state)
* **Optional removal of LED overlay**

This page documents all supported tags and their behavior.

---

# **1. `<vcp_button>` Structure**

A minimal button:

```xml
<vcp_button>
</vcp_button>
```

Everything else is optional and additive.

---

# **2. Event Binding**

### **Tag**

```xml
<skin_event_num>###</skin_event_num>
```

### **Purpose**

Connects this VCP button to a specific CNC12 event/action (jog, toggle, feed hold, etc.)

### **Notes**

* Can appear anywhere inside `<vcp_button>`.
* Required for most interactive buttons.

---

# **3. PLC Output Binding**

Wraps all output-controlled behaviors.

### **Block**

```xml
<plc_output>
    <number>####</number>
    <!-- Optional: LED or output-state images -->
</plc_output>
```

### **When to use**

* Button triggers or reflects a PLC output.

---

# **3.1 LED Indicator (Output-Driven LED)**

Inside `<plc_output>`:

```xml
<color_on>#RRGGBB</color_on>
<color_off>#RRGGBB</color_off>
```

### **Behavior**

* VCP draws a circular LED overlay on top of the button SVG.
* LED uses built-in radial gradient (not editable).
* LED responds to the assigned output’s ON/OFF state.

### **Removing the LED**

Remove `<color_on>` and `<color_off>`, or remove the `<plc_output>` block entirely.

---

# **3.2 Output-State Image Swapping**

```xml
<image_on>filename.svg</image_on>
<image_off>filename.svg</image_off>
```

### **Behavior**

Swaps the entire button graphic depending on the **PLC output's state**.

### **Use cases**

* Replaces LED indicator with more expressive “ON” / “OFF” art.

---

# **4. PLC Input Binding**

Wraps all input-controlled behaviors.

### **Block**

```xml
<plc_input>
    <number>###</number>
    <image_on>...</image_on>
    <image_off>...</image_off>
</plc_input>
```

### **Behavior**

* Turns button into an *indicator* rather than an actuator.
* Image changes based on input TRUE/FALSE state.

### **Use cases**

* Probe trip indicator
* Safety-door indicator
* Limit switch status

---

# **5. Click-Only Swap Image (Pressed-State Graphic)**

### **Tag**

```xml
<on_click_swap>filename.svg</on_click_swap>
```

### **Behavior**

* Displays an alternate SVG *only while the button is being pressed*.
* Does not rely on PLC outputs or inputs.

### **Use cases**

* Visual feedback during momentary press
* “Button depress” effect
* Temporary highlight/flash

### **Notes**

* Works alongside all other features (LED, image_on/off, etc.)

---

# **6. LED Removal**

To fully remove LED functionality:

```xml
<vcp_button>
    <skin_event_num>20</skin_event_num>
</vcp_button>
```

### **Rules**

* Remove the `<plc_output>` block to eliminate LED control.
* If output binding is needed but LED should not exist, omit `color_on` & `color_off`.

---

# **7. Complete Feature Matrix**

| Feature              | Tag(s)                          | Where        | Purpose                     |
| -------------------- | ------------------------------- | ------------ | --------------------------- |
| VCP function binding | `<skin_event_num>`              | root         | Maps button to CNC12 action |
| PLC output binding   | `<plc_output><number>`          | output block | Connects button to output   |
| LED indicator        | `<color_on>`, `<color_off>`     | output block | LED reflects output state   |
| Output image swap    | `<image_on>`, `<image_off>`     | output block | Swap art based on output    |
| PLC input binding    | `<plc_input><number>`           | input block  | Button used as indicator    |
| Input image swap     | `<image_on>`, `<image_off>`     | input block  | Swap art based on input     |
| Pressed-state swap   | `<on_click_swap>`               | root         | Temporary press graphic     |
| No LED               | (omit `<plc_output>` or colors) | —            | Removes LED overlay         |

---

# **8. Best Practices**

### **1. Keep SVGs clean**

* Use groups and layer names consistently.
* Raster effects increase load time.

### **2. Keep filenames unique**

Avoid collisions across button folders:

```
work_light.svg
work_light_off.svg
x_positive_swap.svg
```

### **3. Do not embed LED graphics in SVGs**

The VCP overlays them automatically when enabled.

### **4. Use input-based buttons for anything “indicator-only”**

They do not require `<skin_event_num>` unless also clickable.

### **5. Always restart CNC12 after editing XML**

Changes are not detected dynamically.

---

# **9. Example Library of Templates**

### **Standard action button with no LED**

```xml
<vcp_button>
    <skin_event_num>101</skin_event_num>
</vcp_button>
```

### **Button with LED indicator**

```xml
<vcp_button>
    <skin_event_num>20</skin_event_num>
    <plc_output>
        <number>1076</number>
        <color_on>#00FF00</color_on>
        <color_off>#000000</color_off>
    </plc_output>
</vcp_button>
```

### **Button with press-swap**

```xml
<vcp_button>
    <skin_event_num>39</skin_event_num>
    <on_click_swap>x_positive_swap.svg</on_click_swap>
</vcp_button>
```

### **Button with ON/OFF image swap**

```xml
<vcp_button>
    <skin_event_num>20</skin_event_num>
    <plc_output>
        <number>1076</number>
        <image_on>work_light.svg</image_on>
        <image_off>work_light_off.svg</image_off>
    </plc_output>
</vcp_button>
```

### **Input-driven status indicator**

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
