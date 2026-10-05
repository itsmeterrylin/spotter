# Judge calibration

A judge acts only after human labels show it agrees with people. The label queue mixes the judge's passes and fails, so the true-negative rate is measured on real negatives.

```mermaid
stateDiagram-v2
  [*] --> draft: promote from issue, or write a criterion
  draft --> draft: preview on a sample, files nothing
  draft --> labeling: PM starts labeling
  labeling --> labeling: label mixed queue (half fails, half passes)
  labeling --> live: test split TPR and TNR at 0.9 or above, minimum labels per class
  live --> draft: criterion edited (new version)
  live --> paused: PM pauses
  paused --> live: PM resumes
  note right of live
    Only live judges score production,
    open issues, or count in verify
  end note
```

Today the code has judge versions, human labels, and calibration rates (`judge_calibration`). The `draft` and `live` gate is planned.
