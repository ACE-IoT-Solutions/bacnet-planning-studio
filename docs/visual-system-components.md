# Visual-system component snapshots

This application keeps local components so standalone builds do not require a sibling repository checkout.

`src/components/AceNumberInput.vue` is an unchanged snapshot of `ace-visual-system/src/components/AceNumberInput.vue` from revision `964877c7861acfa96ce2308f9367868dce2f92f5`. Update it from the canonical source when adopting visual-system fixes; keep app-specific behavior outside that file.

`PrimerNumberField.vue` adds the primer's associated field label, accessible step-button names, existing token aliases, and required-number behavior. Empty edits remain editable while focused; the simulator keeps its last valid number and restores it when leaving an empty field. The electrical and timing labs use integer steps for counts, 0.05 V steps for source levels, 10 m steps for cable length, and 0.5 ms steps for token-use delay.
