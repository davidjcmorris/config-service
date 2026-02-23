# From Assistant to Agentic AI course
## Module 1 - Part 1
Although late to the party, today I completed part 1 of module 1. 

1. **What surprised me?** 
    How much setup was required before even starting. I'd already installed VS Code and Cline, but didn't realise how much more there was to do — Git, Apple's command line developer tools, uv, Python. I also didn't realise what the homework actually was until I had Claude read the slide deck, transcripts, and sample files and step me through it. The biggest surprise was the test results — 62 passing on the first run, with only 1 failure that Cline fixed itself. That felt remarkable.
2. **What frustrated me?**
    Getting confused between VS Code's built-in AI chat and Cline — it took a while to work out how to get Cline into the right-hand sidebar. Also having to manually accept each file Cline created was repetitive. I'd be interested to know if that can be automated, or whether keeping that manual approval is actually advisable.
3. **How would I rate my planning efforts?**
    Better than expected given my starting point. Working through specs → prompt → plan in sequence felt methodical. Having to answer Cline's clarifying questions before it finalised the plan was a good discipline — it forced me to think through decisions I hadn't considered.
4. **Did I experience any overwhelm?**
    Honestly yes, at the start. It felt like a bigger shift than when I moved from Classic ASP and VBScript to ASP.NET and C# back in 2002. But once things started working and momentum built, that feeling lifted. Having Claude guide me step by step made a significant difference.
5. **How did I find not hand-writing code?**
    Liberating and slightly unsettling in equal measure. I was anxious going in, but watching Cline scaffold an entire tested, linted Python REST API service — something I couldn't have written myself at this point — was genuinely impressive. The cost (~$5.00) felt entirely reasonable for what it produced.
6. **How will this experience influence me going forward?**
    I want to find a smoother workflow around the commit cycle; committing at every step felt like good discipline and I understand why the course emphasises it, but it also interrupted my flow. Worth exploring how to make that more automatic. I'm also curious whether the file approval process can be streamlined. More broadly, I'm going into Part 2 with much more confidence than I had this morning. 

## Module 1 - Part 2
Now working through part 2, the UI. 
1. **Cost of planning**
I actually had to restasrst the planning a couple of times, so it eneded up being more expensive than necessary, but it looks like it has been less than $2 so far.  
2. **Did it include: class structure, file/folder names/locations, sufficient detail for test automation, and a list of external dependencies with version numbers?**
The plan looks like it includes a complete file/folder structure for the `ui/` directory, named classes and components with their exact filenames, detailed Shadow DOM render structures for each component, and a full `package.json` with dependency versions. Test coverage looks pretty comprehensive, and individual test cases are named for both vitest unit tests and Playwright integration tests, including setup and teardown approach.
3. **What gaps did it fill in on its own? Was its decision close?**
It was pretty amazing to see it spot that the API calls (as seen in the localhost Swagger output) missed GET list and DELETE endpoints for both applications and configurations — this wasn't in the prompt but Cline correctly inferred it by reading the router files. This means it's going to make changes to the back-end service before it does anything with the UI, so that'll be interesting. It also chose Vite as the build/dev server, which from everything I've read looks like a sensible and conventional choice for a TypeScript project. The Vite proxy configuration to handle CORS during development was another good unprompted addition.
4. **Does everything that needs it, have sufficient emphasis?**
Testing has strong emphasis throughout — both unit and integration test cases are well specified. The re-fetch after mutations pattern is clearly called out. The one area with less emphasis is error handling in the backend additions (Part 1), where the plan is lighter on detail than the UI sections. Worth watching during Act mode.
5. **Cost of enacting the plan**
Cost so far has been $3.87. Expecting this to climb as I refine it. 
6. **What code changes would you like to see in the next run?**
- User-friendly error messages instead of raw HTTP status codes (in progress)
- Form field values preserved after a failed submission rather than resetting to original values (in progress)
- The HTTP 500 error was visible immediately on page load before any interaction, which suggests better handling of the initial data fetch failure is needed
- Remove the DATABASE_URL missing test, as it repeatedly fails and Cline says this is by design
7. **Does it run without errors? Do the tests pass?**
All 42 unit tests and 11 integration tests passed on the first run, which was impressive. However the app itself threw HTTP 500 errors immediately because the new list_all and delete functions added to both repository files didn't follow the existing async cursor pattern — they were passing the context manager rather than the actual cursor. Cline fixed this when prompted with the error and the hint about consistency with existing code. Once fixed, the UI worked end to end successfully.
8. **What surprised you about the implementation?**
- Cline identified independently that the backend was missing GET list and DELETE endpoints for both applications and configurations — this wasn't in the prompt, it inferred it from reading the router files
- When toggling from Plan to Act mode, Cline didn't wait for a separate instruction — it immediately began executing the plan without being prompted
- The entire build including backend changes, all components, unit tests, and integration tests was completed in a single Act run (I had thought to split this, but Cline suggested it was better running this in one)
- Node.js wasn't installed and Cline identified this, installed it via Homebrew, and continued without any intervention needed beyond approving the terminal commands
