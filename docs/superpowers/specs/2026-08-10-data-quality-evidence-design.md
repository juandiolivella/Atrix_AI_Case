# Data Quality Evidence Design

## Purpose

Make every data-quality suggestion easier to validate by ordering findings by severity and exposing the evidence behind each proposed correction.

## Experience

- Sort issues in the visible review list by severity: High, Medium, Low; retain stable order within each severity.
- Add a **View evidence** control to each issue card.
- The Asset naming variants evidence view shows four raw labels and their suggested common value, `OVT-209`.
- After **Approve**, that view presents `OVT-209` as the applied normalized value with a purple highlight. After **Keep raw value**, raw source labels remain visible and the applied value is not claimed.
- The state remains browser-session only and the same card shape can receive evidence generated for future uploads.

## Validation

The server-rendered page and Vercel static output must include the evidence control and the raw-to-normalized table labels. Existing build, test, and lint checks stay green.
