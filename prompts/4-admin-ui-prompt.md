Create an implementation plan for an admin web interface that has features 
for adding and updating application entries as well as adding and updating 
the configuration name/value pairs.

**main settings** 
- Use @config-service/app/routers/applications.py and @config-service/app/routers/configurations.py to understand which endpoints and payloads are available.
- The config-service API runs at http://localhost:8000.
- Use pnpm to manage dependencies and run scripts.
- All code should either be TypeScript, HTML, or CSS. Do not use JavaScript directly.
- Do not take any external dependencies such as React and Vue. Use the Web Components functionality built into the browser and only the `fetch` feature of modern browsers. The same principle applies to styling — only CSS and the Shadow DOM.
- The Application model has fields: id, name, comments, and configuration_ids. 
- The Configuration model has fields: id, name, application_id, comments, and config.

**user interface**
The admin UI should implement the following interface:

***Main list view:***
- A scrollable list of application names with an accordion interaction 
- Each application row has a single edit icon before its name. 
- An add icon at the top of the list allows creation of a new application.
- Clicking an application expands a list of any associated configurations as "name: config" pairs. 
- When an application is expanded, an add configuration icon appears at the top of its configuration list. If there are no configurations for that application, the add icon is the only thing shown, making it clear the list is empty.
- Each configuration row has a single edit icon before its name.
- Clicking an expanded application collapses it.

***Edit application form:***
- Editable fields for name and comments; with a save, cancel, and delete button. (delete requires confirmation before executing).
- A read-only list of associated configurations (just as expanded in the applications list) with an add configuration button.

***Edit configuration form:***
- Editable fields for name, config, and comments; with a save, cancel, and delete button. (delete requires confirmation before executing).

***General:***
- All destructive actions (delete) are only accessible via the edit forms, never directly from a list view.
- Display inline validation errors on forms and user-friendly messages on API failures. Require confirmation before any delete operation.
- After any successful create, update, or delete operation, re-fetch data from the API rather than updating local state directly.
- Automated testing is very important Include unit testing with vitest and integration testing with Playwright.
- The plan should output to prompts/5-admin-ui-plan.md.