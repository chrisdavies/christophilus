# Claude Code Example

I've used Claude Code off an on for around a year, using it heavily in the last few months. I thought it might be helpful for others (and maybe my future self) if I jotted down an example scenario and a specific prompt I used.

## Overly general guidance

I recently asked it to build a feature for me-- a calendar view that organization admins could use to see all scheduled activity across their entire organization. An organization might have multiple instructors, each of which is creating and leading multiple courses, any of which might have scheduled meetings and modules. Each course has its own calendar view, but until recently, there was no way for admins to get a high-level calendar view for the entire organization.

So, I tasked Claude Code with this, and it built it in a few minutes. It didn't take long before I realized the solution was pretty terrible.

Claude had:

- Attempted to use kysely (a database library we don't use)
- Decided to pull all courses, instructors, and scheduled items into memory and do the filtering there rather than in Postgres
- Sent the entire payload to the browser to do live-processing there
- Made numerous glaring mistakes in the Preact layer

Some other things I've frequently seen Claude do:

- N+1 queries where a single well-structured query (e.g. a merge or window function) would serve.
- Improper data access validation (for example, not ensuring that ids sent from the client actually belong to / are accessible by the caller).

## Specific guidance

So, here's how I guided it to properly implement the front-end for the calendar feature:

### Browser

The calendar will be driven by a state object:

```
// Pseudo
type State = {
  // The 1st of the month being viewed
  start: Date;
  instructors:
    | { type: 'all' }
    | { type: 'some', ids: UUID[] }
  courses:
    | { type: 'all' }
    | { type: 'some', ids: UUID[] }
  items: Array<'modules' | 'meetings'>;
};

const defaultState = {
  start: now().onDay(1),
  guides: { type: 'all' },
  courses: { type: 'all' }
  items: ['modules', 'meetings'],
};

function Page(props) {
  const [state, setState] = useState<State>(() => {
    try {
      return JSON.parse(props.params.filter);
    } catch {
      return defaultState;
    }
  });

  // etc...
}

```

Note: We'll have a max size for the ids arrays-- maybe 10 or 20 or something.

When the state changes, we'll update the URL without triggering a re-render simply so that if the user refreshes, they'll see the same view, and they can also copy / paste the URL with other admins to share the view they're seeing.

```
// Pseudo
useDidUpdateEffect(() => {
  const queryStr = JSON.stringify(state);
  router.rewrite(`${location.pathname}?filter=${encodeURIComponent(queryStr)}`);
}, [state]);
```

The data we display (the side-nav courses, and the items in the calendar, etc) will be loaded from the server any time that filter changes. We can use a debounce if we like. All of this (including race-condition handling) is built into our existing `useAsyncData` hook:

```
const data = useAsyncData(() => rpx.adminCalendar.load({ ...state, timezone }), [state]);
```

Note: We may want to use Zod or something like it to parse the state rather than just parsing it as JSON, so that we *force* it to conform to the expected shape that we can pass directly to the rpx endpoint.

Remember to use a functional, immutable approach. Use simple state objects to avoid awkward equality checks and mutations:

```
// NO
const [selectedIds, setSelectedIds] = useState(new Set());
const toggleId = (id) => setSelectedIds((ids) => {
  if (ids.has(id)) {
    ids.delete(id);
  } else {
    ids.add(id);
  }
  return ids;
});

// YES
const [selectedIds, setSelectedIds] = useState([]);
const toggleId = (id) => setSelectedIds((ids) => {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
});
```

### Server

The endpoint can probably query the information we need by using a single query. For any given date, we want to display the first 2 items, with meetings being prioritized over modules. We'll display `+ N more...` and allow the user to click that to view all items for a specific date.

So, our RPC function will end up returning something like this:

```
type Item = {
  id: UUID;
  timestamp: Date;
  title: string;
  type: 'module' | 'meeting';
};

type DateResult = {
  date: Date;
  numItems: number;
  items: Item;
};

type ReturnType = {
  dates: DateResult[];
};
```

We can flesh it out more as we go.

- We should probably use a window function or something like that to efficiently collect the items per date.
- We need to ensure we use the passed timezone so we group the items into the proper date (e.g. an item might be Tuesday in UTC, but Wednesday in the caller's timezone)
- Ensure the results all belong to the current organization, and that the caller is at least an active, valid admin in that organization

