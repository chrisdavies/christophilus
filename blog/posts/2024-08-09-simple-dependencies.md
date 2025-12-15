# Simple dependencies

Simplicity. We all want it, yet it eludes us. We reach for complex tools to solve simple problems, but we all know that most problems are best solved by composing simple tools. Small teams can accomplish much, if they aren't overburdened by a poorly-fitting mishmash of tools.

It's a strange twist of psychology that leads us to reach for complexity. I don't know what's behind it, but I suspect there's some comfort in knowing, "This tool can do *anything*!" Most of the time, though, the sales pitch, "This can do anything!", should be viewed not as a bonus, but as a warning. You don't want a tool that can do *anything*. You want to solve a specific problem as directly, simply, and effectively as possible. These super flexible tools are almost never ideal for anything at all.

High-friction dependencies have multiplicative complexity. Each new not-quite-fitting dependency detracts from understandability in a non-linear way. It adds friction to maintenance tasks. Often, it degrades morale. If you dread touching a part of the system because it relies on a confusing mess of spaghetti dependencies, you're in the dependency doldrums, and your project is in trouble.

I have seen projects extend for months, and sometimes fail, simply because they were being built on the wrong (often very general, off-the-shelf) foundational tooling. I've been part of shipping solutions in the wake of such projects, and my success was almost entirely due to a focus on shipping something "good enough" with as simple a foundation as possible.

An example: a team had been working for several months-- close to a year, I think-- trying to solve a customer's problem. For their stack, they had chosen Sharepoint and SQL Server Reporting Services. The project never shipped. Trivial tasks would take them weeks. With a deadline fast approaching, I was brought in to turn things around. I asked, "What problem are we trying to solve for the customer?" It turned out to be a simple data-ingesting and reporting problem. My solution? A simple database, and a single ASP.NET page. This solution turned out to be an order of magnitude faster than the proposed solution, and probably several orders of magnitude simpler. It took maybe a week in total (including testing, Q/A, some design iterations), and our customers got what they needed.

This is not an isolated example. In my 20+ years as a software engineer, I have seen many examples of this same pathology.

How do you avoid this trap? How do you know if a tool is a good fit for the job? There's no surefire way. If you dread touching anything in the vicinity of the tool, that's a tell. But, that's a retrospective tell. Ideally, we'd have some rules of thumb which help us to avoid complexity in the first place.

## Have a bias for building it in-house

This is my first rule of thumb. It's pejoratively known as "Not Invented Here Syndrome". And, it can lead to nasty results. You think that off-the-shelf system was bad? Wait till you get a load of the spaghetti our team slapped together last week! Good luck maintaining *that* monstrosity!

I think the downsides of NIH Syndrome are well known. But the upsides are rarely discussed.

First, if you have a decent team of engineers, they're unlikely to produce a terrible mess. They'll produce a mess-- we all do-- but it shouldn't be terrible.

Second, if it's *your* mess, you can generally find your way around it. Maintaining *your own* mess is almost always easier than maintaining someone else's.

Third, with just a bit of forethought, composing simple tools into a final solution can be done in such a way that each piece is quickly understandable, and removal of any given piece is relatively trivial.

## Have a bias for deletability

If you *must* pull in a dependency, choose one that is easy to replace. This isn't always possible. Your ORM or database layer is generally difficult to replace. If you *know* the dependency will be hard to replace, spend some time finding exploring its rough edges and limitations before committing to it. This is usually best done by building a throwaway prototype that is as real-world as you can make it given your time constraints.

## Ask questions first, shoot second

When considering a new problem for which there may be an existing off-the-shelf solution, here are some questions I use:

- How hard is it to build a simple solution, following the 80/20 rule?
- How many jobs does this potential dependency perform? The fewer the better.
- How easy is it to rip out if it turns out to be a poor choice?
- What are the potential pitfalls?
- Where is it likely to go wrong?

## Anyway

I'm not trying to convince you to write everything in Assembly. Tools are good. Abstraction is necessary. But the cost of the wrong tool, the wrong abstraction, is high, and these costs tend to compound. It's worth considering and eliminating simpler solutions before reaching for the big-fancy-complected-solve-it-all tool.

