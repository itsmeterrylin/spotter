# Issue lifecycle

Agents file and attach. Humans confirm, dismiss, reopen, and resolve. A dismissed issue never returns to the inbox. A match increments its hit count instead.

```mermaid
stateDiagram-v2
  [*] --> open: finder or judge files it
  open --> confirmed: PM confirms
  open --> dismissed: PM dismisses with a reason
  confirmed --> dismissed: PM dismisses
  confirmed --> fixing: agent records a pull request
  fixing --> verifying: agent records the release
  verifying --> resolved: post-release rate clears the bar
  verifying --> fixing: replay or production check fails
  resolved --> verifying: suspected regression, PM reopens
  dismissed --> open: PM reopens
  dismissed --> dismissed: finder match, hit count +1
  note right of confirmed
    Promote: an uncovered issue
    gets a draft judge
  end note
```

Today the code has `open`, `confirmed`, and `dismissed`. The other states are planned.
