# Module 2: Creating and using a context framework

## Table of Contents
- Learning objectives
- Exercise 1: Assistant collaboration on basic context
- Exercise 2: Create the next context document
- Exercise 3: Auto-load the context framework using a rule
- Exercise 4: Create additional context documents
- Exercise 5: Putting this context to use
- Whoa, not so fast my friend
- Reflection Questions
- Extra Credit

## Learning objectives

- Build narrative and code-related context documents with varying levels of AI assistance
- Write and configure a "rule" that can load other files into the context window
- Build context framework assets that can be used in future projects
- Evaluate the differences in tone, precision, and cost between different models during collaboration

## Exercise 1: Assistant collaboration on basic context
  - Remember to plan first, then act
  - Don't (accidentally) be overly ambitious

### Create `memory/ABOUT.md`
> What do you and the assistant need to know about this project that will inform decisions around priority, design, and quality.

Examples: name, description, justification, personas, domain context, scope

You can give the folder any name, but let's use `memory/` for now.

This context will be incorporated during planning sessions. We don't need to be overly comprehensive here. Remember, the goal of this content is help the assistant be more precise and to mitigate any high-level ambiguitity about the project.  

#### Steps

1. **Create the `memory/ABOUT.md` file**

    ```sh
    mkdir memory && touch memory/ABOUT.md
    ```

2. **Define the document's structure & initial content** (_OPTIONAL_)

- Open `memory/ABOUT.md` in your editor and add some of the content and/or create headers for the sections you would like included.

- Another option is to include placeholders along with instructions for the assistant that they should apply when they are reading and updating the file. If you do this, be sure you make it easy to delineate between the placeholders/instructions and content it should not edit.

- If you do this step and spend a bit of time on this document, it's recommended you at least stage (or commit) your changes before moving on to the next step.

3. **Collaborate with the assistant** (_OPTIONAL_)

    _This step is only optional if you are already happy with the document in its current state._

- Ensure your Git working tree is clean and open the `memory/ABOUT.md` in your editor. Choose a model for planning and document writing. 

- Construct a prompt that contains all of the information needed to complete the document and requests the assistant provide a plan for how they would edit the doc. This may be a voice message recording transcript or a hand-typed prompt with concise formatting and terse statements. One will cost more (tokens), but precision will depend on the quality of the prompt and the model fulfilling it.

- Send the prompt with an `@` reference to the file (`@memory/ABOUT.md`) so the assistant doesn't have to spend more tokens searching for it.

- Review the changes and decide to revert them and try again after some edits or accept them and continue to the next step.
  - TODO: add specific reflection questions to consider during the review

- Save and commit changes.

## Exercise 2: Create the next context document

### What's on top?
> What is the first thing you would like to change or get clear about regarding the code base?

Examples: testing approach, pattern choice, data storage, api routes, new non-functional behaviour

Based on what you would like to change, select the most appropriate document to describe these decisions.

- **For Planning**
  - `memory/DOMAIN.md`
  - `memory/ARCHITECTURE.md`
- **For Changing/acting**
  - `memory/TECHNICAL.md`
  - `memory/TESTING.md`

Follow the same collaborative, plan-first, process used to create `ABOUT.md`. However, this time, based on the document, give the assistant all of the appropriate `@file/paths` so it can use what it learns to populate the document.

### Collaborate with the assistant

This context may be incorporated during planning or act sessions.

We should be as comprehensive as needed, but no moreso. Remember, the goal of this content is help the assistant be more precise without too much fluff that isn't actionable.

Examples of (good and bad) results are **very** helpful.

## Exercise 3: Auto-load the context framework using a rule

### Create a 'rules' file

Most AI-enabled coding tools will have a way to auto-load the contents of files into new context windows. With many, the feature is called a "rule" file (cursorrules, clinerules, CLAUDE.md) and there will likely be a specific folder you need to put it in for the assistant to find it.

We're going to use this feature to auto-load our context files so they will be applied to all of the interactions we have with our assistant.

If you're using Cline:

```sh
mkdir .clinerules && touch .clinerules/memory.md
```

For the contents of `memory.md`, it should briefly describe the purpose of the context framework and the scope and purpose of each of the files. You can see an example of this in `memory_example.md`.

In Cline, select the rules/workflows icon in the lower navbar (the balance/scale icon). Be sure `memory.md` is listed as a workspace rule.

You may need to restart Cline for the changes to take place. Now when you create a new conversation, you will see Cline automatically load the context framework without being told to.

### Ensure the context is being auto-loaded

Restart your editor/tool, be sure you're in a new conversation with your assistant, and ask them to tell you about the goals for the project. You should be able to see it reading the memory into the context window.

## Exercise 4: Create additional context documents

Collaborate with your assistant to appropriately fill in the contents of `memory/ARCHITECTURE.md` and `memory/TECHNICAL.md`. Use collaboration patterns similar to those that created `memory/ABOUT.md` except this time include relevant `@file/paths` to source files that represent the overarching patterns and implementation details.

## Exercise 5: Putting this context to use

Now that your assistant has the context they need in their short-term memory, they are much more capable of collaborating and planning with you on future changes. In addition to exercises 5a and 5b, here are some additional suggestions on how you can practice using your shiny new context framework:

- Create a specific phrases to get it to update its memory when asked.

- Experiement with the context framework. Can you get it to conditionally load memory selectively given your request? 

## Exercise 5a: A web client library

Over the past week, you've been telling your team and colleagues about the new configuration service you've been building. Someone on another team is in a perfect position to beta test the service with their web application. However, the plan was always for the applications to use a client library instead of consuming the API directly. This provides a layer of abstraction that improves the dev experience with the service and provides some safety from breaking changes.

Use the memory context framework to begin planning a client library for the web. The Admin UI can be the first consumer of the client library in preparation for beta testing.

## Exercise 5b: Implement a non-functional requirement (optional)

Create a plan for adding a non-functional requirement such as observability by adding OpenTelemetry support. Or have it publish an event to some messaging infrastructure (e.g. Redis PubSub running in a Docker container)

## Whoa, not so fast my friend

Try to avoid telling your assistant about the Makefile targets. If you're using a good model, it will likely find the `Makefile`, read it, and want to start using them. We will be doing this in module 3, so we will have plenty of time to explore this then.

Also try to avoid allowing your assistant to create an elaborate plan, break it down into tasks, and keep track of those tasks as it's completing them. We will also be exploring this in module 3 so maybe try to keep the units of work smaller until then.

## Extra Credit

Assuming this isn't the last time you're going to be creating a context framework for a project, what templates and instructions can you create (collaborating with your assistant of course) that will make this process easier and more efficient the next time you have to do it?

Create these assets and try them when initialising a new project (either an API, a web UI, or both).
