# Module 3: Defining and using a collaborative workflow

## Table of Contents
- Learning objectives
- Alternatives
- Exercise 1: Define your workflow and how to track status
- Exercise 2: Define your workflow and how to track status
- Exercise 3: Define the status and planning of a work item template
- Exercise 4: Put the workflow to use on a specific task
- Exercise 5: Make adjustments along the way

## Learning objectives
- Design a collaborative workflow to share with your assistant
- Prepare and instruct tools/scripts for your assistant to use

## Alternatives
Because the main take-away from this module is that you experience a disciplined workflow with your assistant, you don't have to create your own process. If you would prefer to use an existing one, we would recommend:
- [Superpowers](https://github.com/obra/superpowers) it isn't over-selling itself, it's really good
- [Beads](https://github.com/steveyegge/beads) Also recommended!
- [Spec Kit](https://github.com/github/spec-kit) from GitHub
- [Agent OS](https://github.com/buildermethods/agent-os) (will still require customisation)

## Exercise 1: `memory/ENV_SCRIPTS.md`
- Describe the environments you're catering for
  - Including all ENV VARs (e.g. in `.env`)
- Document all of the developer scripts/commands used during development
  - Makefile targets, npm/uv/poetry/mise/etc scripts
- Describe how they should be run and when it is appropriate to go off-script

## Exercise 2: `memory/WORKFLOW_STATUS.md`
- Clearly define the stages in your process
  - Include the required inputs and outputs of the stage
  - Include the rules/protocol for transitioning to the next stage
- What is the structure of your work item/story/feature file?
- How are the acceptance criteria formatted and validated?
- What level of status is maintained in this file and where?
  - Recommend to not duplicate a lot of details with other files
  - Recommend pointing to the active work item file
- What is the protocol around building/testing? Acceptable to not address?

## Exercise 3: `changes/001-first_story.md`
- Clearly define the list of tasks and their status
- Decide if any section in the file is task-specific
  - Is it purged after task is complete?
- Decide how to track the active stage

## Exercise 4: Put the workflow to use
- Start with a relatively small piece of work
- Work through your stages identifying where it isn't going smoothly

## Exercise 5: Make adjustments along the way
Hopefully the *reflect/adapt* stage in your process is working. This exercise is a reminder to keep identifying opportunities for improvement and making the change.

