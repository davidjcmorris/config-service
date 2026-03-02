# Workflow Status

## Overview
This document defines the collaborative workflow between the developer and the AI assistant for managing work items (stories). It describes the stages, transition rules, git protocol, and WIP guidelines.

## Work Item Structure
Work items are stored as individual markdown files in the `changes/` folder.
Naming convention: `NNN-short_description.md` (e.g. `001-first_story.md`)

Active stories live in the `changes/` root. Completed stories are moved to `changes/done/` as part of the manual Done acceptance step.

Each file contains:
- **Title** — short descriptive name
- **Status** — current state (see below)
- **Description** — what this story delivers
- **Acceptance Criteria** — testable conditions that must be true for Done
- **Notes** — any relevant context, decisions, or links

## Folder Structure

```
changes/
├── 001-active_story.md       ← active stories (any state except Done)
├── 002-another_story.md
└── done/
    └── 000-completed.md      ← manually moved here when marked Done
```

## States

Work items move through the following states in order:

Drafted
Refining ← in-flight
Refined
Planning ← in-flight
Planned
Implementing ← in-flight
Implemented
Testing ← in-flight
Tested
Done

**In-flight states** (present tense "-ing") indicate a stage was started but not yet completed. If a work item is found in an in-flight state at the start of a session, something was interrupted.

**Completed states** (past tense) indicate the stage finished successfully and changes were committed.

**Drafted** is the initial state when a file is first created. The act of drafting happens before the file exists, so Drafting is never saved as a file state.

**Done** requires explicit human (product owner) acceptance that the work meets the intent of the acceptance criteria — i.e. not just that tests pass. 
The human:
1. Reviews the work against the Acceptance Criteria
2. Updates the Status in the story file to Done
3. Moves the file to `changes/done/`
4. Commits and pushes

## Transition Rules

### General rules
- Before starting any new state, update the story file to the in-flight version of that state and commit immediately
- On successful completion of a state, update the story file to the completed version, then commit and push
- Never skip a state
- If a state needs to be restarted (i.e. it shows as in-flight at the start), roll back using the targeted rollback command (see Git Protocol) — never use a blanket `git checkout .`
- There should never be more than one in-flight item at any time

### Refining (transition from Drafted → Refined) 
- Story file has human-created Title, Description, and initial Acceptance Criteria
- Assistant refines the Acceptance Criteria to ensure they are clear, testable, and complete
- Assistant should ask clarifying questions before proceeding

### Planning (transition from Refined → Planned)
- Assistant reads the story and all relevant memory files
- Assistant produces a detailed implementation plan within the story file
- Plan includes: files to change, functions to add/edit, test cases to cover
- Plan must not include changes outside the scope of this story

### Implementing (transition from Planned → Implemented) 
- Assistant implements the plan
- Code changes only — no test execution yet
- Follows all patterns in memory files and clinerules

### Testing (transition from Implemented → Tested) 
- Assistant runs the full test suite
- If tests fail, fixes are made before proceeding
- All existing tests must continue to pass
- New tests must be added for new functionality

### Approving (transition from Tested → Done)
- **Manual step** — human reviews the work against the Acceptance Criteria
- If satisfied: update Status to Done, move file to `changes/done/`, commit and push
- If not satisfied: add notes to the story file and reset Status to the appropriate earlier state for rework

## Git Protocol

### Start of each state
```bash
git add .
git commit -m "task: begin [state] [story-id]"
```

### End of each state
```bash
git add .
git commit -m "task: completed [state] [story-id]" 
git push
```

The `git add .` ensures code changes, story file state updates, and any other story files added or updated in the meantime are always included.

### Targeted rollback
Never use a blanket `git checkout .` as this would wipe story and memory file updates. Instead use:

```bash
git checkout . $(git ls-files --modified | grep -v '^changes/' | grep -v '^memory/' | grep -v '^\.clinerules/' | grep -v '^agents\.md')
```

This resets all modified code files dynamically based on what git knows is modified, while protecting:
- `changes/` — story files
- `memory/` — context framework files
- `.clinerules/` — coding rules
- `agents.md` — context entry point

Because it is driven by `git ls-files --modified`, it automatically covers any new components or folders added to the project in future — no hardcoding required.

## Session Startup Protocol

When asked "what's the next step?" or "what is our status?", the assistant should:

1. Read all memory files and clinerules
2. Scan `changes/` folder for all story files and their states
3. Check for in-flight states:
   - **One in-flight item found:** report and ask:
     - "Roll back to last clean commit and restart?" → perform targeted rollback and auto-proceed to that state
     - "Pause to investigate?" → stop and wait for instructions
   - **Multiple in-flight items found:** this indicates a serious problem — always pause and ask the human to investigate before taking any action
4. Assess WIP across all states and report
5. Identify the story furthest through the workflow
6. Propose the next action and await confirmation
7. On confirmation, begin the next state

## WIP Guidelines

The assistant should report WIP counts and apply opinionated prompts as follows:
```
| State              | Acceptable | Prompt Strength                                  |
|--------------------|------------|--------------------------------------------------|
| Drafted            | 1-2        | Mild — consider refining before drafting more    |
| Refined            | 1-2        | Mild — consider planning before refining more    |
| Planned            | Many       | None — this is the 'ready' queue                 |
| Implemented        | 1          | Strong — finish testing before implementing more |
| Single in-flight   | 1          | Warning — something was interrupted              |
| Multiple in-flight | 2+         | Stop — investigate before proceeding             |
```

When WIP is high, the assistant should report the count and nudge toward finishing before starting something new, but ultimately defer to the human's decision.

## After Completing a State

On successful completion of any state (except Tested → Done), the assistant should:

1. Update story file to completed state
2. Follow the Git Protocol for end of each state
3. Report completion and current WIP counts
4. Ask: "Would you like to continue this story to [next state], or work on another story?"

If other stories are Implemented or in-flight, the prompt should reflect the WIP concern appropriately.

## Future Considerations
- Explore merging Implementing and Testing into a single state to avoid pushing potentially broken code to the cloud
- Explore TDD approach — write failing tests first, implement only enough to pass each test, then progress to the next
- Introduce higher grouping levels (Initiative → Epic → Feature → Story) once the story-level workflow is proven
- Cascade state transitions across grouped work items — stories under a feature, features under an epic — but only from Planned state, never in-flight
- CI/CD automation of Tested → Done via staging deployment and smoke tests, enabling automatic promotion to production on successful testing