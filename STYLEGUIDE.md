# Styleguide

An example script should do one (or both) of the following:

1. Demonstrate how to use a particular scripting API
2. Highlight a common use case in an adaptible/remixable way

At a high level, these scripts should be optimized for clarity and readability over efficiency or
adherence to modern JS best practices. A user with basic JS/programming experience should be able to
copy/paste an example script and modify some variables to get it running in their own base.

Most of the following recommendations are enforced via ESLint/Prettier, which you can run via code
editor plugins or directly on the command line:

```
$ npm run lint
$ npm run format
```

These are also automatically run in a pre-commit hook.

## Naming

-   All filenames should be kebab cased, e.g. `example-script.js`

-   All variable and function names should be camel cased.

-   Avoid abbreviating variable names unless it's a widely known convention, e.g. `i` for array
    index.

### Model naming

-   If this is the only instance of a `Table`/`View`/`RecordQueryResult`/`Record` in the script, use
    `table`/`view`/`query`/`record` as the variable name.

-   If this is the only instance of a `Field` in the script and the script is fairly generic (e.g.
    find and replace), use `field` as the variable name.

-   If there are multiple instances of the same model in the script (usually `Field`), prefix the
    model name with a descriptor, e.g. `tasksTable`, `statusField`.

## Comments

-   Preface every script with a comment about what the script does. You can additionally link to a
    template or Universe base that the script is compatible with.

-   Add inline comments for any code block of sufficient complexity.

-   Avoid trivializing language, e.g. "just", "simple/simply", "basic".

-   Avoid excessively technical terminology.

    -   Prefer "variable" to "constant".
    -   Avoid using "model", "instance", or "{model} object". Prefer "the selected {model}".

-   Add a comment to the first instance of the `await` keyword in a script, e.g.

    ```
    // The await keyword tells the script to wait for a result before continuing.
    // This is required for any function that ends with the word Async.
    ```

-   Add a comment for any idiosyncrasies of our APIs, e.g. specific cell formats, batched updates,
    the `fields` wrapper object for record create/update.

-   Wherever necessary, link to relevant API docs in the comments, e.g. MDN for `Set`/`Map`/`fetch`
    or https://airtable.com/developers/scripting for scripting APIs.

## Code style

### General

-   Prefer single quotes to double quotes.

-   Use four space indentation.

-   Keep line length <= 100 characters.

-   Prefer `let` to `const`.

-   Prefer string interpolation to string concatenation.

-   Prefer `if`/`else` blocks to ternary operators.

-   Prefer arrow functions to inline function definitions. Alternatively, define the function
    outside.

-   Prefer `===/!==` to `==/!=`.

-   Prefer `for... of` to `forEach` or `for (let i = 0...`. The latter can be used when the index is
    relevant.

### Airtable script specific

-   Include batching for any operation that might exceed 50 records.

-   Pull out any remixable pieces of the script into separate variables or functions, e.g.
    `isDuplicate` for a dedupe script, validation logic, a record template object.

-   If a script is likely to use the same models every time, hardcode model names at the top of the
    script. Otherwise, use `input.table/view/fieldAsync`.
